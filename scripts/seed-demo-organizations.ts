// Local demo provisioning for testing the sales lifecycle.
// Two isolated organizations with employee, widget, inbox, CRM, quotes, appointments,
// and follow-ups. Super Admin is never a member (inspect via support mode).
// Never prints passwords, tokens, URIs, or visitor session secrets.
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { hashPassword } from 'better-auth/crypto';
import { getAuth } from '../src/server/auth';
import { authClient, connectDb } from '../src/server/db';
import { getEnv } from '../src/server/env';
import { SUPER_ADMIN_EMAIL, hasSuperAdminGrant } from '../src/modules/platform/repository';
import { findOrganization, insertOrganization } from '../src/modules/organizations/repository';
import {
  Organization,
  Membership,
  AuditEvent,
} from '../src/modules/organizations/models';
import { SalesEmployee } from '../src/modules/employees/models';
import { salesAgentActions } from '../src/modules/employees/input';
import {
  QualifiedLead,
  VisitorConversation,
  VisitorSession,
  WidgetInstallation,
} from '../src/modules/widget/models';
import { createPublicKey } from '../src/modules/widget/tokens';
import {
  Activity,
  Contact,
  Opportunity,
  Pipeline,
  defaultPipelineStages,
} from '../src/modules/crm/models';
import { Quotation } from '../src/modules/quotations/models';
import { Appointment } from '../src/modules/appointments/models';
import { FollowUpJob } from '../src/modules/jobs/models';

type DemoOrg = {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  currency: string;
  locale: string;
  timeZone: string;
  employee: {
    name: string;
    instructions: string;
    knowledge: string;
    fallback: string;
    goal: string;
    qualificationCriteria: string;
    escalationRules: string;
  };
  origin: string;
  conversations: Array<{
    visitorQuestion: string;
    employeeAnswer: string;
    lead?: { name: string; email: string; phone?: string };
    stage?: 'new' | 'qualified' | 'proposal' | 'won';
    quote?: { title: string; description: string; unitAmountMinor: number; status: 'draft' | 'approved' };
    appointment?: { title: string; daysAhead: number; status: 'requested' | 'confirmed' };
    followUp?: { reason: string; hoursAhead: number };
  }>;
};

const force = process.argv.includes('--force');

/** Stable local-only password written to .runtime/demo-org-owners.txt — never logged. */
const DEMO_OWNER_PASSWORD = 'RelayDemo-Test-2026!';

