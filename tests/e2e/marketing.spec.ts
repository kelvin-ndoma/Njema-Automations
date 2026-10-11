import { test as base, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { readFile } from 'node:fs/promises';
import { resetTestLimits } from './reset-limits';
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
const title = /Every lead deserves.*response.*Every opportunity deserves.*follow-up/;
test('homepage and supporting pages render without a database or session configuration', async ({
  page,
  request,
}) => {
  for (const path of [
    '/',
    '/features',
    '/how-it-works',
    '/solutions',
    '/pricing',
    '/contact',
    '/privacy',
    '/terms',
  ]) {
    const response = await request.get('http://127.0.0.1:3101' + path);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain('Database unavailable');
  }
  await page.goto('http://127.0.0.1:3101');
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:3101/');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Relay Sales/);
  const sitemap = await request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('/pricing');
  expect(await sitemap.text()).not.toContain('/platform');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /platform');
  const image = await request.get('/opengraph-image');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/png');
});
test('public desktop and mobile navigation, FAQ and responsive product preview work', async ({
  page,
}) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await page.screenshot({ path: 'test-results/marketing-desktop.png', animations: 'disabled' });
  for (const [label, path] of [
    ['Features', '/features'],
    ['How It Works', '/how-it-works'],
    ['Solutions', '/solutions'],
    ['Pricing', '/pricing'],
  ]) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(path + '$'));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('/');
  await page.locator('summary').filter({ hasText: 'What can I use today?' }).click();
  await expect(page.getByText(/The working foundation includes secure accounts/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/marketing-mobile.png', animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Request a demo', exact: true })
    .click();
  await expect(page).toHaveURL(/contact$/);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const [role, email, landing] of [
  ['Super Admin', 'kelvinndomamutua@gmail.com', /platform$/],
  ['Owner', 'platform-owner@example.test', /organizations$/],
] as const) {
  test(`${role} login keeps its private destination while homepage stays public`, async ({
    page,
  }) => {
    await page.goto('/sign-in');
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('development-test-password-123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(landing);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page).toHaveURL('http://127.0.0.1:3100/');
  });
}
async function fillInquiry(page: import('@playwright/test').Page) {
  await page.getByLabel('Your name', { exact: true }).fill('Development Demo Visitor');
  await page.getByLabel('Email address', { exact: true }).fill('demo-browser@example.test');
  await page.getByLabel('Business name', { exact: true }).fill('Development Inquiry Business');
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole('button', { name: 'Send demo inquiry', exact: true }).click();
}
test('demo success corresponds to a saved inquiry and metadata audit event', async ({ page }) => {
  await page.goto('/contact');
  await fillInquiry(page);
  await expect(page.getByRole('heading', { name: 'Your inquiry is saved.' })).toBeVisible();
  const fixture = JSON.parse(await readFile('.runtime/e2e-database.json', 'utf8')) as {
    uri: string;
  };
  const client = new MongoClient(fixture.uri);
  try {
    const row = await client
      .db('e2e')
      .collection('demoinquiries')
      .findOne({ email: 'demo-browser@example.test' });
    expect(row?.business).toBe('Development Inquiry Business');
    expect(
      await client.db('e2e').collection('marketingaudits').countDocuments({ resourceId: row?._id }),
    ).toBe(1);
  } finally {
    await client.close();
  }
});
test('failed persistence never displays success', async ({ page }) => {
  await page.goto('http://127.0.0.1:3101/contact');
  await fillInquiry(page);
  await expect(page.locator('.demo-form').getByRole('alert')).toHaveText(
    'Your inquiry could not be saved. Please try again later.',
  );
  await expect(page.getByRole('heading', { name: 'Your inquiry is saved.' })).toHaveCount(0);
});

test('immersive preview fits responsive widths and honors reduced motion and contrast', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `overflow at ${width}px`,
    ).toBe(true);
    const preview = page.getByRole('figure', { name: /Illustrative AI sales product preview/ });
    await expect(preview).toBeVisible();
    if (width === 1440) expect((await preview.boundingBox())!.width).toBeGreaterThan(760);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.qualification-panel')).toContainText('Human handoff');
  expect(await page.locator('.interface-workflow strong').allTextContents()).toEqual([
    'Capture',
    'Respond',
    'Qualify',
    'Human handoff',
  ]);
  const contrasts = await page.evaluate(() => {
    const luminance = (values: number[]) =>
      values
        .slice(0, 3)
        .map((value) => {
          const s = value / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const selectors = [
      '.hero-description',
      '.hero-availability',
      '.hero-kicker',
      '.hero-copy .marketing-button',
      '.hero-copy .text-link',
      '.relay-product .chat-bubble.employee',
      '.relay-product .chat-bubble.visitor',
      '.qualification-note',
      '.preview-disclaimer',
    ];
    return selectors.map((selector) => {
      const el = document.querySelector(selector)!;
      let parent: Element | null = el;
      let background: number[] = [];
      while (parent) {
        background = rgb(getComputedStyle(parent).backgroundColor);
        if (background.length === 3 || background[3] === 1) break;
        parent = parent.parentElement;
      }
      const fg = luminance(rgb(getComputedStyle(el).color));
      const bg = luminance(background);
      return { selector, ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) };
    });
  });
  for (const entry of contrasts) expect(entry.ratio, entry.selector).toBeGreaterThanOrEqual(4.5);
  expect(
    await page.locator('.hero-copy').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.screenshot({
    path: 'test-results/relay-redesign-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/relay-redesign-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  // Verify both hero CTA destinations using their actual links.
  await page.locator('.hero-copy').getByRole('link', { name: 'Request a demo' }).click();
  await expect(page).toHaveURL(/contact$/);
  await page.goto('/');
  await page.locator('.hero-copy').getByRole('link', { name: 'See how it works' }).click();
  await expect(page).toHaveURL(/how-it-works$/);
});
