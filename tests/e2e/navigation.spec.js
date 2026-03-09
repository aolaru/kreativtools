const { test, expect } = require('@playwright/test');

const pages = [
  '/index.html',
  '/pdf.html',
  '/video.html',
  '/fonts.html',
  '/audio.html',
  '/file.html',
  '/changes.html',
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
