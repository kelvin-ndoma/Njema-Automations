import 'server-only';
import { createHash } from 'node:crypto';
import { enforceLimit } from '@/server/rate-limit';
import { generateReply, providerConfiguration } from '@/modules/conversations/provider';
import { visitorLeadInput, visitorMessageInput } from './input';
import {
  bootstrapPublic,
  captureLead,
  completeVisitorMessage,
  failVisitorMessage,
  listVisitorMessages,
  reserveVisitorMessage,
  startVisitorSession,
} from './repository';

export async function rateVisitor(origin: string | null, publicKey: string, forwarded: string) {
  const originKey = createHash('sha256')
    .update((origin ?? 'missing').slice(0, 256))
    .digest('hex');
  const forwardKey = createHash('sha256').update(forwarded.slice(0, 256)).digest('hex');
  await enforceLimit('widget:global', 120);
  await enforceLimit(`widget:origin:${originKey}`, 40);
  await enforceLimit(`widget:key:${publicKey.slice(0, 64)}`, 60);
  await enforceLimit(`widget:forward:${forwardKey}`, 30);
}

export async function publicBootstrap(publicKey: string, origin: string | null) {
  return bootstrapPublic(publicKey, origin);
}

export async function publicStartSession(publicKey: string, origin: string | null) {
  return startVisitorSession(publicKey, origin);
}

export async function publicHistory(token: string, origin: string | null) {
  return listVisitorMessages(token, origin);
}

export async function askVisitorQuestion(token: string, origin: string | null, raw: unknown) {
  const input = visitorMessageInput.parse(raw);
  providerConfiguration();
  const pending = await reserveVisitorMessage(token, origin, input);
  try {
    // Recheck live visitor access immediately before external execution and publication.
    await listVisitorMessages(token, origin);
    const reply = await generateReply(pending.employee, pending.question, pending.history);
    await completeVisitorMessage(
      pending.organizationId,
      pending.conversationId,
      pending.employeeMessageId,
      token,
      origin,
      reply,
    );
    return {
      answer: reply.answer,
      grounded: reply.grounded,
      action: reply.action,
      requestContact: reply.action === 'request_contact',
      needsHuman: reply.action === 'escalate_human',
    };
  } catch (error) {
    await failVisitorMessage(
      pending.organizationId,
      pending.conversationId,
      pending.employeeMessageId,
      token,
      origin,
    );
    throw error;
  }
}

export async function submitVisitorLead(token: string, origin: string | null, raw: unknown) {
  const input = visitorLeadInput.parse(raw);
  await captureLead(token, origin, input);
}
