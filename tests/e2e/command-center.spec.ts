import { test, expect } from '@playwright/test';
import { resetTestLimits } from './reset-limits';
test.beforeEach(resetTestLimits);
async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('development-test-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(
    email === 'kelvinndomamutua@gmail.com' ? /platform$/ : /organizations$/,
  );
}
test('operational controls persist and enforce lifecycle, restrictions, support, billing, policies and account security', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, 'kelvinndomamutua@gmail.com');
  await page.goto('/platform/organizations?q=Development%20Business%2001');
  await page.getByRole('link', { name: 'View Development Business 01' }).click();
  await expect(page).toHaveURL(/\/platform\/organizations\/[a-f0-9]{24}$/);
  const orgUrl = page.url();
  const orgId = orgUrl.split('/').at(-1)!;
  await page.getByRole('button', { name: 'Suspend organization', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Type organization address: development-business-1')
    .fill('development-business-1');
  await dialog.getByLabel('Reason for change').fill('Synthetic suspension verification');
  await dialog.getByRole('button', { name: 'Suspend organization', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Operation saved.');
  await dialog.getByRole('button', { name: 'Close operation' }).click();
  const context = await browser.newContext();
  const owner = await context.newPage();
  await signIn(owner, 'platform-owner@example.test');
  await owner.goto('/app/development-business-1');
  await expect(owner.getByRole('heading', { name: 'Workspace unavailable.' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Reactivate organization', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Type organization address: development-business-1')
    .fill('development-business-1');
  await dialog.getByLabel('Reason for change').fill('Synthetic reactivation verification');
  await dialog.getByRole('button', { name: 'Reactivate organization', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Operation saved.');
  await dialog.getByRole('button', { name: 'Close operation' }).click();
  await owner.goto('/app/development-business-1');
  await expect(owner.getByRole('heading', { name: 'A strong start.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit restrictions' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Make customer workspace read-only').check();
  await dialog
    .getByLabel('Type organization address: development-business-1')
    .fill('development-business-1');
  await dialog.getByLabel('Reason for change').fill('Synthetic read-only verification');
  await dialog.getByRole('button', { name: 'Edit restrictions' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Operation saved.');
  await dialog.getByRole('button', { name: 'Close operation' }).click();
  await owner.goto('/app/development-business-1/settings');
  await expect(owner.getByRole('button', { name: 'Save business settings' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit restrictions' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Make customer workspace read-only').uncheck();
  await dialog
    .getByLabel('Type organization address: development-business-1')
    .fill('development-business-1');
  await dialog.getByLabel('Reason for change').fill('Synthetic normal access restored');
  await dialog.getByRole('button', { name: 'Edit restrictions' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Operation saved.');
  await dialog.getByRole('button', { name: 'Close operation' }).click();
  await page.getByLabel('Note — visible only to Super Admin').fill('Synthetic organization note');
  await page.getByRole('button', { name: 'Add internal note' }).click();
  await expect(page.getByText('Synthetic organization note', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect organization (support mode)' }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Type organization address: development-business-1')
    .fill('development-business-1');
  await dialog.getByLabel('Reason for change').fill('Synthetic read-only support verification');
  await dialog.getByRole('button', { name: 'Inspect organization (support mode)', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/development-business-1/);
  await expect(page.getByText('Support mode · viewing Development Business 01')).toBeVisible();
  await page.getByRole('link', { name: 'Issue summary' }).click();
  await expect(page).toHaveURL(/platform\/support\/access\//);
  await expect(page.getByRole('heading', { name: 'Detected issues' })).toBeVisible();
  const supportUrl = page.url();
  await page.getByRole('button', { name: 'Exit support mode' }).click();
  await expect(page).toHaveURL(/platform\/support$/);
  await page.goto(supportUrl);
  await expect(page.getByRole('heading', { name: 'Platform resource unavailable.' })).toBeVisible();
  await page.goto('/platform/support');
  await page.getByLabel('Organization', { exact: true }).selectOption(orgId);
  await page.getByLabel('Subject', { exact: true }).fill('Synthetic support ticket');
  await page.getByLabel('Initial internal note').fill('Synthetic initial support note');
  await page.getByRole('button', { name: 'Create support request' }).click();
  await page.getByRole('link', { name: 'Synthetic support ticket' }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('in_progress');
  await page.getByLabel('Assign to me (Super Admin)').check();
  await page.getByLabel('Add internal note (optional)').fill('Synthetic follow-up note');
  await page.getByLabel('Reason for change').fill('Synthetic support assignment');
  await page.getByRole('button', { name: 'Update support request' }).click();
  await expect(page.getByRole('status')).toHaveText('Operation saved.');
  await page.reload();
  await expect(page.getByLabel('Assign to me (Super Admin)')).toBeChecked();
  await expect(page.getByText('Synthetic follow-up note', { exact: true })).toBeVisible();
  await page.goto('/platform/billing');
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create plan', exact: true }) });
  await form.getByLabel('Plan code').fill('browser-pilot');
  await form.getByLabel('Plan name').fill('Synthetic Browser Plan');
  await form.getByLabel('Currency code').fill('USD');
  await form.getByLabel('Reason for change').fill('Synthetic browser plan');
  await form.getByRole('button', { name: 'Create plan', exact: true }).click();
  await expect(page.getByText('Synthetic Browser Plan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save subscription', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Organization', { exact: true }).selectOption(orgId);
  await dialog.getByLabel('Subscription state').selectOption('trial');
  await dialog.getByLabel('Type organization address').fill('development-business-1');
  await dialog.getByLabel('Reason for change').fill('Synthetic subscription assignment');
  await dialog.getByRole('button', { name: 'Save subscription', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Operation saved.');
  await dialog.getByRole('button', { name: 'Close operation' }).click();
  await expect(page.getByRole('table', { name: 'Organization subscriptions' })).toContainText(
    'trial',
  );
  await page.goto('/platform/ai');
  await page.getByRole('button', { name: 'Save model policy', exact: true }).click();
  await page.getByLabel('Model identifier').fill('synthetic-model');
  await page.getByLabel('Input USD per million tokens').fill('1');
  await page.getByLabel('Output USD per million tokens').fill('2');
  await page.getByLabel('Reason for change').fill('Synthetic model rate policy');
  await page.getByRole('button', { name: 'Save model policy' }).click();
  await expect(page.getByText('synthetic-model · Enabled', { exact: true })).toBeVisible();
  await page.goto('/platform/settings');
  await page.getByRole('button', { name: 'Save platform settings', exact: true }).click();
  await page.getByLabel('Platform identity').fill('Relay Operations');
  await page.getByLabel('Allowed AI model identifiers (comma separated)').fill('synthetic-model');
  await page.getByLabel('Reason for change').fill('Synthetic settings update');
  await page.getByRole('button', { name: 'Save platform settings' }).click();
  await expect(page.getByRole('status')).toHaveText('Operation saved.');
  await page.reload();
  await page.getByRole('button', { name: 'Save platform settings', exact: true }).click();
  await expect(page.getByLabel('Platform identity')).toHaveValue('Relay Operations');
  await page.goto('/platform/health');
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  await page.getByLabel('Incident summary').fill('Synthetic browser incident');
  await page.getByLabel('Internal incident notes').fill('Synthetic investigation note');
  await page.getByRole('button', { name: 'Record incident' }).click();
  await expect(page.getByRole('table', { name: 'Operational incident history' })).toContainText(
    'Synthetic browser incident',
  );
  await page.goto('/platform/users?q=platform-owner');
  await page
    .getByRole('link', { name: /Development Owner/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Restrict account', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Type account email: platform-owner@example.test')
    .fill('platform-owner@example.test');
  await dialog.getByLabel('Reason for change').fill('Synthetic user restriction');
  await dialog.getByRole('button', { name: 'Restrict account', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Operation saved.');
  await dialog.getByRole('button', { name: 'Close operation' }).click();
  await owner.goto('/app/development-business-1');
  await expect(owner).toHaveURL(/sign-in/);
  await page.getByRole('button', { name: 'Restore account access' }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Type account email: platform-owner@example.test')
    .fill('platform-owner@example.test');
  await dialog.getByLabel('Reason for change').fill('Synthetic user access restored');
  await dialog.getByRole('button', { name: 'Restore account access', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Operation saved.');
  await dialog.getByRole('button', { name: 'Close operation' }).click();
  await context.close();
  await page.goto('/platform/security?q=organization.state');
  await page
    .getByRole('link', { name: /^organization state$/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Security event', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/platform/billing');
  await expect(
    page.getByRole('heading', { name: 'Billing & Subscriptions', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('table', { name: 'Organization subscriptions' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/command-center-billing-mobile.png', fullPage: true });
  for (const [path, title] of [
    ['ai', 'AI Operations'],
    ['health', 'System Health'],
  ]) {
    await page.goto('/platform/' + path);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect(errors).toEqual([]);
});
