const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const root = path.resolve(__dirname, '../..');
const pdfFixture = path.join(root, 'tests/fixtures/merge-a.pdf');
const unicodeFont = path.join(root, 'vendor/fonts/NotoSans-Regular.ttf');
const signatureBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z8rkAAAAASUVORK5CYII=', 'base64');

test('CSV conversion preserves quoted newlines, escaped quotes, and empty fields', async ({ page }) => {
  await page.goto('/file/csv-to-json/');
  await page.setInputFiles('#csvInput', {
    name: 'multiline.csv', mimeType: 'text/csv',
    buffer: Buffer.from('name,notes,optional\r\nAlice,"first line\r\nsecond ""quoted"" line",\r\nBob,ok,42'),
  });
  await page.click('#csvConvertButton');
  const result = JSON.parse(await page.locator('#csvPreview').innerText());
  expect(result).toEqual([
    { name: 'Alice', notes: 'first line\r\nsecond "quoted" line', optional: '' },
    { name: 'Bob', notes: 'ok', optional: '42' },
  ]);
});

test('CSV conversion rejects inconsistent columns and duplicate headers', async ({ page }) => {
  await page.goto('/file/csv-to-json/');
  for (const input of ['name,notes\nAlice,one,extra', 'name,name\nAlice,Bob']) {
    await page.setInputFiles('#csvInput', { name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from(input) });
    await page.click('#csvConvertButton');
    await expect(page.locator('#csvDownloadButton')).toBeDisabled();
    await expect(page.locator('#csvPreview')).toHaveText('');
  }
});

test('invalid JSON replacement cannot download a previous result', async ({ page }) => {
  await page.goto('/file/json-to-csv/');
  await page.setInputFiles('#jsonInput', { name: 'old.json', mimeType: 'application/json', buffer: Buffer.from('[{"customer":"old value"}]') });
  await page.click('#jsonConvertButton');
  await expect(page.locator('#jsonDownloadButton')).toBeEnabled();
  await page.setInputFiles('#jsonInput', { name: 'replacement.json', mimeType: 'application/json', buffer: Buffer.from('invalid json') });
  await expect(page.locator('#jsonStatus')).toHaveText('Invalid JSON file.');
  await expect(page.locator('#jsonDownloadButton')).toBeDisabled();
  await expect(page.locator('#jsonConvertButton')).toBeDisabled();
  await expect(page.locator('#jsonPreview')).toHaveText('');
});

test('WOFF and WOFF2 conversion produce valid downloadable fonts', async ({ page }) => {
  await page.goto('/fonts/webfont-convert/');
  await page.setInputFiles('#fontInput', unicodeFont);
  for (const format of ['woff', 'woff2']) {
    await page.selectOption('#outputFormat', format);
    await page.click('#fontConvertButton');
    await expect(page.locator('#fontDownloadButton')).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.click('#fontDownloadButton');
    const download = await downloadPromise;
    const bytes = fs.readFileSync(await download.path());
    expect(bytes.subarray(0, 4).toString()).toBe(format === 'woff2' ? 'wOF2' : 'wOFF');
    const loaded = await page.evaluate(async ({ values, format }) => {
      const face = new FontFace('ConvertedFixture', new Uint8Array(values).buffer);
      await face.load();
      return face.status;
    }, { values: Array.from(bytes), format });
    expect(loaded).toBe('loaded');
  }
});

test('font CSS uses the source format and can load the converted WOFF2', async ({ page }) => {
  await page.goto('/fonts/webfont-convert/');
  await page.setInputFiles('#fontInput', unicodeFont);
  await page.selectOption('#outputFormat', 'woff2');
  await page.click('#fontConvertButton');
  await expect(page.locator('#fontDownloadButton')).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.click('#fontDownloadButton');
  const download = await downloadPromise;
  const file = await download.path();
  await page.goto('/fonts/css-generator/');
  await page.setInputFiles('#cssFontInput', { name: 'fixture.woff2', mimeType: 'font/woff2', buffer: fs.readFileSync(file) });
  await page.click('#cssGenerateButton');
  await expect(page.locator('#cssOutput')).toContainText("format('woff2')");
});

test('PDF upload button opens one file picker per click', async ({ page }) => {
  await page.goto('/pdf/fill-sign/');
  await page.waitForFunction(() => window.kreativUploadUi);
  const calls = await page.locator('#pdfFillUploadButton').evaluate((button) => {
    let count = 0;
    document.getElementById('pdfFillInput').click = () => { count += 1; };
    button.click();
    return count;
  });
  expect(calls).toBe(1);
});

