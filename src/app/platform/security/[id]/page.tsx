import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSecurityEvent } from '@/modules/platform/event-repository';
import { Panel, ProfileFields, formatDate, PageHeading } from '@/components/platform/presentation';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getSecurityEvent(id);
  if (!event) notFound();
  return (
    <>
      <Link href="/platform/security" className="text-sm text-primary">
        ← Audit directory
      </Link>
      <PageHeading
        eyebrow="Protected audit metadata"
        title="Security event"
        description={event.action}
      />
      <Panel title="Event details">
        <ProfileFields
          fields={[
            ['Event ID', event.id],
            ['Source', event.source],
            ['Actor ID', event.actorId],
            ['Organization ID', event.organizationId || 'Global'],
            ['Resource ID', event.resourceId || 'Not recorded'],
            ['Recorded UTC', formatDate(event.createdAt, true)],
          ]}
        />
      </Panel>
    </>
  );
}
