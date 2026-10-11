import { handleAuth } from '@/server/auth-http';
export const runtime = 'nodejs';
export const GET = handleAuth;
export const POST = handleAuth;
