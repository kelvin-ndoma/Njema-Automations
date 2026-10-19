import 'server-only';
import { Types } from 'mongoose';
import { connectDb } from '@/server/db';
import { assertOrganizationOperational, assertTenantState } from '@/server/access-state';
import { AuditEvent, Membership, Organization } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { authorizeMembership, type Permission } from '@/modules/organizations/policy';
import { SalesEmployee } from '@/modules/employees/models';
import { DailyAIUsage } from '@/modules/conversations/models';
import { UsageExceeded } from '@/modules/conversations/input';
import { resolvePublicAIAllowance } from '@/modules/platform/ai-allowance';
import {
  QualifiedLead,
  VisitorConversation,
  VisitorRequest,
  VisitorSession,
  WidgetInstallation,
} from './models';
import {
  VisitorDenied,
  WidgetConflict,
  WidgetUnavailable,
  type InboxConversation,
  type InboxLead,
  type PublicBootstrap,
  type PublicMessage,
  type WidgetSettings,
  type WidgetSettingsInput,
} from './input';
import { originAllowed } from './origin';
import { createPublicKey, createVisitorToken, hashVisitorToken, visitorSessionTtlMs } from './tokens';
import {
  legacySalesAgentDefaults,
  salesAgentActions,
  type EmployeeConfiguration,
  type SalesAgentAction,
} from '@/modules/employees/input';
import type { ConversationTurn } from '@/modules/conversations/input';

