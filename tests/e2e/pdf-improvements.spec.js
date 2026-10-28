const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { PDFDocument, PDFName } = require('pdf-lib');
const fixturePath = path.resolve(__dirname, '../fixtures/merge-a.pdf');
const otherPath = path.resolve(__dirname, '../fixtures/merge-b.pdf');

async function specialPdf(kind) {
  const document = await PDFDocument.create();
  document.addPage([200, 300]).drawText('Keep this page', { x: 20, y: 250, size: 16 });
  if (kind === 'encrypted') document.context.trailerInfo.Encrypt = document.context.register(document.context.obj({ Filter: 'Standard', V: 1, R: 2, Length: 40 }));
  if (kind === 'signed') document.catalog.set(PDFName.of('KreativSignatureFixture'), document.context.register(document.context.obj({ FT: 'Sig', ByteRange: [0, 100, 200, 100] })));
  if (kind === 'large') document.catalog.set(PDFName.of('PreservedPadding'), document.context.register(document.context.stream(new Uint8Array(2 * 1024 * 1024))));
  return { name: `${kind}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(await document.save({ useObjectStreams: kind !== 'large' })) };
}

test('merge validates each file, skips duplicate contents, and keeps valid inputs', async ({ page }) => {
  await page.goto('/pdf/merge/');
  await page.setInputFiles('#mergePdfInput', [fixturePath, otherPath].map((file) => ({ name: path.basename(file), mimeType: 'application/pdf', buffer: fs.readFileSync(file) })).concat([{ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-broken') }, await specialPdf('encrypted')]));
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  await expect(page.locator('#mergePdfIssues')).toContainText('broken.pdf');
  await expect(page.locator('#mergePdfIssues')).toContainText('encrypted.pdf');
  await expect(page.locator('#mergePdfCount')).toHaveText('2');
  await expect(page.locator('.pdf-queue-thumbnail[src]')).toHaveCount(2);
  await expect(page.locator('.queue-item-meta').first()).toContainText('page');
  await page.setInputFiles('#mergePdfInput', { name: 'renamed-copy.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(fixturePath) });
  await expect(page.locator('#mergePdfIssues')).toContainText('duplicate PDF skipped');
  await expect(page.locator('#mergePdfCount')).toHaveText('2');
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfDownloadButton')).toBeEnabled();
});

test('merge supports keyboard ordering, drag ordering, and accurate output order', async ({ page }) => {
  await page.goto('/pdf/merge/');
  await page.setInputFiles('#mergePdfInput', [fixturePath, otherPath]);
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  const initial = await page.locator('.queue-item-title').allTextContents();
  const moveDown = page.locator('[data-action="down"]').first();
  await moveDown.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.queue-item-title').first()).toContainText(path.basename(otherPath));
  await expect(page.locator('[data-action="up"]').nth(1)).toBeFocused();
  const items = page.locator('.pdf-queue-item');
  await items.first().dragTo(items.nth(1), { sourcePosition: { x: 10, y: 10 }, targetPosition: { x: 10, y: 10 } });
  await expect(page.locator('.queue-item-title')).toHaveText(initial);
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfDownloadButton')).toBeEnabled();
  const promise = page.waitForEvent('download');
  await page.click('#mergePdfDownloadButton');
  const result = await PDFDocument.load(fs.readFileSync(await (await promise).path()));
  const a = await PDFDocument.load(fs.readFileSync(fixturePath));
  const b = await PDFDocument.load(fs.readFileSync(otherPath));
  expect(result.getPages().map((page) => page.getSize())).toEqual([...a.getPages(), ...b.getPages()].map((page) => page.getSize()));
});

test('compression rejects encrypted and broken replacements without a stale export', async ({ page }) => {
  await page.goto('/pdf/compress/');
  await page.setInputFiles('#compressPdfInput', fixturePath);
  await expect(page.locator('#compressPdfActionButton')).toBeEnabled();
  await page.click('#compressPdfActionButton');
  await expect(page.locator('#compressPdfDownloadButton')).toBeEnabled();
  for (const file of [await specialPdf('encrypted'), { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not pdf') }]) {
    await page.setInputFiles('#compressPdfInput', file);
    await expect(page.locator('#compressPdfStatus')).toContainText(file.name);
    await expect(page.locator('#compressPdfCancelButton')).toBeHidden();
    await expect(page.locator('#compressPdfActionButton')).toBeDisabled();
    await expect(page.locator('#compressPdfDownloadButton')).toBeDisabled();
  }
});

test('signature fields are warned about before rewriting a PDF', async ({ page }) => {
  const file = await specialPdf('signed');
  for (const tool of ['merge', 'compress']) {
    await page.goto(`/pdf/${tool}/`);
    await page.setInputFiles(`#${tool === 'merge' ? 'mergePdf' : 'compressPdf'}Input`, file);
    await expect(page.locator('.pdf-warning').filter({ hasText: 'invalidate digital signatures' })).toBeVisible();
  }
});

