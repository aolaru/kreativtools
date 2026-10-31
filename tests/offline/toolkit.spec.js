const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { PDFDocument } = require('pdf-lib');
const JSZip = require('jszip');
const { test, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const fixture = path.join(root, 'tests/fixtures/merge-a.pdf');
const other = path.join(root, 'tests/fixtures/merge-b.pdf');
let unpacked;
const local = (file) => pathToFileURL(path.join(unpacked, file)).href;

test.beforeAll(async () => {
  unpacked = fs.mkdtempSync(path.join(os.tmpdir(), 'kreativ-offline-test-'));
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(root, 'downloads/kreativ-pdf-offline.zip')));
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir || path.basename(name) !== name) throw new Error(`Unexpected archive entry: ${name}`);
    fs.writeFileSync(path.join(unpacked, name), await file.async('nodebuffer'));
  }
});

test.afterAll(() => { if (unpacked) fs.rmSync(unpacked, { recursive: true, force: true }); });

test('standalone launcher contains seven local tools and makes no network requests', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(local('index.html'));
  await expect(page.locator('.tool-card')).toHaveCount(7);
  for (const link of await page.locator('.tool-card').all()) expect(await link.getAttribute('href')).toMatch(/^[a-z-]+\.html$/);
  expect(requests).toEqual([]);
});