function mapSalesEmployee(row: {
  name: string;
  instructions: string;
  knowledge: string;
  fallback: string;
  goal?: string;
  qualificationCriteria?: string;
  escalationRules?: string;
  allowedActions?: string[];
  status?: string;
  revision: number;
  updatedAt: Date;
}): EmployeeConfiguration {
  const allowed = (row.allowedActions ?? []).filter((action): action is SalesAgentAction =>
    (salesAgentActions as readonly string[]).includes(action),
  );
  return {
    name: row.name,
    instructions: row.instructions,
    knowledge: row.knowledge,
    fallback: row.fallback,
    goal: row.goal?.trim() ? row.goal : legacySalesAgentDefaults.goal,
    qualificationCriteria: row.qualificationCriteria?.trim()
      ? row.qualificationCriteria
      : legacySalesAgentDefaults.qualificationCriteria,
    escalationRules: row.escalationRules?.trim()
      ? row.escalationRules
      : legacySalesAgentDefaults.escalationRules,
    allowedActions: allowed.length ? allowed : [...legacySalesAgentDefaults.allowedActions],
    status: row.status === 'paused' ? 'paused' : 'active',
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function authorizeMember(
  organizationId: string,
  userId: string,
  permission: Permission = 'workspace:read',
) {
  await authorizeOrganizationAccess(organizationId, userId, permission);
}

function dto(
  row: {
    publicKey: string;
    enabled: boolean;
    allowedOrigins: string[];
    revision: number;
    updatedAt: Date;
  },
  employeeReady: boolean,
  aiAvailable: boolean,
): WidgetSettings {
  return {
    publicKey: row.publicKey,
    enabled: row.enabled,
    allowedOrigins: row.allowedOrigins,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
    employeeReady,
    aiAvailable,
  };
}

export async function readInstallation(
  organizationId: string,
  userId: string,
  aiAvailable: boolean,
): Promise<WidgetSettings | null> {
  await authorizeMember(organizationId, userId);
  const [row, employee] = await Promise.all([
    WidgetInstallation.findOne({ organizationId }).lean().exec(),
    SalesEmployee.findOne({ organizationId }).lean().exec(),
  ]);
  return row ? dto(row, !!employee, aiAvailable) : null;
}

export async function writeInstallation(
  organizationId: string,
  userId: string,
  input: WidgetSettingsInput,
) {
  await connectDb();
  try {
    await WidgetInstallation.db.transaction(async (session) => {
      await assertTenantState(organizationId, userId, 'organization:update', session);
      authorizeMembership(
        await Membership.findOne({ organizationId, userId }).session(session).exec(),
        userId,
        'organization:update',
      );
      const { revision, enabled, allowedOrigins } = input;
      if (enabled && allowedOrigins.length === 0)
        throw new WidgetUnavailable('Add at least one allowed website origin before enabling.');
      let resourceId: string;
      if (revision === 0) {
        const [row] = await WidgetInstallation.create(
          [
            {
              organizationId,
              publicKey: createPublicKey(),
              enabled,
              allowedOrigins,
              revision: 1,
            },
          ],
          { session },
        );
        resourceId = String(row._id);
      } else {
        const row = await WidgetInstallation.findOneAndUpdate(
          { organizationId, revision },
          { $set: { enabled, allowedOrigins }, $inc: { revision: 1 } },
          { session, returnDocument: 'after', runValidators: true },
        ).exec();
        if (!row) throw new WidgetConflict();
        resourceId = String(row._id);
      }
      await AuditEvent.create(
        [
          {
            organizationId,
            actorId: userId,
            action: revision === 0 ? 'widget.configured' : 'widget.configuration.updated',
            resourceId,
          },
        ],
        { session },
      );
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000)
      throw new WidgetConflict();
    throw error;
  }
}

async function installationForKey(publicKey: string) {
  await connectDb();
  const installation = await WidgetInstallation.findOne({ publicKey }).lean().exec();
  if (!installation || !installation.enabled) throw new VisitorDenied();
  return installation;
}

export async function isOriginAllowedForKey(publicKey: string, origin: string | null) {
  try {
    const installation = await installationForKey(publicKey);
    return originAllowed(installation.allowedOrigins, origin);
  } catch {
    return false;
  }
}

export async function bootstrapPublic(
  publicKey: string,
  origin: string | null,
): Promise<PublicBootstrap> {
  const installation = await installationForKey(publicKey);
  if (!originAllowed(installation.allowedOrigins, origin)) throw new VisitorDenied();
  const organizationId = String(installation.organizationId);
  const org = await assertOrganizationOperational(organizationId);
  if (org.readOnly) throw new WidgetUnavailable();
  const employee = await SalesEmployee.findOne({ organizationId }).lean().exec();
  if (!employee) throw new WidgetUnavailable('This business has not finished chat setup.');
  let available = false;
  try {
    const { providerConfiguration } = await import('@/modules/conversations/provider');
    providerConfiguration();
    available = true;
  } catch {
    available = false;
  }
  const organization = await Organization.findById(organizationId).lean().exec();
  return {
    organizationName: organization?.name ?? org.name,
    employeeName: employee.name,
    enabled: true,
    available,
  };
}

export async function startVisitorSession(publicKey: string, origin: string | null) {
  const installation = await installationForKey(publicKey);
  if (!originAllowed(installation.allowedOrigins, origin)) throw new VisitorDenied();
  const organizationId = String(installation.organizationId);
  const org = await assertOrganizationOperational(organizationId);
  if (org.readOnly) throw new WidgetUnavailable();
  const employee = await SalesEmployee.findOne({ organizationId }).lean().exec();
  if (!employee) throw new WidgetUnavailable('This business has not finished chat setup.');
  const { token, tokenHash } = createVisitorToken();
  const conversationId = new Types.ObjectId();
  const sessionId = new Types.ObjectId();
  const expiresAt = new Date(Date.now() + visitorSessionTtlMs);
  await VisitorSession.db.transaction(async (session) => {
    await assertOrganizationOperational(organizationId, session);
    await VisitorConversation.create(
      [
        {
          _id: conversationId,
          organizationId,
          visitorSessionId: sessionId,
          employeeRevision: employee.revision,
          origin: origin!,
          status: 'open',
          messages: [],
        },
      ],
      { session },
    );
    await VisitorSession.create(
      [
        {
          _id: sessionId,
          organizationId,
          tokenHash,
          origin: origin!,
          conversationId,
          expiresAt,
        },
      ],
      { session },
    );
  });
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    organizationName: org.name,
    employeeName: employee.name,
  };
}

async function liveVisitor(token: string, origin: string | null) {
  await connectDb();
  const session = await VisitorSession.findOne({ tokenHash: hashVisitorToken(token) }).exec();
  if (!session || session.expiresAt.getTime() <= Date.now()) throw new VisitorDenied();
  if (session.origin !== origin || !originAllowed([session.origin], origin))
    throw new VisitorDenied();
  await assertOrganizationOperational(String(session.organizationId));
  const installation = await WidgetInstallation.findOne({
    organizationId: session.organizationId,
    enabled: true,
  }).exec();
  if (!installation || !originAllowed(installation.allowedOrigins, origin))
    throw new VisitorDenied();
  return session;
}

export async function listVisitorMessages(
  token: string,
  origin: string | null,
): Promise<PublicMessage[]> {
  const session = await liveVisitor(token, origin);
  const conversation = await VisitorConversation.findOne({
    _id: session.conversationId,
    organizationId: session.organizationId,
  })
    .lean()
    .exec();
  if (!conversation) throw new VisitorDenied();
  return conversation.messages
    .filter((message) => message.status !== 'pending' && message.status !== 'failed')
    .filter(
      (message) =>
        message.role === 'visitor' ||
        message.role === 'human' ||
        message.status === 'completed',
    )
    .map((message) => ({
      role: (message.role === 'human' ? 'employee' : message.role) as 'visitor' | 'employee',
      content: message.content,
      grounded: message.grounded,
      createdAt: new Date(message.createdAt).toISOString(),
    }));
}

export async function reserveVisitorMessage(
  token: string,
  origin: string | null,
  input: { message: string; requestId: string },
) {
  const session = await liveVisitor(token, origin);
  const organizationId = String(session.organizationId);
  const existing = await VisitorConversation.findOne({
    _id: session.conversationId,
    organizationId,
  })
    .lean()
    .exec();
  if (!existing) throw new VisitorDenied();
  if ((existing.controlMode ?? 'ai') === 'human')
    throw new WidgetUnavailable(
      'A team member has taken over this conversation. Please wait for their reply.',
    );
  const employeeRow = await SalesEmployee.findOne({ organizationId }).lean().exec();
  if (!employeeRow) throw new WidgetUnavailable('This business has not finished chat setup.');
  if (employeeRow.status === 'paused')
    throw new WidgetUnavailable('The sales employee is paused. A teammate will follow up shortly.');
  const employee = mapSalesEmployee(employeeRow);
  const history: ConversationTurn[] = (existing.messages ?? [])
    .filter((message) => message.status !== 'pending' && message.status !== 'failed')
    .filter((message) => message.content)
    .map((message) => ({
      role: message.role as ConversationTurn['role'],
      content: message.content,
    }));
  const { providerConfiguration, buildPrompt } = await import('@/modules/conversations/provider');
  const config = providerConfiguration();
  const prompt = buildPrompt(employee, input.message, history);
  const day = new Date().toISOString().slice(0, 10);
  const result = await VisitorConversation.db.transaction(async (tx) => {
    await assertOrganizationOperational(organizationId, tx);
    const installation = await WidgetInstallation.findOne({
      organizationId,
      enabled: true,
    })
      .session(tx)
      .exec();
    if (!installation || !originAllowed(installation.allowedOrigins, origin))
      throw new VisitorDenied();
    const live = await VisitorConversation.findOne({
      _id: session.conversationId,
      organizationId,
      controlMode: { $ne: 'human' },
    })
      .session(tx)
      .exec();
    if (!live)
      throw new WidgetUnavailable(
        'A team member has taken over this conversation. Please wait for their reply.',
      );
    try {
      await VisitorRequest.create(
        [
          {
            organizationId,
            requestId: input.requestId,
            conversationId: session.conversationId,
            kind: 'message',
          },
        ],
        { session: tx },
      );
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 11000)
        throw new WidgetUnavailable('This message was already submitted.');
      throw error;
    }
    const allowance = await resolvePublicAIAllowance(organizationId, config.model, tx);
    const reservedCost =
      allowance.inputRate === null || allowance.outputRate === null
        ? null
        : Math.ceil(
            (prompt.reservedTokens * Math.max(allowance.inputRate, allowance.outputRate)) /
              1000000,
          );
    await DailyAIUsage.updateOne(
      { organizationId, day },
      { $setOnInsert: { requests: 0, committedTokens: 0, committedCostMicroUsd: 0 } },
      { upsert: true, session: tx },
    );
    const budget = await DailyAIUsage.updateOne(
      {
        organizationId,
        day,
        requests: { $lt: allowance.requests },
        committedTokens: { $lte: allowance.tokens - prompt.reservedTokens },
        ...(allowance.costLimitMicroUsd !== null
          ? { committedCostMicroUsd: { $lte: allowance.costLimitMicroUsd - (reservedCost ?? 0) } }
          : {}),
      },
      {
        $inc: {
          requests: 1,
          committedTokens: prompt.reservedTokens,
          committedCostMicroUsd: reservedCost ?? 0,
        },
      },
      { session: tx },
    );
    if (budget.modifiedCount !== 1) throw new UsageExceeded();
    const visitorMessageId = new Types.ObjectId();
    const employeeMessageId = new Types.ObjectId();
    const updated = await VisitorConversation.findOneAndUpdate(
      { _id: session.conversationId, organizationId, controlMode: { $ne: 'human' } },
      {
        $push: {
          messages: {
            $each: [
              {
                _id: visitorMessageId,
                role: 'visitor',
                content: input.message,
                requestId: `${input.requestId}:visitor`,
                status: 'completed',
                createdAt: new Date(),
              },
              {
                _id: employeeMessageId,
                role: 'employee',
                content: '',
                requestId: input.requestId,
                status: 'pending',
                reservedTokens: prompt.reservedTokens,
                reservedCostMicroUsd: reservedCost,
                inputRate: allowance.inputRate,
                outputRate: allowance.outputRate,
                model: config.model,
                day,
                createdAt: new Date(),
              },
            ],
          },
        },
      },
      { session: tx, returnDocument: 'after' },
    ).exec();
    if (!updated)
      throw new WidgetUnavailable(
        'A team member has taken over this conversation. Please wait for their reply.',
      );
    return {
      organizationId,
      conversationId: String(session.conversationId),
      employeeMessageId: String(employeeMessageId),
      day,
      history,
    };
  });
  return { ...result, employee, question: input.message };
}

export async function completeVisitorMessage(
  organizationId: string,
  conversationId: string,
  employeeMessageId: string,
  token: string,
  origin: string | null,
  reply: {
    answer: string;
    grounded: boolean;
    action: SalesAgentAction;
    qualificationNote: string;
    inputTokens: number;
    outputTokens: number;
  },
) {
  const session = await liveVisitor(token, origin);
  if (String(session.organizationId) !== organizationId) throw new VisitorDenied();
  await VisitorConversation.db.transaction(async (tx) => {
    await assertOrganizationOperational(organizationId, tx);
    const installation = await WidgetInstallation.findOne({
      organizationId,
      enabled: true,
    })
      .session(tx)
      .exec();
    if (!installation || !originAllowed(installation.allowedOrigins, origin))
      throw new VisitorDenied();
    const conversation = await VisitorConversation.findOne({
      _id: conversationId,
      organizationId,
      visitorSessionId: session._id,
      controlMode: { $ne: 'human' },
    })
      .session(tx)
      .exec();
    if (!conversation)
      throw new WidgetUnavailable(
        'A team member has taken over this conversation. Please wait for their reply.',
      );
    const pending = conversation.messages.id(employeeMessageId);
    if (!pending || pending.role !== 'employee' || pending.status !== 'pending')
      throw new WidgetUnavailable();
    pending.content = reply.answer;
    pending.grounded = reply.grounded;
    pending.inputTokens = reply.inputTokens;
    pending.outputTokens = reply.outputTokens;
    pending.status = 'completed';
    const cost =
      typeof pending.inputRate === 'number' && typeof pending.outputRate === 'number'
        ? Math.ceil(
            (reply.inputTokens * pending.inputRate + reply.outputTokens * pending.outputRate) /
              1000000,
          )
        : null;
    pending.costMicroUsd = cost;
    if (reply.action === 'escalate_human') conversation.needsHuman = true;
    if (reply.action === 'request_contact') conversation.requestContact = true;
    if (reply.action === 'record_qualification' && reply.qualificationNote) {
      const prior = conversation.qualificationNotes?.trim()
        ? `${conversation.qualificationNotes.trim()}\n`
        : '';
      conversation.qualificationNotes = `${prior}${reply.qualificationNote}`.slice(0, 8000);
    }
    await conversation.save({ session: tx });
    const { executeSalesAgentAction } = await import('@/modules/agent/tools');
    await executeSalesAgentAction({
      organizationId,
      conversationId,
      action: reply.action,
      qualificationNote: reply.qualificationNote,
      actorId: 'agent:sales-employee',
      session: tx,
    });
    await resolvePublicAIAllowance(organizationId, pending.model ?? 'synthetic-model', tx);
    const refund = Math.max(0, (pending.reservedTokens ?? 0) - reply.inputTokens - reply.outputTokens);
    await DailyAIUsage.updateOne(
      { organizationId, day: pending.day },
      {
        $inc: {
          committedTokens: -refund,
          committedCostMicroUsd: -Math.max(0, (pending.reservedCostMicroUsd ?? 0) - (cost ?? 0)),
        },
      },
      { session: tx },
    );
  });
}

export async function failVisitorMessage(
  organizationId: string,
  conversationId: string,
  employeeMessageId: string,
  token: string,
  origin: string | null,
) {
  try {
    const session = await liveVisitor(token, origin);
    if (String(session.organizationId) !== organizationId) return;
    await VisitorConversation.updateOne(
      {
        _id: conversationId,
        organizationId,
        visitorSessionId: session._id,
        messages: { $elemMatch: { _id: employeeMessageId, status: 'pending' } },
      },
      { $set: { 'messages.$.status': 'failed' } },
    );
  } catch {
    /* Revoked or expired sessions leave the reservation pending. */
  }
}

export async function captureLead(
  token: string,
  origin: string | null,
  input: {
    name: string;
    email: string;
    phone?: string;
    consent: true;
    requestId: string;
  },
) {
  const session = await liveVisitor(token, origin);
  const organizationId = String(session.organizationId);
  await QualifiedLead.db.transaction(async (tx) => {
    await assertOrganizationOperational(organizationId, tx);
    const installation = await WidgetInstallation.findOne({
      organizationId,
      enabled: true,
    })
      .session(tx)
      .exec();
    if (!installation || !originAllowed(installation.allowedOrigins, origin))
      throw new VisitorDenied();
    try {
      await VisitorRequest.create(
        [
          {
            organizationId,
            requestId: input.requestId,
            conversationId: session.conversationId,
            kind: 'lead',
          },
        ],
        { session: tx },
      );
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 11000)
        throw new WidgetUnavailable('This contact request was already submitted.');
      throw error;
    }
    const existing = await QualifiedLead.findOne({
      organizationId,
      conversationId: session.conversationId,
    })
      .session(tx)
      .exec();
    if (existing) throw new WidgetUnavailable('Contact details were already shared for this chat.');
    const [lead] = await QualifiedLead.create(
      [
        {
          organizationId,
          conversationId: session.conversationId,
          visitorSessionId: session._id,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          consentAt: new Date(),
          requestId: input.requestId,
        },
      ],
      { session: tx },
    );
    await VisitorConversation.updateOne(
      { _id: session.conversationId, organizationId },
      { $set: { status: 'lead_captured', leadId: lead._id } },
      { session: tx },
    );
    const owner = await Membership.findOne({
      organizationId,
      role: 'owner',
      status: 'active',
    })
      .session(tx)
      .exec();
    const { upsertContactFromLead } = await import('@/modules/crm/repository');
    await upsertContactFromLead(
      organizationId,
      {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        leadId: lead._id,
        conversationId: session.conversationId,
      },
      owner?.userId ?? `visitor:${String(session._id)}`,
      tx,
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: `visitor:${String(session._id)}`,
          action: 'lead.captured',
          resourceId: String(lead._id),
        },
      ],
      { session: tx },
    );
  });
}

