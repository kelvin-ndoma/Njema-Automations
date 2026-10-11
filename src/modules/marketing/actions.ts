'use server';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import { authOrigins } from '@/lib/auth-origins';
import { publicSiteUrl } from '@/lib/public-site';
import { submitDemoInquiry } from './service';
import { RateLimited } from '@/server/rate-limit';
export interface DemoState {
  success?: boolean;
  error?: string;
}
export async function requestDemo(_state: DemoState, form: FormData): Promise<DemoState> {
  try {
    const requestHeaders = await headers();
    if (!authOrigins(publicSiteUrl()).includes(requestHeaders.get('origin') ?? ''))
      return { error: 'This request could not be accepted. Open the form from this website.' };
    // Forwarded addresses are only a supplementary abuse budget, never an identity claim.
    const requestKey = createHash('sha256')
      .update((requestHeaders.get('x-forwarded-for') || 'unknown').slice(0, 256))
      .digest('hex');
    await submitDemoInquiry(Object.fromEntries(form), requestKey);
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message || 'Check your entries.' };
    if (error instanceof RateLimited)
      return { error: 'Too many requests. Please wait a minute and try again.' };
    return { error: 'Your inquiry could not be saved. Please try again later.' };
  }
}
