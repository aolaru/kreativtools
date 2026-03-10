(() => {
  const CONSENT_KEY = 'kreativ_cookie_consent';
  const CONSENT_VALUES = new Set(['accepted', 'rejected']);

  const EU_COUNTRY_CODES = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
    'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ]);

  const getStoredConsent = () => {
    try {
      const value = localStorage.getItem(CONSENT_KEY);
      return CONSENT_VALUES.has(value) ? value : null;
    } catch {
      return null;
    }
  };

  const storeConsent = (value) => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // ignore storage failures
    }
  };

  const getRegionFromLanguage = () => {
    const language = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (!language) return null;

    try {
      if (typeof Intl !== 'undefined' && typeof Intl.Locale !== 'undefined') {
        const locale = new Intl.Locale(language);
        return locale.region || null;
      }
    } catch {
      // fallback below
    }

    const parts = language.split('-');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : null;
  };

  const isLikelyEuVisitor = () => {
    const region = getRegionFromLanguage();
    if (region && EU_COUNTRY_CODES.has(region)) return true;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return tz.startsWith('Europe/');
  };

  const createBanner = () => {
    const banner = document.createElement('aside');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <p>This site uses local storage for preferences and optional privacy-friendly analytics. For EU visitors, consent is required.</p>
      <div class="cookie-actions">
        <button type="button" class="cookie-btn cookie-accept">Accept Cookies</button>
        <button type="button" class="cookie-btn cookie-reject">Reject Non-Essential</button>
      </div>
    `;

    const close = () => banner.remove();

    banner.querySelector('.cookie-accept').addEventListener('click', () => {
      storeConsent('accepted');
      close();
    });

    banner.querySelector('.cookie-reject').addEventListener('click', () => {
      storeConsent('rejected');
      close();
    });

    document.body.appendChild(banner);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (getStoredConsent()) return;
    if (!isLikelyEuVisitor()) return;
    createBanner();
  });
})();
