import { getPlatformSettings } from '@/modules/platform/operations-repository';
import { requirePlatformOperator } from '@/modules/platform/service';
import { PageHeading, Panel, ProfileFields } from '@/components/platform/presentation';
import { OperationForm } from '@/components/platform/operation-form';
import { Field, ToggleField, Reason } from '@/components/platform/fields';
export default async function Page() {
  const operator = await requirePlatformOperator();
  const data = await getPlatformSettings();
  const canEdit = operator.platformRole === 'super-admin';
  return (
    <>
      <PageHeading
        eyebrow="Platform policy"
        title="Platform Settings"
        description="Server-enforced operational defaults. No secrets are stored in these settings."
      />
      <div className="max-w-4xl">
        <Panel title="Identity, limits & access policy">
          <ProfileFields
            fields={[
              ['Platform identity', data.identity],
              ['Daily allowance', `${data.dailyRequests} requests / ${data.dailyTokens} tokens`],
              ['Trial policy', `${data.trialDays} days`],
              [
                'Support access',
                `${data.supportEnabled ? 'Enabled' : 'Disabled'} · ${data.supportMinutes} minutes`,
              ],
              ['AI execution', data.aiEnabled ? 'Enabled' : 'Disabled'],
              ['Allowed models', data.models.join(', ') || 'No model identifiers configured'],
              [
                'Daily cost ceiling',
                data.dailyCostUsd === null ? 'Not configured' : `$${data.dailyCostUsd} USD`,
              ],
            ]}
          />
          <div className="p-5">
            {canEdit ? (
              <OperationForm operation="settings.save" label="Save platform settings" sensitive>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    name="identity"
                    label="Platform identity"
                    value={data.identity}
                    maxLength={80}
                  />
                  <Field
                    name="models"
                    label="Allowed AI model identifiers (comma separated)"
                    value={data.models.join(', ')}
                    required={false}
                  />
                  <Field
                    name="dailyRequests"
                    label="Default daily AI request limit"
                    type="number"
                    value={data.dailyRequests}
                    min={1}
                    max={10000}
                  />
                  <Field
                    name="dailyTokens"
                    label="Default daily AI token limit"
                    type="number"
                    value={data.dailyTokens}
                    min={1}
                  />
                  <Field
                    name="dailyCostUsd"
                    label="Daily estimated provider-cost ceiling USD (optional)"
                    type="number"
                    value={data.dailyCostUsd ?? ''}
                    required={false}
                    min={0}
                  />
                  <Field
                    name="trialDays"
                    label="Trial policy (days)"
                    type="number"
                    value={data.trialDays}
                    min={1}
                    max={90}
                  />
                  <Field
                    name="supportMinutes"
                    label="Support access lifetime (minutes)"
                    type="number"
                    value={data.supportMinutes}
                    min={1}
                    max={30}
                  />
                </div>
                <ToggleField name="aiEnabled" label="Enable AI execution" value={data.aiEnabled} />
                <ToggleField
                  name="supportEnabled"
                  label="Enable explicit read-only support access"
                  value={data.supportEnabled}
                />
                <p className="text-sm text-muted-foreground">
                  After settings are saved, an empty model list disables all AI models. Cost ceilings
                  require a recorded model rate. Trial changes apply to new assignments; existing
                  trial expiry dates are preserved.
                </p>
                <Reason />
              </OperationForm>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only the Super Admin can change platform settings. Platform Admins can view policy
                here and use Support Mode to mask into customer organizations.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
