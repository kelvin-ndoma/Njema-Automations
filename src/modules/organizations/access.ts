import 'server-only';
import { Types } from 'mongoose';
import { connectDb } from '@/server/db';
import { assertTenantState, userIsRestricted } from '@/server/access-state';
import { Membership } from './models';
import {
  AccessDenied,
  authorizeMembership,
  can,
  type Permission,
  type Role,
} from './policy';

/** Membership or active support grant for workspace reads; membership only for writes. */
export async function authorizeOrganizationAccess(
  organizationId: string,
  userId: string,
  permission: Permission = 'workspace:read',
): Promise<{ role: Role; supportMode: boolean }> {
  await connectDb();
  await assertTenantState(organizationId, userId, permission);
  const membership = await Membership.findOne({ organizationId, userId }).exec();
  if (
    membership &&
    membership.userId === userId &&
    membership.status === 'active' &&
    can(membership.role, permission)
  ) {
    return { role: membership.role, supportMode: false };
  }
  if (permission === 'workspace:read' && !(await userIsRestricted(userId))) {
    const { ensureOperatorSupportAccess } = await import('@/modules/platform/support-access');
    // Reuses an active grant, or auto-creates one for Super Admin / Platform Admin.
    const support = await ensureOperatorSupportAccess(userId, String(organizationId));
    if (support) return { role: 'viewer', supportMode: true };
  }
  if (membership) authorizeMembership(membership, userId, permission);
  throw new AccessDenied();
}

export function asObjectId(organizationId: string) {
  return Types.ObjectId.isValid(organizationId)
    ? new Types.ObjectId(organizationId)
    : organizationId;
}
