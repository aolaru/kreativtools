const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const JSZip = require('jszip');

async function fixture() {
  const pdf = await PDFDocument.create();
  pdf.setAuthor('Private fixture author');
  for (const [index, text] of ['Page A', 'Page B', 'Page C'].entries()) {
    const page = pdf.addPage(index === 1 ? [180, 260] : [200, 300]);
    page.drawRectangle({ x: 0, y: 0, width: 40, height: 40, color: rgb(index / 3, 0.3, 0.7) });
    page.drawText(text, { x: 20, y: 180, size: 16 });
    if (index === 1) page.setRotation(degrees(90));
  }
  return { name: 'pages.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) };
}

async function downloaded(page, selector) {
  const promise = page.waitForEvent('download');
  await page.click(selector);
  return fs.readFileSync(await (await promise).path());
}

test('organizer previews, rotates, reorders, and exports the visible page arrangement', async ({ page }) => {
  await page.goto('/pdf/organize/');
  await page.setInputFiles('#organizePdfInput', await fixture());
  await expect(page.locator('#organizePdfPages img')).toHaveCount(3);
  await page.locator('[data-select-page]').first().check();
  await page.click('#organizePdfRotateButton');
  await expect(page.locator('#organizePdfPages img').first()).toHaveAttribute('style', /rotate\(90deg\)/);
  await page.getByRole('button', { name: 'Move output page 2 earlier', exact: true }).click();
  await expect(page.locator('.pdf-page-card').first()).toContainText('source 2');
  await page.check('#organizePdfRemoveMetadata');
  await page.click('#organizePdfActionButton');
  await expect(page.locator('#organizePdfDownloadButton')).toBeEnabled();
  const output = await PDFDocument.load(await downloaded(page, '#organizePdfDownloadButton'), { updateMetadata: false });
  expect(output.getPages().map((item) => item.getRotation().angle)).toEqual([90, 90, 0]);
  expect(output.getPages().map((item) => item.getWidth())).toEqual([180, 200, 200]);
  expect(output.context.trailerInfo.Info).toBeUndefined();
  await page.locator('[data-select-page]').first().check();
  await page.click('#organizePdfRotateButton');
  await expect(page.locator('#organizePdfDownloadButton')).toBeDisabled();
});

test('organizer duplication, deletion, undo, and last-page protection work', async ({ page }) => {
  await page.goto('/pdf/organize/');
  await page.setInputFiles('#organizePdfInput', await fixture());
  await expect(page.locator('#organizePdfActionButton')).toBeEnabled();
  await page.click('#organizePdfSelectButton');
  await page.click('#organizePdfDeleteButton');
  await expect(page.locator('#organizePdfStatus')).toContainText('Keep at least one page');
  await expect(page.locator('.pdf-page-card')).toHaveCount(3);
  await page.click('#organizePdfSelectButton');
  await page.locator('[data-select-page]').nth(1).check();
  await page.click('#organizePdfDuplicateButton');
  await expect(page.locator('.pdf-page-card')).toHaveCount(4);
  await page.click('#organizePdfUndoButton');
  await expect(page.locator('.pdf-page-card')).toHaveCount(3);
  await page.locator('[data-select-page]').nth(1).check();
  await page.click('#organizePdfDeleteButton');
  await expect(page.locator('.pdf-page-card')).toHaveCount(2);
  await page.click('#organizePdfUndoButton');
  await expect(page.locator('.pdf-page-card')).toHaveCount(3);
});

test('PDF to Images respects range order, page rotation, resolution, PNG/JPG, and explicit downloads', async ({ page }) => {
  await page.goto('/pdf/to-images/');
  const downloads = [];
  page.on('download', (item) => downloads.push(item));
  await page.setInputFiles('#imagesPdfInput', await fixture());
  await expect(page.locator('#imagesPdfActionButton')).toBeEnabled();
  await page.fill('#imagesPdfRange', '2,1');
  await page.click('#imagesPdfActionButton');
  await expect(page.locator('#imagesPdfDownloadButton')).toBeEnabled();
  await expect(page.locator('#imagesPdfResults h3')).toHaveText(['Page 2', 'Page 1']);
  await expect(page.locator('#imagesPdfResults article').first()).toContainText('520 x 360');
  expect(downloads).toHaveLength(0);
  const zip = await JSZip.loadAsync(await downloaded(page, '#imagesPdfDownloadButton'));
  expect(Object.keys(zip.files)).toEqual(['pages-page-002.png', 'pages-page-001.png']);
  expect((await zip.file('pages-page-002.png').async('nodebuffer')).subarray(1, 4).toString()).toBe('PNG');
  await page.selectOption('#imagesPdfFormat', 'image/jpeg');
  await expect(page.locator('#imagesPdfDownloadButton')).toBeDisabled();
  await page.selectOption('#imagesPdfDpi', '72');
  await page.fill('#imagesPdfRange', '1');
  await page.click('#imagesPdfActionButton');
  await expect(page.locator('#imagesPdfDownloadButton')).toBeEnabled();
  await expect(page.locator('#imagesPdfResults article')).toContainText('200 x 300');
  const jpg = await downloaded(page, '[data-result="0"]');
  expect(jpg.subarray(0, 2)).toEqual(Buffer.from([255, 216]));
});

test('bad ranges and bad replacement files cannot reuse a prepared image ZIP', async ({ page }) => {
  await page.goto('/pdf/to-images/');
  await page.setInputFiles('#imagesPdfInput', await fixture());
  await expect(page.locator('#imagesPdfActionButton')).toBeEnabled();
  await page.click('#imagesPdfActionButton');
  await expect(page.locator('#imagesPdfDownloadButton')).toBeEnabled();
  await page.fill('#imagesPdfRange', '9');
  await page.click('#imagesPdfActionButton');
  await expect(page.locator('#imagesPdfStatus')).toContainText('page numbers from 1 to 3');
  await expect(page.locator('#imagesPdfDownloadButton')).toBeDisabled();
  await expect(page.locator('#imagesPdfResults img')).toHaveCount(0);
  await page.setInputFiles('#imagesPdfInput', { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('broken') });
  await expect(page.locator('#imagesPdfStatus')).toContainText('broken.pdf');
  await expect(page.locator('#imagesPdfActionButton')).toBeDisabled();
  await expect(page.locator('#imagesPdfDownloadButton')).toBeDisabled();
});

test('cancelling image rendering discards pending images and allows another export', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      original.call(this, (blob) => setTimeout(() => callback(blob), 400), ...args);
    };
  });
  await page.goto('/pdf/to-images/');
  await page.setInputFiles('#imagesPdfInput', await fixture());
  await expect(page.locator('#imagesPdfActionButton')).toBeEnabled();
  await page.click('#imagesPdfActionButton');
  await expect(page.locator('#imagesPdfStatus')).toContainText('Rendering page');
  await page.click('#imagesPdfCancelButton');
  await expect(page.locator('#imagesPdfStatus')).toContainText('Cancelled');
  await page.waitForTimeout(600);
  await expect(page.locator('#imagesPdfResults img')).toHaveCount(0);
  await expect(page.locator('#imagesPdfDownloadButton')).toBeDisabled();
  await page.fill('#imagesPdfRange', '1');
  await page.click('#imagesPdfActionButton');
  await expect(page.locator('#imagesPdfDownloadButton')).toBeEnabled();
  await expect(page.locator('#imagesPdfResults img')).toHaveCount(1);
  await page.click('#imagesPdfActionButton');
  await expect(page.locator('#imagesPdfStatus')).toContainText('Rendering page');
  await page.selectOption('#imagesPdfDpi', '72');
  await expect(page.locator('#imagesPdfCancelButton')).toBeHidden();
  await page.waitForTimeout(600);
  await expect(page.locator('#imagesPdfDownloadButton')).toBeDisabled();
  await expect(page.locator('#imagesPdfResults img')).toHaveCount(0);
});

test('new PDF tools remain usable on mobile with light and dark accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, input, action] of [['organize', 'organizePdfInput', 'organizePdfActionButton'], ['to-images', 'imagesPdfInput', 'imagesPdfActionButton']]) {
    await page.goto(`/pdf/${route}/`);
    await page.setInputFiles(`#${input}`, await fixture());
    await expect(page.locator(`#${action}`)).toBeEnabled();
    await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.waitForTimeout(350);
      const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })));
      expect(violations, `${route} ${theme}`).toEqual([]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});
