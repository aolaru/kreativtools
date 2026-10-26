import { checkPdfFiles } from './pdf-limits.mjs';

export function createPdfTaskRunner({ onProgress = () => {}, onBusy = () => {} } = {}) {
  let active = null;
  const cancel = () => active?.abort();
  const run = (operation, files, options = {}) => {
    cancel();
    return new Promise((resolve, reject) => {
      let worker;
      let timer;
      let blobUrl;
      const job = {
        abort: () => finish(new DOMException('PDF task cancelled.', 'AbortError')),
      };
      const finish = (error, result) => {
        if (active !== job) return;
        clearTimeout(timer);
        worker?.terminate();
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        active = null;
        onBusy(false);
        if (error) reject(error);
        else resolve(result);
      };
      active = job;
      onBusy(true);
      try {
        checkPdfFiles(files);
        // The standalone build embeds this same worker, not a second implementation.
        const source = globalThis.kreativOfflinePdfWorker;
        if (source) blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        worker = new Worker(blobUrl || new URL('./pdf-worker.mjs', import.meta.url), { type: source ? 'classic' : 'module' });
        worker.onmessage = ({ data }) => {
          if (active !== job) return;
          if (data.progress) onProgress(data.progress);
          else finish(data.error ? new Error(data.error) : null, data.result);
        };
        worker.onerror = () => finish(new Error('The PDF worker could not run. Reload the page, or download the offline package.'));
        worker.onmessageerror = () => finish(new Error('Could not read the PDF worker response. Please try again.'));
        timer = setTimeout(() => finish(new Error('This PDF took too long to process. Try a smaller file or fewer PDFs.')), 120_000);
        // Read on the page and transfer ownership. WebKit cannot reliably read a
        // cloned local File from a file:// blob worker, but accepts byte buffers.
        (async () => {
          const inputs = [];
          for (const file of files) {
            if (active !== job) return;
            onProgress(`Reading ${file.name}...`);
            let buffer;
            try { buffer = await file.arrayBuffer(); }
            catch { throw new Error(`${file.name}: could not read this file from your device. Choose it again.`); }
            inputs.push({ name: file.name, size: file.size, buffer });
          }
          if (active === job) worker.postMessage({ operation, files: inputs, ...options }, inputs.map((file) => file.buffer));
        })().catch((error) => finish(error));
      } catch (error) {
        finish(error);
      }
    });
  };
  return { run, cancel, get busy() { return !!active; } };
}
