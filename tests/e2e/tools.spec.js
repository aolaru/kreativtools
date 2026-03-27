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

function createSilentWavBuffer({ sampleRate = 8000, durationSeconds = 0.2 } = {}) {
  const frameCount = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const dataSize = frameCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

test('image tool uploads and enables workspace actions', async ({ page }) => {
  await page.goto('/image/resize');
  await page.setInputFiles('#imageInput', onePxPng);
  await expect(page.locator('#workspace')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#applyButton')).toBeEnabled();
  await expect(page.locator('#downloadButton')).toBeEnabled();
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
