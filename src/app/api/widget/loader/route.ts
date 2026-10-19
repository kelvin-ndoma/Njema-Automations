import { createPublicWidgetScript } from '@/modules/widget/loader-script';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key') ?? '';
  const base = new URL(request.url).origin;
  const body = createPublicWidgetScript(base, key);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
