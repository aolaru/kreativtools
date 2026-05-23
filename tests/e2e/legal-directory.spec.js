const { test, expect } = require('@playwright/test');

const pages = [
  '/',
  '/image',
  '/image/crop',
  '/pdf',
  '/image/resize',
  '/image/compress',
  '/pdf/image-to-pdf',
  '/pdf/split',
  '/pdf/merge',
  '/video/convert-webm',
  '/fonts/webfont-convert',
  '/audio/to-wav',
  '/audio/to-mp3',
  '/file/xml-to-csv',
  '/changes',
  '/workflows',
  '/workflows/image-prep',
  '/workflows/pdf-delivery',
  '/workflows/audio-delivery',
  '/tools',
  '/privacy',
  '/terms',
  '/contact',
];

test('all tools directory shows cards that link to tools', async ({ page }) => {
  await page.goto('/tools');
  const cards = page.locator('.tool-card');
  await expect(cards).toHaveCount(23);

  await expect(page.locator('.tools-upsell').getByRole('link', { name: 'Open Workflows' })).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/crop/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/compress/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/resize/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/to-webp/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/image-to-pdf/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/to-docx/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/fill-sign/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/split/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/merge/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/compress/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/video/convert-webm/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/video/thumbnail/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/video/trim/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/fonts/webfont-convert/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/fonts/preview/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/fonts/css-generator/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/to-wav/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/to-mp3/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/trim/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/volume/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/file/xml-to-csv/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/file/json-to-csv/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/file/csv-to-json/"]')).toBeVisible();
});

test('all tools directory supports search and media filters', async ({ page }) => {
  await page.goto('/tools');
  const visibleCards = page.locator('.category-grid .tool-card:not([hidden])');

  await expect(visibleCards).toHaveCount(23);
  await page.getByRole('button', { name: 'PDF' }).click();
  await expect(visibleCards).toHaveCount(6);
  await expect(page.locator('.tool-card[href="/pdf/merge/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/to-mp3/"]')).toBeHidden();

  await page.fill('#toolDirectorySearch', 'signature');
  await expect(visibleCards).toHaveCount(1);
  await expect(page.locator('.tool-card[href="/pdf/fill-sign/"]')).toBeVisible();
  await expect(page.locator('#toolDirectorySummary')).toContainText('Showing 1 of 23');

  await page.getByRole('button', { name: 'All' }).click();
  await page.fill('#toolDirectorySearch', 'zzz-no-match');
  await expect(page.locator('#toolsEmptyState')).toBeVisible();
});

test('footer legal links exist across all pages', async ({ page }) => {
  for (const route of pages) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('footer a[href="/privacy/"]')).toBeVisible();
    await expect(page.locator('footer a[href="/terms/"]')).toBeVisible();
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
