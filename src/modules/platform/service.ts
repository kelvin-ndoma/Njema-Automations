import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/session';
import { authClient } from '@/server/db';
import { getEnv } from '@/server/env';
import {
  getPlatformGrant,
  grantPlatformAdmin,
  hasPlatformAccess,
  hasSuperAdminGrant,
  listPlatformGrants,
  revokePlatformAdmin,
  type PlatformRole,
} from './repository';
import { recordAuthorizationDenial } from '@/server/access-state';

/** Any platform operator (Super Admin or Platform Admin). */
export const requirePlatformOperator = cache(async () => {
  const user = await requireUser('/platform');
  const role = await getPlatformGrant(authClient().db(getEnv().MONGODB_DB), user.id);
  if (!role) {
    await recordAuthorizationDenial(user.id, 'platform');
    notFound();
  }
  return { ...user, platformRole: role as PlatformRole };
});

/** Super Admin only — privileged platform mutations and operator grants. */
export const requireSuperAdmin = cache(async () => {
  const user = await requireUser('/platform');
  if (!(await hasSuperAdminGrant(authClient().db(getEnv().MONGODB_DB), user.id))) {
    await recordAuthorizationDenial(user.id, 'platform');
    notFound();
  }
  return { ...user, platformRole: 'super-admin' as const };
});

export async function canAccessPlatform() {
  const user = await requireUser();
  return hasPlatformAccess(authClient().db(getEnv().MONGODB_DB), user.id);
}

export async function getCurrentPlatformRole(): Promise<PlatformRole | null> {
  const user = await requireUser();
  return getPlatformGrant(authClient().db(getEnv().MONGODB_DB), user.id);
}

export async function getPlatformOperatorsPage() {
  const actor = await requireSuperAdmin();
  const db = authClient().db(getEnv().MONGODB_DB);
  const grants = await listPlatformGrants(db);
  const userIds = [...new Set(grants.map((row) => row.userId))];
  const { ObjectId } = await import('mongodb');
  const idFilter = userIds.flatMap((value) =>
    ObjectId.isValid(value) ? [new ObjectId(value), value] : [value],
  );
  const users = userIds.length
    ? await db
        .collection('user')
        .find({ _id: { $in: idFilter } } as never, { projection: { _id: 1, email: 1, name: 1 } })
        .toArray()
    : [];
  const userMap = new Map(users.map((row) => [String(row._id), row]));
  return {
    actor,
    operators: grants.map((grant) => {
      const user = userMap.get(grant.userId);
      return {
        ...grant,
        email: typeof user?.email === 'string' ? user.email : null,
        name: typeof user?.name === 'string' ? user.name : null,
      };
    }),
  };
}

export async function grantPlatformAdministrator(raw: unknown) {
  const actor = await requireSuperAdmin();
  const { z } = await import('zod');
  const input = z
    .object({
      userId: z.string().min(1).max(40),
      confirmation: z.string().min(1).max(100),
    })
    .parse(raw);
  if (input.confirmation !== input.userId)
    throw new Error('Type the exact user id to confirm the grant.');
  return grantPlatformAdmin(authClient().db(getEnv().MONGODB_DB), authClient(), actor.id, input.userId);
}

export async function revokePlatformAdministrator(raw: unknown) {
  const actor = await requireSuperAdmin();
  const { z } = await import('zod');
  const input = z
    .object({
      userId: z.string().min(1).max(40),
      confirmation: z.string().min(1).max(100),
    })
    .parse(raw);
  if (input.confirmation !== input.userId)
    throw new Error('Type the exact user id to confirm revocation.');
  return revokePlatformAdmin(
    authClient().db(getEnv().MONGODB_DB),
    authClient(),
    actor.id,
    input.userId,
  );
}
