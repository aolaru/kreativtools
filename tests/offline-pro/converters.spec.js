const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');
const root = path.resolve(__dirname, '../..');
const fixture = (...parts) => path.join(root, 'test-files', ...parts);
let unpacked;
const local = (name) => pathToFileURL(path.join(unpacked, name)).href;

test.beforeAll(async () => {
  if (!process.env.OFFLINE_PRO_ZIP) throw new Error('Set OFFLINE_PRO_ZIP to the private PRO ZIP.');
  unpacked = fs.mkdtempSync(path.join(os.tmpdir(), 'kreativ-converters-test-'));
  const zip = await JSZip.loadAsync(fs.readFileSync(process.env.OFFLINE_PRO_ZIP), { checkCRC32: true });
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir || path.basename(name) !== name) throw new Error(`Unexpected archive entry: ${name}`);
    fs.writeFileSync(path.join(unpacked, name), await file.async('nodebuffer'));
  }
});
test.afterAll(() => { if (unpacked) fs.rmSync(unpacked, { recursive: true, force: true }); });

test('all tools open without network requests or script errors', async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(local('index.html'));
  const links = await page.locator('.tool-card').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  expect(links).toHaveLength(19);
  expect(new Set(links).size).toBe(19);
  for (const href of links) {
    expect(href).toMatch(/^[a-z0-9-]+\.html$/);
    await page.goto(local(href));
    await expect(page.locator('h1')).toBeVisible();
  }
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

for (const [file, input, prepare, download] of [
  ['image-crop.html', '#cropImageInput', '#cropApplyButton', '#cropDownloadButton'],
  ['image-compress.html', '#compressImageInput', '#compressApplyButton', '#compressDownloadButton'],
  ['image-resize.html', '#imageInput', '#applyButton', '#downloadButton'],
  ['image-webp.html', '#webpImageInput', '#webpConvertButton', '#webpDownloadButton'],
  ['image-pdf.html', '#pdfImageInput', '#pdfPrepareButton', '#pdfDownloadButton'],
  ['audio-wav.html', '#audioInput', '#audioConvertButton', '#audioDownloadButton'],
  ['audio-mp3.html', '#mp3AudioInput', '#mp3ConvertButton', '#mp3DownloadButton'],
  ['audio-trim.html', '#trimAudioInput', '#trimAudioAction', '#trimAudioDownloadButton'],
  ['audio-volume.html', '#volumeAudioInput', '#volumeAudioAction', '#volumeAudioDownloadButton'],
]) {
  test(`${file} prepares and downloads an output offline`, async ({ page }) => {
    await page.goto(local(file));
    await page.setInputFiles(input, file.startsWith('audio') ? fixture('audio-video', 'tone.wav') : fixture('images', 'basic.png'));
    await expect(page.locator(prepare)).toBeEnabled({ timeout: 15_000 });
    await page.click(prepare);
    await expect(page.locator(download)).toBeEnabled({ timeout: 20_000 });
    const pending = page.waitForEvent('download');
    await page.click(download);
    expect(fs.statSync(await (await pending).path()).size).toBeGreaterThan(0);
  });
}

test('font conversion embeds WOFF2 and font tools operate offline', async ({ page }) => {
  const font = path.join(root, 'vendor/fonts/NotoSans-Regular.ttf');
  await page.goto(local('font-convert.html'));
  await page.setInputFiles('#fontInput', font);
  await page.selectOption('#outputFormat', 'woff2');
  await page.click('#fontConvertButton');
  await expect(page.locator('#fontDownloadButton')).toBeEnabled({ timeout: 20_000 });
  const pending = page.waitForEvent('download');
  await page.click('#fontDownloadButton');
  const bytes = fs.readFileSync(await (await pending).path());
  expect(bytes.subarray(0, 4).toString()).toBe('wOF2');
  await page.selectOption('#outputFormat', 'woff');
  await page.click('#fontConvertButton');
  await expect(page.locator('#fontDownloadButton')).toBeEnabled({ timeout: 20_000 });
  const woffPending = page.waitForEvent('download');
  await page.click('#fontDownloadButton');
  const woffBytes = fs.readFileSync(await (await woffPending).path());
  expect(woffBytes.subarray(0, 4).toString()).toBe('wOFF');
  await page.goto(local('font-preview.html'));
  await page.setInputFiles('#fontPreviewInput', font);
  await expect(page.locator('#fontPreviewBox')).toBeVisible();
  await page.goto(local('font-css.html'));
  await page.setInputFiles('#cssFontInput', { name: 'test.woff2', mimeType: 'font/woff2', buffer: bytes });
  await page.click('#cssGenerateButton');
  await expect(page.locator('#cssOutput')).toContainText("format('woff2')");
});

for (const [file, input, content, prepare, download] of [
  ['xml-csv.html', '#xmlInput', '<root><item><name>Alpha</name></item><item><name>Beta</name></item></root>', '#xmlConvertButton', '#xmlDownloadButton'],
  ['json-csv.html', '#jsonInput', '[{"name":"Alpha"}]', '#jsonConvertButton', '#jsonDownloadButton'],
  ['csv-json.html', '#csvInput', 'name,value\nAlpha,1\n', '#csvConvertButton', '#csvDownloadButton'],
]) {
  test(`${file} exports data offline`, async ({ page }) => {
    await page.goto(local(file));
    await page.setInputFiles(input, { name: file.startsWith('xml') ? 'sample.xml' : file.startsWith('json') ? 'sample.json' : 'sample.csv', mimeType: 'text/plain', buffer: Buffer.from(content) });
    await expect(page.locator(prepare)).toBeEnabled();
    await page.click(prepare);
    await expect(page.locator(download)).toBeEnabled();
    const pending = page.waitForEvent('download');
    await page.click(download);
    expect(fs.readFileSync(await (await pending).path(), 'utf8')).toContain('Alpha');
  });
}

test('JSON validator formats JSON offline', async ({ page }) => {
  await page.goto(local('json-validator.html'));
  await page.locator('#jsonEditor').fill('{"value":1}');
  await page.click('#formatJson');
  await expect(page.locator('#jsonEditor')).toHaveValue(/\n/);
});

for (const [file, input, prepare, download] of [
  ['video-webm.html', '#videoInput', '#videoConvertButton', '#videoDownloadButton'],
  ['video-trim.html', '#trimVideoInput', '#trimActionButton', '#trimDownloadButton'],
  ['video-thumbnail.html', '#thumbVideoInput', '#thumbCaptureButton', '#thumbDownloadButton'],
]) {
  test(`${file} exports video or a thumbnail offline`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Generated WebM codec coverage is tested in Chromium.');
    await page.goto(local(file));
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
      const context = canvas.getContext('2d'); const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }); const chunks = [];
      return new Promise((resolve) => {
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = async () => { stream.getTracks().forEach((track) => track.stop()); resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))); };
        recorder.start(100); let frame = 0;
        const timer = setInterval(() => { context.fillStyle = frame++ % 2 ? '#114488' : '#448811'; context.fillRect(0, 0, 160, 90); }, 80);
        setTimeout(() => { clearInterval(timer); recorder.stop(); }, 650);
      });
    });
    await page.setInputFiles(input, { name: 'sample.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) });
    await expect(page.locator(prepare)).toBeEnabled({ timeout: 15_000 });
    if (file === 'video-trim.html') await page.fill('#trimEndInput', '0.2');
    await page.click(prepare);
    await expect(page.locator(download)).toBeEnabled({ timeout: 20_000 });
    const pending = page.waitForEvent('download');
    await page.click(download);
    expect(fs.statSync(await (await pending).path()).size).toBeGreaterThan(0);
  });
}
