const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { createSilentWavBuffer } = require('./helpers/audio');

test('conversion errors remain visible beside the controls after upload', async ({ page }) => {
  await page.goto('/fonts/webfont-convert/');
  await page.setInputFiles('#fontInput', { name: 'damaged.ttf', mimeType: 'font/ttf', buffer: Buffer.from('not a font') });
  await page.click('#fontConvertButton');
  await expect(page.locator('#fontStatus')).toContainText('Conversion failed');
  await expect(page.locator('#fontStatus')).toBeVisible();
  await expect(page.locator('.controls #fontStatus')).toHaveAttribute('role', 'status');
  await expect(page.locator('#fontDownloadButton')).toBeDisabled();
  await expect(page.locator('#fontConvertButton')).toHaveAttribute('aria-busy', 'false');
});

test('mobile directory starts with search, short breadcrumbs, and every category filter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/');
  expect(await page.locator('#toolDirectorySearch').evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(400);
  await expect(page.locator('.breadcrumbs')).toHaveText(/Home\s*\/\s*Tools/);
  await expect(page.locator('.common-jobs-section')).not.toHaveAttribute('open', '');
  for (const name of ['Video', 'Fonts', 'Data']) {
    const filter = page.getByRole('button', { name, exact: true });
    const bounds = await filter.boundingBox();
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
    await filter.click();
    await expect(page.locator('.category-grid .tool-card:not([hidden])')).toHaveCount(3);
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
  }
  await page.fill('#toolDirectorySearch', 'no-results');
  await expect(page.locator('#toolsEmptyState')).toBeVisible();
  await page.click('#toolDirectoryReset');
  await expect(page.locator('#toolDirectorySearch')).toBeFocused();
  await expect(page.locator('.category-grid .tool-card:not([hidden])')).toHaveCount(25);
});

test('mobile PDF editor has a reachable preview, collapsible settings, and stable zoomed placements', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pdf/fill-sign/');
  const bytes = await page.evaluate(async () => {
    const document = await PDFLib.PDFDocument.create();
    document.addPage([595, 842]);
    return Array.from(await document.save());
  });
  await page.setInputFiles('#pdfFillInput', { name: 'form.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  const stage = page.locator('.pdf-fill-page-stage').first();
  await expect(stage).toBeVisible();
  await expect(page.locator('#pdfFillOptions')).not.toHaveAttribute('open', '');
  expect(await page.locator('.pdf-fill-preview-panel').evaluate((element) => element.getBoundingClientRect().top + scrollY)).toBeLessThan(1000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.click('#pdfFillToolText');
  await page.fill('#pdfFillText', 'Mobile placement');
  await page.locator('#pdfFillOptions > summary').click();
  await stage.locator('.pdf-fill-page-overlay').click({ position: { x: 50, y: 60 } });
  const placement = page.locator('.pdf-fill-placement-text');
  const initial = await placement.evaluate((element) => ({ left: element.style.left, top: element.style.top, fontSize: parseFloat(element.style.fontSize) }));
  const width = await stage.evaluate((element) => element.clientWidth);
  await page.selectOption('#pdfFillZoom', '2');
  await expect.poll(() => stage.evaluate((element) => element.clientWidth)).toBeGreaterThan(width * 1.9);
  const zoomed = await placement.evaluate((element) => ({ left: element.style.left, top: element.style.top, fontSize: parseFloat(element.style.fontSize) }));
  expect(zoomed.left).toBe(initial.left);
  expect(zoomed.top).toBe(initial.top);
  expect(zoomed.fontSize / initial.fontSize).toBeCloseTo(2, 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.click('#pdfFillExportButton');
  await expect(page.locator('#pdfFillDownloadButton')).toBeEnabled();
  await page.selectOption('#pdfFillZoom', '1');
  await expect(page.locator('#pdfFillDownloadButton')).toBeEnabled();
  await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    await page.waitForTimeout(350);
    const violations = await page.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    })).violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) })));
    expect(violations, theme).toEqual([]);
  }
});

