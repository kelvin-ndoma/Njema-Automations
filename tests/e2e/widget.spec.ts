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

test('website installation, visitor chat, lead capture and inbox', async ({ page, request }) => {
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Jordan');
  await page.getByLabel('Work email').fill('jordan-widget@example.test');
  await page.getByLabel('Password', { exact: true }).fill('unique-password-123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/organizations\/new$/);
  await page.getByLabel('Business name').fill('Widget Shop');
  await page.getByLabel('Workspace address').fill('widget-shop');
  await page.getByLabel('Currency', { exact: true }).selectOption('USD');
  await page.getByLabel('Locale', { exact: true }).fill('en-US');
  await page.getByLabel('Business time zone').selectOption('UTC');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page).toHaveURL(/\/app\/widget-shop$/);

  await page.getByRole('link', { name: 'Sales employee', exact: true }).click();
  await page.getByLabel('Employee name', { exact: true }).fill('Shop Assistant');
  await page
    .getByLabel('Conversation instructions', { exact: true })
    .fill('Ask about the visitor needs before recommending a service.');
  await page
    .getByLabel('Approved business knowledge', { exact: true })
    .fill('Consultations are available Monday to Friday from nine to five.');
  await page
    .getByLabel('Answer when information is missing', { exact: true })
    .fill('Please contact our team for information not available here.');
  await page.getByRole('button', { name: 'Save employee configuration' }).click();
  await expect(page.getByRole('status')).toHaveText('Employee configuration saved.');

  await page.getByRole('link', { name: 'Website installation', exact: true }).click();
  await page.getByLabel('Allowed website origins').fill('http://127.0.0.1:3100');
  await page.getByLabel('Enable website chat on the allowed origins').check();
  await page.getByRole('button', { name: 'Save website installation' }).click();
  await expect(page.getByRole('status')).toHaveText('Website installation saved.');
  await page.reload();
  await expect(page.getByLabel('Allowed website origins')).toHaveValue('http://127.0.0.1:3100');
  const snippet = await page.locator('pre').innerText();
  expect(snippet).toContain('/api/widget/loader?key=wk_');
  const key = snippet.match(/key=(wk_[A-Za-z0-9_-]+)/)?.[1];
  expect(key).toBeTruthy();

  const denied = await request.get(`http://127.0.0.1:3100/api/widget/bootstrap?key=${key}`, {
    headers: { Origin: 'https://evil.example' },
  });
  expect(denied.status()).toBe(403);
  expect(denied.headers()['access-control-allow-origin']).toBeUndefined();

  await page.getByRole('link', { name: 'Open the same-origin preview' }).click();
  await expect(page.getByRole('heading', { name: 'Website chat preview' })).toBeVisible();
  await page.locator('#relay-sales-widget button', { hasText: 'Chat' }).click();
  await page.locator('#relay-sales-widget input[name="message"]').fill('When are consultations?');
  await page.locator('#relay-sales-widget form').first().locator('button[type="submit"]').click();
  await expect(
    page.locator('#relay-sales-widget', { hasText: 'Based on our approved information:' }),
  ).toBeVisible({ timeout: 15000 });
  await page.locator('#relay-sales-widget input[name="name"]').fill('Sam Visitor');
  await page.locator('#relay-sales-widget input[name="email"]').fill('sam@visitor.example');
  await page.locator('#relay-sales-widget input[name="consent"]').check();
  await page
    .locator('#relay-sales-widget form')
    .nth(1)
    .locator('button[type="submit"]')
    .click();
  await expect(page.getByText('Thanks — your details were shared with the business.')).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole('link', { name: 'Inbox', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sam Visitor' })).toBeVisible();
  await expect(page.getByText('sam@visitor.example')).toBeVisible();
  await expect(page.getByText('Latest visitor message:', { exact: false })).toBeVisible();
});
