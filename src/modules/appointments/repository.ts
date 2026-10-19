import 'server-only';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { AuditEvent, Membership, Organization } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { AccessDenied, authorizeMembership } from '@/modules/organizations/policy';
import { Activity, Opportunity } from '@/modules/crm/models';
import { Appointment } from './models';
import { AppointmentUnavailable, type appointmentRequestInput } from './input';
import type { z } from 'zod';

export async function listAppointments(organizationId: string, userId: string) {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  const rows = await Appointment.find({ organizationId })
    .sort({ requestedStartAt: -1, _id: -1 })
    .limit(50)
    .lean()
    .exec();
  return rows.map((row) => ({
    id: String(row._id),
    opportunityId: String(row.opportunityId),
    title: row.title,
    status: row.status,
    requestedStartAt: row.requestedStartAt.toISOString(),
    durationMinutes: row.durationMinutes,
    timeZone: row.timeZone,
    notes: row.notes ?? '',
    calendarProvider: row.calendarProvider,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createAppointmentRequest(
  organizationId: string,
  userId: string,
  input: z.infer<typeof appointmentRequestInput>,
) {
  await connectDb();
  return Appointment.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const org = await Organization.findById(organizationId).session(session).exec();
    if (!org) throw new AccessDenied();
    const opportunity = await Opportunity.findOne({
      _id: input.opportunityId,
      organizationId,
      status: 'open',
    })
      .session(session)
      .exec();
    if (!opportunity) throw new AppointmentUnavailable('Open opportunity required.');
    if (input.requestedStartAt.getTime() < Date.now() - 60_000) {
      throw new AppointmentUnavailable('Choose a start time in the future.');
    }
    const [appointment] = await Appointment.create(
      [
        {
          organizationId,
          opportunityId: opportunity._id,
          contactId: opportunity.contactId,
          conversationId: opportunity.conversationId,
          status: 'requested',
          title: input.title,
          requestedStartAt: input.requestedStartAt,
          durationMinutes: input.durationMinutes,
          notes: input.notes ?? '',
          timeZone: org.timeZone,
          createdBy: userId,
        },
      ],
      { session },
    );
    if (opportunity.stageKey === 'new' || opportunity.stageKey === 'qualified') {
      opportunity.stageKey = 'proposal';
      await opportunity.save({ session });
    }
    await Activity.create(
      [
        {
          organizationId,
          contactId: opportunity.contactId,
          opportunityId: opportunity._id,
          type: 'system',
          body: `Appointment requested: ${input.title} (calendar sync not configured).`,
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
          action: 'appointment.requested',
          resourceId: String(appointment._id),
        },
      ],
      { session },
    );
    return { id: String(appointment._id) };
  });
}

export async function confirmAppointment(
  organizationId: string,
  userId: string,
  appointmentId: string,
) {
  await connectDb();
  return Appointment.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const row = await Appointment.findOneAndUpdate(
      { _id: appointmentId, organizationId, status: 'requested' },
      {
        $set: {
          status: 'confirmed',
          confirmedBy: userId,
          confirmedAt: new Date(),
        },
      },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new AppointmentUnavailable('Only requested appointments can be confirmed.');
    await Activity.create(
      [
        {
          organizationId,
          contactId: row.contactId,
          opportunityId: row.opportunityId,
          type: 'system',
          body: `Appointment confirmed: ${row.title}. External calendar write is not configured.`,
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
          action: 'appointment.confirmed',
          resourceId: appointmentId,
        },
      ],
      { session },
    );
    return { id: appointmentId, status: 'confirmed' as const };
  });
}

export async function cancelAppointment(
  organizationId: string,
  userId: string,
  appointmentId: string,
) {
  await connectDb();
  return Appointment.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const row = await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        organizationId,
        status: { $in: ['requested', 'confirmed'] },
      },
      { $set: { status: 'cancelled' } },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new AppointmentUnavailable('Appointment cannot be cancelled.');
    await Activity.create(
      [
        {
          organizationId,
          contactId: row.contactId,
          opportunityId: row.opportunityId,
          type: 'system',
          body: `Appointment cancelled: ${row.title}.`,
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
          action: 'appointment.cancelled',
          resourceId: appointmentId,
        },
      ],
      { session },
    );
    return { id: appointmentId, status: 'cancelled' as const };
  });
}
