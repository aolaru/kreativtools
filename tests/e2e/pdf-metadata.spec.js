const fs = require('node:fs');
const { test, expect } = require('@playwright/test');

async function fixture(page, label) {
  const values = await page.evaluate(async (label) => {
    const { PDFDocument, PDFName, PDFDict, PDFString, PDFHexString } = PDFLib;
    const document = await PDFDocument.create({ updateMetadata: false });
    document.setTitle(`Private title ${label}`);
    document.setAuthor(`Private author ${label}`);
    document.setSubject('Private subject');
    document.setKeywords(['private', 'keywords']);
    document.setCreator('Private creator');
    document.setProducer('Private producer');
    document.setCreationDate(new Date('2020-01-01T00:00:00Z'));
    document.setModificationDate(new Date('2020-02-01T00:00:00Z'));
    const context = document.context;
    const info = context.lookup(context.trailerInfo.Info, PDFDict);
    info.set(PDFName.of('CustomPrivate'), PDFHexString.fromText(`PRIVATE-METADATA-CUSTOM-${label}`));
    info.set(PDFName.of('IndirectPrivate'), context.register(context.obj([context.register(PDFString.of(`PRIVATE-METADATA-INDIRECT-${label}`))])));
    context.trailerInfo.ID = context.obj([PDFHexString.of('00112233445566778899AABBCCDDEEFF'), PDFHexString.of('FFEEDDCCBBAA99887766554433221100')]);
    const xmp = (kind) => context.register(context.stream(
      `<x:xmpmeta xmlns:x="adobe:ns:meta/">PRIVATE-METADATA-XMP-${kind}-${label}</x:xmpmeta>`,
      { Type: 'Metadata', Subtype: 'XML' },
    ));
    document.catalog.set(PDFName.of('Metadata'), xmp('document'));
    const page = document.addPage([420, 595]);
    page.drawText(`Visible page ${label}`, { x: 40, y: 540, size: 22 });
    page.node.set(PDFName.of('Metadata'), xmp('page'));
    page.node.set(PDFName.of('KreativNestedData'), context.obj({ Nested: [{ Metadata: xmp('nested') }] }));
    const image = await document.embedPng('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z8rkAAAAASUVORK5CYII=');
    await document.flush();
    context.lookup(image.ref).dict.set(PDFName.of('Metadata'), xmp('image'));
    page.drawImage(image, { x: 40, y: 470, width: 24, height: 24 });
    const field = document.getForm().createTextField('approval');
    field.setText('Keep this form value');
    field.addToPage(page, { x: 40, y: 380, width: 250, height: 35 });
    const note = context.register(context.obj({
      Type: 'Annot', Subtype: 'Text', Rect: [40, 300, 60, 320], Contents: PDFString.of('Keep this annotation'),
    }));
    page.node.lookup(PDFName.of('Annots')).push(note);
    await document.attach(new TextEncoder().encode('Keep this attachment'), 'notes.txt');
    return Array.from(await document.save());
  }, label);
  return { name: `${label}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(values) };
}

async function inspect(page, bytes) {
  return page.evaluate(async (values) => {
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, PDFRawStream, decodePDFRawStream } = PDFLib;
    const document = await PDFDocument.load(new Uint8Array(values), { updateMetadata: false });
    const strings = [];
    let metadataLinks = 0;
    let xmpStreams = 0;
    const pending = document.context.enumerateIndirectObjects().map(([, object]) => object);
    const visited = new Set();
    while (pending.length) {
      const object = pending.pop();
      if (!object || visited.has(object)) continue;
      visited.add(object);
      if (object instanceof PDFDict) {
        if (object.has(PDFName.of('Metadata'))) metadataLinks += 1;
        for (const value of object.values()) pending.push(value);
      } else if (object instanceof PDFArray) {
        for (let index = 0; index < object.size(); index += 1) pending.push(object.get(index));
      } else if (object instanceof PDFString || object instanceof PDFHexString) {
        strings.push(object.decodeText());
      } else if (object instanceof PDFRawStream) {
        pending.push(object.dict);
        const decoded = new TextDecoder().decode(decodePDFRawStream(object).decode());
        if (decoded.includes('PRIVATE-METADATA-XMP')) xmpStreams += 1;
        strings.push(decoded);
      }
    }
    const names = document.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
    const embedded = names?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict)?.lookupMaybe(PDFName.of('Names'), PDFArray);
    const formNames = document.getForm().getFields().map((field) => field.getName());
    const { loadPdfPreview } = await import('/pdf-engine.mjs');
    const pdf = await loadPdfPreview(new Uint8Array(values)).promise;
    const pages = [];
    const images = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      pages.push((await page.getTextContent()).items.map((item) => item.str).join(' '));
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = window.document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport, annotationMode: 0 }).promise;
      images.push(canvas.toDataURL());
    }
    await pdf.destroy();
    return {
      info: !!document.context.trailerInfo.Info,
      id: !!document.context.trailerInfo.ID,
      title: document.getTitle() || null,
      author: document.getAuthor() || null,
      producer: document.getProducer() || null,
      modificationDate: document.getModificationDate()?.toISOString() || null,
      metadataLinks, xmpStreams,
      leakedPrivateMetadata: strings.some((value) => value.includes('PRIVATE-METADATA-')),
      pages, images,
      formNames,
      formValue: formNames.includes('approval') ? document.getForm().getTextField('approval').getText() : null,
      attachmentNames: embedded ? Array.from({ length: embedded.size() / 2 }, (_, index) => embedded.get(index * 2).decodeText()) : [],
      hasAnnotation: strings.includes('Keep this annotation'),
    };
  }, Array.from(bytes));
}

async function exportResult(page, prepare, download) {
  await page.click(prepare);
  await expect(page.locator(download)).toBeEnabled();
  const promise = page.waitForEvent('download');
  await page.click(download);
  const result = await promise;
  return fs.readFileSync(await result.path());
}

test('PDF Compress keeps metadata when removal is off, and removes it without changing page rendering when on', async ({ page }) => {
  await page.goto('/pdf/compress/');
  const source = await fixture(page, 'original');
  const original = await inspect(page, source.buffer);
  expect(original.metadataLinks).toBe(4);
  expect(original.xmpStreams).toBe(4);
  await page.setInputFiles('#compressPdfInput', source);
  await expect(page.locator('#compressPdfRemoveMetadata')).not.toBeChecked();
  const unchanged = await inspect(page, await exportResult(page, '#compressPdfActionButton', '#compressPdfDownloadButton'));
  expect(unchanged.title).toBe(original.title);
  expect(unchanged.author).toBe(original.author);
  expect(unchanged.producer).toBe(original.producer);
  expect(unchanged.modificationDate).toBe(original.modificationDate);
  expect(unchanged.metadataLinks).toBe(4);
  expect(unchanged.id).toBe(true);

  await page.check('#compressPdfRemoveMetadata');
  await expect(page.locator('#compressPdfDownloadButton')).toBeDisabled();
  await expect(page.locator('#compressPdfOutputSize')).toHaveText('-');
  const cleaned = await inspect(page, await exportResult(page, '#compressPdfActionButton', '#compressPdfDownloadButton'));
  expect(cleaned.info).toBe(false);
  expect(cleaned.id).toBe(false);
  expect(cleaned.metadataLinks).toBe(0);
  expect(cleaned.xmpStreams).toBe(0);
  expect(cleaned.leakedPrivateMetadata).toBe(false);
  expect(cleaned.images).toEqual(original.images);
  expect(cleaned.pages).toEqual(original.pages);
  expect(cleaned.formValue).toBe('Keep this form value');
  expect(cleaned.attachmentNames).toEqual(['notes.txt']);
  expect(cleaned.hasAnnotation).toBe(true);
  await expect(page.locator('#compressPdfStatus')).toContainText('Metadata removed');
  await page.uncheck('#compressPdfRemoveMetadata');
  const restored = await inspect(page, await exportResult(page, '#compressPdfActionButton', '#compressPdfDownloadButton'));
  expect(restored.author).toBe(original.author);
  expect(restored.metadataLinks).toBe(4);
});

test('PDF Merge removes source page, nested, and image metadata and the generated Info dictionary', async ({ page }) => {
  await page.goto('/pdf/merge/');
  const first = await fixture(page, 'first');
  const second = await fixture(page, 'second');
  const originals = [await inspect(page, first.buffer), await inspect(page, second.buffer)];
  await page.setInputFiles('#mergePdfInput', [first, second]);
  await expect(page.locator('#mergePdfRemoveMetadata')).not.toBeChecked();
  const normal = await inspect(page, await exportResult(page, '#mergePdfActionButton', '#mergePdfDownloadButton'));
  expect(normal.info).toBe(true);
  expect(normal.metadataLinks).toBeGreaterThan(0);

  await page.check('#mergePdfRemoveMetadata');
  await expect(page.locator('#mergePdfDownloadButton')).toBeDisabled();
  await expect(page.locator('#mergePdfOutputStatus')).toHaveText('Waiting for merge');
  const cleaned = await inspect(page, await exportResult(page, '#mergePdfActionButton', '#mergePdfDownloadButton'));
  expect(cleaned.info).toBe(false);
  expect(cleaned.id).toBe(false);
  expect(cleaned.metadataLinks).toBe(0);
  expect(cleaned.xmpStreams).toBe(0);
  expect(cleaned.leakedPrivateMetadata).toBe(false);
  expect(cleaned.pages).toEqual(originals.flatMap((document) => document.pages));
  expect(cleaned.images).toEqual(normal.images);
  expect(cleaned.hasAnnotation).toBe(true);
  await expect(page.locator('#mergePdfStatus')).toContainText('Metadata removed');

  await page.uncheck('#mergePdfRemoveMetadata');
  const restored = await inspect(page, await exportResult(page, '#mergePdfActionButton', '#mergePdfDownloadButton'));
  expect(restored.metadataLinks).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
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

for (const tool of ['merge', 'compress']) {
  test(`${tool} discards a pending result when the metadata setting changes`, async ({ page }) => {
    await page.goto(`/pdf/${tool}/`);
    const source = await fixture(page, 'delayed');
    const prefix = tool === 'merge' ? 'mergePdf' : 'compressPdf';
    const second = tool === 'merge' ? await fixture(page, 'another') : null;
    await page.setInputFiles(`#${prefix}Input`, tool === 'merge' ? [source, second] : source);
    await expect(page.locator(`#${prefix}ActionButton`)).toBeEnabled();
    await page.evaluate(() => {
      const OriginalWorker = window.Worker;
      window.metadataLoadStarted = false;
      window.Worker = class extends OriginalWorker {
        postMessage(data, ...rest) {
          if (data.operation === 'merge' || data.operation === 'compress') {
            window.metadataLoadStarted = true;
            window.resumeMetadataLoad = () => super.postMessage(data, ...rest);
          } else super.postMessage(data, ...rest);
        }
      };
    });
    await page.click(`#${prefix}ActionButton`);
    await page.waitForFunction(() => window.metadataLoadStarted);
    await page.check(`#${prefix}RemoveMetadata`);
    await page.evaluate(() => window.resumeMetadataLoad());
    await expect(page.locator(`#${prefix}ActionButton`)).toBeEnabled();
    await expect(page.locator(`#${prefix}DownloadButton`)).toBeDisabled();
  });
}

test('metadata-cleaned compression results remain downloadable even without size savings', async ({ page }) => {
  await page.goto('/pdf/compress/');
  const values = await page.evaluate(async () => {
    const document = await PDFLib.PDFDocument.create({ updateMetadata: false });
    document.addPage([200, 200]);
    return Array.from(await document.save());
  });
  const source = Buffer.from(values);
  await page.setInputFiles('#compressPdfInput', { name: 'small.pdf', mimeType: 'application/pdf', buffer: source });
  await page.check('#compressPdfRemoveMetadata');
  await page.click('#compressPdfActionButton');
  await expect(page.locator('#compressPdfDownloadButton')).toBeEnabled();
  await expect(page.locator('#compressPdfSummary')).toContainText('did not get smaller');
  await expect(page.locator('#compressPdfStatus')).toContainText('download the cleaned version');
  const promise = page.waitForEvent('download');
  await page.click('#compressPdfDownloadButton');
  const bytes = fs.readFileSync(await (await promise).path());
  expect(bytes.length).toBeGreaterThanOrEqual(source.length);
  expect((await inspect(page, bytes)).info).toBe(false);
});
