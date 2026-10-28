const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument, degrees } = require('pdf-lib');

test('image archive filenames cannot contain directory paths or control characters', async () => {
  const { pdfOutputBase } = await import('../../pdf-page-model.mjs');
  assert.equal(pdfOutputBase('invoice.pdf'), 'invoice');
  assert.doesNotMatch(pdfOutputBase('../folder\\file\u0000.pdf'), /[\\/\u0000]/);
  assert.equal(pdfOutputBase('.pdf'), 'document');
});

test('page selections preserve order, deduplicate, and reject bad or excessive ranges', async () => {
  const { parsePageSelection } = await import('../../pdf-page-model.mjs');
  assert.deepEqual(parsePageSelection('3, 1-2, 2', 4), [3, 1, 2]);
  assert.deepEqual(parsePageSelection('', 3), [1, 2, 3]);
  for (const value of ['0', '5', '3-1', '1,,2', '1.5', 'a', '99999999999999999999']) assert.throws(() => parsePageSelection(value, 4));
  assert.throws(() => parsePageSelection('', 51), /50 pages/);
  assert.throws(() => parsePageSelection('1-50,51', 100), /50 pages/);
});

test('page plans normalize quarter turns and reject missing, invalid, or excessive output pages', async () => {
  const { validatePagePlan } = await import('../../pdf-page-model.mjs');
  assert.deepEqual(validatePagePlan([{ index: 1, rotation: -90 }], 2), [{ index: 1, rotation: 270 }]);
  for (const plan of [[], [{ index: -1, rotation: 0 }], [{ index: 2, rotation: 0 }], [{ index: 0, rotation: 45 }], Array.from({ length: 201 }, () => ({ index: 0, rotation: 0 }))]) assert.throws(() => validatePagePlan(plan, 2));
});

test('organizing copies selected pages in order with independent duplicate rotations and metadata cleanup', async () => {
  const { executePdfOperation } = await import('../../pdf-operations.mjs');
  const source = await PDFDocument.create();
  source.setAuthor('Private fixture author');
  source.addPage([200, 300]);
  source.addPage([180, 260]).setRotation(degrees(90));
  const bytes = await source.save();
  const file = new File([bytes], 'source.pdf', { type: 'application/pdf' });
  const result = await executePdfOperation({ operation: 'organize', files: [file], removeMetadata: true, pagePlan: [{ index: 1, rotation: 90 }, { index: 0, rotation: 270 }, { index: 0, rotation: 0 }] });
  const output = await PDFDocument.load(result.bytes, { updateMetadata: false });
  assert.deepEqual(output.getPages().map((page) => page.getRotation().angle), [180, 270, 0]);
  assert.deepEqual(output.getPages().map((page) => page.getSize()), [{ width: 180, height: 260 }, { width: 200, height: 300 }, { width: 200, height: 300 }]);
  assert.equal(output.context.trailerInfo.Info, undefined);
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
});
