import 'server-only';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { getEnv } from './env';
const globalDb = globalThis as typeof globalThis & {
  mongoosePromise?: Promise<typeof mongoose>;
  authClient?: MongoClient;
};
export async function connectDb() {
  if (!globalDb.mongoosePromise) {
    const env = getEnv();
    globalDb.mongoosePromise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB,
        autoIndex: false,
        serverSelectionTimeoutMS: 5000,
      })
      .catch(() => {
        globalDb.mongoosePromise = undefined;
        throw new Error(
          'Database unavailable. Check the configured connection and network access.',
        );
      });
  }
  return globalDb.mongoosePromise;
}
export function authClient() {
  const env = getEnv();
  return (globalDb.authClient ??= new MongoClient(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  }));
}
