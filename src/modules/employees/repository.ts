import 'server-only';
import { connectDb } from '@/server/db';
import { assertTenantState } from '@/server/access-state';
import { AuditEvent, Membership } from '@/modules/organizations/models';
import { authorizeOrganizationAccess } from '@/modules/organizations/access';
import { authorizeMembership } from '@/modules/organizations/policy';
import { SalesEmployee } from './models';
import {
  ConfigurationConflict,
  legacySalesAgentDefaults,
  salesAgentActions,
  type EmployeeInput,
  type EmployeeConfiguration,
  type SalesAgentAction,
} from './input';

function mapEmployee(row: {
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

export async function readConfiguration(
  organizationId: string,
  userId: string,
): Promise<EmployeeConfiguration | null> {
  await authorizeOrganizationAccess(organizationId, userId, 'workspace:read');
  const row = await SalesEmployee.findOne({ organizationId }).lean().exec();
  return row ? mapEmployee(row) : null;
}

export async function writeConfiguration(
  organizationId: string,
  userId: string,
  input: EmployeeInput,
) {
  await connectDb();
  try {
    await SalesEmployee.db.transaction(async (session) => {
      await assertTenantState(organizationId, userId, 'organization:update', session);
      authorizeMembership(
        await Membership.findOne({ organizationId, userId }).session(session).exec(),
        userId,
        'organization:update',
      );
      const { revision, ...values } = input;
      let resourceId: string;
      if (revision === 0) {
        // The unique organization index serializes concurrent first-time creation.
        const [row] = await SalesEmployee.create([{ organizationId, ...values, revision: 1 }], {
          session,
        });
        resourceId = String(row._id);
      } else {
        const row = await SalesEmployee.findOneAndUpdate(
          { organizationId, revision },
          { $set: values, $inc: { revision: 1 } },
          { session, returnDocument: 'after', runValidators: true },
        ).exec();
        if (!row) throw new ConfigurationConflict();
        resourceId = String(row._id);
      }
      await AuditEvent.create(
        [
          {
            organizationId,
            actorId: userId,
            action: revision === 0 ? 'employee.configured' : 'employee.configuration.updated',
            resourceId,
          },
        ],
        { session },
      );
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000)
      throw new ConfigurationConflict();
    throw error;
  }
}

export async function setEmployeeStatus(
  organizationId: string,
  userId: string,
  status: 'active' | 'paused',
  revision: number,
) {
  await connectDb();
  return SalesEmployee.db.transaction(async (session) => {
    await assertTenantState(organizationId, userId, 'organization:update', session);
    authorizeMembership(
      await Membership.findOne({ organizationId, userId }).session(session).exec(),
      userId,
      'organization:update',
    );
    const row = await SalesEmployee.findOneAndUpdate(
      { organizationId, revision },
      { $set: { status }, $inc: { revision: 1 } },
      { session, returnDocument: 'after' },
    ).exec();
    if (!row) throw new ConfigurationConflict();
    await AuditEvent.create(
      [
        {
          organizationId,
          actorId: userId,
          action: status === 'paused' ? 'employee.paused' : 'employee.resumed',
          resourceId: String(row._id),
        },
      ],
      { session },
    );
    return mapEmployee(row);
  });
}