for (const tool of ['merge', 'compress']) {
  test(`standalone ${tool} cleans metadata and exports without internet or a server`, async ({ page }) => {
    const requests = [];
    const errors = [];
    page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    page.on('pageerror', (error) => errors.push(error.message));
    const prefix = tool === 'merge' ? 'mergePdf' : 'compressPdf';
    await page.goto(local(`pdf-${tool}.html`));
    await page.setInputFiles(`#${prefix}Input`, tool === 'merge' ? [fixture, other] : fixture);
    await expect(page.locator(`#${prefix}ActionButton`)).toBeEnabled();
    if (tool === 'merge') await expect(page.locator('.pdf-queue-thumbnail[src]')).toHaveCount(2);
    await page.check(`#${prefix}RemoveMetadata`);
    await page.click(`#${prefix}ActionButton`);
    await expect(page.locator(`#${prefix}DownloadButton`)).toBeEnabled();
    const promise = page.waitForEvent('download');
    await page.click(`#${prefix}DownloadButton`);
    const bytes = fs.readFileSync(await (await promise).path());
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(document.context.trailerInfo.Info).toBeUndefined();
    expect(document.getPageCount()).toBeGreaterThan(0);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('standalone PDF Split prepares separate page downloads', async ({ page }) => {
  await page.goto(local('pdf-split.html'));
  await page.setInputFiles('#splitPdfInput', fixture);
  await expect(page.locator('#splitPdfActionButton')).toBeEnabled();
  await page.click('#splitPdfActionButton');
  await expect(page.locator('#splitPdfDownloadAllButton')).toBeEnabled();
});

for (const tool of ['organize', 'images']) {
  test(`standalone PDF ${tool} previews and exports without internet or a server`, async ({ page }) => {
    const requests = [];
    const errors = [];
    page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    page.on('pageerror', (error) => errors.push(error.message));
    const prefix = tool === 'organize' ? 'organizePdf' : 'imagesPdf';
    await page.goto(local(`pdf-${tool}.html`));
    await page.setInputFiles(`#${prefix}Input`, fixture);
    await expect(page.locator(`#${prefix}ActionButton`)).toBeEnabled();
    if (tool === 'organize') {
      await expect(page.locator('#organizePdfPages img')).toHaveCount(1);
      await page.check('#organizePdfRemoveMetadata');
    }
    await page.click(`#${prefix}ActionButton`);
    await expect(page.locator(`#${prefix}DownloadButton`)).toBeEnabled();
    const promise = page.waitForEvent('download');
    await page.click(`#${prefix}DownloadButton`);
    const bytes = fs.readFileSync(await (await promise).path());
    if (tool === 'organize') {
      const document = await PDFDocument.load(bytes, { updateMetadata: false });
      expect(document.getPageCount()).toBe(1);
      expect(document.context.trailerInfo.Info).toBeUndefined();
    } else {
      const zip = await JSZip.loadAsync(bytes);
      expect(Object.keys(zip.files)).toEqual(['merge-a-page-001.png']);
      expect((await zip.file('merge-a-page-001.png').async('nodebuffer')).subarray(1, 4).toString()).toBe('PNG');
    }
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('standalone image tools can prepare and download images', async ({ page }) => {
  const png = { name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z8rkAAAAASUVORK5CYII=', 'base64') };
  for (const name of ['image-compress.html', 'image-resize.html']) {
    await page.goto(local(name));
    await page.locator('input[type="file"]').first().setInputFiles(png);
    await expect(page.locator('[data-export-prepare]')).toBeEnabled();
    await page.locator('[data-export-prepare]').click();
    await expect(page.locator('[data-export-download]')).toBeEnabled();
    const promise = page.waitForEvent('download');
    await page.locator('[data-export-download]').click();
    expect(fs.statSync(await (await promise).path()).size).toBeGreaterThan(0);
    if (name === 'image-resize.html') {
      await page.click('#toolPdf');
      await page.locator('[data-export-prepare]').click();
      await expect(page.locator('[data-export-download]')).toBeEnabled();
      const pdfDownload = page.waitForEvent('download');
      await page.locator('[data-export-download]').click();
      const bytes = fs.readFileSync(await (await pdfDownload).path());
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    }
  }
});

test('offline PDF organizer and merge export selected pages', async ({ page }) => {
  const first = await PDFDocument.create();
  first.addPage([100, 300]); first.addPage([200, 300]);
  const file = { name: 'first.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await first.save()) };
  await page.goto(local('pdf-organize.html'));
  await page.setInputFiles('#organizePdfInput', file);
  await expect(page.locator('#organizePdfActionButton')).toBeEnabled();
  await page.locator('[data-select-page]').nth(1).check();
  await page.check('#organizePdfSelectedOnly');
  await page.click('#organizePdfActionButton');
  await expect(page.locator('#organizePdfDownloadButton')).toBeEnabled();
  let event = page.waitForEvent('download');
  await page.click('#organizePdfDownloadButton');
  let document = await PDFDocument.load(fs.readFileSync(await (await event).path()));
  expect(document.getPages().map((p) => p.getWidth())).toEqual([200]);
  await page.goto(local('pdf-merge.html'));
  await page.setInputFiles('#mergePdfInput', [file, { name: 'merge-b.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(other) }]);
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  await page.getByLabel('Pages to include from first.pdf').fill('2');
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfDownloadButton')).toBeEnabled();
  event = page.waitForEvent('download');
  await page.click('#mergePdfDownloadButton');
  document = await PDFDocument.load(fs.readFileSync(await (await event).path()));
  expect(document.getPageCount()).toBe(2);
  expect(document.getPage(0).getWidth()).toBe(200);
});

test('offline image compression resizes and image batch exports a ZIP', async ({ page }) => {
  const base64 = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 50; return canvas.toDataURL('image/png').split(',')[1]; });
  const image = { name: 'one.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
  await page.goto(local('image-compress.html'));
  await page.locator('input[type="file"]').first().setInputFiles(image);
  await expect(page.locator('#compressApplyButton')).toBeEnabled();
  await page.getByText('Optional resize').click();
  await page.fill('#compressMaxWidth', '40');
  await page.click('#compressApplyButton');
  await expect(page.locator('#compressDownloadButton')).toBeEnabled();
  await expect(page.locator('#compressDimensions')).toHaveText('40 x 20px');
  await page.goto(local('image-resize.html'));
  await page.locator('input[type="file"]').first().setInputFiles([image, { ...image, name: 'two.png' }]);
  await expect(page.locator('#applyButton')).toBeEnabled();
  await page.click('#applyButton');
  await expect(page.locator('#downloadButton')).toBeEnabled();
  const event = page.waitForEvent('download');
  await page.click('#downloadButton');
  const zip = await JSZip.loadAsync(fs.readFileSync(await (await event).path()));
  expect(Object.keys(zip.files)).toEqual(['01-one.png', '02-two.png']);
});