const demos: DemoOrg[] = [
  {
    name: 'Coastal Motors',
    slug: 'coastal-motors',
    ownerName: 'Coastal Owner',
    ownerEmail: 'coastal.owner@relay.demo',
    currency: 'KES',
    locale: 'en',
    timeZone: 'Africa/Nairobi',
    employee: {
      name: 'Coastal Sales Guide',
      instructions:
        'Greet website visitors, answer from approved inventory facts, and invite a showroom visit.',
      knowledge:
        'Coastal Motors sells certified pre-owned SUVs and saloons in Mombasa. Test drives are available Tuesday to Saturday 9am–5pm. Financing partners include Equity Bank and Absa. Warranty cover is 6 months or 10,000 km on certified stock. The Nyali showroom is on Links Road.',
      fallback: 'Please visit our Nyali showroom or call the sales desk for that detail.',
      goal: 'Qualify vehicle interest and book a showroom visit when the visitor is ready.',
      qualificationCriteria: 'Confirm vehicle type interest, budget range, and preferred visit day.',
      escalationRules: 'Escalate financing exceptions, trade-in disputes, and legal complaints to a human.',
    },
    origin: 'https://www.coastalmotors.example',
    conversations: [
      {
        visitorQuestion: 'Do you offer weekend test drives?',
        employeeAnswer:
          'Test drives are available Tuesday to Saturday 9am–5pm at our Nyali showroom on Links Road.',
        lead: {
          name: 'Amina Otieno',
          email: 'amina.otieno@example.com',
          phone: '+254712000101',
        },
        stage: 'qualified',
        appointment: { title: 'SUV test drive', daysAhead: 2, status: 'requested' },
        followUp: { reason: 'Confirm Saturday test-drive availability.', hoursAhead: 20 },
      },
      {
        visitorQuestion: 'Which banks partner on financing?',
        employeeAnswer:
          'Financing partners include Equity Bank and Absa for certified pre-owned vehicles.',
      },
      {
        visitorQuestion: 'What warranty comes with certified stock?',
        employeeAnswer: 'Warranty cover is 6 months or 10,000 km on certified stock.',
        lead: {
          name: 'James Kariuki',
          email: 'james.kariuki@example.com',
        },
        stage: 'proposal',
        quote: {
          title: 'Certified saloon package',
          description: 'Pre-owned saloon with 6-month warranty',
          unitAmountMinor: 185000000,
          status: 'draft',
        },
      },
    ],
  },
  {
    name: 'Greenfields Clinic',
    slug: 'greenfields-clinic',
    ownerName: 'Greenfields Owner',
    ownerEmail: 'greenfields.owner@relay.demo',
    currency: 'KES',
    locale: 'en',
    timeZone: 'Africa/Nairobi',
    employee: {
      name: 'Greenfields Concierge',
      instructions:
        'Help visitors book outpatient visits using only approved clinic facts. Never invent clinical advice.',
      knowledge:
        'Greenfields Clinic is a private outpatient clinic in Westlands, Nairobi. General consultations run Monday to Friday 8am–6pm and Saturday 9am–1pm. New patient registration takes about 15 minutes. Lab results for routine blood work are usually ready within 24 hours. Parking is free for the first two hours.',
      fallback: 'Please call reception so our clinical team can help with that question.',
      goal: 'Qualify outpatient visit intent and collect contact details for booking follow-up.',
      qualificationCriteria: 'Confirm visit reason category, preferred day, and contact details.',
      escalationRules: 'Escalate clinical advice requests, emergencies, and billing disputes to a human.',
    },
    origin: 'https://www.greenfieldsclinic.example',
    conversations: [
      {
        visitorQuestion: 'What are Saturday hours?',
        employeeAnswer: 'Saturday consultations run 9am–1pm at our Westlands clinic.',
        lead: {
          name: 'Faith Wanjiku',
          email: 'faith.wanjiku@example.com',
          phone: '+254722000202',
        },
        stage: 'qualified',
        appointment: { title: 'New patient consultation', daysAhead: 3, status: 'confirmed' },
      },
      {
        visitorQuestion: 'How long for routine lab results?',
        employeeAnswer: 'Lab results for routine blood work are usually ready within 24 hours.',
      },
      {
        visitorQuestion: 'Is parking available for new patients?',
        employeeAnswer: 'Parking is free for the first two hours for clinic visitors.',
        lead: {
          name: 'Daniel Mwangi',
          email: 'daniel.mwangi@example.com',
          phone: '+254733000303',
        },
        stage: 'proposal',
        quote: {
          title: 'Outpatient consultation package',
          description: 'General consultation and registration',
          unitAmountMinor: 450000,
          status: 'approved',
        },
        followUp: { reason: 'Share parking and registration instructions before visit.', hoursAhead: -2 },
      },
    ],
  },
];

function tokenHash() {
  return createHash('sha256').update(`demo_${randomBytes(24).toString('base64url')}`).digest('hex');
}

async function signIn(email: string, password: string) {
  const response = await getAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error('Authentication failed.');
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  const session = await getAuth().api.getSession({ headers: new Headers({ Cookie: cookie }) });
  if (!session) throw new Error('Persisted session verification failed.');
  return session.user;
}

/**
 * Better Auth email sign-in requires credential.accountId === user.id (string).
 * Raw password updates that leave a mismatched accountId look like “invalid password”.
 */
