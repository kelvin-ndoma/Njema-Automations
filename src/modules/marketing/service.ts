import 'server-only';
import { createHash } from 'node:crypto';
import { demoInput } from './validation';
import { saveDemoInquiry } from './repository';
import { enforceLimit } from '@/server/rate-limit';
export async function submitDemoInquiry(raw: unknown, requestKey: string) {
  const { name, email, business, industry, message } = demoInput.parse(raw);
  const emailKey = createHash('sha256').update(email).digest('hex');
  await enforceLimit('demo:global', 30);
  await enforceLimit(`demo:request:${requestKey}`, 5);
  await enforceLimit(`demo:email:${emailKey}`, 3);
  await saveDemoInquiry({ name, email, business, industry, message });
}
