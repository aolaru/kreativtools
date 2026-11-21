const { test, expect } = require('@playwright/test');

test('PRO information presents the price without a fake checkout', async ({ page }) => {
  await page.goto('/offline-converters-pro/');
  await expect(page.getByRole('heading', { level: 1, name: 'Convert files on your computer.' })).toBeVisible();
  await expect(page.getByText('€24', { exact: true })).toBeVisible();
  await expect(page.getByText(/Payment and delivery are not yet available/)).toBeVisible();
  await expect(page.getByText(/do not retain audio/)).toBeVisible();
  await expect(page.getByRole('link', { name: /buy|checkout|purchase/i })).toHaveCount(0);
  const contact = page.getByRole('link', { name: 'Ask about availability' });
  await expect(contact).toHaveAttribute('href', /^mailto:hello@madebykreativ\.com\?/);
  await expect(page.getByRole('link', { name: 'See the free toolkit' })).toHaveAttribute('href', '/tools/#offlineToolkitTitle');
});

test('PRO information fits a mobile viewport and works without scripts', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/offline-converters-pro/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('link', { name: 'Ask about availability' })).toBeVisible();
  await context.close();
});
