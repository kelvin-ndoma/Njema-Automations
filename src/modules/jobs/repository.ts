import 'server-only';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { AuditEvent, Membership } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { authorizeMembership } from '@/modules/organizations/policy';
import { Activity, Contact } from '@/modules/crm/models';
import { FollowUpJob } from './models';

export async function listFollowUps(organizationId: string, userId: string) {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  const rows = await FollowUpJob.find({ organizationId })
    .sort({ scheduledAt: 1, _id: 1 })
    .limit(50)
    .lean()
    .exec();
  return rows.map((row) => ({
    id: String(row._id),
    opportunityId: String(row.opportunityId),
    contactId: String(row.contactId),
    conversationId: row.conversationId ? String(row.conversationId) : null,
    channel: row.channel,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    reason: row.reason,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  }));
}

/** Process due in-app follow-ups for one organization (idempotent, no outbound send). */
export async function processDueFollowUps(organizationId: string, userId: string, limit = 20) {
  await connectDb();
  await assertTenantState(organizationId, userId, 'organization:update');
  authorizeMembership(
    await Membership.findOne({ organizationId, userId }).exec(),
    userId,
    'organization:update',
  );
  const now = new Date();
  const due = await FollowUpJob.find({
    organizationId,
    status: 'pending',
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(limit)
    .exec();
  let processed = 0;
  for (const job of due) {
    const claimed = await FollowUpJob.findOneAndUpdate(
      { _id: job._id, organizationId, status: 'pending' },
      { $set: { status: 'processing' }, $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    ).exec();
    if (!claimed) continue;
    try {
      const contact = await Contact.findOne({
        _id: claimed.contactId,
        organizationId,
      })
        .lean()
        .exec();
      if (contact?.communicationOptOut === true) {
        claimed.status = 'cancelled';
        claimed.lastError = 'Cancelled because the contact opted out of communication.';
        await claimed.save();
        await AuditEvent.create({
          organizationId,
          actorId: userId,
          action: 'follow_up.cancelled_opt_out',
          resourceId: String(claimed._id),
        });
        processed += 1;
        continue;
      }
      await Activity.create({
        organizationId,
        contactId: claimed.contactId,
        opportunityId: claimed.opportunityId,
        conversationId: claimed.conversationId,
        type: 'system',
        body: 'In-app follow-up is due. Review the opportunity and continue the conversation. Outbound delivery is not configured.',
        actorId: userId,
      });
      claimed.status = 'completed';
      claimed.completedAt = new Date();
      claimed.lastError = null;
      await claimed.save();
      await AuditEvent.create({
        organizationId,
        actorId: userId,
        action: 'follow_up.completed',
        resourceId: String(claimed._id),
      });
      processed += 1;
    } catch (error) {
      claimed.status = 'failed';
      claimed.lastError = 'Follow-up processing failed.';
      await claimed.save();
      void error;
    }
  }
  return { processed, scanned: due.length };
}
