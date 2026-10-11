import 'server-only';
import { z } from 'zod';
const schema = z.object({
 MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
 MONGODB_DB: z.string().min(1).default('ai_sales'),
 BETTER_AUTH_SECRET: z.string().min(32).refine(v => !v.startsWith('REPLACE_')),
 BETTER_AUTH_URL: z.url(),
});
export function getEnv() {
 const result = schema.safeParse(process.env);
 if (!result.success) throw new Error('Server configuration is incomplete. Check required environment variables.');
 if (process.env.NODE_ENV === 'production' && !result.data.BETTER_AUTH_URL.startsWith('https://')) {
   // Local production-build verification may use localhost HTTP; public deployments must use HTTPS.
   const url = new URL(result.data.BETTER_AUTH_URL);
   if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('HTTPS is required.');
 }
 return result.data;
}
