const path = require('path');
const { test, expect } = require('@playwright/test');
const { createSilentWavBuffer } = require('./helpers/audio');

const onePxPng = {
  name: 'tiny.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z8rkAAAAASUVORK5CYII=',
    'base64'
  ),
};

const onePxGif = {
  name: 'tiny.gif',
  mimeType: 'image/gif',
  buffer: Buffer.from(
    'R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=',
    'base64'
  ),
};

test('image tool uploads and enables workspace actions', async ({ page }) => {
  await page.goto('/image/resize');
  await page.setInputFiles('#imageInput', onePxPng);
  await expect(page.locator('#workspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#applyButton')).toBeEnabled();
  await expect(page.locator('#downloadButton')).toBeEnabled();
});

test('image tool accepts gif input and loads the workspace', async ({ page }) => {
  await page.goto('/image/resize');
  await page.setInputFiles('#imageInput', onePxGif);
  await expect(page.locator('#workspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#status')).toContainText('Loaded image: tiny.gif');
});

test('image crop uploads and enables crop export flow', async ({ page }) => {
  await page.goto('/image/crop');
  await page.setInputFiles('#cropImageInput', onePxPng);
  await expect(page.locator('#cropWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#cropApplyButton')).toBeEnabled();
  await page.click('#cropApplyButton');
  await expect(page.locator('#cropDownloadButton')).toBeEnabled();
});

test('pdf fill and sign places text and a signature image, then exports a filled pdf', async ({ page }) => {
  await page.goto('/pdf/fill-sign');
  const mergePdfA = path.resolve(__dirname, '..', 'fixtures', 'merge-a.pdf');

  await page.setInputFiles('#pdfFillInput', mergePdfA);
  await expect(page.locator('#pdfFillWorkspace')).not.toHaveClass(/is-hidden/);
  const pageStage = page.locator('.pdf-fill-page-stage').first();
  await expect(pageStage).toBeVisible();
  const clickPdfStage = async (x, y) => {
    await pageStage.evaluate((stage, point) => {
      const overlay = stage.querySelector('.pdf-fill-page-overlay');
      const rect = stage.getBoundingClientRect();
      const event = new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + point.x,
        clientY: rect.top + point.y,
      });
      overlay.dispatchEvent(event);
    }, { x, y });
  };

  await page.fill('#pdfFillText', 'John Doe');
  await clickPdfStage(110, 120);
  await expect(page.locator('#pdfFillPlacementCount')).toHaveText('1');
  await expect(page.locator('#pdfFillPlacementList')).toContainText('John Doe');
  await page.click('#pdfFillDuplicateButton');
  await expect(page.locator('#pdfFillPlacementCount')).toHaveText('2');

  await page.click('#pdfFillInsertTodayButton');
  await expect(page.locator('#pdfFillText')).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  await clickPdfStage(160, 170);
  await expect(page.locator('#pdfFillPlacementCount')).toHaveText('3');

  await page.setInputFiles('#pdfSignatureInput', onePxPng);
  await expect(page.locator('#pdfSignaturePreview')).toBeVisible();
  await expect(page.locator('#pdfSignatureStatus')).toContainText('Loaded');
  await page.click('#pdfFillToolSignature');
  await clickPdfStage(260, 240);
  await expect(page.locator('#pdfFillPlacementCount')).toHaveText('4');
  await expect(page.locator('#pdfFillPlacementList')).toContainText('Signature');

  await page.click('#pdfFillExportButton');
  await expect(page.locator('#pdfFillDownloadButton')).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.click('#pdfFillDownloadButton');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/merge-a-filled\.pdf$/);
  await expect(page.locator('#pdfFillStatus')).toContainText('Downloaded merge-a-filled.pdf');
});

test('pdf to docx extracts text and downloads a docx export', async ({ page }) => {
  await page.goto('/pdf/to-docx');
  const mergePdfA = path.resolve(__dirname, '..', 'fixtures', 'merge-a.pdf');

  await page.setInputFiles('#pdfDocxInput', mergePdfA);
  await expect(page.locator('#pdfDocxWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#pdfDocxConvertButton')).toBeEnabled();

  await page.click('#pdfDocxConvertButton');
  await expect(page.locator('#pdfDocxDownloadButton')).toBeEnabled();
  await expect(page.locator('#pdfDocxExportStatus')).toContainText('DOCX ready');

  const downloadPromise = page.waitForEvent('download');
  await page.click('#pdfDocxDownloadButton');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/merge-a\.docx$/);
  await expect(page.locator('#pdfDocxStatus')).toContainText('Downloaded merge-a.docx');
});

test('file tool converts sample XML and renders CSV preview', async ({ page }) => {
  await page.goto('/file/xml-to-csv');
  const sampleXmlPath = path.resolve(__dirname, '..', 'fixtures', 'sample.xml');
  await page.setInputFiles('#xmlInput', sampleXmlPath);
  await page.click('#xmlConvertButton');
  await expect(page.locator('#csvPreview')).toContainText('id');
  await expect(page.locator('#csvPreview')).toContainText('Alpha');
  await expect(page.locator('#xmlDownloadButton')).toBeEnabled();
});

test('audio to mp3 converts a wav upload into a downloadable mp3', async ({ page }) => {
  await page.goto('/audio/to-mp3');
  await page.setInputFiles('#mp3AudioInput', {
    name: 'fixture.wav',
    mimeType: 'audio/wav',
    buffer: createSilentWavBuffer(),
  });

  await expect(page.locator('#mp3AudioWorkspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#mp3ConvertButton')).toBeEnabled();
  await expect(page.locator('#mp3AudioMeta')).toContainText('Hz');

  const downloadPromise = page.waitForEvent('download');
  await page.click('#mp3ConvertButton');
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/fixture-128kbps\.mp3$/);
  await expect(page.locator('#mp3AudioStatus')).toContainText('Downloaded fixture-128kbps.mp3');
});