export async function listInbox(
  organizationId: string,
  userId: string,
): Promise<{ leads: InboxLead[]; conversations: InboxConversation[] }> {
  await authorizeMember(organizationId, userId);
  const [leads, conversations] = await Promise.all([
    QualifiedLead.find({ organizationId }).sort({ createdAt: -1, _id: -1 }).limit(25).lean().exec(),
    VisitorConversation.find({ organizationId })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(25)
      .lean()
      .exec(),
  ]);
  const byId = new Map(conversations.map((row) => [String(row._id), row]));
  return {
    leads: leads.map((lead) => {
      const conversation = byId.get(String(lead.conversationId));
      const messages = conversation?.messages ?? [];
      const visitor = [...messages].reverse().find((message) => message.role === 'visitor');
      const employee = [...messages]
        .reverse()
        .find(
          (message) =>
            (message.role === 'employee' || message.role === 'human') &&
            message.status === 'completed',
        );
      return {
        id: String(lead._id),
        name: lead.name,
        email: lead.email,
        phone: lead.phone ?? null,
        consentAt: lead.consentAt.toISOString(),
        createdAt: lead.createdAt.toISOString(),
        conversationId: String(lead.conversationId),
        latestVisitorMessage: visitor?.content ?? null,
        latestEmployeeMessage: employee?.content ?? null,
        messageCount: messages.filter((message) => message.status !== 'pending').length,
      };
    }),
    conversations: conversations.map((row) => {
      const messages = row.messages ?? [];
      const visitor = [...messages].reverse().find((message) => message.role === 'visitor');
      const employee = [...messages]
        .reverse()
        .find(
          (message) =>
            (message.role === 'employee' || message.role === 'human') &&
            message.status === 'completed',
        );
      return {
        id: String(row._id),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        messageCount: messages.filter((message) => message.status !== 'failed').length,
        hasLead: !!row.leadId,
        controlMode: (row.controlMode as 'ai' | 'human' | undefined) ?? 'ai',
        needsHuman: row.needsHuman === true,
        requestContact: row.requestContact === true,
        assigneeId: row.assigneeId ?? null,
        latestVisitorMessage: visitor?.content ?? null,
        latestEmployeeMessage: employee?.content ?? null,
      };
    }),
  };
}

