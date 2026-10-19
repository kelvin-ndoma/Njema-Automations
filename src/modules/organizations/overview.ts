import 'server-only';
import { requireUser } from '@/server/session';
import { connectDb } from '@/server/db';
import { SalesEmployee } from '@/modules/employees/models';
import { Opportunity } from '@/modules/crm/models';
import { FollowUpJob } from '@/modules/jobs/models';
import { Appointment } from '@/modules/appointments/models';
import { Quotation } from '@/modules/quotations/models';
import { QualifiedLead, VisitorConversation, WidgetInstallation } from '@/modules/widget/models';
import { authorizeOrganizationAccess } from './access';
import { workspaceFor, type Workspace } from './service';

export type WorkspaceHome = {
  workspace: Workspace;
  employee: {
    name: string;
    revision: number;
    updatedAt: string;
    status: 'active' | 'paused';
  } | null;
  widget: { enabled: boolean; originCount: number; updatedAt: string } | null;
  leadCount: number;
  conversationCount: number;
  needsHumanCount: number;
  openOpportunityCount: number;
  pendingFollowUpCount: number;
  draftQuotationCount: number;
  openAppointmentCount: number;
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    latestVisitorMessage: string | null;
  }>;
  recentConversations: Array<{
    id: string;
    updatedAt: string;
    hasLead: boolean;
    needsHuman: boolean;
    controlMode: 'ai' | 'human';
    latestVisitorMessage: string | null;
    latestEmployeeMessage: string | null;
    messageCount: number;
  }>;
};

export async function getWorkspaceHome(slug: string): Promise<WorkspaceHome> {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  await authorizeOrganizationAccess(workspace.id, user.id, 'workspace:read');
  await connectDb();

  const [
    employee,
    widget,
    leadCount,
    conversationCount,
    needsHumanCount,
    openOpportunityCount,
    pendingFollowUpCount,
    draftQuotationCount,
    openAppointmentCount,
    leads,
    conversations,
  ] = await Promise.all([
    SalesEmployee.findOne({ organizationId: workspace.id })
      .select({ name: 1, revision: 1, updatedAt: 1, status: 1 })
      .lean()
      .exec(),
    WidgetInstallation.findOne({ organizationId: workspace.id })
      .select({ enabled: 1, allowedOrigins: 1, updatedAt: 1 })
      .lean()
      .exec(),
    QualifiedLead.countDocuments({ organizationId: workspace.id }),
    VisitorConversation.countDocuments({ organizationId: workspace.id }),
    VisitorConversation.countDocuments({
      organizationId: workspace.id,
      $or: [{ needsHuman: true }, { controlMode: 'human' }],
    }),
    Opportunity.countDocuments({ organizationId: workspace.id, status: 'open' }),
    FollowUpJob.countDocuments({
      organizationId: workspace.id,
      status: { $in: ['pending', 'processing'] },
    }),
    Quotation.countDocuments({ organizationId: workspace.id, status: 'draft' }),
    Appointment.countDocuments({
      organizationId: workspace.id,
      status: { $in: ['requested', 'confirmed'] },
    }),
    QualifiedLead.find({ organizationId: workspace.id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(3)
      .lean()
      .exec(),
    VisitorConversation.find({ organizationId: workspace.id })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(5)
      .lean()
      .exec(),
  ]);

  const conversationById = new Map(conversations.map((row) => [String(row._id), row]));

  return {
    workspace,
    employee: employee
      ? {
          name: employee.name,
          revision: employee.revision,
          updatedAt: employee.updatedAt.toISOString(),
          status: employee.status === 'paused' ? 'paused' : 'active',
        }
      : null,
    widget: widget
      ? {
          enabled: widget.enabled,
          originCount: widget.allowedOrigins?.length ?? 0,
          updatedAt: widget.updatedAt.toISOString(),
        }
      : null,
    leadCount,
    conversationCount,
    needsHumanCount,
    openOpportunityCount,
    pendingFollowUpCount,
    draftQuotationCount,
    openAppointmentCount,
    recentLeads: leads.map((lead) => {
      const conversation = conversationById.get(String(lead.conversationId));
      const visitor = [...(conversation?.messages ?? [])]
        .reverse()
        .find((message) => message.role === 'visitor');
      return {
        id: String(lead._id),
        name: lead.name,
        email: lead.email,
        createdAt: lead.createdAt.toISOString(),
        latestVisitorMessage: visitor?.content ?? null,
      };
    }),
    recentConversations: conversations.map((row) => {
      const messages = row.messages ?? [];
      const visitor = [...messages].reverse().find((message) => message.role === 'visitor');
      const employeeMessage = [...messages]
        .reverse()
        .find(
          (message) =>
            (message.role === 'employee' || message.role === 'human') &&
            message.status === 'completed',
        );
      return {
        id: String(row._id),
        updatedAt: row.updatedAt.toISOString(),
        hasLead: !!row.leadId,
        needsHuman: row.needsHuman === true,
        controlMode: (row.controlMode as 'ai' | 'human' | undefined) ?? 'ai',
        latestVisitorMessage: visitor?.content ?? null,
        latestEmployeeMessage: employeeMessage?.content ?? null,
        messageCount: messages.filter((message) => message.status !== 'failed').length,
      };
    }),
  };
}
