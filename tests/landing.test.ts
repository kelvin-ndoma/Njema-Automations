import { describe, it, expect } from 'vitest';
import { chooseLanding, safeDestination } from '@/server/landing-policy';
describe('independent access scopes and landing policy', () => {
  it('prioritizes a database-resolved platform grant over saved membership', () => {
    expect(chooseLanding(true, ['njema'], undefined, 'njema')).toBe('/platform');
  });
  it('routes ordinary single members to their organization', () => {
    expect(chooseLanding(false, ['business'])).toBe('/app/business');
  });
  it('uses onboarding and multiple-membership selection', () => {
    expect(chooseLanding(false, [])).toBe('/organizations/new');
    expect(chooseLanding(false, ['a', 'b'])).toBe('/organizations');
  });
  it('validates saved preferences against current memberships', () => {
    expect(chooseLanding(false, ['a', 'b'], undefined, 'b')).toBe('/app/b');
    expect(chooseLanding(false, ['a', 'b'], undefined, 'revoked')).toBe('/organizations');
  });
  it('preserves authorized destinations before defaults', () => {
    expect(chooseLanding(true, ['a'], '/app/a')).toBe('/app/a');
    expect(chooseLanding(true, [], '/platform/users?q=kelvin')).toBe('/platform/users?q=kelvin');
    expect(chooseLanding(false, ['a'], '/account')).toBe('/account');
    expect(chooseLanding(false, ['a'], '/app/a/employee')).toBe('/app/a/employee');
    expect(chooseLanding(false, ['a'], '/app/a/settings')).toBe('/app/a/settings');
    expect(chooseLanding(false, ['a'], '/app/private/employee')).toBe('/app/a');
  });
  it('rejects cross-tenant and revoked platform destinations', () => {
    expect(chooseLanding(true, ['a'], '/app/private')).toBe('/platform');
    expect(chooseLanding(false, ['a'], '/platform')).toBe('/app/a');
  });
  it('rejects external, encoded, control-character and unsupported destinations', () => {
    for (const value of [
      'https://evil.test',
      '//evil.test',
      '/\\evil.test',
      '/%2f%2fevil.test',
      '/platform/../api/auth/sign-out',
      '/api/auth/sign-out',
      '/app/a\n',
    ])
      expect(safeDestination(value)).toBeNull();
  });
});
