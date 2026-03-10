(() => {
  const KEY = 'kreativ-theme';
  const root = document.documentElement;
  let shareResetTimer = null;

  const setTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // ignore storage issues
    }

    const btn = document.getElementById('themeToggle');
    if (btn) {
      const icon = btn.querySelector('span');
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  };

  const getPreferredTheme = () => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  };

  const toggleTheme = () => {
    const current = root.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  const updateShareButton = (state) => {
    const btn = document.getElementById('shareButton');
    if (!btn) return;
    const icon = btn.querySelector('span');
    if (!icon) return;

    if (shareResetTimer) {
      clearTimeout(shareResetTimer);
      shareResetTimer = null;
    }

    if (state === 'ok') {
      icon.textContent = '✓';
      btn.title = 'Link copied';
      btn.setAttribute('aria-label', 'Link copied');
      shareResetTimer = setTimeout(() => {
        icon.textContent = '↗';
        btn.title = 'Share this page';
        btn.setAttribute('aria-label', 'Share this page');
      }, 1500);
      return;
    }

    icon.textContent = '↗';
    btn.title = 'Share this page';
    btn.setAttribute('aria-label', 'Share this page');
  };

  const copyLinkFallback = async (url) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    return false;
  };

  const shareCurrentPage = async () => {
    const url = window.location.href;
    const data = { title: document.title, url };

    if (navigator.share) {
      try {
        await navigator.share(data);
        updateShareButton('ok');
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    try {
      const copied = await copyLinkFallback(url);
      if (copied) {
        updateShareButton('ok');
        return;
      }
    } catch {
      // noop
    }

    window.prompt('Copy this link:', url);
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTheme(getPreferredTheme());
    updateShareButton('idle');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
    const shareBtn = document.getElementById('shareButton');
    if (shareBtn) shareBtn.addEventListener('click', shareCurrentPage);
  });
})();
