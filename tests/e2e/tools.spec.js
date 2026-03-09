const path = require('path');
const { test, expect } = require('@playwright/test');

const onePxPng = {
  name: 'tiny.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z8rkAAAAASUVORK5CYII=',
    'base64'
  ),
};

test('image tool uploads and enables workspace actions', async ({ page }) => {
  await page.goto('/image/resize/');
  await page.setInputFiles('#imageInput', onePxPng);
  await expect(page.locator('#workspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#applyButton')).toBeEnabled();
  await expect(page.locator('#downloadButton')).toBeEnabled();
});

test('file tool converts sample XML and renders CSV preview', async ({ page }) => {
  await page.goto('/file/xml-to-csv/');
  const sampleXmlPath = path.resolve(__dirname, '..', 'fixtures', 'sample.xml');
  await page.setInputFiles('#xmlInput', sampleXmlPath);
  await page.click('#xmlConvertButton');
  await expect(page.locator('#csvPreview')).toContainText('id');
  await expect(page.locator('#csvPreview')).toContainText('Alpha');
  await expect(page.locator('#xmlDownloadButton')).toBeEnabled();
});
