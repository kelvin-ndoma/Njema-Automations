import { describe, expect, it } from 'vitest';
import { authorizeMembership, can, organizationInput } from '@/modules/organizations/policy';
const valid = {
  name: 'Global Company',
  slug: 'global-company',
  currency: 'EUR',
  timeZone: 'Europe/Paris',
  locale: 'fr-FR',
};
describe('authorization policy', () => {
  it('grants owner administration and denies viewer mutation', () => {
    expect(can('owner', 'organization:update')).toBe(true);
    expect(can('viewer', 'organization:update')).toBe(false);
  });
  it('denies absent, mismatched, and revoked membership', () => {
    expect(() => authorizeMembership(null, 'a', 'workspace:read')).toThrow();
    expect(() =>
      authorizeMembership({ userId: 'b', role: 'owner', status: 'active' }, 'a', 'workspace:read'),
    ).toThrow();
    expect(() =>
      authorizeMembership({ userId: 'a', role: 'owner', status: 'revoked' }, 'a', 'workspace:read'),
    ).toThrow();
  });
});
describe('organization validation', () => {
  it('accepts globally configurable settings', () =>
    expect(organizationInput.parse(valid)).toEqual(valid));
  it.each([
    { slug: '../other' },
    { name: 'x' },
    { currency: 'ZZZ' },
    { timeZone: 'Not/AZone' },
    { locale: 'invalid_locale' },
  ])('rejects invalid field %j', (change) =>
    expect(organizationInput.safeParse({ ...valid, ...change }).success).toBe(false),
  );
  it('strips client role claims', () =>
    expect(organizationInput.parse({ ...valid, role: 'owner' })).not.toHaveProperty('role'));
});
