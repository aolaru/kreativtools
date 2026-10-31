const imageInput = document.getElementById('imageInput');
const dropzone = document.getElementById('dropzone');
const uploadButton = document.getElementById('uploadButton');

const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const formatInput = document.getElementById('formatInput');
const qualityInput = document.getElementById('qualityInput');
const qualityValue = document.getElementById('qualityValue');
const keepRatioInput = document.getElementById('keepRatio');

const toolResizeButton = document.getElementById('toolResize');
const toolConvertButton = document.getElementById('toolConvert');
const toolPdfButton = document.getElementById('toolPdf');

const workspace = document.getElementById('workspace');
const resizeFields = document.getElementById('resizeFields');
const formatFields = document.getElementById('formatFields');
const pdfFields = document.getElementById('pdfFields');
const ratioRow = document.getElementById('ratioRow');
const pdfMarginRow = document.getElementById('pdfMarginRow');
const pdfPageSizeInput = document.getElementById('pdfPageSize');
const pdfOrientationInput = document.getElementById('pdfOrientation');
const pdfMarginInput = document.getElementById('pdfMarginInput');

const applyButton = document.getElementById('applyButton');
const downloadButton = document.getElementById('downloadButton');

const statusEl = document.getElementById('status');
const canvas = document.getElementById('previewCanvas');
const dimensionsEl = document.getElementById('dimensions');

const ctx = canvas.getContext('2d');

let originalImage = null;
let originalWidth = 0;
let originalHeight = 0;
let sourceBaseName = 'image';
let activeTool = 'resize';
let batchFiles = [];
let batchZip = null;
let batchVersion = 0;
let loadVersion = 0;

const invalidateBatch = () => {
  batchVersion++;
  batchZip = null;
  downloadButton.disabled = true;
  if (originalImage) applyButton.disabled = false;
};

