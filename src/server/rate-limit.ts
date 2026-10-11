import 'server-only';
import { connectDb } from './db';
import { MutationLimit } from '@/modules/organizations/models';
export class RateLimited extends Error {
  constructor() {
    super('Too many requests. Please wait a minute.');
  }
}
export async function enforceLimit(key: string, max: number) {
  await connectDb();
  const minute = Math.floor(Date.now() / 60000);
  const id = `${key}:${minute}`;
  // The unique _id makes increments atomic; retry only the concurrent upsert race.
  let counter;
  try {
    counter = await MutationLimit.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((minute + 2) * 60000) } },
      { upsert: true, returnDocument: 'after' },
    ).exec();
  } catch (error) {
    if (typeof error !== 'object' || !error || !('code' in error) || error.code !== 11000)
      throw error;
    counter = await MutationLimit.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 } },
      { returnDocument: 'after' },
    ).exec();
  }
  if (!counter || counter.count > max) throw new RateLimited();
}