test('metadata settings can change during PDF validation without abandoning the input', async ({ page }) => {
  await page.goto('/pdf/compress/');
  await page.evaluate(() => {
    const Original = Worker;
    window.Worker = class extends Original {
      postMessage(data, ...rest) {
        if (data.operation === 'inspect') window.resumePdfInspection = () => super.postMessage(data, ...rest);
        else super.postMessage(data, ...rest);
      }
    };
  });
  await page.setInputFiles('#compressPdfInput', fixturePath);
  await page.waitForFunction(() => window.resumePdfInspection);
  await page.check('#compressPdfRemoveMetadata');
  await page.evaluate(() => window.resumePdfInspection());
  await expect(page.locator('#compressPdfActionButton')).toBeEnabled();
  await page.click('#compressPdfActionButton');
  await expect(page.locator('#compressPdfDownloadButton')).toBeEnabled();
  await expect(page.locator('#compressPdfMetadataResult')).toContainText('Metadata removed');
});

test('the initial merge validation can be cancelled before any file reaches the queue', async ({ page }) => {
  await page.goto('/pdf/merge/');
  await page.evaluate(() => {
    const Original = Worker;
    window.Worker = class extends Original {
      postMessage() { window.pdfInspectionStarted = true; }
    };
    window.restorePdfWorker = () => { window.Worker = Original; };
  });
  await page.setInputFiles('#mergePdfInput', fixturePath);
  await expect(page.locator('#mergePdfCancelButton')).toBeVisible();
  await page.click('#mergePdfCancelButton');
  await expect(page.locator('#mergePdfStatus')).toContainText('Cancelled');
  await expect(page.locator('#mergePdfWorkspace')).toHaveClass(/is-hidden/);
  await page.evaluate(() => window.restorePdfWorker());
  await page.setInputFiles('#mergePdfInput', [fixturePath, otherPath]);
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
});

