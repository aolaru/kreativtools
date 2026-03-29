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
  '/workflows',
  '/tools',
  '/privacy',
  '/terms',
  '/contact',
];

test('main pages load and keep Workflows before Learn with Updates last', async ({ page }) => {
  for (const route of pages) {
    await page.goto(route);
    await expect(page.locator('nav.top-nav')).toBeVisible();
    const labels = await page.locator('nav.top-nav a').allTextContents();
    const normalized = labels.map((label) => label.trim());
    expect(normalized[normalized.length - 1]).toBe('Updates');
    expect(normalized).toContain('Workflows');
    expect(normalized).toContain('Learn');
    expect(normalized.indexOf('Workflows')).toBe(normalized.indexOf('Learn') - 1);
    expect(normalized.indexOf('Learn')).toBe(normalized.indexOf('Updates') - 1);
  }
});

test('workflows nav item points to the canonical workflows route', async ({ page }) => {
  await page.goto('/');
  const workflowsLink = page.locator('nav.top-nav a[href="/workflows/"]').first();
  await expect(workflowsLink).toBeVisible();
  await expect(workflowsLink).toHaveText('Workflows');
  await workflowsLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/workflows/');
  await expect(page.getByRole('heading', { level: 1, name: 'Workflows' })).toBeVisible();
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

test('legacy alias routes redirect to canonical clean routes', async ({ page }) => {
  await page.goto('/learn/use-kreativ-studio-image-prep-for-web-ready-images/');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/learn/use-kreativ-workflows-image-prep-for-web-ready-images/');
  await expect(page.getByRole('heading', { level: 1, name: /Web-Ready Images/i })).toBeVisible();

  await page.goto('/learn/prepare-a-sendable-pdf-in-kreativ-studio/');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/learn/prepare-a-sendable-pdf-in-kreativ-workflows/');
  await expect(page.getByRole('heading', { level: 1, name: /Prepare a Sendable PDF/i })).toBeVisible();

  await page.goto('/learn.html');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/learn/');
  await expect(page.getByRole('heading', { level: 1, name: 'Guides for Better Results' })).toBeVisible();

  await page.goto('/audio-to-mp3.html');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/audio/to-mp3/');
  await expect(page.getByRole('heading', { level: 1, name: 'Audio to MP3' })).toBeVisible();
});
