(() => {
  const CONSENT_KEY = 'kreativ_cookie_consent';
  const CONFIG = {
    enabled: true,
    provider: 'google',
    googleAnalyticsId: 'G-52WXEBLJY7',
    productAnalyticsEndpoint: '/api/analytics/events',
  };
  const TOOL_CATEGORIES = new Set(['image', 'pdf', 'video', 'fonts', 'audio', 'file']);
  const PRODUCT_ANALYTICS_EVENTS = new Set([
    'tool_opened',
    'workflow_opened',
    'tool_file_loaded',
    'tool_export_clicked',
    'tool_download_clicked',
    'workflow_completed',
  ]);
  const ALLOWED_PROPERTY_KEYS = new Set([
    'action',
    'control_id',
    'event_source',
    'file_count',
    'file_kind',
    'file_size_bucket',
    'output_format',
    'route',
    'tool_category',
    'tool_id',
    'tool_name',
    'tool_type',
    'total_size_bucket',
    'workflow_step',
  ]);

  const canTrack = () => {
    if (!CONFIG.enabled) return false;

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;

    try {
      if (localStorage.getItem(CONSENT_KEY) === 'rejected') return false;
    } catch {
      // Ignore storage errors and fail open.
    }

    return true;
  };

  const ensureGoogleAnalytics = () => {
    if (!CONFIG.googleAnalyticsId || document.querySelector('script[data-kreativ-analytics="google"]')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', CONFIG.googleAnalyticsId);

    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.dataset.kreativAnalytics = 'google';
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CONFIG.googleAnalyticsId)}`;
    document.head.appendChild(gaScript);
  };

  const safeString = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_/-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);

  const sanitizeProperties = (eventProperties = {}) => {
    const safeProperties = {};

    Object.entries(eventProperties).forEach(([key, value]) => {
      if (!ALLOWED_PROPERTY_KEYS.has(key)) return;
      if (value === undefined || value === null || value === '') return;

      if (typeof value === 'number' || typeof value === 'boolean') {
        safeProperties[key] = value;
        return;
      }

      safeProperties[key] = String(value).slice(0, 120);
    });

    return safeProperties;
  };

  const routeFromCanonical = () => {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    if (canonical) {
      try {
        return new URL(canonical).pathname;
      } catch {
        // Fall through to location parsing.
      }
    }

    return window.location.pathname;
  };

  const getToolContext = () => {
    const route = routeFromCanonical();
    const segments = route.split('/').filter(Boolean);
    const [category, slug] = segments;

    if (category === 'workflows' && slug && !['pricing', 'success'].includes(slug)) {
      return {
        route,
        tool_id: `workflows_${safeString(slug).replace(/-/g, '_')}`,
        tool_name: document.querySelector('h1')?.textContent?.trim() || slug,
        tool_category: 'workflows',
        tool_type: 'guided_workflow',
      };
    }

    if (TOOL_CATEGORIES.has(category) && slug) {
      return {
        route,
        tool_id: `${category}_${safeString(slug).replace(/-/g, '_')}`,
        tool_name: document.querySelector('h1')?.textContent?.trim() || slug,
        tool_category: category,
        tool_type: 'free_tool',
      };
    }

    return null;
  };

  const bucketBytes = (bytes = 0) => {
    if (!bytes) return 'unknown';
    if (bytes < 250 * 1024) return 'under_250kb';
    if (bytes < 1024 * 1024) return '250kb_1mb';
    if (bytes < 5 * 1024 * 1024) return '1mb_5mb';
    if (bytes < 20 * 1024 * 1024) return '5mb_20mb';
    if (bytes < 100 * 1024 * 1024) return '20mb_100mb';
    return 'over_100mb';
  };

  const fileKind = (file) => {
    const type = file?.type || '';
    const name = file?.name || '';
    const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';

    if (type.startsWith('image/') || ['avif', 'gif', 'bmp', 'tif', 'tiff', 'jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) return 'image';
    if (type === 'application/pdf' || extension === 'pdf') return 'pdf';
    if (type.startsWith('audio/') || ['wav', 'mp3', 'm4a', 'ogg', 'flac'].includes(extension)) return 'audio';
    if (type.startsWith('video/') || ['webm', 'mp4', 'mov'].includes(extension)) return 'video';
    if (['ttf', 'otf', 'woff', 'woff2'].includes(extension)) return 'font';
    if (['csv', 'json', 'xml'].includes(extension)) return 'data';
    return 'unknown';
  };

  const actionFromControl = (control) => {
    const label = [
      control.getAttribute('aria-label'),
      control.getAttribute('title'),
      control.textContent,
      control.id,
      control.getAttribute('download') ? 'download' : '',
    ].filter(Boolean).join(' ').toLowerCase();

    if (label.includes('upload') || label.includes('replace') || label.includes('remove')) return '';
    if (label.includes('download')) return 'download';
    if (label.includes('generate')) return 'generate';
    if (label.includes('export')) return 'export';
    if (label.includes('convert')) return 'convert';
    if (label.includes('compress')) return 'compress';
    if (label.includes('merge')) return 'merge';
    if (label.includes('split')) return 'split';
    if (label.includes('trim')) return 'trim';
    if (label.includes('crop')) return 'crop';
    if (label.includes('resize')) return 'resize';
    if (label.includes('apply')) return 'apply';
    if (label.includes('boost')) return 'boost';
    if (label.includes('extract')) return 'extract';
    if (label.includes('capture')) return 'capture';
    return '';
  };

  const outputFormatFromPage = () => {
    const formatSelect = Array.from(document.querySelectorAll('select')).find((select) => {
      const labelText = select.labels ? Array.from(select.labels).map((label) => label.textContent || '').join(' ') : '';
      const descriptor = `${select.id || ''} ${select.name || ''} ${labelText}`.toLowerCase();
      return descriptor.includes('format') || descriptor.includes('output');
    });

    if (!formatSelect) return '';
    const selectedText = formatSelect.options?.[formatSelect.selectedIndex]?.textContent || '';
    return safeString(formatSelect.value || selectedText);
  };

  const forwardProductAnalytics = (eventName, safeProperties) => {
    if (!CONFIG.productAnalyticsEndpoint) return false;
    if (!PRODUCT_ANALYTICS_EVENTS.has(eventName)) return false;

    const payload = JSON.stringify({
      event: eventName,
      properties: safeProperties,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(CONFIG.productAnalyticsEndpoint, blob)) return true;
    }

    if (typeof fetch === 'function') {
      fetch(CONFIG.productAnalyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {});
      return true;
    }

    return false;
  };

  window.kreativTrack = (eventName, eventProperties = {}) => {
    const safeProperties = sanitizeProperties(eventProperties);
    const detail = {
      event: eventName,
      properties: safeProperties,
      provider: CONFIG.provider,
      forwarded: false,
      productForwarded: false,
    };

    window.dispatchEvent(new CustomEvent('kreativ:track', { detail }));

    if (!canTrack()) return false;
    ensureGoogleAnalytics();
    detail.productForwarded = forwardProductAnalytics(eventName, safeProperties);

    if (window.zaraz && typeof window.zaraz.track === 'function') {
      window.zaraz.track(eventName, safeProperties);
      detail.forwarded = true;
      return true;
    }

    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props: safeProperties });
      detail.forwarded = true;
      return true;
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, safeProperties);
      detail.forwarded = true;
      return true;
    }

    return false;
  };

  const trackToolOpened = () => {
    const context = getToolContext();
    if (!context) return;
    window.kreativTrack(context.tool_type === 'guided_workflow' ? 'workflow_opened' : 'tool_opened', context);
  };

  const trackFileLoaded = (input) => {
    const context = getToolContext();
    const files = Array.from(input.files || []);
    if (!context || files.length === 0) return;

    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const firstFile = files[0];

    window.kreativTrack('tool_file_loaded', {
      ...context,
      file_count: files.length,
      file_kind: fileKind(firstFile),
      file_size_bucket: bucketBytes(firstFile?.size || 0),
      total_size_bucket: bucketBytes(totalSize),
    });
  };

  const trackToolAction = (control, clickEvent) => {
    const context = getToolContext();
    if (!context) return;

    if (clickEvent?.isTrusted === false && control.matches?.('a[download]')) return;

    const action = actionFromControl(control);
    if (!action) return;

    const eventName = action === 'download' ? 'tool_download_clicked' : 'tool_export_clicked';
    window.kreativTrack(eventName, {
      ...context,
      action,
      control_id: safeString(control.id || control.getAttribute('data-analytics-id') || action),
      output_format: outputFormatFromPage(),
    });
  };

  document.addEventListener('change', (event) => {
    const input = event.target?.closest?.('input[type="file"]');
    if (input) trackFileLoaded(input);
  }, true);

  document.addEventListener('click', (event) => {
    const control = event.target?.closest?.('button, a, input[type="button"], input[type="submit"]');
    if (control) trackToolAction(control, event);
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackToolOpened, { once: true });
  } else {
    trackToolOpened();
  }

  if (!canTrack()) return;
  ensureGoogleAnalytics();
})();
