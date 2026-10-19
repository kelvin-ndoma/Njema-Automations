import { resetTestLimits } from './reset-limits';
import { test as base, expect } from '@playwright/test';
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
test('protected routes redirect anonymous users', async ({ page }) => {
  for (const route of ['/organizations', '/organizations/new', '/app/private', '/account']) {
    await page.goto(route);
    await expect(page).toHaveURL(/sign-in/);
  }
});
test('signup, organization creation, switching and logout', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Morgan');
  await page.getByLabel('Work email').fill('morgan@example.test');
  await page.getByLabel('Password', { exact: true }).fill('unique-password-123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/organizations\/new$/);
  async function create(name: string, slug: string) {
    await page.getByLabel('Business name').fill(name);
    await page.getByLabel('Workspace address').fill(slug);
    await page.getByLabel('Currency', { exact: true }).selectOption('EUR');
    await page.getByLabel('Locale', { exact: true }).fill('en-GB');
    await page.getByLabel('Business time zone').selectOption('Europe/London');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${slug}$`));
  }
  await create('First Business', 'first-business');
  await expect(page.getByRole('heading', { name: 'A strong start.' })).toBeVisible();
  await page.getByRole('link', { name: 'Business settings', exact: true }).click();
  await page.getByLabel('Business name', { exact: true }).fill('First Business Updated');
  await page.getByLabel('Currency', { exact: true }).selectOption('USD');
  await page.getByRole('button', { name: 'Save business settings' }).click();
  await expect(page.getByRole('status')).toHaveText('Business settings saved.');
  await page.reload();
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'First Business Updated',
  );
  await page.getByRole('link', { name: 'Sales employee', exact: true }).click();
  await page.getByLabel('Employee name', { exact: true }).fill('Morgan Sales');
  await page
    .getByLabel('Conversation instructions', { exact: true })
    .fill('Ask about the visitor business needs before recommending services.');
  await page
    .getByLabel('Approved business knowledge', { exact: true })
    .fill('We provide business consultations on weekdays from 9am to 5pm.');
  await page
    .getByLabel('Answer when information is missing', { exact: true })
    .fill('Please contact our team for information not available here.');
  await page.getByRole('button', { name: 'Save employee configuration' }).click();
  await expect(page.getByRole('status')).toHaveText('Employee configuration saved.');
  await page.reload();
  await expect(page.getByLabel('Employee name', { exact: true })).toHaveValue('Morgan Sales');
  await page.getByLabel('Employee name', { exact: true }).fill('Morgan Assistant');
  await page.getByRole('button', { name: 'Save employee configuration' }).click();
  await expect(page.getByRole('status')).toHaveText('Employee configuration saved.');
  await page.reload();
  await expect(page.getByLabel('Employee name', { exact: true })).toHaveValue('Morgan Assistant');
  await page.getByRole('link', { name: 'Test employee', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Test your sales employee' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask employee', exact: true })).toBeEnabled();
  await expect(page.getByText('No test questions yet.', { exact: false })).toBeVisible();
  await page.getByLabel('Test question').fill('When are consultations available?');
  await page.getByRole('button', { name: 'Ask employee', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Reply saved below.');
  await expect(page.getByText('Based on our approved information:', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: 'test-results/workspace-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/workspace-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/organizations/new');
  await create('Second Business', 'second-business');
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'First Business Updated' }).click();
  await expect(page).toHaveURL(/app\/first-business$/);
  await page.goto('/app/unrelated-workspace');
  await expect(page.getByRole('heading', { name: 'Workspace unavailable.' })).toBeVisible();
  await page.goto('/app/first-business');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/sign-in(?:\?|$)/);
  await page.goto('/app/first-business');
  await expect(page).toHaveURL(/sign-in(?:\?|$)/);
  await page.getByLabel('Work email').fill('morgan@example.test');
  await page.getByLabel('Password', { exact: true }).fill('unique-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/app\/first-business$/);
});
test('auth validation and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sign-up');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Use at least 12 characters')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
