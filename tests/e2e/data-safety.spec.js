const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('JSON CSV protects headers and values by default, supports raw mode, and quotes carriage returns', async ({ page }) => {
  await page.goto('/file/json-to-csv/');
  await page.setInputFiles('#jsonInput', { name: 'data.json', mimeType: 'application/json', buffer: Buffer.from('[{"=heading":"=1+2","note":"a\\rb","id":"9007199254740993"}]') });
  await page.click('#jsonConvertButton');
  await expect(page.locator('#jsonPreview')).toContainText('"\t=heading"');
  await expect(page.locator('#jsonPreview')).toContainText('"\t=1+2"');
  const download = page.waitForEvent('download');
  await page.click('#jsonDownloadButton');
  const text = fs.readFileSync(await (await download).path(), 'utf8');
  expect(text).toContain('"a\rb"');
  await page.uncheck('#jsonSpreadsheetSafe');
  await expect(page.locator('#jsonDownloadButton')).toBeDisabled();
  await page.click('#jsonConvertButton');
  await expect(page.locator('#jsonPreview')).toContainText('=heading,note,id');
  await expect(page.locator('#jsonPreview')).toContainText('=1+2');
  await page.setInputFiles('#jsonInput', { name: 'unsafe.json', mimeType: 'application/json', buffer: Buffer.from('[{"id":9007199254740993}]') });
  await expect(page.locator('#jsonStatus')).toContainText('safe integer range');
  await expect(page.locator('#jsonDownloadButton')).toBeDisabled();
});

test('XML CSV protects formula-like cells and allows an explicit raw export', async ({ page }) => {
  await page.goto('/file/xml-to-csv/');
  await page.setInputFiles('#xmlInput', { name: 'data.xml', mimeType: 'application/xml', buffer: Buffer.from('<root><item><value>=1+2</value></item><item><value>safe</value></item></root>') });
  await page.click('#xmlConvertButton');
  await expect(page.locator('#csvPreview')).toContainText('"\t=1+2"');
  await page.uncheck('#xmlSpreadsheetSafe');
  await expect(page.locator('#xmlDownloadButton')).toBeDisabled();
  await page.click('#xmlConvertButton');
  await expect(page.locator('#csvPreview')).toContainText('=1+2');
});

test('JSON CSV refuses an excessive expanded table without leaving a stale export', async ({ page }) => {
  await page.goto('/file/json-to-csv/');
  const rows = Array.from({ length: 1000 }, (_, i) => ({ [`column${i}`]: i }));
  await page.setInputFiles('#jsonInput', { name: 'wide.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(rows)) });
  await page.click('#jsonConvertButton');
  await expect(page.locator('#jsonStatus')).toContainText('1 million cell limit');
  await expect(page.locator('#jsonDownloadButton')).toBeDisabled();
});

for (const [route, input, status, mime, name] of [
  ['/file/json-to-csv/', '#jsonInput', '#jsonStatus', 'application/json', 'large.json'],
  ['/file/xml-to-csv/', '#xmlInput', '#xmlStatus', 'application/xml', 'large.xml'],
  ['/file/csv-to-json/', '#csvInput', '#csvStatus', 'text/csv', 'large.csv'],
]) {
  test(`${route} rejects an oversized input`, async ({ page }) => {
    await page.goto(route);
    await page.setInputFiles(input, { name, mimeType: mime, buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(page.locator(status)).toContainText('up to 5 MB');
  });
}

test('video limitations and offline toolkit are visible before upload', async ({ page }) => {
  for (const route of ['/video/trim/', '/video/convert-webm/']) {
    await page.goto(route);
    await expect(page.locator('.hero')).toContainText('audio is not included');
  }
  await page.goto('/tools/');
  await expect(page.getByRole('heading', { name: 'Take seven tools offline' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download offline toolkit' })).toHaveAttribute('href', '/downloads/kreativ-pdf-offline.zip');
});
