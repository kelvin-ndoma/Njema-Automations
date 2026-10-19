import 'server-only';
import { Types, type ClientSession } from 'mongoose';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { AuditEvent, Membership } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { AccessDenied, authorizeMembership } from '@/modules/organizations/policy';
import {
  Activity,
  Contact,
  Opportunity,
  Pipeline,
  defaultPipelineStages,
} from './models';
import { ContactConflict, type ContactInput } from './input';

export async function ensureDefaultPipeline(organizationId: string, session?: ClientSession) {
  await connectDb();
  const existing = await Pipeline.findOne({ organizationId, isDefault: true })
    .session(session ?? null)
    .exec();
  if (existing) return existing;
  const [created] = await Pipeline.create(
    [
      {
        organizationId,
        name: 'Sales pipeline',
        stages: defaultPipelineStages,
        isDefault: true,
      },
    ],
    session ? { session } : undefined,
  );
  return created;
}

/** Called inside visitor lead capture transaction — no membership (public path). */
export async function upsertContactFromLead(
  organizationId: string,
  input: {
    name: string;
    email: string;
    phone?: string | null;
    leadId: Types.ObjectId;
    conversationId: Types.ObjectId;
  },
  actorId: string,
  session: ClientSession,
) {
  const email = input.email.toLowerCase();
  let contact = await Contact.findOne({ organizationId, email }).session(session).exec();
  if (!contact) {
    [contact] = await Contact.create(
      [
        {
          organizationId,
          name: input.name,
          email,
          phone: input.phone ?? null,
          source: 'website_widget',
        },
      ],
      { session },
    );
  } else {
    contact.name = input.name;
    if (input.phone) contact.phone = input.phone;
    await contact.save({ session });
  }
  const pipeline = await ensureDefaultPipeline(organizationId, session);
  const existingOpportunity = await Opportunity.findOne({
    organizationId,
    leadId: input.leadId,
  })
    .session(session)
    .exec();
  if (!existingOpportunity) {
    const [opportunity] = await Opportunity.create(
      [
        {
          organizationId,
          contactId: contact._id,
          pipelineId: pipeline._id,
          stageKey: 'new',
          title: `Website lead — ${input.name}`,
          ownerId: actorId,
          status: 'open',
          conversationId: input.conversationId,
          leadId: input.leadId,
        },
      ],
      { session },
    );
    await Activity.create(
      [
        {
          organizationId,
          contactId: contact._id,
          opportunityId: opportunity._id,
          conversationId: input.conversationId,
          type: 'lead_captured',
          body: 'Consented website lead captured; opportunity opened in New.',
          actorId,
        },
      ],
      { session },
    );
  }
  return contact;
}

export async function listContacts(organizationId: string, userId: string) {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  const rows = await Contact.find({ organizationId })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(50)
    .lean()
    .exec();
  return rows.map((row) => ({
    id: String(row._id),
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    source: row.source,
    communicationOptOut: row.communicationOptOut === true,
    optedOutAt: row.optedOutAt ? row.optedOutAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function setContactCommunicationOptOut(
  organizationId: string,
  userId: string,
  contactId: string,
  communicationOptOut: boolean,
) {
  await connectDb();
  return Contact.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const contact = await Contact.findOneAndUpdate(
      { _id: contactId, organizationId },
      {
        $set: {
          communicationOptOut,
          optedOutAt: communicationOptOut ? new Date() : null,
        },
      },
      { session, returnDocument: 'after' },
    ).exec();
    if (!contact) throw new AccessDenied();
    if (communicationOptOut) {
      const { FollowUpJob } = await import('@/modules/jobs/models');
      await FollowUpJob.updateMany(
        {
          organizationId,
          contactId: contact._id,
          status: { $in: ['pending', 'processing'] },
        },
        {
          $set: {
            status: 'cancelled',
            lastError: 'Cancelled because the contact opted out of communication.',
          },
        },
        { session },
      );
    }
    await Activity.create(
      [
        {
          organizationId,
          contactId: contact._id,
          type: 'system',
          body: communicationOptOut
            ? 'Contact opted out of automated follow-up communication.'
            : 'Contact communication opt-out cleared.',
          actorId: userId,
        },
      ],
      { session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: communicationOptOut ? 'crm.contact.opted_out' : 'crm.contact.opt_out_cleared',
          resourceId: contactId,
        },
      ],
      { session },
    );
    return { id: contactId, communicationOptOut };
  });
}

export async function createManualContact(
  organizationId: string,
  userId: string,
  input: ContactInput,
) {
  await connectDb();
  return Contact.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    try {
      const [contact] = await Contact.create(
        [
          {
            organizationId,
            name: input.name,
            email: input.email,
            phone: input.phone ?? null,
            source: 'manual',
            ownerId: userId,
          },
        ],
        { session },
      );
      await ensureDefaultPipeline(organizationId, session);
      await AuditEvent.create(
        [
          {
            organizationId,
            actorId: userId,
            action: 'crm.contact.created',
            resourceId: String(contact._id),
          },
        ],
        { session },
      );
      return { id: String(contact._id) };
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 11000)
        throw new ContactConflict();
      throw error;
    }
  });
}

export async function listOpportunities(organizationId: string, userId: string) {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  const [pipeline, rows, contacts] = await Promise.all([
    ensureDefaultPipeline(organizationId),
    Opportunity.find({ organizationId }).sort({ updatedAt: -1, _id: -1 }).limit(50).lean().exec(),
    Contact.find({ organizationId }).select({ name: 1, email: 1 }).lean().exec(),
  ]);
  const contactMap = new Map(contacts.map((row) => [String(row._id), row]));
  return {
    pipeline: {
      id: String(pipeline._id),
      name: pipeline.name,
      stages: pipeline.stages.map((stage) => ({
        key: stage.key,
        label: stage.label,
        order: stage.order,
      })),
    },
    opportunities: rows.map((row) => {
      const contact = contactMap.get(String(row.contactId));
      return {
        id: String(row._id),
        title: row.title,
        stageKey: row.stageKey,
        status: row.status,
        contactName: contact?.name ?? 'Unknown contact',
        contactEmail: contact?.email ?? '',
        conversationId: row.conversationId ? String(row.conversationId) : null,
        updatedAt: row.updatedAt.toISOString(),
      };
    }),
  };
}

export async function moveOpportunityStage(
  organizationId: string,
  userId: string,
  opportunityId: string,
  stageKey: string,
) {
  await connectDb();
  return Opportunity.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const pipeline = await ensureDefaultPipeline(organizationId, session);
    if (!pipeline.stages.some((stage) => stage.key === stageKey)) throw new AccessDenied();
    const status = stageKey === 'won' ? 'won' : stageKey === 'lost' ? 'lost' : 'open';
    const row = await Opportunity.findOneAndUpdate(
      { _id: opportunityId, organizationId },
      { $set: { stageKey, status } },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new AccessDenied();
    await Activity.create(
      [
        {
          organizationId,
          contactId: row.contactId,
          opportunityId: row._id,
          type: 'stage_change',
          body: `Stage moved to ${stageKey}.`,
          actorId: userId,
        },
      ],
      { session },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'crm.opportunity.stage_changed',
          resourceId: opportunityId,
        },
      ],
      { session },
    );
    return { id: opportunityId, stageKey, status };
  });
}
