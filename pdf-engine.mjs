import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';

const offline = globalThis.kreativOfflinePdfAssets;
const assetUrl = (path) => offline ? `./${path}` : new URL(`./vendor/pdfjs/${path}`, import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = globalThis.kreativOfflinePreviewWorkerUrl || assetUrl('pdf.worker.min.mjs');
if (globalThis.kreativOfflinePreviewWorkerPort) pdfjsLib.GlobalWorkerOptions.workerPort = globalThis.kreativOfflinePreviewWorkerPort;

function embeddedBytes(directory, name) {
  const value = offline?.[directory]?.[name];
  if (!value) throw new Error(`Missing offline PDF resource: ${name}`);
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

class OfflineCMapFactory {
  async fetch({ name }) { return { cMapData: embeddedBytes('cmaps', `${name}.bcmap`), isCompressed: true }; }
}
class OfflineFontFactory {
  async fetch({ filename }) { return embeddedBytes('standard_fonts', filename); }
}
class OfflineWasmFactory {
  async fetch({ filename }) { return embeddedBytes('wasm', filename); }
}

export function loadPdfPreview(data) {
  return pdfjsLib.getDocument({
    data,
    isEvalSupported: false,
    cMapUrl: assetUrl('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: assetUrl('standard_fonts/'),
    wasmUrl: assetUrl('wasm/'),
    ...(offline ? {
      useWorkerFetch: false,
      CMapReaderFactory: OfflineCMapFactory,
      StandardFontDataFactory: OfflineFontFactory,
      WasmFactory: OfflineWasmFactory,
    } : {}),
  });
}
