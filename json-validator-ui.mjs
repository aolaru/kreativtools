import { formatJson, MAX_JSON_BYTES, validateJson } from './json-format.mjs';

const editor = document.getElementById('jsonEditor');
const fileInput = document.getElementById('jsonFile');
const status = document.getElementById('jsonResult');
let filename = 'formatted.json';
let revision = 0;

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('json-result-error', error);
}
function check(action) {
  try {
    if (action === 'validate') validateJson(editor.value);
    else editor.value = formatJson(editor.value, action === 'format');
    message(action === 'validate' ? 'Valid JSON syntax.' : action === 'format' ? 'Valid JSON formatted.' : 'Valid JSON minified.');
  } catch (error) {
    message(`Could not ${action}: ${error.message}`, true);
  }
}
editor.addEventListener('input', () => { revision += 1; message('Text changed. Validate to check its syntax.'); });
document.getElementById('validateJson').addEventListener('click', () => check('validate'));
document.getElementById('formatJson').addEventListener('click', () => check('format'));
document.getElementById('minifyJson').addEventListener('click', () => check('minify'));
document.getElementById('openJson').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  fileInput.value = '';
  if (!file) return;
  const current = ++revision;
  if (file.size > MAX_JSON_BYTES) { message('File exceeds the 2 MB input limit.', true); return; }
  try {
    const content = await file.text();
    if (current !== revision) return;
    editor.value = content;
    filename = file.name.replace(/\.json$/i, '') + '.json';
    message(`Opened ${file.name}. Validate to check its syntax.`);
  } catch { if (current === revision) message('Could not read this file.', true); }
});
document.getElementById('clearJson').addEventListener('click', () => { revision += 1; editor.value = ''; filename = 'formatted.json'; message('Enter JSON to get started.'); editor.focus(); });
document.getElementById('copyJson').addEventListener('click', async () => {
  if (!editor.value) { message('Nothing to copy.', true); return; }
  try { await navigator.clipboard.writeText(editor.value); message('JSON copied to clipboard.'); }
  catch { message('Clipboard unavailable. Select the text and copy it manually.', true); }
});
document.getElementById('downloadJson').addEventListener('click', () => {
  try { validateJson(editor.value); }
  catch (error) { message(`Cannot download: ${error.message}`, true); return; }
  const url = URL.createObjectURL(new Blob([editor.value], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message(`Downloaded ${filename}.`);
});
