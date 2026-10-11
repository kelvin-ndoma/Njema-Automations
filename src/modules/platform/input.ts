import { z } from 'zod';
export type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pageSchema = z.coerce.number().int().min(1).max(10000).catch(1);
export const pageSize = 15;
export function directoryInput(params: SearchParams) {
  return {
    q: z
      .string()
      .trim()
      .max(80)
      .catch('')
      .parse(first(params.q) ?? ''),
    page: pageSchema.parse(first(params.page) ?? 1),
    status: z
      .enum(['all', 'active', 'suspended', 'untracked'])
      .catch('all')
      .parse(first(params.status) ?? 'all'),
    size: pageSize,
  };
}
export function reportDays(params: SearchParams): 7 | 30 | 90 {
  const v = first(params.days);
  return v === '7' ? 7 : v === '90' ? 90 : 30;
}
export const platformId = z.string().regex(/^[a-fA-F0-9]{24}$/);
export function escapedSearch(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
