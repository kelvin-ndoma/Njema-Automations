import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeDestination } from './landing-policy';
import { getAuth } from './auth';
import { userIsRestricted } from './access-state';

const readSession = cache(async () => {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
});

export async function requireUser(destination?: string) {
  const session = await readSession();
  if (!session) {
    const requestHeaders = await headers();
    const next = safeDestination(requestHeaders.get('x-relay-request-path') ?? destination);
    redirect('/sign-in' + (next ? '?next=' + encodeURIComponent(next) : ''));
  }
  if (await userIsRestricted(session.user.id)) redirect('/sign-in?restricted=1');
  return session.user;
}
