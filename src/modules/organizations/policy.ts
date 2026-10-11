import { z } from 'zod';
export const roles = ['owner', 'admin', 'manager', 'agent', 'viewer'] as const;
export type Role = (typeof roles)[number];
export type Permission = 'workspace:read' | 'organization:update' | 'members:manage';
const permissions: Record<Role, readonly Permission[]> = {
  owner: ['workspace:read', 'organization:update', 'members:manage'],
  admin: ['workspace:read', 'organization:update', 'members:manage'],
  manager: ['workspace:read'],
  agent: ['workspace:read'],
  viewer: ['workspace:read'],
};
export function can(role: Role, permission: Permission) {
  return permissions[role]?.includes(permission) ?? false;
}
export class AccessDenied extends Error {
  constructor() {
    super('Workspace unavailable or access denied.');
  }
}
export function authorizeMembership(
  membership: { userId: string; status: string; role: Role } | null,
  userId: string,
  permission: Permission,
) {
  if (
    !membership ||
    membership.userId !== userId ||
    membership.status !== 'active' ||
    !can(membership.role, permission)
  )
    throw new AccessDenied();
  return membership;
}
export const organizationInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .refine((v) => {
      try {
        return Intl.supportedValuesOf('currency').includes(v);
      } catch {
        return false;
      }
    }, 'Choose a supported currency'),
  timeZone: z
    .string()
    .max(80)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, 'Choose a valid time zone'),
  locale: z
    .string()
    .max(35)
    .refine((v) => {
      try {
        return Intl.getCanonicalLocales(v).length === 1;
      } catch {
        return false;
      }
    }, 'Choose a valid locale'),
});
