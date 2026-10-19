import 'server-only';
import { requireUser } from '@/server/session';
import { connectDb } from '@/server/db';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { workspaceFor } from '@/modules/organizations/service';
import { Activity, Contact, Opportunity } from '@/modules/crm/models';
import { Appointment } from '@/modules/appointments/models';
import { Quotation } from '@/modules/quotations/models';
import { FollowUpJob } from '@/modules/jobs/models';
import { QualifiedLead, VisitorConversation } from '@/modules/widget/models';

export async function getWorkspaceAnalytics(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  await authorizeOrganizationAccess(workspace.id, user.id, 'workspace:read');
  await connectDb();
  const organizationId = workspace.id;

  const [
    contactCount,
    leadCount,
    openOpportunities,
    wonOpportunities,
    lostOpportunities,
    draftQuotations,
    approvedQuotations,
    requestedAppointments,
    confirmedAppointments,
    pendingFollowUps,
    completedFollowUps,
    conversationCount,
    humanControlCount,
    recentActivities,
  ] = await Promise.all([
    Contact.countDocuments({ organizationId }),
    QualifiedLead.countDocuments({ organizationId }),
    Opportunity.countDocuments({ organizationId, status: 'open' }),
    Opportunity.countDocuments({ organizationId, status: 'won' }),
    Opportunity.countDocuments({ organizationId, status: 'lost' }),
    Quotation.countDocuments({ organizationId, status: 'draft' }),
    Quotation.countDocuments({ organizationId, status: 'approved' }),
    Appointment.countDocuments({ organizationId, status: 'requested' }),
    Appointment.countDocuments({ organizationId, status: 'confirmed' }),
    FollowUpJob.countDocuments({
      organizationId,
      status: { $in: ['pending', 'processing'] },
    }),
    FollowUpJob.countDocuments({ organizationId, status: 'completed' }),
    VisitorConversation.countDocuments({ organizationId }),
    VisitorConversation.countDocuments({
      organizationId,
      $or: [{ needsHuman: true }, { controlMode: 'human' }],
    }),
    Activity.find({ organizationId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(12)
      .lean()
      .exec(),
  ]);

  return {
    workspace,
    metrics: {
      contactCount,
      leadCount,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      draftQuotations,
      approvedQuotations,
      requestedAppointments,
      confirmedAppointments,
      pendingFollowUps,
      completedFollowUps,
      conversationCount,
      humanControlCount,
    },
    recentActivities: recentActivities.map((row) => ({
      id: String(row._id),
      type: row.type,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
