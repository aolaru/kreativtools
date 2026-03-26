(() => {
  const CONSENT_KEY = 'kreativ_cookie_consent';
  const CONFIG = {
    enabled: true,
    provider: 'cloudflare',
    cloudflareToken: 'f7acecd16c454cfbbb4704b4e665a173'
  };

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

  window.kreativTrack = (eventName, eventProperties = {}) => {
    const detail = {
      event: eventName,
      properties: eventProperties,
      provider: CONFIG.provider,
      forwarded: false,
    };

    window.dispatchEvent(new CustomEvent('kreativ:track', { detail }));

    if (!canTrack()) return false;

    if (window.zaraz && typeof window.zaraz.track === 'function') {
      window.zaraz.track(eventName, eventProperties);
      detail.forwarded = true;
      return true;
    }

    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props: eventProperties });
      detail.forwarded = true;
      return true;
    }

    return false;
  };

  if (CONFIG.provider !== 'cloudflare') return;
  if (!CONFIG.cloudflareToken) return;
  if (!canTrack()) return;

  if (document.querySelector('script[data-kreativ-analytics="cloudflare"]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.cfBeacon = JSON.stringify({ token: CONFIG.cloudflareToken });
  script.dataset.kreativAnalytics = 'cloudflare';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  document.head.appendChild(script);
})();
