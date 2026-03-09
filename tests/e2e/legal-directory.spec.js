const { test, expect } = require('@playwright/test');

const pages = [
  '/index.html',
  '/pdf.html',
  '/video.html',
  '/fonts.html',
  '/audio.html',
  '/file.html',
  '/changes.html',
  '/all-tools.html',
  '/privacy.html',
  '/terms.html',
];

test('all tools directory shows cards that link to tools', async ({ page }) => {
  await page.goto('/all-tools.html');
  const cards = page.locator('.tool-card');
  await expect(cards).toHaveCount(9);

  await expect(page.locator('.tool-card[href="image-compress.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="index.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="pdf.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="pdf-merge.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="video.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="fonts.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="audio.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="file.html"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="changes.html"]')).toBeVisible();
});

test('footer legal links exist across all pages', async ({ page }) => {
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator('footer a[href="privacy.html"]')).toBeVisible();
    await expect(page.locator('footer a[href="terms.html"]')).toBeVisible();
    await expect(page.locator('script[src="cookie-consent.js"]')).toHaveCount(1);
  }
});

test('privacy and terms pages include core legal headings', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  await expect(page.locator('text=Last updated:')).toBeVisible();

  await page.goto('/terms.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeVisible();
  await expect(page.locator('text=Last updated:')).toBeVisible();
});
