import { createPdfTaskRunner } from './pdf-job.mjs';
import { formatBytes, downloadPdf, bindPdfUpload, pdfWarning, firstPageThumbnail } from './pdf-tool-ui.mjs';

const $ = (id) => document.getElementById(`mergePdf${id}`);
const input = $('Input');
const workspace = $('Workspace');
const prepare = $('ActionButton');
const download = $('DownloadButton');
const cancel = $('CancelButton');
const status = $('Status');
const list = $('List');
const metadata = $('RemoveMetadata');
const uploadUi = window.kreativUploadUi.init({ input, dropzone: $('Dropzone'), workspace });
let entries = [];
let pending = [];
let checking = false;
let checkCancelled = false;
let output = null;
let dragging = null;
let generation = 0;
const thumbnailAbort = new AbortController();
let thumbnailQueue = Promise.resolve();
const runner = createPdfTaskRunner({
  onProgress: (message) => { status.textContent = message; },
  onBusy: (busy) => { cancel.hidden = !busy; prepare.disabled = busy || checking || entries.length < 2; },
});

function resetResult() {
  generation += 1;
  if (!checking) runner.cancel();
  output = null;
  download.disabled = true;
  $('OutputStatus').textContent = 'Waiting for merge';
  $('MetadataResult').textContent = '';
}

