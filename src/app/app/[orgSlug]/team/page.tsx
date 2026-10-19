import { notFound } from 'next/navigation';
import { AccessDenied } from '@/modules/organizations/policy';
import { getTeamPage } from '@/modules/team/service';
import {
  InviteMemberForm,
  MemberRoleForm,
  RevokeInvitationButton,
  RevokeMemberButton,
} from '@/components/team-forms';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getTeamPage(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const activeOwners = data.members.filter(
    (member) => member.role === 'owner' && member.status === 'active',
  ).length;
  return (
    <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Team</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Manage members and invitations for this workspace. Invitation email delivery is not
        configured; share accept links securely.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <section className="space-y-3" aria-label="Members">
            <h2 className="text-sm font-semibold">Members</h2>
            {!data.members.length && (
              <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
                No members found.
              </p>
            )}
            {data.members.map((member) => (
              <article
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-input p-5"
              >
                <div>
                  <p className="font-medium">{member.name ?? member.email ?? member.userId}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.email ?? 'Email unavailable'} ·{' '}
                    <span className="capitalize">{member.status}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <MemberRoleForm
                    slug={orgSlug}
                    membershipId={member.id}
                    role={member.role}
                    canManage={data.canManage}
                    isOwner={member.role === 'owner'}
                  />
                  <RevokeMemberButton
                    slug={orgSlug}
                    membershipId={member.id}
                    canManage={data.canManage}
                    disabled={
                      member.role === 'owner' && activeOwners <= 1
                        ? true
                        : member.userId === data.currentUserId
                    }
                  />
                </div>
              </article>
            ))}
          </section>
          <section className="space-y-3" aria-label="Pending invitations">
            <h2 className="text-sm font-semibold">Pending invitations</h2>
            {!data.invitations.length && (
              <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
                No pending invitations.
              </p>
            )}
            {data.invitations.map((invite) => (
              <article
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-input p-5"
              >
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="capitalize">{invite.role}</span> · expires{' '}
                    {new Intl.DateTimeFormat(data.workspace.locale, {
                      timeZone: data.workspace.timeZone,
                      dateStyle: 'medium',
                    }).format(new Date(invite.expiresAt))}
                  </p>
                </div>
                {invite.status === 'pending' && (
                  <RevokeInvitationButton
                    slug={orgSlug}
                    invitationId={invite.id}
                    canManage={data.canManage}
                  />
                )}
              </article>
            ))}
          </section>
        </div>
        <InviteMemberForm slug={orgSlug} canManage={data.canManage} />
      </div>
    </main>
  );
}