export async function getConversationDetail(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  await authorizeMember(organizationId, userId);
  if (!Types.ObjectId.isValid(conversationId)) throw new VisitorDenied();
  const row = await VisitorConversation.findOne({ _id: conversationId, organizationId })
    .lean()
    .exec();
  if (!row) return null;

  const { Contact, Opportunity, Activity } = await import('@/modules/crm/models');
  const { Quotation } = await import('@/modules/quotations/models');
  const { Appointment } = await import('@/modules/appointments/models');
  const { FollowUpJob } = await import('@/modules/jobs/models');
  const { Membership } = await import('@/modules/organizations/models');

  const opportunity = await Opportunity.findOne({ organizationId, conversationId })
    .lean()
    .exec();
  let resolvedContact = opportunity
    ? await Contact.findOne({ _id: opportunity.contactId, organizationId }).lean().exec()
    : null;
  if (!resolvedContact && row.leadId) {
    const lead = await QualifiedLead.findOne({ _id: row.leadId, organizationId }).lean().exec();
    if (lead?.email) {
      resolvedContact = await Contact.findOne({
        organizationId,
        email: lead.email.toLowerCase(),
      })
        .lean()
        .exec();
    }
  }

  const opportunityId = opportunity?._id;
  const [quotations, appointments, followUps, activities, members] = await Promise.all([
    opportunityId
      ? Quotation.find({ organizationId, opportunityId })
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean()
          .exec()
      : Promise.resolve([]),
    opportunityId
      ? Appointment.find({ organizationId, opportunityId })
          .sort({ requestedStartAt: -1 })
          .limit(5)
          .lean()
          .exec()
      : Promise.resolve([]),
    opportunityId
      ? FollowUpJob.find({ organizationId, opportunityId })
          .sort({ scheduledAt: -1 })
          .limit(5)
          .lean()
          .exec()
      : Promise.resolve([]),
    opportunityId
      ? Activity.find({ organizationId, opportunityId })
          .sort({ createdAt: -1 })
          .limit(8)
          .lean()
          .exec()
      : Promise.resolve([]),
    Membership.find({ organizationId, status: 'active' }).lean().exec(),
  ]);

  const memberIds = members.map((member) => member.userId);
  const db = Membership.db;
  const { ObjectId } = await import('mongodb');
  const userIdFilter = memberIds.flatMap((id) =>
    ObjectId.isValid(id) ? [new ObjectId(id), id] : [id],
  );
  const users = memberIds.length
    ? await db
        .collection('user')
        .find({ _id: { $in: userIdFilter } } as import('mongodb').Filter<import('mongodb').Document>, {
          projection: { _id: 1, name: 1, email: 1 },
        })
        .toArray()
    : [];
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  return {
    id: String(row._id),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    origin: row.origin,
    status: row.status,
    controlMode: (row.controlMode as 'ai' | 'human' | undefined) ?? 'ai',
    needsHuman: row.needsHuman === true,
    requestContact: row.requestContact === true,
    assigneeId: row.assigneeId ?? null,
    takenOverAt: row.takenOverAt ? row.takenOverAt.toISOString() : null,
    qualificationNotes: row.qualificationNotes ?? '',
    hasLead: !!row.leadId,
    leadId: row.leadId ? String(row.leadId) : null,
    messages: (row.messages ?? [])
      .filter((message) => message.status !== 'pending' && message.status !== 'failed')
      .map((message) => ({
        id: String(message._id),
        role: message.role as 'visitor' | 'employee' | 'human',
        content: message.content,
        grounded: typeof message.grounded === 'boolean' ? message.grounded : null,
        status: message.status ?? null,
        actorId: message.actorId ?? null,
        createdAt: new Date(message.createdAt).toISOString(),
      })),
    sales: {
      contact: resolvedContact
        ? {
            id: String(resolvedContact._id),
            name: resolvedContact.name,
            email: resolvedContact.email,
            phone: resolvedContact.phone ?? null,
          }
        : null,
      opportunity: opportunity
        ? {
            id: String(opportunity._id),
            title: opportunity.title,
            stageKey: opportunity.stageKey,
            status: opportunity.status,
          }
        : null,
      quotations: quotations.map((quote) => ({
        id: String(quote._id),
        title: quote.title,
        status: quote.status,
      })),
      appointments: appointments.map((appt) => ({
        id: String(appt._id),
        title: appt.title,
        status: appt.status,
        requestedStartAt: appt.requestedStartAt.toISOString(),
      })),
      followUps: followUps.map((job) => ({
        id: String(job._id),
        status: job.status,
        scheduledAt: job.scheduledAt.toISOString(),
        reason: job.reason,
      })),
      activities: activities.map((activity) => ({
        id: String(activity._id),
        type: activity.type,
        body: activity.body,
        createdAt: activity.createdAt.toISOString(),
      })),
    },
    teamMembers: members.map((member) => {
      const user = userMap.get(member.userId);
      return {
        userId: member.userId,
        role: member.role,
        name: typeof user?.name === 'string' ? user.name : null,
        email: typeof user?.email === 'string' ? user.email : null,
      };
    }),
  };
}

