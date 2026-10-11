import { NextResponse, type NextRequest } from 'next/server';
// Routing hint only: actual authentication and authorization stay in server services.
// Overwrite incoming values so a browser cannot supply this header.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-relay-request-path', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: ['/platform/:path*', '/app/:path*', '/account', '/organizations/:path*'],
};
