const { test, expect } = require('@playwright/test');

const pages = [
  '/',
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

test('main pages load and keep Changes as last nav item', async ({ page }) => {
  for (const route of pages) {
    await page.goto(route);
    await expect(page.locator('nav.top-nav')).toBeVisible();
    const labels = await page.locator('nav.top-nav a').allTextContents();
    expect(labels[labels.length - 1].trim()).toBe('Changes');
  }
});

test('theme toggle switches data-theme attribute', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  const before = await root.getAttribute('data-theme');
  await page.click('#themeToggle');
  const after = await root.getAttribute('data-theme');
  expect(after).not.toBe(before);
});

test('brand link points to homepage from content pages', async ({ page }) => {
  await page.goto('/pdf/image-to-pdf');
  await expect(page.locator('a.brand[href="/"]')).toBeVisible();
  await page.goto('/video/convert-webm');
  await expect(page.locator('a.brand[href="/"]')).toBeVisible();
});

test('canonical URL removes trailing slash from displayed path', async ({ page }) => {
  await page.goto('/image/resize');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/image/resize');

  await page.goto('/tools');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/tools');
});
