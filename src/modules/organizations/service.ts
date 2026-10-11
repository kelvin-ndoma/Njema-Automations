import 'server-only';
import { enforceLimit } from '@/server/rate-limit';
import {
  AccessDenied,
  authorizeMembership,
  type Permission,
  type Role,
  organizationInput,
} from './policy';
import {
  findOrganization,
  findMembership,
  findUserOrganizations,
  insertOrganization,
  insertSwitchAudit,
} from './repository';
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timeZone: string;
  locale: string;
  role: Role;
}
export async function workspaceFor(
  userId: string,
  slug: string,
  permission: Permission = 'workspace:read',
): Promise<Workspace> {
  const org = await findOrganization(slug);
  if (!org) throw new AccessDenied();
  const member = authorizeMembership(await findMembership(org._id, userId), userId, permission);
  return {
    id: String(org._id),
    name: org.name,
    slug: org.slug,
    currency: org.currency,
    timeZone: org.timeZone,
    locale: org.locale,
    role: member.role,
  };
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
