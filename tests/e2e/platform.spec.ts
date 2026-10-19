import { resetTestLimits } from './reset-limits';
import { test as base, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { readFile } from 'node:fs/promises';
const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
test.beforeEach(resetTestLimits);
async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('development-test-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(
    email === 'kelvinndomamutua@gmail.com' ? /platform$/ : /organizations$/,
  );
}
test('anonymous platform routes require login', async ({ page }) => {
  for (const route of [
    '/platform',
    '/platform/organizations',
    '/platform/users',
    '/platform/organizations/000000000000000000000000',
    '/platform/users/000000000000000000000000',
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/sign-in(?:\?|$)/);
  }
});
test('organization owner cannot access platform routes or private data', async ({ page }) => {
  await login(page, 'platform-owner@example.test');
  for (const route of ['/platform', '/platform/organizations', '/platform/users']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Operations overview' })).toHaveCount(0);
    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open platform navigation' })).toHaveCount(0);
  }
});
test('super-admin overview, search, pagination, details, filters and mobile navigation', async ({
  page,
}) => {
  await login(page, 'kelvinndomamutua@gmail.com');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Platform control center' }).click();
  await expect(page.getByRole('heading', { name: 'Operations overview' })).toBeVisible();
  await expect(page.getByText('All registered businesses')).toBeVisible();
  await page.getByRole('button', { name: 'About platform metrics' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Reporting period').selectOption('7');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page).toHaveURL(/days=7/);
  await expect(page.getByRole('heading', { name: 'Operations overview' })).toBeVisible();
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/platform-overview-desktop.png', fullPage: true });
  await page
    .getByRole('navigation', { name: 'Platform navigation' })
    .getByRole('link', { name: 'Organizations', exact: true })
    .click();
  await expect(page.getByRole('table', { name: 'Organization directory' })).toBeVisible();
  await page.getByRole('link', { name: 'Next page' }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByLabel('Search directory').fill('Development Business 01');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'View Development Business 01' }).click();
  await expect(page.getByRole('heading', { name: 'Development Business 01' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Organization memberships' })).toBeVisible();
  await page.getByRole('link', { name: /Development Owner.*platform-owner/ }).click();
  await expect(page.getByRole('heading', { name: 'Development Owner' })).toBeVisible();
  await expect(page.getByText('No platform access', { exact: true })).toBeVisible();
  await page.goto('/platform/users?q=does-not-exist');
  await expect(page.getByRole('heading', { name: 'No records found' })).toBeVisible();
  await page.goto('/platform/organizations?status=untracked');
  await expect(page.getByLabel('Organization status')).toHaveValue('untracked');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/platform');
  await page.getByRole('button', { name: 'Open platform navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Platform navigation' })).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page).toHaveURL(/platform\/users$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Registered user directory' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/platform-users-mobile.png', fullPage: true });
  await page.goto('/platform/users/invalid');
  await expect(page.getByRole('heading', { name: 'Platform resource unavailable.' })).toBeVisible();
});
test('revoked platform grant denies fresh route requests', async ({ page }) => {
  await login(page, 'kelvinndomamutua@gmail.com');
  const config = JSON.parse(await readFile('.runtime/e2e-database.json', 'utf8')) as {
    uri: string;
    adminId: string;
  };
  const client = new MongoClient(config.uri);
  const grants = client
    .db('e2e')
    .collection<{ _id: string; userId: string; role: string; createdAt: Date }>('platformRoles');
  const grant = await grants.findOne({ _id: 'super-admin' });
  try {
    await grants.deleteOne({ _id: 'super-admin' });
    await page.goto('/platform/users');
    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toHaveCount(0);
  } finally {
    if (grant) await grants.insertOne(grant);
    await client.close();
  }
});

test('platform default overrides saved workspace, membership switching and logout work', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'workspace', value: 'development-business-18', url: 'http://127.0.0.1:3100' },
  ]);
  await login(page, 'kelvinndomamutua@gmail.com');
  await page.getByRole('link', { name: 'My organization workspaces' }).click();
  await expect(page).toHaveURL(/organizations$/);
  await page.getByRole('button', { name: /Development Business 18/ }).click();
  await expect(page).toHaveURL(/app\/development-business-18$/);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Platform control center' }).click();
  await expect(page).toHaveURL(/platform$/);
  await page.goto('/app/development-business-1');
  await expect(page.getByRole('heading', { name: 'Workspace unavailable.' })).toBeVisible();
  await page.goto('/platform/security');
  await expect(page.getByRole('heading', { name: 'Security & Audit' })).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/sign-in$/);
  await page.goto('/platform');
  await expect(page).toHaveURL(/sign-in/);
});
test('organization admin has only tenant access and authorized deep links survive login', async ({
  page,
}) => {
  await page.goto('/app/development-business-1');
  await expect(page).toHaveURL(/next=/);
  await page.getByLabel('Work email').fill('org-admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('development-test-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/app\/development-business-1$/);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Platform control center' })).toHaveCount(0);
  await page.goto('/platform');
  await expect(page.getByRole('heading', { name: 'Operations overview' })).toHaveCount(0);
});
test('authorized platform deep links survive authentication', async ({ page }) => {
  await page.goto('/platform/users?q=Development');
  await page.getByLabel('Work email').fill('kelvinndomamutua@gmail.com');
  await page.getByLabel('Password', { exact: true }).fill('development-test-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/platform\/users\?q=Development$/);
});

test('a platform administrator with viewer membership cannot edit the employee or run tenant test chat', async ({
  page,
}) => {
  await login(page, 'kelvinndomamutua@gmail.com');
  await page.goto('/app/development-business-18/employee');
  await expect(page.getByRole('heading', { name: 'Your sales employee' })).toBeVisible();
  await expect(page.getByLabel('Employee name', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save employee configuration' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Test employee', exact: true })).toHaveCount(0);
  await page.goto('/app/development-business-18/settings');
  await expect(page.getByLabel('Business name', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save business settings' })).toHaveCount(0);
  await page.goto('/app/development-business-18/test-chat');
  await expect(page.getByRole('heading', { name: 'Workspace unavailable.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask employee' })).toHaveCount(0);
});
