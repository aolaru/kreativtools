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
