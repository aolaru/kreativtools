const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');

test('PDF resource limits reject excessive files before reading their contents', async () => {
  const { executePdfOperation, PDF_LIMITS } = await import('../../pdf-operations.mjs');
  const unreadable = (name, size) => ({ name, size, arrayBuffer() { throw new Error('Should not read this file'); } });
  await assert.rejects(executePdfOperation({ operation: 'inspect', files: [unreadable('huge.pdf', PDF_LIMITS.fileBytes + 1)] }), /huge.pdf.*100 MB/);
  await assert.rejects(executePdfOperation({ operation: 'merge', files: Array.from({ length: 101 }, () => unreadable('file.pdf', 1)) }), /100 PDFs/);
  await assert.rejects(executePdfOperation({ operation: 'merge', files: Array.from({ length: 3 }, () => unreadable('file.pdf', PDF_LIMITS.fileBytes)) }), /200 MB/);
  await assert.rejects(executePdfOperation({ operation: 'inspect', files: [unreadable('empty.pdf', 0)] }), /empty.pdf.*empty/);
});

test('shared PDF operations retain page counts and report named validation failures', async () => {
  const { executePdfOperation } = await import('../../pdf-operations.mjs');
  const document = await PDFDocument.create();
  document.addPage();
  const file = new File([await document.save()], 'valid.pdf', { type: 'application/pdf' });
  const info = await executePdfOperation({ operation: 'inspect', files: [file] });
  assert.equal(info.pages, 1);
  assert.match(info.hash, /^[0-9a-f]{64}$/);
  const result = await executePdfOperation({ operation: 'compress', files: [file], removeMetadata: true });
  const output = await PDFDocument.load(result.bytes, { updateMetadata: false });
  assert.equal(output.getPageCount(), 1);
  assert.equal(output.context.trailerInfo.Info, undefined);
  await assert.rejects(executePdfOperation({ operation: 'inspect', files: [new File(['not PDF'], 'bad.pdf')] }), /bad.pdf.*not a readable PDF/);
});
