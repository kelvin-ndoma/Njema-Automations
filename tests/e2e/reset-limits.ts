import { MongoClient } from 'mongodb';
import { readFile } from 'node:fs/promises';
// Isolate request budgets between browser tests; production limits stay unchanged.
export async function resetTestLimits() {
  const fixture = JSON.parse(await readFile('.runtime/e2e-database.json', 'utf8')) as {
    uri: string;
  };
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):/.test(fixture.uri))
    throw new Error('Expected disposable localhost test database.');
  const client = new MongoClient(fixture.uri);
  try {
    await client.db('e2e').collection('rateLimit').deleteMany({});
    await client.db('e2e').collection('mutationlimits').deleteMany({});
  } finally {
    await client.close();
  }
}
