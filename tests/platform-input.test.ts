import { expect, it } from 'vitest';
import { priceToMinor, operationInput } from '@/modules/platform/operations-input';
it('stores configured prices with the currency minor-unit scale', () => {
  expect(priceToMinor('USD', 12.34)).toBe(1234);
  expect(priceToMinor('JPY', 123)).toBe(123);
  expect(priceToMinor('KWD', 1.234)).toBe(1234);
  expect(priceToMinor('USD', null)).toBeNull();
  expect(() => priceToMinor('USD', 1.234)).toThrow('precision');
});
it('rejects unsupported currencies, missing reasons and invalid lifecycle values', () => {
  expect(
    operationInput.safeParse({
      operation: 'organization.state',
      organizationId: '000000000000000000000000',
      status: 'deleted',
      confirmation: 'x',
      reason: 'reason',
    }).success,
  ).toBe(false);
  expect(
    operationInput.safeParse({
      operation: 'model.save',
      model: 'valid-model',
      enabled: 'on',
      inputUsdPerMillion: 1,
      outputUsdPerMillion: 2,
      reason: '',
    }).success,
  ).toBe(false);
});