export async function assignConversation(
  organizationId: string,
  conversationId: string,
  actorId: string,
  assigneeId: string,
) {
  await authorizeCollaborator(organizationId, actorId);
  return VisitorConversation.db.transaction(async (session) => {
    await assertTenantState(organizationId, actorId, 'workspace:read', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId: actorId }).session(session).exec(),
      actorId,
      'workspace:read',
    );
    const assignee = await Membership.findOne({
      organizationId,
      userId: assigneeId,
      status: 'active',
    })
      .session(session)
      .exec();
    if (!assignee) throw new WidgetUnavailable('Choose an active team member.');
    const row = await VisitorConversation.findOneAndUpdate(
      { _id: conversationId, organizationId },
      {
        $set: {
          assigneeId,
          controlMode: 'human',
          needsHuman: false,
          takenOverAt: new Date(),
        },
      },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new WidgetUnavailable('Conversation unavailable.');
    await VisitorConversation.updateOne(
      { _id: conversationId, organizationId },
      {
        $set: {
          'messages.$[pending].status': 'failed',
        },
      },
      {
        session,
        arrayFilters: [{ 'pending.status': 'pending', 'pending.role': 'employee' }],
      },
    ).exec();
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId,
          action: 'conversation.assigned',
          resourceId: conversationId,
        },
      ],
      { session },
    );
    return { assigneeId, controlMode: 'human' as const };
  });
}

