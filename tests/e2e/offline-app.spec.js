const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('interest page presents a proposed offer and a manual email waitlist', async ({ page }) => {
  await page.goto('/offline-app/');
  await expect(page.getByRole('heading', { level: 1, name: 'File work, without the upload.' })).toBeVisible();
  await expect(page.getByText('€24', { exact: true })).toBeVisible();
  await expect(page.getByText(/not an available app/i)).toBeVisible();
  await expect(page.getByText(/send the message to join/i)).toBeVisible();
  const links = page.getByRole('link', { name: 'Join the waitlist by email' });
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) {
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^mailto:hello@madebykreativ\.com\?/);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toBe('Kreativ Tools Offline waitlist');
    expect(params.get('body')).toContain('Please add me');
  }
  await expect(page.getByRole('link', { name: 'privacy policy', exact: true })).toHaveAttribute('href', '/privacy/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kreativtools.com/offline-app/');
});

test('homepage and free toolkit link to the app idea', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'proposed desktop app' }).click();
  await expect(page).toHaveURL(/\/offline-app\/$/);
  await page.goto('/tools/');
  await expect(page.getByRole('link', { name: 'See the proposed app and join the waitlist' })).toHaveAttribute('href', '/offline-app/');
  await expect(page.locator('#offlineToolkitTitle').locator('..').locator('..').getByRole('link', { name: 'Download offline toolkit' })).toHaveAttribute('download', '');
});

test('mobile page fits and remains usable without scripts', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/offline-app/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('link', { name: 'Join the waitlist by email' }).first()).toBeVisible();
  await context.close();
});

test('page passes accessibility checks in both themes', async ({ page }) => {
  await page.goto('/offline-app/');
  await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    await page.waitForTimeout(500);
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    })).violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => target) })));
    expect(violations, theme).toEqual([]);
  }
});