const MAX_DIMENSION = 16384;
const MAX_CANVAS_PIXELS = 268435456;
const imageFormats = window.kreativImageFormats;
const extensionByMime = imageFormats?.extensionByMime || {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const uploadUi = window.kreativUploadUi?.init({
  input: imageInput,
  dropzone,
  workspace,
});

const drawImageToCanvas = (img, width, height) => {
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  dimensionsEl.textContent = `${width} x ${height}px`;
};

const parseDimension = (value) => {
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
};

const getSafeDimension = (value, fallback) => {
  const parsed = parseDimension(value);
  if (parsed == null) return fallback;
  return Math.min(parsed, MAX_DIMENSION);
};

const canUseCanvasSize = (width, height) => width > 0 && height > 0 && width * height <= MAX_CANVAS_PIXELS;

const getOutputQuality = () => {
  const q = Number.parseInt(qualityInput.value, 10);
  return Math.min(1, Math.max(0.01, q / 100));
};

const isQualityActive = () => imageFormats?.isLossyMime(formatInput.value) || formatInput.value === 'image/jpeg' || formatInput.value === 'image/webp' || formatInput.value === 'image/avif';

const syncQualityUi = () => {
  const enabled = isQualityActive();
  qualityInput.disabled = !enabled;
  qualityValue.textContent = qualityInput.value;
};

const getOutputFilename = () => {
  if (activeTool === 'pdf') {
    return `${sourceBaseName}.pdf`;
  }
  const ext = extensionByMime[formatInput.value] || 'png';
  const suffix = activeTool === 'convert' ? 'converted' : 'resized';
  return `${sourceBaseName}-${suffix}.${ext}`;
};

const syncToolUi = () => {
  const isResize = activeTool === 'resize';
  const isPdf = activeTool === 'pdf';
  const isConvert = activeTool === 'convert';

  toolResizeButton.classList.toggle('is-active', isResize);
  toolConvertButton.classList.toggle('is-active', isConvert);
  toolPdfButton.classList.toggle('is-active', isPdf);
  toolResizeButton.setAttribute('aria-pressed', String(isResize));
  toolConvertButton.setAttribute('aria-pressed', String(isConvert));
  toolPdfButton.setAttribute('aria-pressed', String(isPdf));

  resizeFields.classList.toggle('is-hidden', !isResize);
  ratioRow.classList.toggle('is-hidden', !isResize);
  formatFields.classList.toggle('is-hidden', isPdf);
  pdfFields.classList.toggle('is-hidden', !isPdf);
  pdfMarginRow.classList.toggle('is-hidden', !isPdf);
  applyButton.textContent = isPdf ? 'Prepare PDF' : batchFiles.length > 1 ? 'Prepare images' : 'Prepare image';
  downloadButton.textContent = isPdf ? 'Download PDF' : batchFiles.length > 1 ? 'Download ZIP' : 'Download Image';
  toolPdfButton.disabled = batchFiles.length > 1;
};

const enableWorkspace = () => {
  workspace.classList.remove('is-hidden');
  applyButton.disabled = false;
  downloadButton.disabled = true;
};

const loadFile = (file) => {
  const request = ++loadVersion;
  originalImage = null;
  applyButton.disabled = true;
  downloadButton.disabled = true;
  if (!imageFormats?.isSupportedImageFile(file) && (!file || !file.type.startsWith('image/'))) {
    setStatus('Please select a valid image file. JPG, PNG, WebP, AVIF, GIF, BMP, and TIFF are supported when the browser can decode them.');
    return;
  }

  const normalizedFile = imageFormats?.normalizeImageFile(file) || file;

  const imageUrl = URL.createObjectURL(normalizedFile);
  const img = new Image();

  img.onload = () => {
    if (request !== loadVersion) { URL.revokeObjectURL(imageUrl); return; }
    originalImage = img;
    originalWidth = img.naturalWidth;
    originalHeight = img.naturalHeight;
    sourceBaseName = normalizedFile.name.replace(/\.[^.]+$/, '');

    widthInput.value = String(originalWidth);
    heightInput.value = String(originalHeight);

    if (!canUseCanvasSize(originalWidth, originalHeight)) {
      setStatus('Image is too large for safe browser processing. Use a smaller file.');
      URL.revokeObjectURL(imageUrl);
      return;
    }

    drawImageToCanvas(img, originalWidth, originalHeight);
    enableWorkspace();
    setStatus(`Loaded image: ${normalizedFile.name}`);
    uploadUi?.setLoaded(batchFiles.length > 1
      ? { countLabel: `${batchFiles.length} images`, meta: 'First image shown in preview' }
      : { name: normalizedFile.name, size: normalizedFile.size });
    URL.revokeObjectURL(imageUrl);
  };

  img.onerror = () => {
    if (request !== loadVersion) { URL.revokeObjectURL(imageUrl); return; }
    setStatus('Could not load this file. AVIF, GIF, BMP, and TIFF support depends on the current browser.');
    URL.revokeObjectURL(imageUrl);
  };

  img.src = imageUrl;
};

const loadFiles = (files) => {
  invalidateBatch();
  loadVersion++;
  originalImage = null;
  applyButton.disabled = true;
  batchFiles = [];
  if (!files.length) return;
  if (files.length > 30 || files.reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024) {
    setStatus('Choose at most 30 images and 100 MB combined.');
    return;
  }
  if (files.some((file) => !imageFormats.isSupportedImageFile(file))) {
    setStatus('All selected files must be supported images.');
    return;
  }
  batchFiles = files;
  if (batchFiles.length > 1 && activeTool === 'pdf') activeTool = 'resize';
  syncToolUi();
  loadFile(files[0]);
};

const prepareBatch = async () => {
  if (!window.JSZip) { setStatus('ZIP support is unavailable. Reload and try again.'); return; }
  const request = ++batchVersion;
  batchZip = null;
  downloadButton.disabled = true;
  applyButton.disabled = true;
  const zip = new window.JSZip();
  const mime = formatInput.value;
  const quality = isQualityActive() ? getOutputQuality() : undefined;
  const width = getSafeDimension(widthInput.value, originalWidth);
  const height = getSafeDimension(heightInput.value, originalHeight);
  let totalBytes = 0;
  try {
    for (let i = 0; i < batchFiles.length; i++) {
      if (request !== batchVersion) return;
      const file = imageFormats.normalizeImageFile(batchFiles[i]);
      setStatus(`Preparing image ${i + 1} of ${batchFiles.length}...`);
      const url = URL.createObjectURL(file);
      const img = new Image();
      try {
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error(`Cannot decode ${file.name}.`)); img.src = url; });
        if (request !== batchVersion) return;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (activeTool === 'resize') {
          if (keepRatioInput.checked) {
            const scale = Math.min(width / w, height / h);
            w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
          } else { w = width; h = height; }
        }
        if (w > MAX_DIMENSION || h > MAX_DIMENSION || w * h > 16000000) throw new Error(`${file.name}: dimensions are too large for batch processing.`);
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = w; outputCanvas.height = h;
        outputCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const blob = await new Promise((resolve) => outputCanvas.toBlob(resolve, mime, quality));
        outputCanvas.width = outputCanvas.height = 0;
        if (request !== batchVersion) return;
        if (!blob || blob.type !== mime) throw new Error(`Could not export ${file.name} in this format.`);
        totalBytes += blob.size;
        if (totalBytes > 100 * 1024 * 1024) throw new Error('Batch output exceeds 100 MB. Use fewer images.');
        const base = file.name.replace(/\.[^.]+$/, '').replace(/[\\/<>:"|?*\x00-\x1f\u202a-\u202e\u2066-\u2069]/g, '_').replace(/^\.+/, '').slice(0, 100) || 'image';
        zip.file(`${String(i + 1).padStart(2, '0')}-${base}.${extensionByMime[mime]}`, await blob.arrayBuffer());
      } finally { URL.revokeObjectURL(url); }
    }
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
    if (request !== batchVersion) return;
    batchZip = bytes;
    downloadButton.disabled = false;
    setStatus(`${batchFiles.length} images ready. Download the ZIP.`);
  } catch (error) { if (request === batchVersion) setStatus(error.message); }
  finally { if (request === batchVersion) applyButton.disabled = false; }
};

