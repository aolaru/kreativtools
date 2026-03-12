(() => {
  const CONSENT_KEY = 'kreativ_cookie_consent';
  const CONFIG = {
    enabled: true,
    provider: 'cloudflare',
    cloudflareToken: 'f7acecd16c454cfbbb4704b4e665a173'
  };

  if (!CONFIG.enabled || CONFIG.provider !== 'cloudflare') return;
  if (!CONFIG.cloudflareToken) return;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return;

  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  try {
    if (localStorage.getItem(CONSENT_KEY) === 'rejected') return;
  } catch {
    // Ignore storage errors and fail open.
  }

  if (document.querySelector('script[data-kreativ-analytics="cloudflare"]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.cfBeacon = JSON.stringify({ token: CONFIG.cloudflareToken });
  script.dataset.kreativAnalytics = 'cloudflare';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  document.head.appendChild(script);
})();
