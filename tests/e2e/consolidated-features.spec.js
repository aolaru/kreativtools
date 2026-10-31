const { test, expect } = require('@playwright/test');
const { PDFDocument, degrees } = require('pdf-lib');
const JSZip = require('jszip');
const fs = require('node:fs');

async function pdf(name, widths) {
  const doc = await PDFDocument.create();
  for (const width of widths) doc.addPage([width, 300]);
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) };
}

async function image(page, name, width, height) {
  const bytes = await page.evaluate(([w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').fillRect(0, 0, w, h); return c.toDataURL('image/png').split(',')[1]; }, [width, height]);
  return { name, mimeType: 'image/png', buffer: Buffer.from(bytes, 'base64') };
}

async function download(page, selector) {
  const promise = page.waitForEvent('download');
  await page.locator(selector).click();
  return fs.readFileSync(await (await promise).path());
}

test('compress fits image within optional bounds without enlarging', async ({ page }) => {
  await page.goto('/image/compress/');
  await page.setInputFiles('#compressImageInput', await image(page, 'source.png', 120, 60));
  await expect(page.locator('#compressApplyButton')).toBeEnabled();
  await page.getByText('Optional resize').click();
  await page.fill('#compressMaxWidth', '40');
  await page.click('#compressApplyButton');
  await expect(page.locator('#compressDownloadButton')).toBeEnabled();
  await expect(page.locator('#compressDimensions')).toHaveText('40 x 20px');
  await page.fill('#compressMaxWidth', '400');
  await expect(page.locator('#compressDownloadButton')).toBeDisabled();
  await page.click('#compressApplyButton');
  await expect(page.locator('#compressDimensions')).toHaveText('120 x 60px');
});

test('organizer exports checked pages in arranged order and invalidates selection changes', async ({ page }) => {
  await page.goto('/pdf/organize/');
  await page.setInputFiles('#organizePdfInput', await pdf('source.pdf', [100, 200, 300]));
  await expect(page.locator('#organizePdfActionButton')).toBeEnabled();
  await page.locator('[data-select-page]').nth(1).check();
  await page.click('#organizePdfRotateButton');
  await page.check('#organizePdfSelectedOnly');
  await page.click('#organizePdfActionButton');
  await expect(page.locator('#organizePdfDownloadButton')).toBeEnabled();
  const doc = await PDFDocument.load(await download(page, '#organizePdfDownloadButton'));
  expect(doc.getPageCount()).toBe(1);
  expect(doc.getPage(0).getWidth()).toBe(200);
  expect(doc.getPage(0).getRotation().angle).toBe(degrees(90).angle);
  await page.locator('[data-select-page]').first().check();
  await expect(page.locator('#organizePdfDownloadButton')).toBeDisabled();
});

test('merge accepts per-file ranges and exports only chosen pages', async ({ page }) => {
  await page.goto('/pdf/merge/');
  await page.setInputFiles('#mergePdfInput', [await pdf('first.pdf', [100, 110, 120]), await pdf('second.pdf', [200, 210])]);
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  await page.getByLabel('Pages to include from first.pdf').fill('3, 1');
  await page.getByLabel('Pages to include from second.pdf').fill('2');
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfDownloadButton')).toBeEnabled();
  const doc = await PDFDocument.load(await download(page, '#mergePdfDownloadButton'));
  expect(doc.getPages().map((p) => p.getWidth())).toEqual([120, 100, 210]);
  await page.getByLabel('Pages to include from second.pdf').fill('9');
  await expect(page.locator('#mergePdfDownloadButton')).toBeDisabled();
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfStatus')).toContainText('second.pdf');
});

test('batch resize produces a ZIP with safely named images and invalidates old output', async ({ page }) => {
  await page.goto('/image/resize/');
  await page.setInputFiles('#imageInput', [await image(page, 'one.png', 120, 60), await image(page, 'two.png', 40, 80)]);
  await expect(page.locator('#applyButton')).toBeEnabled();
  await page.fill('#widthInput', '60');
  await page.click('#applyButton');
  await expect(page.locator('#downloadButton')).toBeEnabled();
  const zip = await JSZip.loadAsync(await download(page, '#downloadButton'));
  expect(Object.keys(zip.files)).toEqual(['01-one.png', '02-two.png']);
  const bytes = await zip.file('02-two.png').async('base64');
  const size = await page.evaluate(async (data) => { const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode(); return [img.naturalWidth, img.naturalHeight]; }, bytes);
  expect(size).toEqual([15, 30]);
  await page.fill('#widthInput', '30');
  await expect(page.locator('#downloadButton')).toBeDisabled();
});

test('new controls fit mobile screens and pass accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [url, input, files, ready] of [
    ['/image/compress/', '#compressImageInput', [await image(page, 'image.png', 100, 50)], '#compressApplyButton'],
    ['/image/resize/', '#imageInput', [await image(page, 'one.png', 100, 50), await image(page, 'two.png', 50, 100)], '#applyButton'],
    ['/pdf/merge/', '#mergePdfInput', [await pdf('a.pdf', [100, 120]), await pdf('b.pdf', [200])], '#mergePdfActionButton'],
    ['/pdf/organize/', '#organizePdfInput', [await pdf('source.pdf', [100, 200])], '#organizePdfActionButton'],
  ]) {
    await page.goto(url);
    await page.setInputFiles(input, files);
    await expect(page.locator(ready)).toBeEnabled();
    if (url === '/image/compress/') await page.getByText('Optional resize').click();
    await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
    const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })));
    expect(violations, url).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});