for (const [route, input, prepare, download, settings, filename] of [
  ['/audio/to-mp3/', 'mp3AudioInput', 'mp3ConvertButton', 'mp3DownloadButton', 'mp3MonoInput', 'sample-128kbps.mp3'],
  ['/audio/to-wav/', 'audioInput', 'audioConvertButton', 'audioDownloadButton', 'monoInput', 'sample-converted.wav'],
  ['/audio/trim/', 'trimAudioInput', 'trimAudioAction', 'trimAudioDownloadButton', 'trimAudioEnd', 'sample-trimmed.wav'],
  ['/audio/volume/', 'volumeAudioInput', 'volumeAudioAction', 'volumeAudioDownloadButton', 'volumeGainInput', 'sample-volume.wav'],
]) {
  test(`${route} prepares a result without downloading and invalidates changed settings`, async ({ page }) => {
    await page.goto(route);
    const downloads = [];
    page.on('download', (download) => downloads.push(download));
    await page.setInputFiles(`#${input}`, { name: 'sample.wav', mimeType: 'audio/wav', buffer: createSilentWavBuffer({ durationSeconds: 0.4 }) });
    await expect(page.locator(`#${prepare}`)).toBeEnabled({ timeout: 15_000 });
    await page.click(`#${prepare}`);
    await expect(page.locator(`#${download}`)).toBeEnabled();
    expect(downloads).toHaveLength(0);
    await expect(page.locator('.export-state')).toContainText('Ready to download');
    await expect(page.getByLabel('Prepared audio preview')).toBeVisible();
    const promise = page.waitForEvent('download');
    await page.click(`#${download}`);
    const result = await promise;
    expect(result.suggestedFilename()).toBe(filename);
    expect(fs.statSync(await result.path()).size).toBeGreaterThan(44);
    await page.locator(`#${settings}`).dispatchEvent('input');
    await expect(page.locator(`#${download}`)).toBeDisabled();
    await expect(page.getByLabel('Prepared audio preview')).toHaveCount(0);
  });
}

for (const route of ['/video/convert-webm/', '/video/trim/']) {
  test(`${route} prepares a playable video before an explicit download`, async ({ page }) => {
    await page.goto(route);
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const context = canvas.getContext('2d');
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      return new Promise((resolve) => {
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));
        };
        recorder.start(100);
        let frame = 0;
        const timer = setInterval(() => {
          context.fillStyle = frame++ % 2 ? '#114488' : '#448811';
          context.fillRect(0, 0, 160, 90);
        }, 80);
        setTimeout(() => { clearInterval(timer); recorder.stop(); }, 650);
      });
    });
    const trim = route.includes('/trim/');
    await page.setInputFiles(trim ? '#trimVideoInput' : '#videoInput', { name: 'sample.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) });
    const prepare = page.locator(trim ? '#trimActionButton' : '#videoConvertButton');
    const download = page.locator(trim ? '#trimDownloadButton' : '#videoDownloadButton');
    await expect(prepare).toBeEnabled();
    if (trim) await page.fill('#trimEndInput', '0.2');
    const unexpectedDownloads = [];
    page.on('download', (download) => unexpectedDownloads.push(download));
    await prepare.click();
    await expect(download).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByLabel('Prepared video preview')).toBeVisible();
    expect(unexpectedDownloads).toHaveLength(0);
    const promise = page.waitForEvent('download');
    await download.click();
    const result = await promise;
    const output = fs.readFileSync(await result.path());
    const dimensions = await page.evaluate(async (values) => {
      const url = URL.createObjectURL(new Blob([new Uint8Array(values)], { type: 'video/webm' }));
      try {
        const video = document.createElement('video');
        const ready = new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject; });
        video.src = url;
        await ready;
        return [video.videoWidth, video.videoHeight];
      } finally { URL.revokeObjectURL(url); }
    }, Array.from(output));
    expect(dimensions).toEqual([160, 90]);
  });
}

test('every exporting tool has separate prepare and download controls', async ({ page }) => {
  await page.goto('/tools/');
  const routes = await page.locator('.category-grid .tool-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('href')).filter((route) => route !== '/fonts/preview/'));
  expect(routes).toHaveLength(24);
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('[data-export-prepare]')).toHaveCount(1);
    await expect(page.locator('[data-export-download]')).toHaveCount(1);
    await expect(page.locator('.export-steps')).toHaveCount(1);
    await expect(page.locator('.tool-feedback')).toHaveCount(1);
    await expect(page.locator('.dropzone [id].status')).toHaveCount(0);
  }
});
