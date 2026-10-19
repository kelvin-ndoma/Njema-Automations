import { z } from 'zod';
import { platformId } from './input';
const reason = z.string().trim().min(5).max(500);
const confirmation = z.string().min(1).max(100);
const flag = z
  .enum(['on', 'off'])
  .default('off')
  .transform((value) => value === 'on');
const positive = z.coerce.number().int().min(1).max(10000000);
const optionalMoney = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.coerce.number().min(0).max(10000).nullable(),
);
export const settingsInput = z.object({
  identity: z.string().trim().min(2).max(80),
  dailyRequests: positive.max(10000),
  dailyTokens: positive,
  trialDays: positive.max(90),
  supportMinutes: positive.max(30),
  supportEnabled: flag,
  aiEnabled: flag,
  models: z
    .string()
    .max(2000)
    .transform((value) => value.split(/[\s,]+/).filter(Boolean))
    .pipe(z.array(z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/)).max(30)),
  dailyCostUsd: optionalMoney,
});
export const operationInput = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('organization.state'),
    organizationId: platformId,
    status: z.enum(['active', 'suspended']),
    confirmation,
    reason,
  }),
  z.object({
    operation: z.literal('organization.restrictions'),
    organizationId: platformId,
    aiDisabled: flag,
    readOnly: flag,
    confirmation,
    reason,
  }),
  z.object({
    operation: z.literal('organization.note'),
    organizationId: platformId,
    note: z.string().trim().min(2).max(2000),
  }),
  z.object({
    operation: z.literal('user.state'),
    userId: platformId,
    restricted: flag,
    confirmation,
    reason,
  }),
  z.object({ operation: z.literal('user.sessions'), userId: platformId, confirmation, reason }),
  z.object({
    operation: z.literal('plan.save'),
    id: z.union([platformId, z.literal('')]).default(''),
    code: z.string().regex(/^[a-z0-9-]{3,48}$/),
    name: z.string().trim().min(2).max(80),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .refine(
        (value) => Intl.supportedValuesOf('currency').includes(value),
        'Choose a supported currency.',
      ),
    monthlyPrice: optionalMoney,
    dailyRequests: positive.max(10000),
    dailyTokens: positive,
    aiEnabled: flag,
    enabled: flag,
    reason,
  }),
  z.object({
    operation: z.literal('subscription.assign'),
    organizationId: platformId,
    planId: platformId,
    state: z.enum(['trial', 'active', 'past_due', 'canceled']),
    confirmation,
    reason,
  }),
  z.object({
    operation: z.literal('model.save'),
    model: z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/),
    enabled: flag,
    inputUsdPerMillion: z.coerce.number().min(0).max(10000),
    outputUsdPerMillion: z.coerce.number().min(0).max(10000),
    reason,
  }),
  z.object({
    operation: z.literal('support.create'),
    organizationId: platformId,
    subject: z.string().trim().min(5).max(120),
    note: z.string().trim().min(5).max(2000),
  }),
  z.object({
    operation: z.literal('support.update'),
    id: platformId,
    state: z.enum(['open', 'in_progress', 'resolved']),
    assigned: flag,
    note: z.string().trim().max(2000).default(''),
    reason,
  }),
  z.object({
    operation: z.literal('support.enter'),
    organizationId: platformId,
    confirmation,
    reason,
  }),
  z.object({ operation: z.literal('support.exit'), id: platformId }),
  z.object({
    operation: z.literal('incident.save'),
    subject: z.string().trim().min(5).max(120),
    state: z.enum(['investigating', 'resolved']),
    note: z.string().trim().min(5).max(2000),
  }),
  z.object({ operation: z.literal('incident.resolve'), id: platformId, reason }),
  z.object({ operation: z.literal('settings.save'), ...settingsInput.shape, reason }),
]);
export type PlatformOperation = z.infer<typeof operationInput>;
export function currencyDecimals(currency: string) {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}
export function priceToMinor(currency: string, value: number | null) {
  if (value === null) return null;
  const scale = 10 ** currencyDecimals(currency);
  const minor = Math.round(value * scale);
  if (!Number.isSafeInteger(minor) || minor / scale !== value)
    throw new Error('Price precision does not match the currency.');
  return minor;
}
export const defaultSettings = {
  identity: 'Relay',
  dailyRequests: 20,
  dailyTokens: 100000,
  trialDays: 14,
  supportMinutes: 15,
  supportEnabled: true,
  aiEnabled: true,
  models: [] as string[],
  dailyCostUsd: null as number | null,
};
