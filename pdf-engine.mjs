import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';

const assetUrl = (path) => new URL(`./vendor/pdfjs/${path}`, import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = assetUrl('pdf.worker.min.mjs');

export function loadPdfPreview(data) {
  return pdfjsLib.getDocument({
    data,
    isEvalSupported: false,
    cMapUrl: assetUrl('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: assetUrl('standard_fonts/'),
    wasmUrl: assetUrl('wasm/'),
  });
}
