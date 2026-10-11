import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeDestination } from './landing-policy';
import { getAuth } from './auth';
export async function requireUser(destination?: string) {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) {
    const next = safeDestination(requestHeaders.get('x-relay-request-path') ?? destination);
    redirect('/sign-in' + (next ? '?next=' + encodeURIComponent(next) : ''));
  }
  return session.user;
}
