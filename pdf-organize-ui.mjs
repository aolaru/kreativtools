import { createPdfTaskRunner } from './pdf-job.mjs';
import { bindPdfUpload, downloadPdf, formatBytes, pdfWarning } from './pdf-tool-ui.mjs';
import { openPdfPages, renderPdfPage } from './pdf-page-render.mjs';
import { ORGANIZER_PAGE_LIMIT, pdfOutputBase } from './pdf-page-model.mjs';

const $ = (name) => document.getElementById(`organizePdf${name}`);
const status = $('Status');
const workspace = $('Workspace');
const prepare = $('ActionButton');
const download = $('DownloadButton');
const grid = $('Pages');
const upload = window.kreativUploadUi.init({ input: $('Input'), dropzone: $('Dropzone'), workspace });
let source = null;
let items = [];
let selected = new Set();
let undo = [];
let nextId = 0;
let output = null;
let loadVersion = 0;
let outputVersion = 0;
let previews = null;
let previewBusy = false;
let dragId = null;
const thumbnails = new Map();
const runner = createPdfTaskRunner({
  onProgress: (message) => { status.textContent = message; },
  onBusy: (busy) => { $('CancelButton').hidden = !busy && !previewBusy; prepare.disabled = busy || !source; },
});

function invalidate() {
  outputVersion += 1;
  runner.cancel();
  output = null;
  download.disabled = true;
  $('Result').textContent = '';
}

