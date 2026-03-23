const { test, expect } = require('@playwright/test');

const pages = [
  '/',
  '/image',
  '/pdf',
  '/image/resize',
  '/image/compress',
  '/pdf/image-to-pdf',
  '/pdf/split',
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

test('main pages load and keep Learn before Updates with Updates last', async ({ page }) => {
  for (const route of pages) {
    await page.goto(route);
    await expect(page.locator('nav.top-nav')).toBeVisible();
    const labels = await page.locator('nav.top-nav a').allTextContents();
    const normalized = labels.map((label) => label.trim());
    expect(normalized[normalized.length - 1]).toBe('Updates');
    expect(normalized).toContain('Learn');
    expect(normalized.indexOf('Learn')).toBe(normalized.indexOf('Updates') - 1);
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

test('clean routes resolve without breaking tool pages', async ({ page }) => {
  await page.goto('/image/resize');
  await expect(page.getByRole('heading', { level: 1, name: /Resize an Image, Convert, or Export PDF/i })).toBeVisible();
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/image\/resize\/?$/);

  await page.goto('/tools');
  await expect(page.locator('.tool-card[href="/image/compress/"]')).toBeVisible();
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/tools\/?$/);
});
