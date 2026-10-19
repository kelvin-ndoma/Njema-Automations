import 'server-only';
import { enforceLimit } from '@/server/rate-limit';
import { assertTenantState, recordAuthorizationDenial } from '@/server/access-state';
import {
  AccessDenied,
  authorizeMembership,
  type Permission,
  type Role,
  organizationInput,
  businessSettingsInput,
} from './policy';
import {
  findOrganization,
  findMembership,
  findUserOrganizations,
  insertOrganization,
  insertSwitchAudit,
  updateBusinessSettings,
} from './repository';
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timeZone: string;
  locale: string;
  role: Role;
  readOnly?: boolean;
  aiDisabled?: boolean;
  /** Present when access comes from an explicit Super Admin support grant, not membership. */
  supportMode?: { id: string; reason: string; expiresAt: string | null };
}
export async function workspaceFor(
  userId: string,
  slug: string,
  permission: Permission = 'workspace:read',
): Promise<Workspace> {
  const org = await findOrganization(slug);
  if (!org) {
    await recordAuthorizationDenial(userId, 'organization');
    throw new AccessDenied();
  }
  try {
    const controls = await assertTenantState(String(org._id), userId, permission);
    const member = authorizeMembership(await findMembership(org._id, userId), userId, permission);
    return {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      currency: org.currency,
      timeZone: org.timeZone,
      locale: org.locale,
      role: member.role,
      readOnly: controls.readOnly,
      aiDisabled: controls.aiDisabled,
    };
  } catch (error) {
    // Support grants only authorize read of the customer experience — never writes.
    // Platform operators auto-enter an audited mask when opening a non-member workspace.
    if (permission === 'workspace:read' && error instanceof AccessDenied) {
      const { userIsRestricted } = await import('@/server/access-state');
      const { ensureOperatorSupportAccess } = await import('@/modules/platform/support-access');
      if (!(await userIsRestricted(userId))) {
        const support = await ensureOperatorSupportAccess(userId, String(org._id));
        if (support) {
          const { authClient } = await import('@/server/db');
          const { getEnv } = await import('@/server/env');
          const { ObjectId } = await import('mongodb');
          const controls = await authClient()
            .db(getEnv().MONGODB_DB)
            .collection('organizationControls')
            .findOne(
              { organizationId: new ObjectId(String(org._id)) },
              { projection: { aiDisabled: 1 } },
            );
          return {
            id: String(org._id),
            name: org.name,
            slug: org.slug,
            currency: org.currency,
            timeZone: org.timeZone,
            locale: org.locale,
            role: 'viewer',
            readOnly: true,
            aiDisabled: controls?.aiDisabled === true,
            supportMode: support,
          };
        }
      }
    }
    await recordAuthorizationDenial(userId, 'organization');
    throw error instanceof AccessDenied ? error : new AccessDenied();
  }
}
export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const { memberships, organizations } = await findUserOrganizations(userId);
  return organizations.map((org) => ({
    id: String(org._id),
    name: org.name,
    slug: org.slug,
    currency: org.currency,
    timeZone: org.timeZone,
    locale: org.locale,
    role: memberships.find((m) => String(m.organizationId) === String(org._id))!.role,
  }));
}
export async function limitMutation(userId: string) {
  await enforceLimit(`mutation:${userId}`, 10);
}
export async function createWorkspace(userId: string, raw: unknown): Promise<string> {
  const input = organizationInput.parse(raw);
  await limitMutation(userId);
  await insertOrganization(userId, input);
  return input.slug;
}
export async function recordSwitch(userId: string, slug: string) {
  const org = await workspaceFor(userId, slug);
  await limitMutation(userId);
  await insertSwitchAudit(userId, org.id);
  return org;
}

export async function saveBusinessSettings(userId: string, slug: string, raw: unknown) {
  const workspace = await workspaceFor(userId, slug, 'organization:update');
  const input = businessSettingsInput.parse(raw);
  await limitMutation(userId);
  await updateBusinessSettings(workspace.id, userId, input);
}
