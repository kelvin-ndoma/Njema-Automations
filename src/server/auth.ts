import 'server-only';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { getEnv } from './env';
import { authClient } from './db';
import { authOrigins } from '@/lib/auth-origins';
function buildAuth() {
  const env = getEnv();
  const client = authClient();
  return betterAuth({
    appName: 'Relay',
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: authOrigins(env.BETTER_AUTH_URL),
    secret: env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(client.db(env.MONGODB_DB), { client }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await client
              .db(env.MONGODB_DB)
              .collection('identityAudit')
              .insertOne({ actorId: user.id, action: 'user.created', createdAt: new Date() });
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            await client.db(env.MONGODB_DB).collection('identityAudit').insertOne({
              actorId: session.userId,
              action: 'session.created',
              createdAt: new Date(),
            });
          },
        },
        delete: {
          after: async (session) => {
            await client.db(env.MONGODB_DB).collection('identityAudit').insertOne({
              actorId: session.userId,
              action: 'session.deleted',
              createdAt: new Date(),
            });
          },
        },
      },
    },
    logger: { disabled: true },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
      },
    },
  });
}
let instance: ReturnType<typeof buildAuth> | undefined;
export function getAuth(): ReturnType<typeof buildAuth> {
  return (instance ??= buildAuth());
}
