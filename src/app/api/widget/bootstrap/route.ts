import {
  jsonResponse,
  optionsResponse,
  publicError,
  requestOrigin,
  forwardedKey,
} from '@/modules/widget/http';
import { isOriginAllowedForKey } from '@/modules/widget/repository';
import { publicBootstrap, rateVisitor } from '@/modules/widget/public-service';

export const runtime = 'nodejs';

export async function OPTIONS(request: Request) {
  const origin = requestOrigin(request);
  const key = new URL(request.url).searchParams.get('key') ?? '';
  return optionsResponse(origin, await isOriginAllowedForKey(key, origin));
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const key = new URL(request.url).searchParams.get('key') ?? '';
  const allow = await isOriginAllowedForKey(key, origin);
  try {
    if (!key) return jsonResponse({ error: 'Missing installation key.' }, 400, origin, false);
    await rateVisitor(origin, key, forwardedKey(request));
    const data = await publicBootstrap(key, origin);
    return jsonResponse(data, 200, origin, allow);
  } catch (error) {
    return publicError(error, origin, allow);
  }
}
