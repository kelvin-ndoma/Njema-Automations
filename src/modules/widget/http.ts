import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ConversationUnavailable, UsageExceeded } from '@/modules/conversations/input';
import { RateLimited } from '@/server/rate-limit';
import { AccessDenied } from '@/modules/organizations/policy';
import { VisitorDenied, WidgetUnavailable } from './input';

export function widgetCors(origin: string | null, allow: boolean) {
  const headers = new Headers({
    Vary: 'Origin',
    'Cache-Control': 'private, no-store',
  });
  if (allow && origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

export function optionsResponse(origin: string | null, allow: boolean) {
  return new NextResponse(null, { status: allow ? 204 : 403, headers: widgetCors(origin, allow) });
}

export function jsonResponse(body: unknown, status: number, origin: string | null, allow: boolean) {
  return NextResponse.json(body, { status, headers: widgetCors(origin, allow) });
}

export function publicError(error: unknown, origin: string | null, allow = true) {
  if (error instanceof VisitorDenied || error instanceof AccessDenied)
    return jsonResponse({ error: error.message }, 403, origin, allow);
  if (error instanceof UsageExceeded)
    return jsonResponse({ error: error.message }, 429, origin, allow);
  if (error instanceof RateLimited)
    return jsonResponse({ error: error.message }, 429, origin, allow);
  if (error instanceof WidgetUnavailable || error instanceof ConversationUnavailable)
    return jsonResponse({ error: error.message }, 503, origin, allow);
  if (error instanceof ZodError)
    return jsonResponse(
      { error: error.issues[0]?.message ?? 'Check your entries.' },
      400,
      origin,
      allow,
    );
  return jsonResponse({ error: 'Website chat could not complete this request.' }, 500, origin, allow);
}

export function requestOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) return origin;
  // Same-origin GET/script calls may omit Origin; Referer still identifies the embedding site.
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export function forwardedKey(request: Request) {
  return (request.headers.get('x-forwarded-for') || 'unknown').slice(0, 256);
}
