import 'server-only';
import { Types, type ClientSession } from 'mongoose';
import type { SalesAgentAction } from '@/modules/employees/input';
import { Activity, Opportunity } from '@/modules/crm/models';
import { QualifiedLead, VisitorConversation } from '@/modules/widget/models';
import { FollowUpJob } from '@/modules/jobs/models';
import { Appointment } from '@/modules/appointments/models';
import { Organization, AuditEvent, Membership } from '@/modules/organizations/models';
import { Quotation } from '@/modules/quotations/models';

/**
 * Server-side execution of approved sales-agent actions.
 * Never invents bookings/payments. Consent-gated CRM writes require a QualifiedLead.
 */
export async function executeSalesAgentAction(input: {
  organizationId: string;
  conversationId: string;
  action: SalesAgentAction;
  qualificationNote: string;
  actorId: string;
  session: ClientSession;
}): Promise<{ applied: string[] }> {
  const applied: string[] = [];
  const organizationId = new Types.ObjectId(input.organizationId);
  const conversationId = new Types.ObjectId(input.conversationId);

  if (input.action === 'continue' || input.action === 'request_contact' || input.action === 'escalate_human') {
    return { applied };
  }

  const lead = await QualifiedLead.findOne({ organizationId, conversationId })
    .session(input.session)
    .exec();
  const opportunity = await Opportunity.findOne({ organizationId, conversationId })
    .session(input.session)
    .exec();

  if (input.action === 'record_qualification') {
    if (!input.qualificationNote.trim()) return { applied };
    if (opportunity && lead) {
      await Activity.create(
        [
          {
            organizationId,
            contactId: opportunity.contactId,
            opportunityId: opportunity._id,
            conversationId,
            type: 'note',
            body: `AI qualification: ${input.qualificationNote.trim()}`.slice(0, 2000),
            actorId: input.actorId,
          },
        ],
        { session: input.session },
      );
      if (opportunity.stageKey === 'new' && opportunity.status === 'open') {
        opportunity.stageKey = 'qualified';
        await opportunity.save({ session: input.session });
        await Activity.create(
          [
            {
              organizationId,
              contactId: opportunity.contactId,
              opportunityId: opportunity._id,
              conversationId,
              type: 'stage_change',
              body: 'AI advanced opportunity to Qualified after recording qualification notes.',
              actorId: input.actorId,
            },
          ],
          { session: input.session },
        );
        applied.push('opportunity.qualified');
      }
      applied.push('activity.qualification_note');
      await AuditEvent.create(
        [
          {
            organizationId,
            actorId: input.actorId,
            action: 'agent.tool.record_qualification',
            resourceId: String(opportunity._id),
          },
        ],
        { session: input.session },
      );
    }
    return { applied };
  }

  if (input.action === 'advance_opportunity') {
    // Consent gate: only after a consented lead exists for this conversation.
    if (!lead || !opportunity || opportunity.status !== 'open') return { applied };
    const order = ['new', 'qualified', 'proposal'];
    const index = order.indexOf(opportunity.stageKey);
    if (index < 0 || index >= order.length - 1) return { applied };
    const next = order[index + 1]!;
    opportunity.stageKey = next;
    await opportunity.save({ session: input.session });
    await Activity.create(
      [
        {
          organizationId,
          contactId: opportunity.contactId,
          opportunityId: opportunity._id,
          conversationId,
          type: 'stage_change',
          body: `AI advanced opportunity to ${next}.`,
          actorId: input.actorId,
        },
      ],
      { session: input.session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: input.actorId,
          action: 'agent.tool.advance_opportunity',
          resourceId: String(opportunity._id),
        },
      ],
      { session: input.session },
    );
    applied.push(`opportunity.${next}`);
    return { applied };
  }

  if (input.action === 'schedule_follow_up') {
    if (!lead || !opportunity) return { applied };
    const { Contact } = await import('@/modules/crm/models');
    const contact = await Contact.findOne({
      _id: opportunity.contactId,
      organizationId,
    })
      .session(input.session)
      .exec();
    if (contact?.communicationOptOut === true) {
      applied.push('follow_up.blocked_opt_out');
      return { applied };
    }
    const owner =
      (
        await Membership.findOne({
          organizationId,
          role: 'owner',
          status: 'active',
        })
          .session(input.session)
          .exec()
      )?.userId ?? input.actorId;
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const idempotencyKey = `followup:${String(opportunity._id)}:ai:24h`;
    try {
      await FollowUpJob.create(
        [
          {
            organizationId,
            contactId: opportunity.contactId,
            opportunityId: opportunity._id,
            conversationId,
            channel: 'in_app',
            scheduledAt,
            status: 'pending',
            reason: 'AI scheduled a consent-aware in-app follow-up after qualification.',
            idempotencyKey,
            createdBy: owner,
          },
        ],
        { session: input.session },
      );
      await Activity.create(
        [
          {
            organizationId,
            contactId: opportunity.contactId,
            opportunityId: opportunity._id,
            conversationId,
            type: 'system',
            body: `In-app follow-up scheduled for ${scheduledAt.toISOString()} (UTC). Outbound email/SMS not configured.`,
            actorId: input.actorId,
          },
        ],
        { session: input.session },
      );
      await AuditEvent.create(
        [
          {
            organizationId,
            actorId: input.actorId,
            action: 'agent.tool.schedule_follow_up',
            resourceId: String(opportunity._id),
          },
        ],
        { session: input.session },
      );
      applied.push('follow_up.scheduled');
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
        applied.push('follow_up.already_scheduled');
        return { applied };
      }
      throw error;
    }
    return { applied };
  }

  if (input.action === 'request_quotation') {
    // Creates a zero-amount draft for human pricing — never invents customer prices.
    if (!lead || !opportunity || opportunity.status !== 'open') return { applied };
    const org = await Organization.findById(organizationId).session(input.session).exec();
    if (!org) return { applied };
    const title = (input.qualificationNote.trim() || 'Quotation request').slice(0, 120);
    const [quotation] = await Quotation.create(
      [
        {
          organizationId,
          opportunityId: opportunity._id,
          contactId: opportunity.contactId,
          currency: org.currency,
          status: 'draft',
          title,
          lines: [
            {
              description: 'Pending human pricing review (AI must not invent amounts).',
              quantity: 1,
              unitAmountMinor: 0,
            },
          ],
          notes: 'Created by AI request_quotation. Replace pricing before approval.',
          createdBy: input.actorId,
        },
      ],
      { session: input.session },
    );
    if (opportunity.stageKey === 'new' || opportunity.stageKey === 'qualified') {
      opportunity.stageKey = 'proposal';
      await opportunity.save({ session: input.session });
    }
    await VisitorConversation.updateOne(
      { _id: conversationId, organizationId },
      { $set: { needsHuman: true } },
      { session: input.session },
    );
    await Activity.create(
      [
        {
          organizationId,
          contactId: opportunity.contactId,
          opportunityId: opportunity._id,
          conversationId,
          type: 'system',
          body: `AI requested quotation draft "${title}" (amount unset — human pricing required).`,
          actorId: input.actorId,
        },
      ],
      { session: input.session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: input.actorId,
          action: 'agent.tool.request_quotation',
          resourceId: String(quotation._id),
        },
      ],
      { session: input.session },
    );
    applied.push('quotation.draft_requested');
    return { applied };
  }

  if (input.action === 'request_appointment') {
    // Provisional slot only — calendar sync is not configured; humans confirm.
    if (!lead || !opportunity || opportunity.status !== 'open') return { applied };
    const org = await Organization.findById(organizationId).session(input.session).exec();
    if (!org) return { applied };
    const title = (input.qualificationNote.trim() || 'Discovery call').slice(0, 120);
    const requestedStartAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const [appointment] = await Appointment.create(
      [
        {
          organizationId,
          opportunityId: opportunity._id,
          contactId: opportunity.contactId,
          conversationId,
          status: 'requested',
          title,
          requestedStartAt,
          durationMinutes: 30,
          notes:
            'Provisional slot from AI request_appointment. Confirm actual time with the customer. Calendar sync is not configured.',
          timeZone: org.timeZone,
          createdBy: input.actorId,
        },
      ],
      { session: input.session },
    );
    if (opportunity.stageKey === 'new' || opportunity.stageKey === 'qualified') {
      opportunity.stageKey = 'proposal';
      await opportunity.save({ session: input.session });
    }
    await VisitorConversation.updateOne(
      { _id: conversationId, organizationId },
      { $set: { needsHuman: true } },
      { session: input.session },
    );
    await Activity.create(
      [
        {
          organizationId,
          contactId: opportunity.contactId,
          opportunityId: opportunity._id,
          conversationId,
          type: 'system',
          body: `AI requested provisional appointment "${title}" at ${requestedStartAt.toISOString()} (UTC). Confirm before treating as booked.`,
          actorId: input.actorId,
        },
      ],
      { session: input.session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: input.actorId,
          action: 'agent.tool.request_appointment',
          resourceId: String(appointment._id),
        },
      ],
      { session: input.session },
    );
    applied.push('appointment.requested');
    return { applied };
  }

  return { applied };
}