const applyResize = () => {
  if (!originalImage) return;

  const width = getSafeDimension(widthInput.value, originalWidth);
  const height = getSafeDimension(heightInput.value, originalHeight);

  widthInput.value = String(width);
  heightInput.value = String(height);

  if (!canUseCanvasSize(width, height)) {
    setStatus('Target size is too large. Please reduce width or height.');
    return;
  }

  drawImageToCanvas(originalImage, width, height);
  downloadButton.disabled = false;
  setStatus('Resize applied. Download when ready.');
};

const prepareConvert = () => {
  if (!originalImage) return;
  drawImageToCanvas(originalImage, originalWidth, originalHeight);
  downloadButton.disabled = false;
  setStatus('Convert ready. Choose a format and download.');
};

const preparePdf = () => {
  if (!originalImage) return;
  drawImageToCanvas(originalImage, originalWidth, originalHeight);
  downloadButton.disabled = false;
  setStatus('PDF is ready. Choose page options and download.');
};

const downloadPdf = () => {
  if (!canvas.width || !canvas.height) {
    setStatus('Nothing to export yet.');
    return;
  }

  const jspdfApi = window.jspdf;
  if (!jspdfApi || !jspdfApi.jsPDF) {
    setStatus('PDF engine failed to load. Refresh and try again.');
    return;
  }

  const pageSize = pdfPageSizeInput.value;
  const orientation = pdfOrientationInput.value;
  const marginRaw = Number(pdfMarginInput.value);
  const margin = Number.isFinite(marginRaw) ? Math.min(200, Math.max(0, marginRaw)) : 24;
  pdfMarginInput.value = String(Math.round(margin));

  const { jsPDF } = jspdfApi;
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: pageSize,
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = Math.max(1, pageWidth - margin * 2);
  const maxHeight = Math.max(1, pageHeight - margin * 2);
  const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
  const targetWidth = Math.max(1, Math.round(canvas.width * scale));
  const targetHeight = Math.max(1, Math.round(canvas.height * scale));
  const x = (pageWidth - targetWidth) / 2;
  const y = (pageHeight - targetHeight) / 2;

  const imageData = canvas.toDataURL('image/jpeg', 0.92);
  doc.addImage(imageData, 'JPEG', x, y, targetWidth, targetHeight, undefined, 'FAST');
  doc.save(getOutputFilename());
  setStatus(`Downloaded ${getOutputFilename()}`);
};

