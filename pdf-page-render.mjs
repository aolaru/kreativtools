import { loadPdfPreview } from './pdf-engine.mjs';

export function checkAbort(signal) {
  if (signal.aborted) throw new DOMException('Cancelled.', 'AbortError');
}

export async function openPdfPages(file, signal) {
  checkAbort(signal);
  const task = loadPdfPreview(new Uint8Array(await file.arrayBuffer()));
  const stop = () => { task.destroy().catch(() => {}); };
  signal.addEventListener('abort', stop, { once: true });
  try {
    checkAbort(signal);
    const pdf = await task.promise;
    return { pdf, close: async () => { signal.removeEventListener('abort', stop); await task.destroy().catch(() => {}); } };
  } catch (error) {
    signal.removeEventListener('abort', stop);
    await task.destroy().catch(() => {});
    throw error;
  }
}

export async function renderPdfPage(pdf, number, { signal, scale = 1, thumbnail = false, format = 'image/png', quality = 0.9 } = {}) {
  checkAbort(signal);
  const page = await pdf.getPage(number);
  const natural = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: thumbnail ? Math.min(140 / natural.width, 180 / natural.height) : scale });
  if (viewport.width > 8192 || viewport.height > 8192 || viewport.width * viewport.height > 16_000_000) throw new Error(`Page ${number} is too large at this resolution. Choose a lower DPI.`);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const task = page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' });
  const stop = () => task.cancel();
  signal.addEventListener('abort', stop, { once: true });
  try {
    checkAbort(signal);
    await task.promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
    checkAbort(signal);
    if (!blob || blob.type !== format) throw new Error('Your browser could not encode this image format. Try PNG.');
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    signal.removeEventListener('abort', stop);
    canvas.width = canvas.height = 0;
  }
}
