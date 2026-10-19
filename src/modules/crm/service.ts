import 'server-only';
import { requireUser } from '@/server/session';
import { workspaceFor, limitMutation } from '@/modules/organizations/service';
import { contactInput, contactOptOutInput, opportunityStageInput } from './input';
import {
  createManualContact,
  listContacts,
  listOpportunities,
  moveOpportunityStage,
  setContactCommunicationOptOut,
} from './repository';

export async function getCrmContacts(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  return { workspace, contacts: await listContacts(workspace.id, user.id) };
}

export async function getCrmPipeline(slug: string) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug);
  return { workspace, ...(await listOpportunities(workspace.id, user.id)) };
}

export async function createContact(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) {
    const { AccessDenied } = await import('@/modules/organizations/policy');
    throw new AccessDenied();
  }
  const input = contactInput.parse(raw);
  await limitMutation(user.id);
  return createManualContact(workspace.id, user.id, input);
}

export async function updateOpportunityStage(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) {
    const { AccessDenied } = await import('@/modules/organizations/policy');
    throw new AccessDenied();
  }
  const input = opportunityStageInput.parse(raw);
  await limitMutation(user.id);
  return moveOpportunityStage(workspace.id, user.id, input.opportunityId, input.stageKey);
}

export async function updateContactOptOut(slug: string, raw: unknown) {
  const user = await requireUser();
  const workspace = await workspaceFor(user.id, slug, 'organization:update');
  if (workspace.supportMode || workspace.readOnly) {
    const { AccessDenied } = await import('@/modules/organizations/policy');
    throw new AccessDenied();
  }
  const input = contactOptOutInput.parse(raw);
  await limitMutation(user.id);
  return setContactCommunicationOptOut(
    workspace.id,
    user.id,
    input.contactId,
    input.communicationOptOut,
  );
}