function render() {
  $('Selection').textContent = `${items.length} output pages / ${selected.size} selected`;
  for (const name of ['RotateButton', 'DeleteButton', 'DuplicateButton']) $(name).disabled = !selected.size;
  $('UndoButton').disabled = !undo.length;
  $('SelectButton').disabled = !items.length;
  grid.replaceChildren(...items.map((item, index) => {
    const card = document.createElement('article');
    card.className = `pdf-page-card${selected.has(item.id) ? ' is-selected' : ''}`;
    card.draggable = true;
    card.dataset.id = item.id;
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = selected.has(item.id);
    check.dataset.exportIgnore = '';
    check.dataset.selectPage = item.id;
    label.append(check, document.createTextNode(` Output ${index + 1} / source ${item.index + 1}`));
    const stage = document.createElement('div');
    stage.className = 'pdf-page-thumbnail';
    const thumbnail = thumbnails.get(item.index);
    if (thumbnail) {
      const image = document.createElement('img');
      image.src = thumbnail;
      image.alt = `Source page ${item.index + 1}, rotated ${item.rotation} degrees`;
      image.style.transform = `rotate(${item.rotation}deg)`;
      image.draggable = false;
      stage.append(image);
    } else stage.textContent = `Page ${item.index + 1}`;
    const actions = document.createElement('div');
    actions.className = 'inline-actions';
    for (const [direction, text, disabled] of [[-1, 'Earlier', index === 0], [1, 'Later', index === items.length - 1]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary-button';
      button.textContent = text;
      button.dataset.move = direction;
      button.disabled = disabled;
      button.setAttribute('aria-label', `Move output page ${index + 1} ${text.toLowerCase()}`);
      actions.append(button);
    }
    card.append(label, stage, actions);
    return card;
  }));
}

function change(build) {
  const next = build(items.map((item) => ({ ...item })));
  if (!next.length) { status.textContent = 'Keep at least one page in the PDF.'; return; }
  if (next.length > ORGANIZER_PAGE_LIMIT) { status.textContent = 'Use at most 200 output pages.'; return; }
  undo.push(items.map((item) => ({ ...item })));
  if (undo.length > 20) undo.shift();
  items = next;
  selected = new Set([...selected].filter((id) => items.some((item) => item.id === id)));
  invalidate();
  render();
  status.textContent = 'Page arrangement changed. Prepare the PDF again before downloading.';
}

async function load(file) {
  const request = ++loadVersion;
  previews?.abort();
  previewBusy = false;
  invalidate();
  thumbnails.forEach((url) => URL.revokeObjectURL(url));
  thumbnails.clear();
  source = null;
  items = [];
  selected.clear();
  undo = [];
  workspace.classList.remove('is-hidden');
  upload.setLoaded({ name: file.name, size: file.size });
  $('Meta').textContent = `Checking ${file.name}...`;
  $('Warnings').textContent = '';
  render();
  try {
    const info = await runner.run('inspect', [file]);
    if (request !== loadVersion) return;
    if (info.pages > ORGANIZER_PAGE_LIMIT) throw new Error('Page Organizer supports up to 200 source pages. Split a larger PDF first.');
    source = file;
    items = Array.from({ length: info.pages }, (_, index) => ({ id: nextId++, index, rotation: 0 }));
    $('Meta').textContent = `${file.name} / ${info.pages} pages / ${formatBytes(file.size)}`;
    $('Warnings').textContent = pdfWarning(info, 'Page Organizer');
    prepare.disabled = false;
    render();
  } catch (error) {
    if (request === loadVersion && error.name !== 'AbortError') status.textContent = error.message;
    return;
  }
  const abort = new AbortController();
  previews = abort;
  previewBusy = true;
  $('CancelButton').hidden = false;
  let previewMessage = 'Building page thumbnails. You can arrange pages now.';
  status.textContent = previewMessage;
  let session;
  try {
    session = await openPdfPages(file, abort.signal);
    for (let number = 1; number <= session.pdf.numPages; number += 1) {
      if (status.textContent === previewMessage) {
        previewMessage = `Previewing page ${number} of ${session.pdf.numPages}...`;
        status.textContent = previewMessage;
      }
      const { blob } = await renderPdfPage(session.pdf, number, { signal: abort.signal, thumbnail: true });
      if (request !== loadVersion) return;
      thumbnails.set(number - 1, URL.createObjectURL(blob));
      const active = document.activeElement;
      // Do not rebuild focused controls when an asynchronous preview arrives.
      for (const card of grid.querySelectorAll('.pdf-page-card')) {
        const item = items.find((item) => item.id === Number(card.dataset.id));
        if (item?.index !== number - 1) continue;
        const image = document.createElement('img');
        image.src = thumbnails.get(item.index);
        image.alt = `Source page ${number}, rotated ${item.rotation} degrees`;
        image.style.transform = `rotate(${item.rotation}deg)`;
        image.draggable = false;
        card.querySelector('.pdf-page-thumbnail').replaceChildren(image);
      }
      if (active?.isConnected && active !== document.activeElement) active.focus({ preventScroll: true });
    }
    if (request === loadVersion && !runner.busy && status.textContent === previewMessage) status.textContent = 'Select pages to rotate, duplicate, or delete. Drag to reorder, or use Earlier and Later.';
  } catch (error) {
    if (request === loadVersion && !abort.signal.aborted && !runner.busy && status.textContent === previewMessage) status.textContent = `Preview unavailable. You can still organize by page number. ${error.message}`;
  } finally {
    await session?.close();
    if (request === loadVersion) { previewBusy = false; $('CancelButton').hidden = !runner.busy; }
  }
}

$('SelectButton').addEventListener('click', () => { selected = selected.size === items.length ? new Set() : new Set(items.map((item) => item.id)); render(); });
$('RotateButton').addEventListener('click', () => change((plan) => plan.map((item) => selected.has(item.id) ? { ...item, rotation: (item.rotation + 90) % 360 } : item)));
$('DeleteButton').addEventListener('click', () => change((plan) => plan.filter((item) => !selected.has(item.id))));
$('DuplicateButton').addEventListener('click', () => change((plan) => plan.flatMap((item) => selected.has(item.id) ? [item, { ...item, id: nextId++ }] : [item])));
$('UndoButton').addEventListener('click', () => { if (undo.length) { items = undo.pop(); selected.clear(); invalidate(); render(); status.textContent = 'Last page change undone.'; } });
$('RemoveMetadata').addEventListener('change', invalidate);
grid.addEventListener('change', (event) => {
  if (!event.target.matches('[data-select-page]')) return;
  const id = Number(event.target.dataset.selectPage);
  if (event.target.checked) selected.add(id); else selected.delete(id);
  $('Selection').textContent = `${items.length} output pages / ${selected.size} selected`;
  event.target.closest('.pdf-page-card').classList.toggle('is-selected', event.target.checked);
  for (const name of ['RotateButton', 'DeleteButton', 'DuplicateButton']) $(name).disabled = !selected.size;
});
function move(from, to, direction) {
  if (from < 0 || to < 0 || to >= items.length || from === to) return;
  const id = items[from].id;
  change((plan) => { const [item] = plan.splice(from, 1); plan.splice(to, 0, item); return plan; });
  if (direction) {
    const row = grid.querySelector(`[data-id="${id}"]`);
    (row.querySelector(`[data-move="${direction}"]:not(:disabled)`) || row.querySelector('button:not(:disabled)'))?.focus();
  }
}
grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-move]');
  if (!button) return;
  const from = items.findIndex((item) => item.id === Number(button.closest('[data-id]').dataset.id));
  move(from, from + Number(button.dataset.move), button.dataset.move);
});
grid.addEventListener('dragstart', (event) => {
  if (event.target.closest('button, input, label')) { event.preventDefault(); return; }
  dragId = Number(event.target.closest('[data-id]')?.dataset.id);
  event.dataTransfer.setData('text/plain', String(dragId));
  event.dataTransfer.effectAllowed = 'move';
});
grid.addEventListener('dragover', (event) => { if (dragId !== null) event.preventDefault(); });
grid.addEventListener('drop', (event) => {
  const card = event.target.closest('[data-id]');
  if (dragId === null || !card) return;
  event.preventDefault();
  move(items.findIndex((item) => item.id === dragId), items.findIndex((item) => item.id === Number(card.dataset.id)));
  dragId = null;
});
grid.addEventListener('dragend', () => { dragId = null; });
prepare.addEventListener('click', async () => {
  if (!source) return;
  previews?.abort();
  previewBusy = false;
  invalidate();
  const request = outputVersion;
  try {
    const result = await runner.run('organize', [source], { pagePlan: items.map(({ index, rotation }) => ({ index, rotation })), removeMetadata: $('RemoveMetadata').checked });
    if (request !== outputVersion) return;
    output = result.bytes;
    download.disabled = false;
    $('Result').textContent = `${result.pages} pages / ${formatBytes(output.byteLength)}.${result.metadataRemoved ? ' Metadata removed.' : ''}`;
    status.textContent = 'Organized PDF ready. Review the page order, then download.';
  } catch (error) { if (error.name !== 'AbortError' && request === outputVersion) status.textContent = error.message; }
});
download.addEventListener('click', () => { if (output && source) downloadPdf(output, `${pdfOutputBase(source.name)}-organized.pdf`); });
$('CancelButton').addEventListener('click', () => { previews?.abort(); invalidate(); status.textContent = 'Cancelled. Your original file is unchanged.'; });
bindPdfUpload({ input: $('Input'), button: $('UploadButton'), dropzone: $('Dropzone'), onFiles: (files) => { if (files[0]) load(files[0]); } });
window.addEventListener('pagehide', (event) => { loadVersion += 1; previews?.abort(); runner.cancel(); if (!event.persisted) thumbnails.forEach((url) => URL.revokeObjectURL(url)); });
render();
