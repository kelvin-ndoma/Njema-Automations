import { notFound } from 'next/navigation';
import { AccessDenied, can } from '@/modules/organizations/policy';
import { getEmployeeConfiguration } from '@/modules/employees/service';
import { EmployeeForm } from '@/components/employee-form';
import { EmployeeStatusControl } from '@/components/employee-status-control';
import Link from 'next/link';

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  let data;
  try {
    data = await getEmployeeConfiguration(orgSlug);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
      <p className="text-xs uppercase tracking-wider text-primary">{data.workspace.name}</p>
      <h1 className="mt-3 text-3xl font-semibold">Your sales employee</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Give your employee a name, an approach, and approved business knowledge.
      </p>
      <p className="mt-4 rounded-lg bg-muted p-4 text-sm">
        Configuration is saved privately. Set the sales goal, qualification criteria, escalation
        rules and allowed actions, then test replies when an OpenAI connection is configured.
        Website visitors use the same employee through Website installation.
      </p>
      {data.employee && (
        <EmployeeStatusControl
          slug={orgSlug}
          employee={data.employee}
          editable={
            can(data.workspace.role, 'organization:update') &&
            !data.workspace.readOnly &&
            !data.workspace.supportMode
          }
        />
      )}
      {data.employee && can(data.workspace.role, 'organization:update') && (
        <Link
          className="mt-4 inline-block text-sm text-primary underline"
          href={`/app/${orgSlug}/test-chat`}
        >
          Test your employee
        </Link>
      )}
      <EmployeeForm
        slug={orgSlug}
        employee={data.employee}
        editable={can(data.workspace.role, 'organization:update') && !data.workspace.readOnly}
      />
    </main>
  );
}