function render(focus) {
  const activeButton = document.activeElement?.closest('#mergePdfList button[data-action]');
  if (!focus && activeButton) focus = { hash: activeButton.closest('.pdf-queue-item').dataset.hash, action: activeButton.dataset.action };
  workspace.classList.toggle('is-hidden', !entries.length && !checking);
  if (entries.length) {
    uploadUi.setLoaded({ countLabel: `${entries.length} PDF files in queue`, meta: `${formatBytes(entries.reduce((sum, entry) => sum + entry.file.size, 0))} - checked locally` });
  } else uploadUi.clear();
  prepare.disabled = checking || runner.busy || entries.length < 2;
  $('Meta').textContent = `${entries.length} files / ${entries.reduce((sum, entry) => sum + entry.info.pages, 0)} pages`;
  $('Count').textContent = String(entries.length);
  $('TotalSize').textContent = formatBytes(entries.reduce((sum, entry) => sum + entry.file.size, 0));
  $('Summary').textContent = entries.length < 2 ? 'Add one more PDF to enable merging.' : 'Drag files into order, or use Move Up and Move Down.';
  list.replaceChildren(...entries.map((entry, index) => {
    const item = document.createElement('article');
    item.className = 'queue-item pdf-queue-item';
    item.dataset.hash = entry.info.hash;
    item.draggable = true;
    item.setAttribute('aria-label', `${index + 1}. ${entry.file.name}`);
    const thumbnail = document.createElement(entry.thumbnail ? 'img' : 'span');
    thumbnail.className = 'pdf-queue-thumbnail';
    if (entry.thumbnail) {
      thumbnail.src = entry.thumbnail;
      thumbnail.alt = `First page of ${entry.file.name}`;
      thumbnail.draggable = false;
    } else {
      thumbnail.textContent = 'PDF';
      thumbnail.setAttribute('aria-hidden', 'true');
    }
    const main = document.createElement('div');
    main.className = 'queue-item-main';
    const title = document.createElement('strong');
    title.className = 'queue-item-title';
    title.textContent = `${index + 1}. ${entry.file.name}`;
    const meta = document.createElement('span');
    meta.className = 'queue-item-meta';
    meta.textContent = `${entry.info.pages} page${entry.info.pages === 1 ? '' : 's'} - ${formatBytes(entry.file.size)}`;
    main.append(title, meta);
    const warning = pdfWarning(entry.info, true);
    if (warning) {
      const note = document.createElement('p');
      note.className = 'pdf-warning';
      note.textContent = warning;
      main.append(note);
    }
    const actions = document.createElement('div');
    actions.className = 'queue-item-actions';
    for (const [action, label, disabled] of [['up', 'Move Up', index === 0], ['down', 'Move Down', index === entries.length - 1], ['remove', 'Remove', false]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action === 'remove' ? 'danger-button' : 'secondary-button';
      button.dataset.action = action;
      button.dataset.index = index;
      button.textContent = label;
      button.setAttribute('aria-label', `${label}: ${entry.file.name}`);
      button.disabled = disabled;
      actions.append(button);
    }
    item.append(thumbnail, main, actions);
    return item;
  }));
  if (focus) {
    const row = list.querySelector(`[data-hash="${focus.hash}"]`);
    const target = row?.querySelector(`[data-action="${focus.action}"]:not(:disabled)`) || row?.querySelector('button:not(:disabled)');
    target?.focus();
  }
}

function move(from, to, action) {
  if (from === to || to < 0 || to >= entries.length) return;
  resetResult();
  const [entry] = entries.splice(from, 1);
  entries.splice(to, 0, entry);
  render(action ? { hash: entry.info.hash, action } : null);
  status.textContent = `Moved ${entry.file.name} to position ${to + 1}.`;
}

async function addFiles(files) {
  pending.push(...files);
  if (checking) return;
  resetResult();
  checking = true;
  checkCancelled = false;
  render();
  const problems = [];
  while (pending.length) {
    const file = pending.shift();
    try {
      if (entries.length >= 100 || entries.reduce((sum, entry) => sum + entry.file.size, file.size) > 200 * 1024 * 1024) {
        throw new Error(`${file.name}: the queue limit is 100 PDFs or 200 MB combined.`);
      }
      const info = await runner.run('inspect', [file]);
      if (entries.some((entry) => entry.info.hash === info.hash)) {
        problems.push(`${file.name}: duplicate PDF skipped (same file contents).`);
        continue;
      }
      const entry = { file, info, thumbnail: null };
      entries.push(entry);
      render();
      // Only one preview is decoded at a time; a failed preview never rejects a readable PDF.
      thumbnailQueue = thumbnailQueue.then(async () => {
        if (!entries.includes(entry)) return;
        try {
          const thumbnail = await firstPageThumbnail(file, thumbnailAbort.signal);
          if (!entries.includes(entry)) { if (thumbnail) URL.revokeObjectURL(thumbnail); return; }
          entry.thumbnail = thumbnail;
          const old = list.querySelector(`[data-hash="${info.hash}"] .pdf-queue-thumbnail`);
          if (old && thumbnail) {
            const image = document.createElement('img');
            image.className = old.className;
            image.src = thumbnail;
            image.alt = `First page of ${file.name}`;
            image.draggable = false;
            old.replaceWith(image);
          }
        } catch (error) {
          const meta = list.querySelector(`[data-hash="${info.hash}"] .queue-item-meta`);
          if (meta) meta.textContent += ' - preview unavailable';
          console.warn('PDF thumbnail unavailable:', error.message);
        }
      });
    } catch (error) {
      if (error.name !== 'AbortError') problems.push(error.message);
    }
  }
  checking = false;
  render();
  $('Issues').replaceChildren(...problems.map((message) => {
    const item = document.createElement('li');
    item.textContent = message;
    return item;
  }));
  status.textContent = checkCancelled ? 'Cancelled. Checked files stay in the queue.' : problems.length ? problems.join(' ') : `${entries.length} PDF files checked. Review the order before merging.`;
}

prepare.addEventListener('click', async () => {
  if (checking || entries.length < 2) return;
  resetResult();
  const request = generation;
  const clean = metadata.checked;
  $('OutputStatus').textContent = 'Merging in progress';
  try {
    const result = await runner.run('merge', entries.map((entry) => entry.file), { removeMetadata: clean });
    if (request !== generation) return;
    output = result.bytes;
    $('OutputStatus').textContent = `Ready to download: ${result.pages} pages / ${formatBytes(output.byteLength)}`;
    $('MetadataResult').textContent = clean ? 'Metadata removed. Page content and annotations are not redacted.' : 'Metadata cleanup was not selected.';
    download.disabled = false;
    status.textContent = clean ? 'Merge complete. Metadata removed. Download the cleaned PDF when ready.' : 'Merge complete. Review the order and download when ready.';
  } catch (error) {
    if (error.name !== 'AbortError') { status.textContent = error.message; $('OutputStatus').textContent = 'Merge failed'; }
  }
});
download.addEventListener('click', () => {
  if (!output) return;
  downloadPdf(output, 'merged.pdf');
  status.textContent = metadata.checked ? 'Downloaded merged PDF. Metadata removed.' : 'Downloaded merged PDF.';
});
metadata.addEventListener('change', resetResult);
cancel.addEventListener('click', () => {
  pending = [];
  checkCancelled = true;
  runner.cancel();
  resetResult();
  status.textContent = 'Cancelled. Checked files stay in the queue.';
});
$('AddMoreButton').addEventListener('click', () => input.click());
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const index = Number(button.dataset.index);
  if (button.dataset.action === 'up') move(index, index - 1, 'up');
  if (button.dataset.action === 'down') move(index, index + 1, 'down');
  if (button.dataset.action === 'remove') {
    resetResult();
    const [entry] = entries.splice(index, 1);
    if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail);
    render();
    list.querySelectorAll('[data-action="remove"]')[Math.min(index, entries.length - 1)]?.focus();
    if (!entries.length) $('UploadButton').focus();
    status.textContent = `Removed ${entry.file.name}.`;
  }
});
list.addEventListener('dragstart', (event) => {
  const item = event.target.closest('.pdf-queue-item');
  if (!item) return;
  dragging = item.dataset.hash;
  event.dataTransfer.setData('text/plain', dragging);
  event.dataTransfer.effectAllowed = 'move';
});
list.addEventListener('dragover', (event) => { if (dragging) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } });
list.addEventListener('drop', (event) => {
  const item = event.target.closest('.pdf-queue-item');
  if (!dragging || !item) return;
  event.preventDefault();
  move(entries.findIndex((entry) => entry.info.hash === dragging), entries.findIndex((entry) => entry.info.hash === item.dataset.hash));
  dragging = null;
});
list.addEventListener('dragend', () => { dragging = null; });
bindPdfUpload({ input, button: $('UploadButton'), dropzone: $('Dropzone'), onFiles: addFiles });
window.addEventListener('pagehide', (event) => {
  pending = [];
  checkCancelled = true;
  const wasBusy = runner.busy;
  runner.cancel();
  if (wasBusy) {
    resetResult();
    status.textContent = 'Cancelled when leaving the page. Prepare the PDF again when ready.';
  }
  // Back/forward cache keeps the page alive, including its thumbnail URLs.
  if (event.persisted) return;
  thumbnailAbort.abort();
  entries.forEach((entry) => { if (entry.thumbnail) URL.revokeObjectURL(entry.thumbnail); });
});
render();
