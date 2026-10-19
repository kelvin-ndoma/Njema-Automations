import { connectDb, authClient } from '../src/server/db';
import {
  Organization,
  Membership,
  AuditEvent,
  MutationLimit,
} from '../src/modules/organizations/models';
import { getEnv } from '../src/server/env';
import { SalesEmployee } from '../src/modules/employees/models';
import { createPlatformIndexes } from '../src/modules/platform/indexes';
import { DailyAIUsage, TestConversationRecord } from '../src/modules/conversations/models';
import {
  QualifiedLead,
  VisitorConversation,
  VisitorRequest,
  VisitorSession,
  WidgetInstallation,
} from '../src/modules/widget/models';
async function main() {
  const db = await connectDb();
  try {
    await Promise.all([
      Organization.createIndexes(),
      Membership.createIndexes(),
      AuditEvent.createIndexes(),
      MutationLimit.createIndexes(),
      SalesEmployee.createIndexes(),
      DailyAIUsage.createIndexes(),
      TestConversationRecord.createIndexes(),
      WidgetInstallation.createIndexes(),
      VisitorSession.createIndexes(),
      VisitorConversation.createIndexes(),
      VisitorRequest.createIndexes(),
      QualifiedLead.createIndexes(),
    ]);
    const client = authClient();
    const authDb = client.db(getEnv().MONGODB_DB);
    await createPlatformIndexes(authDb);
    await Promise.all([
      authDb.collection('user').createIndex({ email: 1 }, { unique: true }),
      authDb.collection('session').createIndex({ token: 1 }, { unique: true }),
      authDb.collection('session').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      authDb.collection('account').createIndex({ providerId: 1, accountId: 1 }, { unique: true }),
      authDb.collection('rateLimit').createIndex({ key: 1 }, { unique: true }),
    ]);
    console.log('Database indexes created.');
    await client.close();
  } finally {
    await db.disconnect();
  }
}
main().catch(() => {
  console.error('Index setup failed. Verify database configuration and replica-set access.');
  process.exitCode = 1;
});
