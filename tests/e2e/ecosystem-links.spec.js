const { test, expect } = require('@playwright/test');

test('homepage highlights privacy, offline tools and popular tasks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your files stay in your browser.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get the offline toolkit' })).toHaveAttribute('href', '/tools/#offlineToolkitTitle');
  await expect(page.locator('.job-router-card')).toHaveCount(6);
});

test('homepage and PaperBuild link fit on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/pdf/image-to-pdf/']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await expect(page.getByRole('link', { name: 'View PaperBuild on Google Play' })).toBeVisible();
});

test('Image to PDF explains the optional PaperBuild Android app', async ({ page }) => {
  await page.goto('/pdf/image-to-pdf/');
  await expect(page.locator('#paperbuildTitle')).toBeVisible();
  await expect(page.locator('section').filter({ has: page.locator('#paperbuildTitle') })).toContainText('up to 10 pages');
  await expect(page.getByRole('link', { name: 'View PaperBuild on Google Play' })).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.kreativ.paperbuild');
});
