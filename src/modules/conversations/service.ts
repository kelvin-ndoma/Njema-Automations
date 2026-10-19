import 'server-only';
import { requireUser } from '@/server/session';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { readConfiguration } from '@/modules/employees/repository';
import { ConversationUnavailable, testQuestionInput } from './input';
import { buildPrompt, generateReply, providerConfiguration } from './provider';
import { completeTest, failTest, recentTests, reserveTest } from './repository';

export async function getTestChat(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  const employee = await readConfiguration(workspace.id, user.id);
  let available = false;
  try {
    providerConfiguration();
    available = true;
  } catch {
    /* No credentials enter the DTO. */
  }
  return {
    workspace,
    employee,
    available,
    conversations: await recentTests(workspace.id, user.id),
  };
}
export async function askTestQuestion(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  const input = testQuestionInput.parse(raw);
  const config = providerConfiguration();
  const employee = await readConfiguration(workspace.id, user.id);
  if (!employee)
    throw new ConversationUnavailable(
      'Configure your employee and approved knowledge before testing.',
    );
  await limitMutation(user.id);
  const prompt = buildPrompt(employee, input.question);
  const operation = await reserveTest(workspace.id, user.id, {
    ...input,
    reservedTokens: prompt.reservedTokens,
    model: config.model,
    employeeRevision: employee.revision,
  });
  try {
    // Recheck live access immediately before external execution and before publication.
    await workspaceFor(user.id, slug, 'organization:update');
    const reply = await generateReply(employee, input.question);
    await completeTest(workspace.id, user.id, operation.id, reply);
  } catch (error) {
    await failTest(workspace.id, user.id, operation.id).catch(() => {});
    throw error;
  }
}
