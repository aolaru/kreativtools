(() => {
  const CONSENT_KEY = 'kreativ_cookie_consent';
  const CONFIG = {
    enabled: true,
    provider: 'google',
    googleAnalyticsId: 'G-52WXEBLJY7'
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

  if (!canTrack()) return;

  if (CONFIG.googleAnalyticsId && !document.querySelector('script[data-kreativ-analytics="google"]')) {
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
  }
})();