/** Membership required — support mode cannot take over or reply. */
async function authorizeCollaborator(organizationId: string, userId: string) {
  await connectDb();
  await assertTenantState(organizationId, userId, 'workspace:read');
  authorizeMembership(
    await Membership.findOne({ organizationId, userId }).exec(),
    userId,
    'workspace:read',
  );
}

export async function takeOverConversation(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  await authorizeCollaborator(organizationId, userId);
  return VisitorConversation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'workspace:read', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'workspace:read',
    );
    const now = new Date();
    const row = await VisitorConversation.findOneAndUpdate(
      { _id: conversationId, organizationId },
      {
        $set: {
          controlMode: 'human',
          assigneeId: userId,
          takenOverAt: now,
          needsHuman: false,
        },
      },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new WidgetUnavailable('Conversation unavailable.');
    // Fail any in-flight AI pending messages so they cannot publish after takeover.
    await VisitorConversation.updateOne(
      { _id: conversationId, organizationId },
      { $set: { 'messages.$[pending].status': 'failed' } },
      {
        session,
        arrayFilters: [{ 'pending.role': 'employee', 'pending.status': 'pending' }],
      },
    );
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'conversation.taken_over',
          resourceId: conversationId,
        },
      ],
      { session },
    );
    return { controlMode: 'human' as const, assigneeId: userId };
  });
}

