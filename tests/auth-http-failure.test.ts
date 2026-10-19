import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ limit: vi.fn(), handler: vi.fn(), configuration: vi.fn() }));
vi.mock('@/server/rate-limit', () => ({
  enforceLimit: mocks.limit,
  RateLimited: class extends Error {},
}));
vi.mock('@/server/auth', () => ({ getAuth: () => ({ handler: mocks.handler }) }));
vi.mock('@/server/env', () => ({ getEnv: mocks.configuration }));
import { handleAuth } from '@/server/auth-http';
import { authErrorMessage } from '@/lib/auth-error';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configuration.mockReturnValue({ BETTER_AUTH_URL: 'http://localhost:3000' });
  mocks.limit.mockResolvedValue(undefined);
  mocks.handler.mockResolvedValue(
    Response.json({ message: 'Invalid credentials.' }, { status: 401 }),
  );
});
function signIn() {
  return new Request('http://localhost:3000/api/auth/sign-in/email', {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'diagnostic@example.test', password: 'synthetic-password-only' }),
  });
}
it('fails closed before password verification when the database-backed request budget is unavailable', async () => {
  mocks.limit.mockRejectedValueOnce(new Error('private TLS connection details'));
  const response = await handleAuth(signIn());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ message: 'Authentication service unavailable.' });
  expect(response.headers.has('set-cookie')).toBe(false);
  expect(mocks.handler).not.toHaveBeenCalled();
  expect(authErrorMessage(response.status, false)).toBe(
    'Sign-in service unavailable. Please try again shortly.',
  );
});
it('does not turn a native session database failure into a session or leak its details', async () => {
  mocks.handler.mockRejectedValueOnce(new Error('private native database connection details'));
  const response = await handleAuth(new Request('http://localhost:3000/api/auth/get-session'));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ message: 'Authentication service unavailable.' });
  expect(response.headers.has('set-cookie')).toBe(false);
});
it('retains origin protection even while database connectivity is broken', async () => {
  const response = await handleAuth(
    new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: { Origin: 'https://foreign.example' },
      body: '{}',
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.handler).not.toHaveBeenCalled();
});
it('resumes the ordinary authentication path after the dependency recovers without changing configuration', async () => {
  mocks.limit.mockRejectedValueOnce(new Error('synthetic temporary outage'));
  expect((await handleAuth(signIn())).status).toBe(503);
  expect((await handleAuth(signIn())).status).toBe(401);
  expect(mocks.handler).toHaveBeenCalledOnce();
});
