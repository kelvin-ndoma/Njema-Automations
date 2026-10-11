import 'server-only';
import { createHash } from 'node:crypto';
import { getAuth } from './auth';
import { enforceLimit, RateLimited } from './rate-limit';
import { getEnv } from './env';
export async function handleAuth(request: Request) {
 try {
  if (request.method === 'POST') {
   if (request.headers.get('origin') !== new URL(getEnv().BETTER_AUTH_URL).origin) return Response.json({ message: 'Invalid request origin.' }, { status: 403 });
   await enforceLimit('auth:global', 100);
   if (new URL(request.url).pathname.endsWith('/sign-in/email') || new URL(request.url).pathname.endsWith('/sign-up/email')) {
    const text = await request.clone().text();
    if (text.length > 4096) return Response.json({ message: 'Request too large.' }, { status: 413 });
    let body: unknown; try { body = JSON.parse(text); } catch { return Response.json({ message: 'Invalid request.' }, { status: 400 }); }
    if (typeof body === 'object' && body && 'email' in body && typeof body.email === 'string') {
     const digest = createHash('sha256').update(body.email.trim().toLowerCase()).digest('hex');
     await enforceLimit(`auth:identity:${digest}`, 5);
    }
   }
  }
  return await getAuth().handler(request);
 } catch (e) { return Response.json({ message: e instanceof RateLimited ? e.message : 'Authentication service unavailable.' }, { status: e instanceof RateLimited ? 429 : 503, headers: e instanceof RateLimited ? { 'Retry-After': '60' } : {} }); }
}
