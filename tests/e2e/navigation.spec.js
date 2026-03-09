const { test, expect } = require('@playwright/test');

const pages = [
  '/index.html',
  '/image-tools.html',
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

test('main pages load and keep Changes as last nav item', async ({ page }) => {
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator('nav.top-nav')).toBeVisible();
    const labels = await page.locator('nav.top-nav a').allTextContents();
    expect(labels[labels.length - 1].trim()).toBe('Changes');
  }
});

test('theme toggle switches data-theme attribute', async ({ page }) => {
  await page.goto('/index.html');
  const root = page.locator('html');
  const before = await root.getAttribute('data-theme');
  await page.click('#themeToggle');
  const after = await root.getAttribute('data-theme');
  expect(after).not.toBe(before);
});

test('brand link points to homepage from content pages', async ({ page }) => {
  await page.goto('/pdf.html');
  await expect(page.locator('a.brand[href="index.html"]')).toBeVisible();
  await page.goto('/video.html');
  await expect(page.locator('a.brand[href="index.html"]')).toBeVisible();
});
