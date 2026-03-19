const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const fixturesDir = path.resolve(__dirname, '..', 'fixtures');
const mergePdfA = path.join(fixturesDir, 'merge-a.pdf');
const mergePdfB = path.join(fixturesDir, 'merge-b.pdf');
const compressPdf = path.join(fixturesDir, 'compress-sample.pdf');

test('homepage surfaces featured workflows and Learn entry points', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Useful browser tools/i })).toBeVisible();
  await expect(page.locator('.quick-links a[href="/image/compress/"]')).toBeVisible();
  await expect(page.locator('.quick-links a[href="/pdf/merge/"]')).toBeVisible();
  await expect(page.locator('.home-panel a[href="/learn/"]')).toBeVisible();
  await expect(page.locator('.home-panel a[href="/changes/"]')).toBeVisible();
});

test('learn landing page includes the core hero guides and expanded follow-up guides', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.getByRole('heading', { level: 1, name: 'Guides for Better Results' })).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/compress-pdf-for-email/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/merge-pdf-files-in-order/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/convert-otf-or-ttf-to-woff2/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/compress-images-for-faster-websites/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/resize-images-for-shopify-or-woocommerce/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/convert-png-to-webp-without-obvious-quality-loss/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/when-pdf-compression-does-not-help/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/organize-pdf-handoff-files-before-sending/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/prepare-webfonts-for-fast-frontend-delivery/"]')).toBeVisible();
});

test('pdf merge accepts fixtures and enables merged download flow', async ({ page }) => {
  await page.goto('/pdf/merge');
  await page.setInputFiles('#mergePdfInput', [mergePdfA, mergePdfB]);
  await expect(page.locator('#mergePdfWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#mergePdfCount')).toHaveText('2');
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfOutputStatus')).toContainText('Ready');
  await expect(page.locator('#mergePdfDownloadButton')).toBeEnabled();
});

test('pdf compress processes a fixture and exposes the result step', async ({ page }) => {
  await page.goto('/pdf/compress');
  await page.setInputFiles('#compressPdfInput', compressPdf);
  await expect(page.locator('#compressPdfWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#compressPdfActionButton')).toBeEnabled();
  await page.click('#compressPdfActionButton');
  await expect(page.locator('#compressPdfOutputSize')).not.toHaveText('-');
  await expect(page.locator('#compressPdfDownloadButton')).toBeEnabled();
});

test('sitemap routes resolve to live pages', async ({ page }) => {
  const sitemap = fs.readFileSync(path.resolve(process.cwd(), 'sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>https:\/\/kreativtools\.com([^<]*)<\/loc>/g)].map((match) => match[1] || '/');

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Kreativ Tools|Redirecting/);
  }
});
