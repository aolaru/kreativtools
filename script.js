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
  applyButton.textContent = isResize ? 'Apply Resize' : isPdf ? 'Prepare PDF' : 'Prepare Convert';
  downloadButton.textContent = isPdf ? 'Download PDF' : 'Download Image';
};

const enableWorkspace = () => {
  workspace.classList.remove('is-hidden');
  applyButton.disabled = false;
  downloadButton.disabled = false;
};

const loadFile = (file) => {
  if (!imageFormats?.isSupportedImageFile(file) && (!file || !file.type.startsWith('image/'))) {
    setStatus('Please select a valid image file. JPG, PNG, WebP, AVIF, GIF, BMP, and TIFF are supported when the browser can decode them.');
    return;
  }

  const normalizedFile = imageFormats?.normalizeImageFile(file) || file;

  const imageUrl = URL.createObjectURL(normalizedFile);
  const img = new Image();

  img.onload = () => {
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
    uploadUi?.setLoaded({ name: normalizedFile.name, size: normalizedFile.size });
    URL.revokeObjectURL(imageUrl);
  };

  img.onerror = () => {
    setStatus('Could not load this file. AVIF, GIF, BMP, and TIFF support depends on the current browser.');
    URL.revokeObjectURL(imageUrl);
  };

  img.src = imageUrl;
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
  setStatus('Resize applied. Download when ready.');
};

const prepareConvert = () => {
  if (!originalImage) return;
  drawImageToCanvas(originalImage, originalWidth, originalHeight);
  setStatus('Convert ready. Choose a format and download.');
};

const preparePdf = () => {
  if (!originalImage) return;
  drawImageToCanvas(originalImage, originalWidth, originalHeight);
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
  const [file] = imageInput.files || [];
  if (file) loadFile(file);
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
  const [file] = event.dataTransfer?.files || [];
  if (file) loadFile(file);
});

toolResizeButton.addEventListener('click', () => {
  activeTool = 'resize';
  syncToolUi();
});

toolConvertButton.addEventListener('click', () => {
  activeTool = 'convert';
  syncToolUi();
});

toolPdfButton.addEventListener('click', () => {
  activeTool = 'pdf';
  syncToolUi();
});

formatInput.addEventListener('change', syncQualityUi);
qualityInput.addEventListener('input', () => {
  qualityValue.textContent = qualityInput.value;
});

widthInput.addEventListener('input', () => {
  if (!keepRatioInput.checked || !originalImage) return;
  const w = getSafeDimension(widthInput.value, originalWidth);
  const ratio = originalHeight / originalWidth;
  heightInput.value = String(Math.min(MAX_DIMENSION, Math.max(1, Math.round(w * ratio))));
});

heightInput.addEventListener('input', () => {
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

imageFormats?.syncFormatSelect(formatInput, formatInput.value);
syncQualityUi();
syncToolUi();
