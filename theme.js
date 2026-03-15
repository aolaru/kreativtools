(() => {
  const KEY = 'kreativ-theme';
  const root = document.documentElement;
  let shareResetTimer = null;
  let shareMenu = null;
  let shareDocClickHandler = null;
  let shareKeydownHandler = null;
  let shareMenuIdCounter = 0;
  const setButtonIcon = (button, iconClasses) => {
    const icon = button?.querySelector('i');
    if (!icon) return;
    icon.className = iconClasses;
    icon.setAttribute('aria-hidden', 'true');
  };

  const setTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // ignore storage issues
    }

    const btn = document.getElementById('themeToggle');
    if (btn) {
      setButtonIcon(btn, theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon');
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

    if (shareResetTimer) {
      clearTimeout(shareResetTimer);
      shareResetTimer = null;
    }

    if (state === 'ok') {
      setButtonIcon(btn, 'fa-solid fa-check');
      btn.title = 'Link copied';
      btn.setAttribute('aria-label', 'Link copied');
      shareResetTimer = setTimeout(() => {
        setButtonIcon(btn, 'fa-solid fa-share-nodes');
        btn.title = 'Share this page';
        btn.setAttribute('aria-label', 'Share this page');
      }, 1500);
      return;
    }

    setButtonIcon(btn, 'fa-solid fa-share-nodes');
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

  const copyCurrentPageLink = async () => {
    const url = window.location.href;

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

  const closeShareMenu = () => {
    if (!shareMenu) return;
    detachShareMenuHandlers();
    const shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
      shareBtn.setAttribute('aria-expanded', 'false');
      shareBtn.removeAttribute('aria-controls');
    }
    shareMenu.remove();
    shareMenu = null;
  };

  const detachShareMenuHandlers = () => {
    if (shareDocClickHandler) {
      document.removeEventListener('click', shareDocClickHandler, true);
      shareDocClickHandler = null;
    }
    if (shareKeydownHandler) {
      document.removeEventListener('keydown', shareKeydownHandler, true);
      shareKeydownHandler = null;
    }
  };

  const buildShareHref = (platform, url, title) => {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);

    if (platform === 'x') return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    if (platform === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    if (platform === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    if (platform === 'whatsapp') return `https://wa.me/?text=${t}%20${u}`;
    if (platform === 'telegram') return `https://t.me/share/url?url=${u}&text=${t}`;
    return url;
  };

  const getShareItems = (menu) => Array.from(menu.querySelectorAll('[role="menuitem"]'));

  const focusShareItem = (menu, index) => {
    const items = getShareItems(menu);
    if (!items.length) return;
    const nextIndex = (index + items.length) % items.length;
    items[nextIndex].focus();
  };

  const buildShareMenu = (url, title) => {
    const menu = document.createElement('div');
    menu.className = 'social-share-menu';
    menu.setAttribute('role', 'menu');
    menu.id = `social-share-menu-${++shareMenuIdCounter}`;

    const linkItems = [
      { label: 'Share on X', platform: 'x' },
      { label: 'Share on Facebook', platform: 'facebook' },
      { label: 'Share on LinkedIn', platform: 'linkedin' },
      { label: 'Share on WhatsApp', platform: 'whatsapp' },
      { label: 'Share on Telegram', platform: 'telegram' }
    ];

    for (const item of linkItems) {
      const link = document.createElement('a');
      link.setAttribute('role', 'menuitem');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.href = buildShareHref(item.platform, url, title);
      link.textContent = item.label;
      link.addEventListener('click', () => {
        closeShareMenu();
      });
      menu.appendChild(link);
    }

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.setAttribute('role', 'menuitem');
    copyBtn.textContent = 'Copy Link';
    copyBtn.addEventListener('click', async () => {
      await copyCurrentPageLink();
      closeShareMenu();
    });
    menu.appendChild(copyBtn);

    return menu;
  };

  const openShareMenu = () => {
    const shareBtn = document.getElementById('shareButton');
    if (!shareBtn) return;
    if (shareMenu) {
      closeShareMenu();
      shareBtn.focus();
      return;
    }

    detachShareMenuHandlers();
    const url = window.location.href;
    const title = document.title;
    const menu = buildShareMenu(url, title);

    const actions = shareBtn.closest('.header-actions');
    if (!actions) return;
    actions.appendChild(menu);
    shareMenu = menu;
    shareBtn.setAttribute('aria-expanded', 'true');
    shareBtn.setAttribute('aria-controls', menu.id);
    focusShareItem(menu, 0);

    shareDocClickHandler = (event) => {
      if (!shareMenu) return;
      if (shareMenu.contains(event.target) || shareBtn.contains(event.target)) return;
      closeShareMenu();
    };

    shareKeydownHandler = (event) => {
      if (!shareMenu) return;
      const items = getShareItems(shareMenu);
      if (!items.length) return;

      const activeIndex = items.indexOf(document.activeElement);

      if (event.key === 'Escape') {
        event.preventDefault();
        closeShareMenu();
        shareBtn.focus();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusShareItem(shareMenu, activeIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusShareItem(shareMenu, activeIndex - 1);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        focusShareItem(shareMenu, 0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        focusShareItem(shareMenu, items.length - 1);
      }
    };

    document.addEventListener('click', shareDocClickHandler, true);
    document.addEventListener('keydown', shareKeydownHandler, true);
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTheme(getPreferredTheme());
    updateShareButton('idle');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
    const shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
      shareBtn.setAttribute('aria-haspopup', 'menu');
      shareBtn.setAttribute('aria-expanded', 'false');
      shareBtn.addEventListener('click', openShareMenu);
    }
  });
})();
