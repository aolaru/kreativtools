const imageInput = document.getElementById('imageInput');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const formatInput = document.getElementById('formatInput');
const qualityInput = document.getElementById('qualityInput');
const qualityValue = document.getElementById('qualityValue');
const keepRatioInput = document.getElementById('keepRatio');
const resizeButton = document.getElementById('resizeButton');
const downloadButton = document.getElementById('downloadButton');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('previewCanvas');
const dimensionsEl = document.getElementById('dimensions');

const ctx = canvas.getContext('2d');
let originalImage = null;
let originalWidth = 0;
let originalHeight = 0;
let baseOutputName = 'resized-image';
const MAX_DIMENSION = 16384;
const MAX_CANVAS_PIXELS = 268435456; // 16,384 * 16,384

const extensionByMime = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

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

const getSelectedExtension = () => extensionByMime[formatInput.value] || 'png';

const getOutputFilename = () => `${baseOutputName}.${getSelectedExtension()}`;

const getOutputQuality = () => {
  const q = Number.parseInt(qualityInput.value, 10);
  return Math.min(1, Math.max(0.01, q / 100));
};

const isQualityActive = () => formatInput.value === 'image/jpeg' || formatInput.value === 'image/webp';

const syncQualityUi = () => {
  const enabled = isQualityActive();
  qualityInput.disabled = !enabled;
  qualityValue.textContent = qualityInput.value;
};

imageInput.addEventListener('change', () => {
  const [file] = imageInput.files || [];
  if (!file) return;

  const imageUrl = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    originalImage = img;
    originalWidth = img.naturalWidth;
    originalHeight = img.naturalHeight;

    widthInput.value = String(originalWidth);
    heightInput.value = String(originalHeight);

    drawImageToCanvas(img, originalWidth, originalHeight);

    resizeButton.disabled = false;
    downloadButton.disabled = false;

    const cleanName = file.name.replace(/\.[^.]+$/, '');
    baseOutputName = `${cleanName}-resized`;
    setStatus(`Loaded image: ${file.name}`);

    URL.revokeObjectURL(imageUrl);
  };

  img.onerror = () => {
    setStatus('Could not load this file. Please try another image.');
    URL.revokeObjectURL(imageUrl);
  };

  img.src = imageUrl;
});

formatInput.addEventListener('change', () => {
  syncQualityUi();
});

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

resizeButton.addEventListener('click', () => {
  if (!originalImage) return;

  const width = getSafeDimension(widthInput.value, originalWidth);
  const height = getSafeDimension(heightInput.value, originalHeight);

  widthInput.value = String(width);
  heightInput.value = String(height);

  if (!canUseCanvasSize(width, height)) {
    setStatus('Image is too large to process safely in-browser. Please use smaller dimensions.');
    return;
  }

  drawImageToCanvas(originalImage, width, height);
  setStatus('Image resized. You can now download it.');
});

downloadButton.addEventListener('click', () => {
  if (!canvas.width || !canvas.height) return;
  if (!canUseCanvasSize(canvas.width, canvas.height)) {
    setStatus('Image is too large to download safely. Please reduce dimensions.');
    return;
  }

  const mimeType = formatInput.value;
  const filename = getOutputFilename();
  const quality = isQualityActive() ? getOutputQuality() : undefined;
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        setStatus('Could not export image. Try a different format or size.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    mimeType,
    quality
  );
});

syncQualityUi();
