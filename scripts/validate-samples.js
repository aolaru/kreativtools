const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PDFDocument } = require('pdf-lib');
const JSZip = require('jszip');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'resources/sample-files/manifest.json');
const categories = ['pdf', 'images', 'documents', 'archives', 'data', 'audio-video'];
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fail = (message) => { throw new Error(message); };

async function validateCatalog() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (catalog.version !== 1 || !Array.isArray(catalog.samples) || !catalog.samples.length) fail('Invalid sample catalog.');
  const ids = new Set(), urls = new Set();
  for (const item of catalog.samples) {
    for (const key of ['id', 'title', 'description', 'category', 'format', 'filename', 'mimeType', 'downloadUrl', 'testScenario', 'expectedResult', 'validity', 'access', 'sha256']) {
      if (typeof item[key] !== 'string' || !item[key].trim()) fail(`Missing ${key} in ${item.id || 'sample'}.`);
    }
    if (!categories.includes(item.category) || !['valid', 'invalid', 'edge'].includes(item.validity) || item.access !== 'free') fail(`Invalid public classification: ${item.id}`);
    if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== 'string' || !tag)) fail(`Invalid tags: ${item.id}`);
    if (!/^[a-z0-9-]+$/.test(item.id) || !/^[a-z0-9][a-z0-9.-]*$/.test(item.filename) || item.filename.includes('..')) fail(`Unsafe identifier or filename: ${item.id}`);
    if (item.downloadUrl !== `/test-files/${item.category}/${item.filename}` || !/^[a-f0-9]{64}$/.test(item.sha256)) fail(`Invalid path or checksum: ${item.id}`);
    if (ids.has(item.id) || urls.has(item.downloadUrl)) fail(`Duplicate sample: ${item.id}`);
    ids.add(item.id); urls.add(item.downloadUrl);
    const file = path.join(root, item.downloadUrl.slice(1));
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) fail(`Missing or unsafe sample: ${item.downloadUrl}`);
    const bytes = fs.readFileSync(file);
    if (!Number.isSafeInteger(item.sizeBytes) || item.sizeBytes !== bytes.length || item.sha256 !== hash(bytes)) fail(`Metadata mismatch: ${item.id}`);
    const text = bytes.toString('utf8');
    if (item.category === 'pdf') {
      if (item.validity === 'invalid') {
        try { await PDFDocument.load(bytes); fail(`Invalid PDF unexpectedly loaded: ${item.id}`); } catch (error) { if (error.message.startsWith('Invalid PDF unexpectedly')) throw error; }
      } else if (item.tags.includes('encrypted')) {
        try { await PDFDocument.load(bytes); fail(`Encrypted PDF unexpectedly loaded: ${item.id}`); } catch (error) { if (!/encrypted/i.test(error.message)) throw error; }
      } else {
        const doc = await PDFDocument.load(bytes);
        if (doc.getPageCount() < 1) fail(`PDF has no pages: ${item.id}`);
        if (item.tags.includes('form') && !doc.getForm().getFields().length) fail(`PDF form is missing: ${item.id}`);
      }
    }
    if (item.category === 'images' && item.validity === 'invalid' && bytes.toString('hex').startsWith('89504e470d0a1a0a')) fail(`Invalid PNG has a PNG signature: ${item.id}`);
    if (item.category === 'images' && item.validity !== 'invalid') {
      const signatures = { PNG: '89504e470d0a1a0a', JPEG: 'ffd8ff', GIF: '47494638', WEBP: '52494646' };
      if (item.format === 'SVG') { if (!text.includes('<svg') || !text.includes('</svg>')) fail(`Invalid SVG: ${item.id}`); }
      else if (!bytes.toString('hex').startsWith(signatures[item.format] || 'NO_SIGNATURE')) fail(`Invalid image signature: ${item.id}`);
      if (item.format === 'WEBP' && bytes.toString('ascii', 8, 12) !== 'WEBP') fail(`Invalid WebP: ${item.id}`);
    }
    if (item.category === 'archives' || ['DOCX', 'XLSX', 'PPTX'].includes(item.format)) {
      if (item.validity === 'invalid') {
        try { await JSZip.loadAsync(bytes); fail(`Invalid ZIP unexpectedly loaded: ${item.id}`); } catch (error) { if (error.message.startsWith('Invalid ZIP unexpectedly')) throw error; }
      } else {
        const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
        const required = { DOCX: 'word/document.xml', XLSX: 'xl/workbook.xml', PPTX: 'ppt/presentation.xml' }[item.format];
        if (required && (!zip.file('[Content_Types].xml') || !zip.file(required))) fail(`Invalid Office package: ${item.id}`);
        if (item.filename === 'formula.xlsx' && !(await zip.file('xl/worksheets/sheet1.xml').async('string')).includes('<f>B2*C2</f>')) fail('Spreadsheet formula missing.');
        if (item.filename === 'nested-zip.zip') await JSZip.loadAsync(await zip.file('inner.zip').async('nodebuffer'), { checkCRC32: true });
      }
    }
    if (item.category === 'data' && item.format === 'JSON') {
      if (item.validity === 'valid') JSON.parse(text);
      else { let invalid = false; try { JSON.parse(text); } catch { invalid = true; } if (!invalid) fail(`Invalid JSON parsed: ${item.id}`); }
    }
    if (item.format === 'WAV' && (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')) fail(`Invalid WAV: ${item.id}`);
    if (item.format === 'MP3' && !((bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) || bytes.toString('ascii', 0, 3) === 'ID3')) fail(`Invalid MP3: ${item.id}`);
    if (item.format === 'MP4' && bytes.toString('ascii', 4, 8) !== 'ftyp') fail(`Invalid MP4: ${item.id}`);
  }
  for (const entry of fs.readdirSync(path.join(root, 'test-files'), { withFileTypes: true })) {
    if (!entry.isDirectory() || !categories.includes(entry.name)) fail(`Unexpected public test-files entry: ${entry.name}`);
  }
  for (const category of categories) {
    const dir = path.join(root, 'test-files', category);
    for (const name of fs.readdirSync(dir)) if (!urls.has(`/test-files/${category}/${name}`)) fail(`Uncatalogued public file: ${category}/${name}`);
  }
  require('node:child_process').execFileSync('python3', [path.join(root, 'scripts/validate-sample-content.py')], { stdio: 'inherit' });
  console.log(`Validated ${catalog.samples.length} public samples, sizes, hashes and format checks.`);
  return catalog;
}
if (require.main === module) validateCatalog().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { validateCatalog, categories };
