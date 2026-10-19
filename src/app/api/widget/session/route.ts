import {
  jsonResponse,
  optionsResponse,
  publicError,
  requestOrigin,
  forwardedKey,
} from '@/modules/widget/http';
import { isOriginAllowedForKey } from '@/modules/widget/repository';
import { publicStartSession, rateVisitor } from '@/modules/widget/public-service';

export const runtime = 'nodejs';

export async function OPTIONS(request: Request) {
  const origin = requestOrigin(request);
  const key = new URL(request.url).searchParams.get('key') ?? '';
  return optionsResponse(origin, await isOriginAllowedForKey(key, origin));
}

export async function POST(request: Request) {
  const origin = requestOrigin(request);
  const keyFromQuery = new URL(request.url).searchParams.get('key') ?? '';
  let key = keyFromQuery;
  let allow = false;
  try {
    const body = (await request.json()) as { key?: string };
    key = String(body.key ?? keyFromQuery);
    allow = await isOriginAllowedForKey(key, origin);
    await rateVisitor(origin, key, forwardedKey(request));
    const data = await publicStartSession(key, origin);
    return jsonResponse(data, 200, origin, allow);
  } catch (error) {
    return publicError(error, origin, allow || (await isOriginAllowedForKey(key, origin)));
  }
}
