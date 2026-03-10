(() => {
  const CONSENT_KEY = 'kreativ_cookie_consent';
  const CONFIG = {
    enabled: true,
    provider: 'plausible',
    plausibleDomain: 'kreativtools.com',
    plausibleScriptSrc: 'https://plausible.io/js/script.js'
  };

  if (!CONFIG.enabled) return;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return;

  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  try {
    if (localStorage.getItem(CONSENT_KEY) === 'rejected') return;
  } catch {
    // ignore storage errors
  }

  if (CONFIG.provider !== 'plausible' || !CONFIG.plausibleDomain) return;
  if (document.querySelector('script[data-kreativ-analytics="plausible"]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = CONFIG.plausibleDomain;
  script.dataset.kreativAnalytics = 'plausible';
  script.src = CONFIG.plausibleScriptSrc;
  document.head.appendChild(script);
})();
