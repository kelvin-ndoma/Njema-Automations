import { expect, it } from 'vitest';
import { authOrigins } from '@/lib/auth-origins';
import { authErrorMessage } from '@/lib/auth-error';
it('permits only exact loopback aliases with the same port and protocol', () => {
  expect(authOrigins('http://localhost:3000')).toEqual([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
  expect(authOrigins('http://localhost:3000')).not.toContain('http://localhost:3001');
  expect(authOrigins('http://localhost:3000')).not.toContain('https://localhost:3000');
  expect(authOrigins('https://app.example.com')).toEqual(['https://app.example.com']);
});
it('does not describe origin or service failures as invalid passwords', () => {
  expect(authErrorMessage(403, false)).not.toContain('password');
  expect(authErrorMessage(503, false)).toContain('unavailable');
  expect(authErrorMessage(401, false)).toContain('email and password');
  expect(authErrorMessage(429, false)).toContain('wait');
});
