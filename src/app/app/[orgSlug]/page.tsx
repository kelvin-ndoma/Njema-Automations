import { Building2, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/modules/organizations/policy';
import { requireUser } from '@/server/session';
import { workspaceFor } from '@/modules/organizations/service';
export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const user = await requireUser(`/app/${orgSlug}`);
  let org;
  try {
    org = await workspaceFor(user.id, orgSlug);
  } catch (e) {
    if (e instanceof AccessDenied) notFound();
    throw e;
  }
  const formattedDate = new Intl.DateTimeFormat(org.locale, {
    timeZone: org.timeZone,
    dateStyle: 'long',
  }).format(new Date());
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.16em] text-primary">{org.name}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">A strong start.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your workspace is ready, {user.name.split(' ')[0]}.
          </p>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">{formattedDate}</p>
      </div>
      <section className="mt-8 grid overflow-hidden rounded-2xl border border-input bg-white md:grid-cols-[1.5fr_1fr]">
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf2e8] px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck size={13} /> Workspace established
          </span>
          <h2 className="mt-5 text-2xl font-medium tracking-tight">
            Room for your next opportunity.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Your business has a secure home. Employee configuration, conversations, and sales
            workflows will arrive in later milestones.
          </p>
        </div>
        <div
          className="hidden items-center justify-center bg-[#eef3e9] p-8 md:flex"
          aria-hidden="true"
        >
          <div className="relative flex size-36 items-center justify-center rounded-full border border-primary/15">
            <div className="flex size-24 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
              <Sparkles size={40} strokeWidth={1.3} />
            </div>
          </div>
        </div>
      </section>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-input p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 size={17} /> Business profile
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd>{org.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Your role</dt>
              <dd className="capitalize">{org.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="truncate">/{org.slug}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-xl border border-input p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Globe2 size={17} /> Regional preferences
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Currency</dt>
              <dd>{org.currency}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Time zone</dt>
              <dd>{org.timeZone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Locale</dt>
              <dd>{org.locale}</dd>
            </div>
          </dl>
        </section>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Only configured workspace information is shown. Sales reporting will become available when
        those workflows are implemented.
      </p>
    </main>
  );
}
