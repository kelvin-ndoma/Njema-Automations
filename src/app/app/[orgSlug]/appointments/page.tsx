import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getAppointmentsPage } from '@/modules/appointments/service';
import {
  AppointmentStatusButtons,
  RequestAppointmentForm,
} from '@/components/appointment-forms';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getAppointmentsPage(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  const editable =
    can(data.workspace.role, 'organization:update') &&
    !data.workspace.readOnly &&
    !data.workspace.supportMode;
  return (
    <main className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Appointments</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Request and confirm meeting times bound to open opportunities. External calendar write is
        not configured.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3" aria-label="Appointments">
          {!data.appointments.length && (
            <p className="rounded-xl border border-input p-5 text-sm text-muted-foreground">
              No appointment requests yet.
            </p>
          )}
          {data.appointments.map((row) => (
            <article
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-input p-5"
            >
              <div>
                <h2 className="font-medium">{row.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <time dateTime={row.requestedStartAt}>
                    {new Intl.DateTimeFormat(data.workspace.locale, {
                      timeZone: row.timeZone,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(row.requestedStartAt))}
                  </time>
                  {' · '}
                  {row.durationMinutes} min · <span className="capitalize">{row.status}</span>
                </p>
              </div>
              <AppointmentStatusButtons
                slug={orgSlug}
                appointmentId={row.id}
                status={row.status}
                editable={editable}
              />
            </article>
          ))}
        </section>
        <RequestAppointmentForm
          slug={orgSlug}
          opportunities={data.opportunities}
          editable={editable}
        />
      </div>
    </main>
  );
}
