(function () {
  const extensionByMime = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
  };

  const mimeByExtension = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
  };

  const lossyMimes = new Set(['image/jpeg', 'image/webp', 'image/avif']);
  const exportSupportCache = new Map();

  const getFileExtension = (name) => {
    const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  };

  const inferMimeFromName = (name) => mimeByExtension[getFileExtension(name)] || '';

  const isSupportedImageFile = (file) => {
    if (!file) return false;
    if (String(file.type || '').startsWith('image/')) return true;
    return Boolean(inferMimeFromName(file.name));
  };

  const normalizeImageFile = (file) => {
    if (!file) return null;
    if (String(file.type || '').startsWith('image/')) return file;

    const inferredMime = inferMimeFromName(file.name);
    if (!inferredMime) return file;

    try {
      return new File([file], file.name, {
        type: inferredMime,
        lastModified: file.lastModified || Date.now(),
      });
    } catch (error) {
      return file;
    }
  };

  const canEncodeType = (mimeType) => {
    if (exportSupportCache.has(mimeType)) return exportSupportCache.get(mimeType);

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    let supported = false;
    try {
      const dataUrl = canvas.toDataURL(mimeType, 0.8);
      supported = dataUrl.startsWith(`data:${mimeType}`);
    } catch (error) {
      supported = false;
    }

    exportSupportCache.set(mimeType, supported);
    return supported;
  };

  const syncFormatSelect = (select, preferredMimeType) => {
    if (!select) return;

    const options = Array.from(select.querySelectorAll('option'));
    for (const option of options) {
      const mimeType = option.value;
      if (!mimeType.startsWith('image/')) continue;
      const supported = canEncodeType(mimeType);
      option.disabled = !supported;
      option.hidden = !supported;
    }

    const preferredOption = preferredMimeType ? select.querySelector(`option[value="${preferredMimeType}"]`) : null;
    if (preferredOption && !preferredOption.disabled) {
      select.value = preferredMimeType;
      return;
    }

    if (!select.selectedOptions.length || select.selectedOptions[0].disabled) {
      const firstEnabled = options.find((option) => !option.disabled && !option.hidden);
      if (firstEnabled) select.value = firstEnabled.value;
    }
  };

  window.kreativImageFormats = {
    extensionByMime,
    inferMimeFromName,
    isSupportedImageFile,
    normalizeImageFile,
    canEncodeType,
    syncFormatSelect,
    isLossyMime: (mimeType) => lossyMimes.has(mimeType),
  };
})();
