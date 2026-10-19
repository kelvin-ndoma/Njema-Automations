import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

export function createVisitorToken() {
  const token = `vs_${randomBytes(32).toString('base64url')}`;
  return { token, tokenHash: hashVisitorToken(token) };
}

export function hashVisitorToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createPublicKey() {
  return `wk_${randomBytes(24).toString('base64url')}`;
}

export const visitorSessionTtlMs = 24 * 60 * 60 * 1000;
