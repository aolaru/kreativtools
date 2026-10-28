import * as bundledPdfLib from './vendor/pdf-lib.min.js';
import { removePdfMetadata } from './pdf-metadata.mjs';
import { checkPdfFiles } from './pdf-limits.mjs';
import { validatePagePlan } from './pdf-page-model.mjs';
export { PDF_LIMITS } from './pdf-limits.mjs';

const pdfLib = globalThis.PDFLib || bundledPdfLib.default || bundledPdfLib;

async function readDocument(file) {
  const bytes = file.buffer || await file.arrayBuffer();
  const header = new TextDecoder().decode(bytes.slice(0, 1024));
  if (!header.includes('%PDF-')) throw new Error(`${file.name}: this is not a readable PDF.`);
  try {
    const document = await pdfLib.PDFDocument.load(bytes, { updateMetadata: false });
    if (!document.getPageCount()) throw new Error('No pages');
    // Traverse the page tree now so a broken input is named before any output is created.
    document.getPages();
    return { document, bytes };
  } catch (error) {
    if (/encrypt|password/i.test(`${error.name} ${error.message}`)) {
      throw new Error(`${file.name}: password-protected or encrypted PDFs are not supported. Unlock it in a trusted PDF app first.`);
    }
    throw new Error(`${file.name}: could not read its pages. Re-export the PDF from its source application.`);
  }
}

function documentWarnings(document) {
  const { PDFName, PDFDict } = pdfLib;
  const signed = document.context.enumerateIndirectObjects().some(([, object]) =>
    object instanceof PDFDict && (object.has(PDFName.of('ByteRange')) || object.get(PDFName.of('FT'))?.toString() === '/Sig'));
  const hasForms = document.catalog.has(PDFName.of('AcroForm'));
  const names = document.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  return { signed, hasForms, hasAttachments: !!names?.has(PDFName.of('EmbeddedFiles')) };
}

export async function executePdfOperation({ operation, files, removeMetadata = false, pagePlan }, progress = () => {}) {
  checkPdfFiles(files);
  const api = pdfLib;
  if (operation === 'inspect') {
    const file = files[0];
    progress(`Checking ${file.name}...`);
    const { document, bytes } = await readDocument(file);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    return { pages: document.getPageCount(), hash, ...documentWarnings(document) };
  }
  let output;
  if (operation === 'merge') {
    if (files.length < 2) throw new Error('Add at least 2 different PDFs to merge.');
    output = await api.PDFDocument.create({ updateMetadata: !removeMetadata });
    for (let index = 0; index < files.length; index += 1) {
      progress(`Merging file ${index + 1} of ${files.length}: ${files[index].name}`);
      const { document } = await readDocument(files[index]);
      files[index].buffer = null;
      const pages = await output.copyPages(document, document.getPageIndices());
      pages.forEach((page) => output.addPage(page));
    }
  } else if (operation === 'organize') {
    progress('Reading the source pages...');
    const { document } = await readDocument(files[0]);
    const plan = validatePagePlan(pagePlan, document.getPageCount());
    output = await api.PDFDocument.create({ updateMetadata: !removeMetadata });
    const pages = await output.copyPages(document, plan.map((page) => page.index));
    pages.forEach((page, index) => {
      page.setRotation(api.degrees((page.getRotation().angle + plan[index].rotation) % 360));
      output.addPage(page);
    });
  } else if (operation === 'compress') {
    progress(`Reading ${files[0].name}...`);
    ({ document: output } = await readDocument(files[0]));
  } else {
    throw new Error('Unknown PDF operation.');
  }
  if (removeMetadata) {
    progress('Removing document properties and XMP metadata...');
    await removePdfMetadata(output, api);
  }
  progress('Writing the PDF...');
  const bytes = await output.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false, objectsPerTick: 25 });
  return { bytes, pages: output.getPageCount(), metadataRemoved: removeMetadata };
}