async function syncDemoOwnerPassword(userId: string, password: string) {
  const db = authClient().db(getEnv().MONGODB_DB);
  const passwordHash = await hashPassword(password);
  const account = await db.collection('account').findOne({
    providerId: 'credential',
    userId: { $in: [userId, new Types.ObjectId(userId)] },
  });
  const now = new Date();
  if (account) {
    await db.collection('account').updateOne(
      { _id: account._id, providerId: 'credential' },
      {
        $set: {
          password: passwordHash,
          userId,
          accountId: userId,
          updatedAt: now,
        },
      },
    );
  } else {
    await db.collection('account').insertOne({
      accountId: userId,
      providerId: 'credential',
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection('session').deleteMany({
    userId: { $in: [userId, new Types.ObjectId(userId)] },
  });
}

async function ensureDemoOwner(demo: DemoOrg, password: string) {
  const db = authClient().db(getEnv().MONGODB_DB);
  const existing = await db.collection('user').findOne({ email: demo.ownerEmail });
  if (existing) {
    const userId = String(existing._id);
    if (await hasSuperAdminGrant(db, userId))
      throw new Error('Demo owner unexpectedly has platform privileges.');
    await syncDemoOwnerPassword(userId, password);
    const verified = await getAuth().api.signInEmail({
      body: { email: demo.ownerEmail, password },
      asResponse: true,
    });
    if (!verified.ok) throw new Error(`Demo owner password sync failed for ${demo.slug}.`);
    return { id: userId, created: false };
  }
  const created = await getAuth().api.signUpEmail({
    body: { name: demo.ownerName, email: demo.ownerEmail, password },
  });
  if (await hasSuperAdminGrant(db, created.user.id))
    throw new Error('Demo owner unexpectedly has platform privileges.');
  // Normalize accountId/userId to strings Better Auth expects on sign-in.
  await syncDemoOwnerPassword(created.user.id, password);
  return { id: created.user.id, created: true };
}

async function isolateFromOperator(organizationId: string, ownerId: string, operatorId: string) {
  const orgObjectId = new Types.ObjectId(organizationId);
  await Membership.findOneAndUpdate(
    { organizationId: orgObjectId, userId: ownerId },
    { $set: { role: 'owner', status: 'active' } },
    { upsert: true, runValidators: true },
  ).exec();
  await Membership.updateMany(
    { organizationId: orgObjectId, userId: operatorId },
    { $set: { status: 'revoked' } },
  ).exec();
  await AuditEvent.create({
    organizationId: orgObjectId,
    actorId: operatorId,
    action: 'demo.membership.isolated',
    resourceId: organizationId,
  });
}

async function ensureOrg(ownerId: string, operatorId: string, demo: DemoOrg) {
  const existing = await findOrganization(demo.slug);
  if (existing) {
    if (!existing.status) {
      await Organization.updateOne(
        { _id: existing._id },
        { $set: { status: 'active', statusChangedAt: new Date() } },
      );
    }
    await isolateFromOperator(String(existing._id), ownerId, operatorId);
    return { id: String(existing._id), created: false };
  }
  await insertOrganization(ownerId, {
    name: demo.name,
    slug: demo.slug,
    currency: demo.currency,
    locale: demo.locale,
    timeZone: demo.timeZone,
  });
  const created = await findOrganization(demo.slug);
  if (!created) throw new Error(`Organization ${demo.slug} was not persisted.`);
  await isolateFromOperator(String(created._id), ownerId, operatorId);
  return { id: String(created._id), created: true };
}

async function ensurePipeline(organizationId: Types.ObjectId) {
  const existing = await Pipeline.findOne({ organizationId, isDefault: true }).exec();
  if (existing) return existing;
  const [created] = await Pipeline.create([
    {
      organizationId,
      name: 'Sales pipeline',
      stages: defaultPipelineStages,
      isDefault: true,
    },
  ]);
  return created;
}

async function clearDemoCommercialData(organizationId: Types.ObjectId) {
  await Promise.all([
    Quotation.deleteMany({ organizationId }),
    Appointment.deleteMany({ organizationId }),
    FollowUpJob.deleteMany({ organizationId }),
    Opportunity.deleteMany({ organizationId }),
    Activity.deleteMany({ organizationId }),
    Contact.deleteMany({ organizationId }),
    VisitorConversation.deleteMany({ organizationId }),
    VisitorSession.deleteMany({ organizationId }),
    QualifiedLead.deleteMany({ organizationId }),
  ]);
}

async function seedOrgData(organizationId: string, userId: string, demo: DemoOrg) {
  const orgObjectId = new Types.ObjectId(organizationId);
  const employeeFields = {
    ...demo.employee,
    allowedActions: [...salesAgentActions],
    status: 'active' as const,
  };

  let employee = await SalesEmployee.findOne({ organizationId: orgObjectId }).exec();
  if (!employee) {
    [employee] = await SalesEmployee.create([
      {
        organizationId: orgObjectId,
        ...employeeFields,
        revision: 1,
      },
    ]);
  } else {
    employee.set(employeeFields);
    await employee.save();
  }

  let widget = await WidgetInstallation.findOne({ organizationId: orgObjectId }).exec();
  if (!widget) {
    [widget] = await WidgetInstallation.create([
      {
        organizationId: orgObjectId,
        publicKey: createPublicKey(),
        enabled: true,
        allowedOrigins: [demo.origin],
        revision: 1,
      },
    ]);
    await AuditEvent.create({
      organizationId: orgObjectId,
      actorId: userId,
      action: 'widget.settings.updated',
      resourceId: String(widget._id),
    });
  } else if (!widget.enabled || !widget.allowedOrigins.includes(demo.origin)) {
    widget.enabled = true;
    if (!widget.allowedOrigins.includes(demo.origin)) widget.allowedOrigins.push(demo.origin);
    await widget.save();
  }

  const existingConversations = await VisitorConversation.countDocuments({
    organizationId: orgObjectId,
  });
  if (force && existingConversations > 0) {
    await clearDemoCommercialData(orgObjectId);
  }

  const conversationsAfterClear = await VisitorConversation.countDocuments({
    organizationId: orgObjectId,
  });
  const pipeline = await ensurePipeline(orgObjectId);

  let leads = 0;
  let opportunities = 0;
  let quotations = 0;
  let appointments = 0;
  let followUps = 0;
  let seededFresh = conversationsAfterClear === 0;

  if (conversationsAfterClear === 0) {
    for (const [index, row] of demo.conversations.entries()) {
      const conversationId = new Types.ObjectId();
      const sessionId = new Types.ObjectId();
      const hoursAgo = (index + 1) * 5;
      const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      const updatedAt = new Date(createdAt.getTime() + 4 * 60 * 1000);
      let leadId: Types.ObjectId | null = null;
      let contactId: Types.ObjectId | null = null;

      if (row.lead) {
        leadId = new Types.ObjectId();
        await QualifiedLead.create({
          _id: leadId,
          organizationId: orgObjectId,
          conversationId,
          visitorSessionId: sessionId,
          name: row.lead.name,
          email: row.lead.email,
          phone: row.lead.phone ?? null,
          consentAt: updatedAt,
          requestId: `demo-lead-${demo.slug}-${index}`,
          createdAt: updatedAt,
        });
        leads += 1;

        const [contact] = await Contact.create([
          {
            organizationId: orgObjectId,
            name: row.lead.name,
            email: row.lead.email.toLowerCase(),
            phone: row.lead.phone ?? null,
            source: 'website_widget',
            ownerId: userId,
          },
        ]);
        contactId = contact._id as Types.ObjectId;

        const stageKey = row.stage ?? 'qualified';
        const [opportunity] = await Opportunity.create([
          {
            organizationId: orgObjectId,
            contactId,
            pipelineId: pipeline._id,
            stageKey,
            title: `${row.lead.name} · website inquiry`,
            ownerId: userId,
            status: stageKey === 'won' ? 'won' : 'open',
            conversationId,
            leadId,
          },
        ]);
        opportunities += 1;

        await Activity.create({
          organizationId: orgObjectId,
          contactId,
          opportunityId: opportunity._id,
          conversationId,
          type: 'lead_captured',
          body: `Demo lead captured for ${row.lead.name}.`,
          actorId: userId,
        });

        if (row.quote) {
          await Quotation.create({
            organizationId: orgObjectId,
            opportunityId: opportunity._id,
            contactId,
            currency: demo.currency,
            status: row.quote.status,
            title: row.quote.title,
            lines: [
              {
                description: row.quote.description,
                quantity: 1,
                unitAmountMinor: row.quote.unitAmountMinor,
              },
            ],
            notes: 'Seeded demo quotation for local testing.',
            createdBy: userId,
            approvedBy: row.quote.status === 'approved' ? userId : null,
            approvedAt: row.quote.status === 'approved' ? updatedAt : null,
          });
          quotations += 1;
        }

        if (row.appointment) {
          await Appointment.create({
            organizationId: orgObjectId,
            opportunityId: opportunity._id,
            contactId,
            conversationId,
            status: row.appointment.status,
            title: row.appointment.title,
            requestedStartAt: new Date(
              Date.now() + row.appointment.daysAhead * 24 * 60 * 60 * 1000,
            ),
            durationMinutes: 30,
            notes: 'Seeded demo appointment. Calendar sync is not configured.',
            timeZone: demo.timeZone,
            createdBy: userId,
            confirmedBy: row.appointment.status === 'confirmed' ? userId : null,
            confirmedAt: row.appointment.status === 'confirmed' ? updatedAt : null,
          });
          appointments += 1;
        }

        if (row.followUp) {
          await FollowUpJob.create({
            organizationId: orgObjectId,
            contactId,
            opportunityId: opportunity._id,
            conversationId,
            channel: 'in_app',
            scheduledAt: new Date(Date.now() + row.followUp.hoursAhead * 60 * 60 * 1000),
            status: 'pending',
            reason: row.followUp.reason,
            idempotencyKey: `demo-followup:${demo.slug}:${index}`,
            createdBy: userId,
          });
          followUps += 1;
        }
      }

      await VisitorConversation.create({
        _id: conversationId,
        organizationId: orgObjectId,
        visitorSessionId: sessionId,
        employeeRevision: employee.revision,
        origin: demo.origin,
        status: leadId ? 'lead_captured' : 'open',
        leadId,
        controlMode: 'ai',
        needsHuman: false,
        requestContact: false,
        messages: [
          {
            role: 'visitor',
            content: row.visitorQuestion,
            createdAt,
          },
          {
            role: 'employee',
            content: row.employeeAnswer,
            grounded: true,
            status: 'completed',
            createdAt: new Date(createdAt.getTime() + 90 * 1000),
          },
        ],
        createdAt,
        updatedAt,
      });

      await VisitorSession.create({
        _id: sessionId,
        organizationId: orgObjectId,
        tokenHash: tokenHash(),
        origin: demo.origin,
        conversationId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt,
      });
    }

    await AuditEvent.create({
      organizationId: orgObjectId,
      actorId: userId,
      action: 'demo.lifecycle.seeded',
      resourceId: organizationId,
    });
  } else {
    leads = await QualifiedLead.countDocuments({ organizationId: orgObjectId });
    opportunities = await Opportunity.countDocuments({ organizationId: orgObjectId });
    quotations = await Quotation.countDocuments({ organizationId: orgObjectId });
    appointments = await Appointment.countDocuments({ organizationId: orgObjectId });
    followUps = await FollowUpJob.countDocuments({ organizationId: orgObjectId });
  }

  return {
    employee: true,
    widget: true,
    conversations: await VisitorConversation.countDocuments({ organizationId: orgObjectId }),
    leads,
    opportunities,
    quotations,
    appointments,
    followUps,
    seededFresh,
    force,
  };
}

let stage = 'configuration';
async function main() {
  const env = getEnv();
  const db = authClient().db(env.MONGODB_DB);
  stage = 'operator authentication';
  const password = (await readFile('.runtime/super-admin-password.txt', 'utf8')).trim();
  const actor = await signIn(SUPER_ADMIN_EMAIL, password);
  if (!(await hasSuperAdminGrant(db, actor.id)))
    throw new Error('Operator platform grant unavailable.');

  stage = 'database connection';
  await connectDb();
  await Promise.all([
    Organization.createIndexes(),
    Membership.createIndexes(),
    AuditEvent.createIndexes(),
    SalesEmployee.createIndexes(),
    WidgetInstallation.createIndexes(),
    VisitorSession.createIndexes(),
    VisitorConversation.createIndexes(),
    QualifiedLead.createIndexes(),
    Contact.createIndexes(),
    Pipeline.createIndexes(),
    Opportunity.createIndexes(),
    Activity.createIndexes(),
    Quotation.createIndexes(),
    Appointment.createIndexes(),
    FollowUpJob.createIndexes(),
  ]);

  const ownerLines: string[] = [
    '# Demo org owners — local only. Not printed to the terminal.',
    `# Generated ${new Date().toISOString()}`,
    `# Password for all demo owners below: stored only in this file`,
  ];
  const summary: Array<Record<string, unknown>> = [];
  for (const demo of demos) {
    stage = `owner ${demo.slug}`;
    const owner = await ensureDemoOwner(demo, DEMO_OWNER_PASSWORD);
    ownerLines.push(`${demo.ownerEmail}\t${DEMO_OWNER_PASSWORD}`);
    stage = `organization ${demo.slug}`;
    const org = await ensureOrg(owner.id, actor.id, demo);
    stage = `tenant data ${demo.slug}`;
    const data = await seedOrgData(org.id, owner.id, demo);
    const operatorMembership = await Membership.findOne({
      organizationId: org.id,
      userId: actor.id,
      status: 'active',
    }).exec();
    summary.push({
      name: demo.name,
      slug: demo.slug,
      ownerEmail: demo.ownerEmail,
      ownerAccountCreated: owner.created,
      organizationCreated: org.created,
      operatorMembershipRemoved: !operatorMembership,
      inspectVia: 'platform → Mask into organization (support mode)',
      signInAsOwner: 'credentials in .runtime/demo-org-owners.txt',
      workspacePath: `/app/${demo.slug}`,
      employeeConfigured: data.employee,
      widgetEnabled: data.widget,
      conversations: data.conversations,
      leads: data.leads,
      opportunities: data.opportunities,
      quotations: data.quotations,
      appointments: data.appointments,
      followUps: data.followUps,
      dataSeeded: data.seededFresh,
      forceRefresh: data.force,
    });
  }
  await mkdir('.runtime', { recursive: true });
  await writeFile('.runtime/demo-org-owners.txt', `${ownerLines.join('\n')}\n`, { mode: 0o600 });

  console.log(
    JSON.stringify(
      {
        operator: SUPER_ADMIN_EMAIL,
        privacy: 'Demo orgs are isolated from the Super Admin membership list.',
        credentialsFile: '.runtime/demo-org-owners.txt',
        tip: 'Re-run with --force to wipe and reseed demo tenant commercial data.',
        organizations: summary,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} catch {
  console.error(
    `Demo organization seed stopped at: ${stage}. No private credentials were logged.`,
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
  await authClient().close().catch(() => {});
}
