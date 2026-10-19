import { requirePlatformOperator } from '@/modules/platform/service';
import { PageHeading, Panel, ProfileFields } from '@/components/platform/presentation';

export default async function Page() {
  const user = await requirePlatformOperator();
  return (
    <>
      <PageHeading
        eyebrow="Signed-in operator"
        title="Your account"
        description="Platform operator identity. Password changes remain local to your sign-in process."
      />
      <Panel title="Account profile" detail="Shown from your authenticated session only.">
        <ProfileFields
          fields={[
            ['Name', user.name],
            ['Email', user.email],
            [
              'Platform role',
              user.platformRole === 'super-admin' ? 'Super administrator' : 'Platform administrator',
            ],
          ]}
        />
      </Panel>
    </>
  );
}
