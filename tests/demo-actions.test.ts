import { it, expect, vi, beforeEach } from 'vitest';
const state = vi.hoisted(() => ({ origin: 'http://localhost:3000', fails: false }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ origin: state.origin }) }));
vi.mock('@/modules/marketing/service', () => ({
  submitDemoInquiry: vi.fn(async () => {
    if (state.fails) throw new Error('private database details');
  }),
}));
import { requestDemo } from '@/modules/marketing/actions';
import { submitDemoInquiry } from '@/modules/marketing/service';
beforeEach(() => {
  process.env.SITE_URL = 'http://localhost:3000';
  state.origin = 'http://localhost:3000';
  state.fails = false;
  vi.clearAllMocks();
});
it('rejects foreign origins before saving', async () => {
  state.origin = 'https://other.test';
  expect((await requestDemo({}, new FormData())).error).toBeTruthy();
  expect(submitDemoInquiry).not.toHaveBeenCalled();
});
it('reports success only after persistence succeeds', async () => {
  expect(await requestDemo({}, new FormData())).toEqual({ success: true });
  expect(submitDemoInquiry).toHaveBeenCalledOnce();
});
it('never reports success or private error details when persistence fails', async () => {
  state.fails = true;
  const result = await requestDemo({}, new FormData());
  expect(result.success).toBeUndefined();
  expect(result.error).toBe('Your inquiry could not be saved. Please try again later.');
});