export async function resumeAiConversation(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  await authorizeCollaborator(organizationId, userId);
  return VisitorConversation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'workspace:read', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'workspace:read',
    );
    const row = await VisitorConversation.findOneAndUpdate(
      { _id: conversationId, organizationId, controlMode: 'human' },
      {
        $set: {
          controlMode: 'ai',
          assigneeId: null,
          takenOverAt: null,
        },
      },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new WidgetUnavailable('Conversation is not in human control.');
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'conversation.ai_resumed',
          resourceId: conversationId,
        },
      ],
      { session },
    );
    return { controlMode: 'ai' as const };
  });
}

export async function replyAsHuman(
  organizationId: string,
  conversationId: string,
  userId: string,
  content: string,
) {
  await authorizeCollaborator(organizationId, userId);
  return VisitorConversation.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'workspace:read', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'workspace:read',
    );
    const row = await VisitorConversation.findOne({
      _id: conversationId,
      organizationId,
      controlMode: 'human',
    })
      .session(session)
      .exec();
    if (!row) throw new WidgetUnavailable('Take over the conversation before sending a reply.');
    row.messages.push({
      role: 'human',
      content,
      status: 'completed',
      actorId: userId,
      createdAt: new Date(),
    } as never);
    row.needsHuman = false;
    await row.save({ session });
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: 'conversation.human_replied',
          resourceId: conversationId,
        },
      ],
      { session },
    );
    return { id: conversationId };
  });
}

export async function findForeignConversationAccess(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  await authorizeMember(organizationId, userId);
  return VisitorConversation.findOne({ _id: conversationId, organizationId }).lean().exec();
}
