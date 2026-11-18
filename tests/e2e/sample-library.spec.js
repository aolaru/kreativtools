const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const catalog = require('../../resources/sample-files/manifest.json');

test('directory search, category filtering, and keyboard use', async ({ page }) => {
  await page.goto('/resources/sample-files/');
  await expect(page.locator('[data-sample-card]')).toHaveCount(45);
  await page.getByLabel('Search by name, format or scenario').fill('unicode');
  await expect(page.locator('[data-sample-card]:visible')).toHaveCount(1);
  await expect(page.locator('#sampleCount')).toContainText('Showing 1 of 45');
  await page.getByLabel('Search by name, format or scenario').fill('');
  await page.getByLabel('Category', { exact: true }).selectOption('pdf');
  await expect(page.locator('[data-sample-card]:visible')).toHaveCount(12);
  await page.getByLabel('Search by name, format or scenario').fill('not-a-real-fixture');
  await expect(page.locator('#sampleEmpty')).toBeVisible();
  await page.getByLabel('Search by name, format or scenario').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Category', { exact: true })).toBeFocused();
});

test('all category routes and downloads match published metadata', async ({ request }) => {
  for (const category of ['pdf', 'images', 'documents', 'archives', 'data', 'audio-video']) {
    const response = await request.get(`/resources/sample-files/${category}/`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(`https://kreativtools.com/resources/sample-files/${category}/`);
  }
  for (const sample of catalog.samples) {
    const response = await request.get(sample.downloadUrl);
    expect(response.status(), sample.downloadUrl).toBe(200);
    const body = await response.body();
    expect(body.length, sample.filename).toBe(sample.sizeBytes);
    expect(crypto.createHash('sha256').update(body).digest('hex'), sample.filename).toBe(sample.sha256);
  }
});

test('invalid fixtures and encrypted password are clear; downloads work without script', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/resources/sample-files/pdf/');
  await expect(page.getByText('Intentionally invalid')).toBeVisible();
  await expect(page.getByText('Encrypted PDF; password: sample123.')).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download One-page PDF (basic.pdf)' }).click();
  expect((await pending).suggestedFilename()).toBe('basic.pdf');
  await context.close();
});

test('mobile layout and theme remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/resources/sample-files/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('planned product has no checkout and is not indexed', async ({ page, request }) => {
  await page.goto('/resources/sample-files/pro/');
  await expect(page.getByText(/no checkout or purchase available/i)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('link', { name: /buy|purchase/i })).toHaveCount(0);
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/resources/sample-files/pro/');
});

test('sample listings pass accessibility checks in light and dark themes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Run the accessibility scan once; behavior is tested in all browsers.');
  test.setTimeout(60000);
  for (const route of ['/resources/sample-files/', '/resources/sample-files/pdf/']) {
    await page.goto(route);
    await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.waitForTimeout(500);
      const violations = await page.evaluate(async () => (await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })).violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => target) })));
      expect(violations, `${route} ${theme}`).toEqual([]);
    }
  }
});