test('cached-page lifecycle preserves merge thumbnails and allows further uploads', async ({ page }) => {
  await page.goto('/pdf/merge/');
  await page.setInputFiles('#mergePdfInput', [fixturePath, otherPath]);
  await expect(page.locator('.pdf-queue-thumbnail[src]')).toHaveCount(2);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.setInputFiles('#mergePdfInput', await specialPdf('signed'));
  await expect(page.locator('.pdf-queue-thumbnail[src]')).toHaveCount(3);
  expect(await page.locator('.pdf-queue-thumbnail[src]').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
});

for (const tool of ['merge', 'compress']) {
  test(`${tool} cancellation terminates a pending worker and permits retry`, async ({ page }) => {
    const prefix = tool === 'merge' ? 'mergePdf' : 'compressPdf';
    await page.goto(`/pdf/${tool}/`);
    await page.setInputFiles(`#${prefix}Input`, tool === 'merge' ? [fixturePath, otherPath] : fixturePath);
    await expect(page.locator(`#${prefix}ActionButton`)).toBeEnabled();
    await page.evaluate(() => {
      const Original = Worker;
      window.restoreWorker = () => { window.Worker = Original; };
      window.Worker = class extends Original {
        postMessage(data, ...rest) { if (data.operation !== 'inspect') window.delayedPdfJob = true; else super.postMessage(data, ...rest); }
        terminate() { window.pdfWorkerTerminated = true; super.terminate(); }
      };
    });
    await page.click(`#${prefix}ActionButton`);
    await page.waitForFunction(() => window.delayedPdfJob);
    await expect(page.locator(`#${prefix}CancelButton`)).toBeVisible();
    await page.click(`#${prefix}CancelButton`);
    await expect(page.locator(`#${prefix}Status`)).toContainText('Cancelled');
    expect(await page.evaluate(() => window.pdfWorkerTerminated)).toBe(true);
    await expect(page.locator(`#${prefix}DownloadButton`)).toBeDisabled();
    await expect(page.locator(`#${prefix}ActionButton`)).toBeEnabled();
    await page.evaluate(() => window.restoreWorker());
    await page.click(`#${prefix}ActionButton`);
    await expect(page.locator(`#${prefix}DownloadButton`)).toBeEnabled();
  });
}

test('mobile next action remains available away from the controls and does not cover them', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pdf/merge/');
  await page.setInputFiles('#mergePdfInput', [fixturePath, otherPath]);
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  await page.locator('#mergePdfOutputStatus').scrollIntoViewIfNeeded();
  await expect(page.locator('.mobile-export-bar')).toBeVisible();
  const mobileAction = page.locator('.mobile-export-bar button');
  await expect(mobileAction).toHaveText('Prepare PDF');
  await expect(mobileAction).toBeEnabled();
  const labelSurvivesFocus = await mobileAction.evaluate((button) => {
    const label = button.firstChild;
    button.focus();
    return button.firstChild === label;
  });
  expect(labelSurvivesFocus).toBe(true);
  await mobileAction.click();
  await expect(page.locator('#mergePdfDownloadButton'), `After mobile Prepare: ${await page.locator('#mergePdfStatus').textContent()}`).toBeEnabled();
  await expect(page.locator('.mobile-export-bar button')).toHaveText('Download PDF');
  await page.locator('#mergePdfDownloadButton').scrollIntoViewIfNeeded();
  await expect(page.locator('.mobile-export-bar')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.evaluate(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    await page.waitForTimeout(350);
    const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => target) })));
    expect(violations, theme).toEqual([]);
  }
});

test('compression reports size increases honestly and confirms metadata cleanup separately', async ({ page }) => {
  await page.goto('/pdf/compress/');
  const document = await PDFDocument.create({ updateMetadata: false });
  document.addPage([200, 300]);
  const buffer = Buffer.from(await document.save());
  await page.setInputFiles('#compressPdfInput', { name: 'small.pdf', mimeType: 'application/pdf', buffer });
  await expect(page.locator('#compressPdfActionButton')).toBeEnabled();
  await page.check('#compressPdfRemoveMetadata');
  await page.click('#compressPdfActionButton');
  await expect(page.locator('#compressPdfDownloadButton')).toBeEnabled();
  await expect(page.locator('#compressPdfOutcome')).toContainText('Metadata removed; no size reduction');
  await expect(page.locator('#compressPdfMetadataResult')).toContainText('Metadata removed');
  await expect(page.locator('#compressPdfSavings')).toHaveText(/No change|Increased by/);
});

test('large PDF processing stays in a worker and leaves the UI responsive', async ({ page }) => {
  await page.goto('/pdf/compress/');
  await page.setInputFiles('#compressPdfInput', await specialPdf('large'));
  await expect(page.locator('#compressPdfActionButton')).toBeEnabled();
  await page.click('#compressPdfActionButton');
  await page.click('#themeToggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#compressPdfDownloadButton')).toBeEnabled();
});

test('core PDF tools require no external processing or presentation resources', async ({ page }) => {
  const unexpected = [];
  await page.route('https://**/*', (route) => {
    if (!route.request().url().includes('cloudflareinsights.com')) unexpected.push(route.request().url());
    return route.abort();
  });
  await page.goto('/pdf/merge/');
  await page.setInputFiles('#mergePdfInput', [fixturePath, otherPath]);
  await expect(page.locator('#mergePdfActionButton')).toBeEnabled();
  await expect(page.locator('.pdf-queue-thumbnail[src]')).toHaveCount(2);
  await page.click('#mergePdfActionButton');
  await expect(page.locator('#mergePdfDownloadButton')).toBeEnabled();
  expect(unexpected).toEqual([]);
});
