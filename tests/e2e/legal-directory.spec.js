const { test, expect } = require('@playwright/test');

const pages = [
  '/',
  '/image',
  '/pdf',
  '/image/resize',
  '/image/compress',
  '/pdf/image-to-pdf',
  '/pdf/merge',
  '/video/convert-webm',
  '/fonts/webfont-convert',
  '/audio/to-wav',
  '/file/xml-to-csv',
  '/changes',
  '/tools',
  '/privacy',
  '/terms',
  '/contact',
];

test('all tools directory shows cards that link to tools', async ({ page }) => {
  await page.goto('/tools');
  const cards = page.locator('.tool-card');
  await expect(cards).toHaveCount(9);

  await expect(page.locator('.tool-card[href="/image/compress"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/resize"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/image-to-pdf"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/merge"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/video/convert-webm"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/fonts/webfont-convert"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/to-wav"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/file/xml-to-csv"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/changes"]')).toBeVisible();
});

test('footer legal links exist across all pages', async ({ page }) => {
  for (const route of pages) {
    await page.goto(route);
    await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
    await expect(page.locator('footer a[href="/terms"]')).toBeVisible();
    await expect(page.locator('script[src$="cookie-consent.js"]')).toHaveCount(1);
  }
});

test('privacy and terms pages include core legal headings', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  await expect(page.locator('text=Last updated:')).toBeVisible();

  await page.goto('/terms');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeVisible();
  await expect(page.locator('text=Last updated:')).toBeVisible();
});
