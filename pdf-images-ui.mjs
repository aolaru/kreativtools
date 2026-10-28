import { createPdfTaskRunner } from './pdf-job.mjs';
import { bindPdfUpload, formatBytes } from './pdf-tool-ui.mjs';
import { openPdfPages, renderPdfPage, checkAbort } from './pdf-page-render.mjs';
import { parsePageSelection, pdfOutputBase } from './pdf-page-model.mjs';

const $ = (name) => document.getElementById(`imagesPdf${name}`);
const status = $('Status');
const prepare = $('ActionButton');
const download = $('DownloadButton');
const workspace = $('Workspace');
const upload = window.kreativUploadUi.init({ input: $('Input'), dropzone: $('Dropzone'), workspace });
let source = null;
let session = null;
let loadAbort = null;
let workAbort = null;
let version = 0;
let loadVersion = 0;
let zipBytes = null;
let results = [];
const runner = createPdfTaskRunner({ onProgress: (message) => { status.textContent = message; }, onBusy: (busy) => { $('CancelButton').hidden = !busy; } });

function invalidate() {
  version += 1;
  workAbort?.abort();
  zipBytes = null;
  download.disabled = true;
  results.forEach((result) => URL.revokeObjectURL(result.url));
  results = [];
  $('Results').replaceChildren();
  $('Result').textContent = '';
  prepare.disabled = !source;
  $('CancelButton').hidden = !runner.busy;
}

async function load(file) {
  const request = ++loadVersion;
  loadAbort?.abort();
  invalidate();
  runner.cancel();
  const previous = session;
  session = null;
  source = null;
  prepare.disabled = true;
  $('Range').value = '';
  workspace.classList.remove('is-hidden');
  upload.setLoaded({ name: file.name, size: file.size });
  $('Meta').textContent = `Checking ${file.name}...`;
  const abort = new AbortController();
  loadAbort = abort;
  try {
    await previous?.close();
    if (request !== loadVersion) return;
    checkAbort(abort.signal);
    const info = await runner.run('inspect', [file]);
    if (request !== loadVersion) return;
    $('CancelButton').hidden = false;
    const opened = await openPdfPages(file, abort.signal);
    if (request !== loadVersion) { await opened.close(); return; }
    session = opened;
    source = file;
    $('Meta').textContent = `${file.name} / ${info.pages} pages / ${formatBytes(file.size)}`;
    if (info.pages > 50) $('Range').value = '1-50';
    prepare.disabled = false;
    status.textContent = info.pages > 50 ? 'Loaded. The first 50 pages are selected; change the range to export another batch.' : 'Loaded. Choose pages and resolution, then prepare the images.';
  } catch (error) {
    if (request === loadVersion && !abort.signal.aborted && error.name !== 'AbortError') status.textContent = error.message;
  } finally { if (request === loadVersion) $('CancelButton').hidden = true; }
}

prepare.addEventListener('click', async () => {
  if (!source || !session) return;
  invalidate();
  const request = version;
  const abort = new AbortController();
  workAbort = abort;
  const pending = [];
  prepare.disabled = true;
  $('CancelButton').hidden = false;
  try {
    const pages = parsePageSelection($('Range').value, session.pdf.numPages);
    const format = $('Format').value;
    const dpi = Number($('Dpi').value);
    const quality = Number($('Quality').value) / 100;
    if (!['image/png', 'image/jpeg'].includes(format) || ![72, 144, 216].includes(dpi)) throw new Error('Choose a supported image format and resolution.');
    const archive = new window.JSZip();
    let total = 0;
    for (let index = 0; index < pages.length; index += 1) {
      status.textContent = `Rendering page ${pages[index]} (${index + 1} of ${pages.length})...`;
      const image = await renderPdfPage(session.pdf, pages[index], { signal: abort.signal, format, scale: dpi / 72, quality });
      checkAbort(abort.signal);
      total += image.blob.size;
      if (total > 100 * 1024 * 1024) throw new Error('The images exceed 100 MB. Use fewer pages, JPG, or a lower DPI.');
      const name = `${pdfOutputBase(source.name)}-page-${String(pages[index]).padStart(3, '0')}.${format === 'image/png' ? 'png' : 'jpg'}`;
      archive.file(name, await image.blob.arrayBuffer());
      pending.push({ ...image, name, url: URL.createObjectURL(image.blob), page: pages[index] });
    }
    status.textContent = 'Building the ZIP...';
    // PNG and JPG are already compressed. STORE avoids another CPU-heavy pass.
    const bytes = await archive.generateAsync({ type: 'uint8array', compression: 'STORE' });
    checkAbort(abort.signal);
    if (request !== version) return;
    zipBytes = bytes;
    results = pending;
    $('Results').replaceChildren(...results.map((result, index) => {
      const card = document.createElement('article');
      card.className = 'pdf-page-card';
      const heading = document.createElement('h3');
      heading.textContent = `Page ${result.page}`;
      const image = document.createElement('img');
      image.className = 'pdf-image-result';
      image.src = result.url;
      image.alt = `Exported page ${result.page}`;
      const meta = document.createElement('p');
      meta.textContent = `${result.width} x ${result.height} px / ${formatBytes(result.blob.size)}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary-button';
      button.textContent = 'Download image';
      button.dataset.result = index;
      button.setAttribute('aria-label', `Download page ${result.page} image`);
      card.append(heading, image, meta, button);
      return card;
    }));
    download.disabled = false;
    $('Result').textContent = `${results.length} images / ZIP ${formatBytes(bytes.byteLength)}`;
    status.textContent = 'Images ready. Download the ZIP or an individual page.';
  } catch (error) {
    if (request === version && !abort.signal.aborted) status.textContent = error.message;
  } finally {
    if (request !== version || !zipBytes) pending.forEach((result) => URL.revokeObjectURL(result.url));
    if (request === version) { prepare.disabled = !source; $('CancelButton').hidden = true; }
  }
});
function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
download.addEventListener('click', () => { if (zipBytes && source) save(new Blob([zipBytes], { type: 'application/zip' }), `${pdfOutputBase(source.name)}-images.zip`); });
$('Results').addEventListener('click', (event) => { const button = event.target.closest('[data-result]'); const result = button && results[Number(button.dataset.result)]; if (result) save(result.blob, result.name); });
for (const name of ['Range', 'Format', 'Dpi', 'Quality']) $(name).addEventListener('input', () => { invalidate(); $('Quality').disabled = $('Format').value !== 'image/jpeg'; });
$('Quality').disabled = true;
$('CancelButton').addEventListener('click', () => { if (!source) { loadAbort?.abort(); runner.cancel(); } invalidate(); $('CancelButton').hidden = true; status.textContent = 'Cancelled. Your original PDF is unchanged.'; });
bindPdfUpload({ input: $('Input'), button: $('UploadButton'), dropzone: $('Dropzone'), onFiles: (files) => { if (files[0]) load(files[0]); } });
window.addEventListener('pagehide', (event) => { workAbort?.abort(); runner.cancel(); if (!event.persisted) { loadAbort?.abort(); results.forEach((result) => URL.revokeObjectURL(result.url)); } });