test('PDF text and saved signature names are rendered as text, including after reload', async ({ page }) => {
  await page.goto('/pdf/fill-sign/');
  await page.setInputFiles('#pdfFillInput', pdfFixture);
  const overlay = page.locator('.pdf-fill-page-overlay').first();
  await expect(overlay).toBeVisible();
  const payload = '<img src=x onerror="window.auditInjection=true">';
  await page.fill('#pdfFillText', payload);
  await overlay.click({ position: { x: 65, y: 65 } });
  await expect(page.locator('#pdfFillPlacementList')).toContainText(payload);
  await expect(page.locator('#pdfFillPlacementList img')).toHaveCount(0);
  await page.click('#pdfFillToolSignature');
  const name = '<img src=x onerror=window.auditInjection=true>.png';
  await page.setInputFiles('#pdfSignatureInput', { name, mimeType: 'image/png', buffer: signatureBytes });
  await page.click('#pdfSignatureSaveButton');
  await expect(page.locator('#pdfSavedSignatureList')).toContainText(name);
  await expect(page.locator('#pdfSavedSignatureList img')).toHaveCount(0);
  expect(await page.evaluate(() => window.auditInjection)).toBeUndefined();
  await page.reload();
  expect(await page.evaluate(() => window.auditInjection)).toBeUndefined();
  await page.setInputFiles('#pdfFillInput', pdfFixture);
  await page.click('#pdfFillToolSignature');
  await expect(page.locator('#pdfSavedSignatureList')).toContainText(name);
  await page.locator('#pdfSavedSignatureList').getByRole('button', { name: 'Remove', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kreativ-pdf-fill-signatures')).length)).toBe(0);
});

test('PDF text with Romanian diacritics survives export and extraction', async ({ page }) => {
  await page.goto('/pdf/fill-sign/');
  await page.setInputFiles('#pdfFillInput', pdfFixture);
  const text = 'Ștefan Țară - București';
  await page.fill('#pdfFillText', text);
  await page.locator('.pdf-fill-page-overlay').first().click({ position: { x: 65, y: 65 } });
  await page.click('#pdfFillExportButton');
  await expect(page.locator('#pdfFillDownloadButton')).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.click('#pdfFillDownloadButton');
  const download = await downloadPromise;
  const bytes = fs.readFileSync(await download.path());
  const extracted = await page.evaluate(async (values) => {
    const { loadPdfPreview } = await import('/pdf-engine.mjs');
    const pdf = await loadPdfPreview(new Uint8Array(values)).promise;
    const page = await pdf.getPage(1);
    const text = (await page.getTextContent()).items.map((item) => item.str).join(' ');
    await pdf.destroy();
    return text;
  }, Array.from(bytes));
  expect(extracted).toContain(text);
});

test('invalid PDF replacements cannot reuse earlier PDF or DOCX exports', async ({ page }) => {
  for (const tool of ['fill-sign', 'to-docx']) {
    await page.goto(`/pdf/${tool}/`);
    const prefix = tool === 'fill-sign' ? 'pdfFill' : 'pdfDocx';
    await page.setInputFiles(`#${prefix}Input`, pdfFixture);
    if (tool === 'fill-sign') {
      await page.fill('#pdfFillText', 'Earlier document');
      await page.locator('.pdf-fill-page-overlay').first().click({ position: { x: 65, y: 65 } });
      await page.click('#pdfFillExportButton');
    } else {
      await page.click('#pdfDocxConvertButton');
    }
    await expect(page.locator(`#${prefix}DownloadButton`)).toBeEnabled();
    await page.setInputFiles(`#${prefix}Input`, { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
    await expect(page.locator(`#${prefix}Status`)).toContainText('Could not');
    await expect(page.locator(`#${prefix}DownloadButton`)).toBeDisabled();
    await expect(page.locator(`#${prefix}${tool === 'fill-sign' ? 'Export' : 'Convert'}Button`)).toBeDisabled();
  }
});

test('the static HTML security policy rejects JavaScript eval and injected handlers', async ({ page }) => {
  // Execute in a normal page script: DevTools evaluation can bypass eval restrictions.
  await page.route('**/__csp-probe.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.securityProbe = { evalBlocked: false, handlerRan: false };
      try {
        new Function('window.untrustedEvaluation = true')();
      } catch (error) {
        window.securityProbe.evalBlocked = error.name === 'EvalError';
      }
      const image = document.createElement('img');
      image.setAttribute('onerror', 'window.securityProbe.handlerRan = true');
      image.src = '/missing-security-regression-image.png';
      document.body.append(image);
      image.addEventListener('error', () => { window.securityProbe.imageFailed = true; });
    `,
  }));
  await page.goto('/pdf/fill-sign/');
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.src = '/__csp-probe.js';
    document.head.append(script);
  });
  await page.waitForFunction(() => window.securityProbe?.imageFailed);
  expect(await page.evaluate(() => window.securityProbe)).toEqual({
    evalBlocked: true, handlerRan: false, imageFailed: true,
  });
  expect(await page.evaluate(() => window.untrustedEvaluation)).toBeUndefined();
});

test('Learn promotes active guides and does not contain generated export filler', async ({ page }) => {
  await page.goto('/learn/');
  await expect(page.locator('main a[href*="kreativ-workflows"]')).toHaveCount(0);
  await expect(page.locator('main .page-quality-note')).toHaveCount(0);
  await page.goto('/privacy/');
  await expect(page.locator('main')).toContainText('signature image');
  await expect(page.locator('main')).not.toContainText('After downloading the result');
});

test('all tool upload controls and shared colors pass accessibility checks', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/tools/');
  const routes = await page.locator('.tool-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
  expect(routes).toHaveLength(23);
  for (const route of ['/', '/tools/', '/learn/', '/privacy/', '/contact/', ...routes]) {
    await page.goto(route);
    await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.waitForTimeout(350);
      const violations = await page.evaluate(async () => (await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })).violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => target) })));
      expect(violations, `${route} ${theme}`).toEqual([]);
    }
    for (const button of await page.locator('.dropzone button').all()) {
      const pickerCount = await button.evaluate((element) => {
        const input = element.closest('.upload-card').querySelector('input[type="file"]');
        let calls = 0;
        input.click = () => { calls += 1; };
        element.click();
        return calls;
      });
      expect(pickerCount, `${route} upload button`).toBe(1);
    }
  }
});
