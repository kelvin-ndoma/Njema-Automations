import 'server-only';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/session';
import { authClient } from '@/server/db';
import { getEnv } from '@/server/env';
import { hasSuperAdminGrant } from './repository';
export async function requireSuperAdmin() {
  const user = await requireUser('/platform');
  if (!(await hasSuperAdminGrant(authClient().db(getEnv().MONGODB_DB), user.id))) notFound();
  return user;
}

export async function canAccessPlatform() {
  const user = await requireUser();
  return hasSuperAdminGrant(authClient().db(getEnv().MONGODB_DB), user.id);
}
