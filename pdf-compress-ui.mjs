import { createPdfTaskRunner } from './pdf-job.mjs';
import { formatBytes, downloadPdf, bindPdfUpload, pdfWarning } from './pdf-tool-ui.mjs';

const $ = (id) => document.getElementById(`compressPdf${id}`);
const input = $('Input');
const workspace = $('Workspace');
const prepare = $('ActionButton');
const download = $('DownloadButton');
const cancel = $('CancelButton');
const status = $('Status');
const metadata = $('RemoveMetadata');
const uploadUi = window.kreativUploadUi.init({ input, dropzone: $('Dropzone'), workspace });
let source = null;
let output = null;
let generation = 0;
const runner = createPdfTaskRunner({
  onProgress: (message) => { status.textContent = message; },
  onBusy: (busy) => { cancel.hidden = !busy; prepare.disabled = busy || !source; },
});

function resetResult() {
  generation += 1;
  runner.cancel();
  output = null;
  download.disabled = true;
  $('Summary').textContent = source ? 'Ready to compare the original and optimized sizes.' : 'No PDF analyzed yet.';
  $('InputSize').textContent = source ? formatBytes(source.size) : '-';
  $('OutputSize').textContent = '-';
  $('Savings').textContent = '-';
  $('SavingsRow').classList.remove('result-savings-positive');
  $('Outcome').textContent = '';
  $('MetadataResult').textContent = '';
}

async function load(file) {
  resetResult();
  const request = generation;
  source = null;
  prepare.disabled = true;
  workspace.classList.remove('is-hidden');
  uploadUi.setLoaded({ name: file.name, size: file.size });
  $('Meta').textContent = `Checking ${file.name}...`;
  $('Warnings').textContent = '';
  $('InputSize').textContent = formatBytes(file.size);
  try {
    const info = await runner.run('inspect', [file]);
    if (request !== generation) return;
    source = file;
    prepare.disabled = false;
    $('Meta').textContent = `${file.name} - ${info.pages} page${info.pages === 1 ? '' : 's'} - ${formatBytes(file.size)}`;
    $('Warnings').textContent = pdfWarning(info);
    status.textContent = `Loaded PDF: ${file.name}. Ready to compress.`;
  } catch (error) {
    if (error.name !== 'AbortError') {
      $('Meta').textContent = 'Choose another PDF to continue.';
      status.textContent = error.message;
    }
  }
}

prepare.addEventListener('click', async () => {
  if (!source) return;
  resetResult();
  const request = generation;
  const file = source;
  const clean = metadata.checked;
  try {
    const result = await runner.run('compress', [file], { removeMetadata: clean });
    if (request !== generation) return;
    output = result.bytes;
    const difference = file.size - output.byteLength;
    const percent = Math.abs(difference / file.size * 100).toFixed(1);
    $('InputSize').textContent = formatBytes(file.size);
    $('OutputSize').textContent = formatBytes(output.byteLength);
    $('Savings').textContent = difference > 0 ? `${formatBytes(difference)} (${percent}%)` : difference < 0 ? `Increased by ${formatBytes(-difference)} (${percent}%)` : 'No change';
    $('Outcome').textContent = difference > 0 ? `${percent}% smaller` : clean ? 'Metadata removed; no size reduction' : 'No size reduction';
    $('Summary').textContent = difference > 0 ? 'Download the smaller PDF if the result suits your needs.' : clean
      ? 'Metadata removed, but the PDF did not get smaller. Download this result to keep the metadata removal.'
      : 'This PDF did not get smaller. Keep the original unless you need this rewritten version.';
    $('MetadataResult').textContent = clean ? 'Metadata removed. Visible content, annotations, form values, and attachments remain.' : 'Metadata cleanup was not selected.';
    $('SavingsRow').classList.toggle('result-savings-positive', difference > 0);
    download.disabled = false;
    status.textContent = difference > 0 ? `Compression complete.${clean ? ' Metadata removed.' : ''} Ready to download.` : clean
      ? 'Metadata removed. This PDF did not shrink, but you can download the cleaned version.' : 'Compression complete. This PDF did not shrink.';
  } catch (error) {
    if (error.name !== 'AbortError') { status.textContent = error.message; $('Summary').textContent = 'No output was created. Your original is unchanged.'; }
  }
});
download.addEventListener('click', () => {
  if (!output || !source) return;
  const filename = `${source.name.replace(/\.[^.]+$/, '')}.compressed.pdf`;
  downloadPdf(output, filename);
  status.textContent = `Downloaded ${filename}.${metadata.checked ? ' Metadata removed.' : ''}`;
});
metadata.addEventListener('change', () => {
  // Settings may change while the source is being checked; do not abandon that check.
  if (!source && runner.busy) return;
  resetResult();
});
cancel.addEventListener('click', () => {
  resetResult();
  if (!source) $('Meta').textContent = 'Choose a PDF again to continue.';
  status.textContent = 'Cancelled. Your original file is unchanged.';
});
$('ResetButton').addEventListener('click', () => input.click());
bindPdfUpload({ input, button: $('UploadButton'), dropzone: $('Dropzone'), onFiles: (files) => { if (files[0]) load(files[0]); } });
window.addEventListener('pagehide', () => {
  if (!runner.busy) return;
  resetResult();
  if (!source) $('Meta').textContent = 'Choose a PDF again to continue.';
  status.textContent = 'Cancelled when leaving the page. Your original file is unchanged.';
});
prepare.disabled = true;