uploadButton.addEventListener('click', () => {
  imageInput.click();
});

dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    imageInput.click();
  }
});

imageInput.addEventListener('change', () => {
  const files = Array.from(imageInput.files || []);
  if (files.length) loadFiles(files);
});

dropzone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', (event) => {
  if (event.target === dropzone) {
    dropzone.classList.remove('drag-over');
  }
});

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag-over');
  loadFiles(Array.from(event.dataTransfer?.files || []));
});

toolResizeButton.addEventListener('click', () => {
  invalidateBatch();
  activeTool = 'resize';
  syncToolUi();
});

toolConvertButton.addEventListener('click', () => {
  invalidateBatch();
  activeTool = 'convert';
  syncToolUi();
});

toolPdfButton.addEventListener('click', () => {
  invalidateBatch();
  activeTool = 'pdf';
  syncToolUi();
});

formatInput.addEventListener('change', () => { invalidateBatch(); syncQualityUi(); });
qualityInput.addEventListener('input', () => {
  invalidateBatch();
  qualityValue.textContent = qualityInput.value;
});

widthInput.addEventListener('input', () => {
  invalidateBatch();
  if (!keepRatioInput.checked || !originalImage) return;
  const w = getSafeDimension(widthInput.value, originalWidth);
  const ratio = originalHeight / originalWidth;
  heightInput.value = String(Math.min(MAX_DIMENSION, Math.max(1, Math.round(w * ratio))));
});

heightInput.addEventListener('input', () => {
  invalidateBatch();
  if (!keepRatioInput.checked || !originalImage) return;
  const h = getSafeDimension(heightInput.value, originalHeight);
  const ratio = originalWidth / originalHeight;
  widthInput.value = String(Math.min(MAX_DIMENSION, Math.max(1, Math.round(h * ratio))));
});

applyButton.addEventListener('click', () => {
  if (!originalImage) {
    setStatus('Upload an image first.');
    return;
  }

  if (batchFiles.length > 1) { prepareBatch(); return; }

  if (activeTool === 'resize') {
    applyResize();
    return;
  }

  if (activeTool === 'pdf') {
    preparePdf();
    return;
  }

  prepareConvert();
});

downloadButton.addEventListener('click', () => {
  if (batchFiles.length > 1) {
    if (!batchZip) return;
    const url = URL.createObjectURL(new Blob([batchZip], { type: 'application/zip' }));
    const link = document.createElement('a'); link.href = url; link.download = 'images.zip'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  if (activeTool === 'pdf') {
    downloadPdf();
    return;
  }

  if (!canvas.width || !canvas.height) {
    setStatus('Nothing to download yet.');
    return;
  }

  const mimeType = formatInput.value;
  const filename = getOutputFilename();
  const quality = isQualityActive() ? getOutputQuality() : undefined;

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        setStatus('Could not export image. Try a different format.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded ${filename}`);
    },
    mimeType,
    quality
  );
});

keepRatioInput.addEventListener('change', invalidateBatch);
window.addEventListener('pagehide', invalidateBatch);

imageFormats?.syncFormatSelect(formatInput, formatInput.value);
syncQualityUi();
syncToolUi();
