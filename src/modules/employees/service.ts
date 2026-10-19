import 'server-only';
import { requireUser } from '@/server/session';
import { AccessDenied } from '@/modules/organizations/policy';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { employeeInput, employeeStatusInput } from './input';
import { readConfiguration, setEmployeeStatus, writeConfiguration } from './repository';

export async function getEmployeeConfiguration(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  return { workspace, employee: await readConfiguration(workspace.id, user.id) };
}

export async function saveEmployeeConfiguration(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = employeeInput.parse(raw);
  await limitMutation(user.id);
  await writeConfiguration(workspace.id, user.id, input);
}

export async function updateEmployeeStatus(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) throw new AccessDenied();
  const input = employeeStatusInput.parse(raw);
  await limitMutation(user.id);
  return setEmployeeStatus(workspace.id, user.id, input.status, input.revision);
}
