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
  await expect(page.locator('.quick-links a[href="/studio/image-prep/"]')).toBeVisible();
  await expect(page.locator('.quick-links a[href="/image/compress/"]')).toBeVisible();
  await expect(page.locator('.quick-links a[href="/pdf/merge/"]')).toBeVisible();
  await expect(page.locator('.home-panel a[href="/studio/"]').first()).toBeVisible();
  await expect(page.locator('.home-panel a[href="/learn/"]')).toBeVisible();
  await expect(page.locator('.home-panel a[href="/changes/"]')).toBeVisible();
});

test('studio landing page introduces workflow lineup and image prep entry point', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByRole('heading', { level: 1, name: 'Kreativ Studio' })).toBeVisible();
  await expect(page.locator('.tool-card[href="/studio/image-prep/"]')).toBeVisible();
  await expect(page.locator('text=PDF Delivery')).toBeVisible();
  await expect(page.locator('text=Audio Delivery')).toBeVisible();
});

test('studio image prep runs through a basic guided export flow', async ({ page }) => {
  await page.goto('/studio/image-prep');

  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VE3d2QAAAAASUVORK5CYII=',
    'base64'
  );

  await page.setInputFiles('#studioImageInput', {
    name: 'studio-fixture.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });

  await expect(page.locator('#studioWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#studioStageCrop')).toBeVisible();
  await page.click('#studioApplyCropButton');
  await expect(page.locator('#studioStageResize')).toBeVisible();
  await page.fill('#studioResizeWidth', '320');
  await page.click('#studioApplyResizeButton');
  await expect(page.locator('#studioStageCompress')).toBeVisible();
  await page.selectOption('#studioFormat', 'image/webp');
  await page.click('#studioGenerateExportButton');
  await expect(page.locator('#studioStageExport')).toBeVisible();
  await expect(page.locator('#studioDownloadButton')).toBeEnabled();
  await expect(page.locator('#studioExportFormat')).toHaveText('WEBP');
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
  await expect(page.locator('.tool-card[href="/learn/crop-images-for-clean-thumbnails-and-social-posts/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/resize-before-compressing-images/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/when-pdf-compression-does-not-help/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/split-pdf-pages-without-rebuilding-document/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/prepare-pdfs-for-email-without-breaking-layout/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/organize-pdf-handoff-files-before-sending/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/prepare-webfonts-for-fast-frontend-delivery/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/learn/convert-wav-to-mp3-and-choose-the-right-bitrate/"]')).toBeVisible();
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

test('pdf split creates separate outputs from custom page ranges', async ({ page }) => {
  await page.goto('/pdf/split');
  const splitPdfBase64 = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    for (let index = 0; index < 3; index += 1) {
      const pdfPage = doc.addPage([420, 595]);
      pdfPage.drawText(`Split Fixture Page ${index + 1}`, { x: 48, y: 520, size: 22 });
    }
    const bytes = await doc.save();
    let binary = '';
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.slice(index, index + chunk));
    }
    return btoa(binary);
  });

  await page.setInputFiles('#splitPdfInput', {
    name: 'split-fixture.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(splitPdfBase64, 'base64'),
  });

  await expect(page.locator('#splitPdfWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#splitPdfPageCount')).toHaveText('3');
  await page.selectOption('#splitPdfMode', 'ranges');
  await page.fill('#splitPdfRanges', '1-2\n3');
  await page.click('#splitPdfActionButton');
  await expect(page.locator('#splitPdfOutputCount')).toHaveText('2');
  await expect(page.locator('#splitPdfList .queue-item')).toHaveCount(2);
  await expect(page.locator('#splitPdfDownloadAllButton')).toBeEnabled();
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
