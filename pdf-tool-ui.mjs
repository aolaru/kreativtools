export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function downloadPdf(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function bindPdfUpload({ input, button, dropzone, onFiles }) {
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    input.value = '';
    if (files.length) onFiles(files);
  });
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    onFiles(Array.from(event.dataTransfer.files || []));
  });
}

export function pdfWarning(info, merging = false) {
  const warnings = [];
  if (info.signed) warnings.push('This PDF contains signature fields. Rewriting it can invalidate digital signatures; keep the original.');
  if (merging && info.hasForms) warnings.push('This PDF contains form fields. Merge copies pages, not an editable form. Flatten completed forms in a trusted PDF app first.');
  if (merging && info.hasAttachments) warnings.push('This PDF contains attachments. Merge copies pages, not document attachments.');
  return warnings.join(' ');
}

export async function firstPageThumbnail(file, signal) {
  if (signal.aborted) return null;
  const { loadPdfPreview } = await import('./pdf-engine.mjs');
  if (signal.aborted) return null;
  const task = loadPdfPreview(new Uint8Array(await file.arrayBuffer()));
  const stop = () => { task.destroy().catch(() => {}); };
  signal.addEventListener('abort', stop, { once: true });
  let url;
  try {
    if (signal.aborted) return null;
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const initial = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(120 / initial.width, 160 / initial.height) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport, annotationMode: 0 }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blob && !signal.aborted) url = URL.createObjectURL(blob);
    return url;
  } finally {
    signal.removeEventListener('abort', stop);
    await task.destroy();
  }
}
