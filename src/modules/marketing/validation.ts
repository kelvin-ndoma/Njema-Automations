import { z } from 'zod';
export const demoInput = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: z
    .email('Enter a valid email address.')
    .max(254)
    .transform((v) => v.toLowerCase()),
  business: z.string().trim().min(2, 'Enter your business name.').max(120),
  industry: z
    .enum(['', 'real-estate', 'services', 'commerce', 'education', 'hospitality', 'other'])
    .default(''),
  message: z.string().trim().max(2000, 'Keep your message under 2,000 characters.').default(''),
  consent: z.literal('on', { error: 'Please consent to contact about your inquiry.' }),
  website: z.string().max(0, 'Unable to accept this request.').default(''),
});
