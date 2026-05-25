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
  '/learn',
  '/workflows',
  '/workflows/audio-delivery',
  '/tools',
  '/privacy',
  '/terms',
  '/contact',
];

test('main pages load and keep Tools, Learn, and Updates in the expected order', async ({ page }) => {
  for (const route of pages) {
    await page.goto(route);
    await expect(page.locator('nav.top-nav')).toBeVisible();
    const labels = await page.locator('nav.top-nav a').allTextContents();
    const normalized = labels.map((label) => label.trim());
    expect(normalized).toEqual(['Tools', 'Learn', 'Updates']);
    expect(normalized[normalized.length - 1]).toBe('Updates');
    expect(normalized).toContain('Tools');
    expect(normalized).toContain('Learn');
    expect(normalized.indexOf('Tools')).toBe(normalized.indexOf('Learn') - 1);
    expect(normalized.indexOf('Learn')).toBe(normalized.indexOf('Updates') - 1);
  }
});

test('tools nav item points to the directory and stays active on workflow routes', async ({ page }) => {
  await page.goto('/');
  const toolsLink = page.locator('nav.top-nav a[href="/tools/"]').first();
  await expect(toolsLink).toBeVisible();
  await expect(toolsLink).toHaveText('Tools');
  await toolsLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/tools/');
  await expect(page.getByRole('heading', { level: 1, name: 'Tools and Guided Workflows' })).toBeVisible();

  await page.goto('/workflows/image-prep');
  await expect(page.locator('nav.top-nav a[href="/tools/"]')).toHaveAttribute('aria-current', 'page');
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
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/tools\/?$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tools and Guided Workflows' })).toBeVisible();
});

test('legacy alias routes redirect to canonical clean routes', async ({ page }) => {
  await page.goto('/learn/use-kreativ-studio-image-prep-for-web-ready-images/');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/learn/use-kreativ-workflows-image-prep-for-web-ready-images/');
  await expect(page.getByRole('heading', { level: 1, name: /Web-Ready Images/i })).toBeVisible();

  await page.goto('/learn/prepare-a-sendable-pdf-in-kreativ-studio/');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/learn/prepare-a-sendable-pdf-in-kreativ-workflows/');
  await expect(page.getByRole('heading', { level: 1, name: /Prepare a Sendable PDF/i })).toBeVisible();

  await page.goto('/learn.html');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/learn/');
  await expect(page.getByRole('heading', { level: 1, name: 'Practical guides for choosing and using Kreativ Tools' })).toBeVisible();

  await page.goto('/audio-to-mp3.html');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/audio/to-mp3/');
  await expect(page.getByRole('heading', { level: 1, name: 'Audio to MP3' })).toBeVisible();
});
