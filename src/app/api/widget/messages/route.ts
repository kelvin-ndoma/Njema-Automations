import {
  bearerToken,
  jsonResponse,
  optionsResponse,
  publicError,
  requestOrigin,
  forwardedKey,
} from '@/modules/widget/http';
import { askVisitorQuestion, publicHistory, rateVisitor } from '@/modules/widget/public-service';
import { VisitorDenied } from '@/modules/widget/input';

export const runtime = 'nodejs';

export async function OPTIONS(request: Request) {
  const origin = requestOrigin(request);
  // Preflight cannot include Authorization; origin binding is enforced on the real request.
  return optionsResponse(origin, Boolean(origin));
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const token = bearerToken(request);
  const allow = Boolean(origin && token);
  try {
    if (!token) throw new VisitorDenied();
    await rateVisitor(origin, token.slice(0, 24), forwardedKey(request));
    return jsonResponse({ messages: await publicHistory(token, origin) }, 200, origin, allow);
  } catch (error) {
    return publicError(error, origin, allow);
  }
}

export async function POST(request: Request) {
  const origin = requestOrigin(request);
  const token = bearerToken(request);
  const allow = Boolean(origin && token);
  try {
    if (!token) throw new VisitorDenied();
    await rateVisitor(origin, token.slice(0, 24), forwardedKey(request));
    const body = await request.json();
    const reply = await askVisitorQuestion(token, origin, body);
    return jsonResponse(reply, 200, origin, allow);
  } catch (error) {
    return publicError(error, origin, allow);
  }
}
