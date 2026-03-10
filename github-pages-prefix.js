(function () {
  var isGithubPages = window.location.hostname.endsWith('github.io');

  function analyticsSrc() {
    if (!isGithubPages) return '/analytics.js';
    var parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '/analytics.js';
    return '/' + parts[0] + '/analytics.js';
  }

  if (!document.querySelector('script[data-kreativ-loader="analytics"]')) {
    var analyticsScript = document.createElement('script');
    analyticsScript.defer = true;
    analyticsScript.src = analyticsSrc();
    analyticsScript.dataset.kreativLoader = 'analytics';
    document.head.appendChild(analyticsScript);
  }

  var path = window.location.pathname;
  if (path && path !== '/' && path.endsWith('/')) {
    var normalized = path.replace(/\/+$/, '');
    if (!normalized) normalized = '/';
    window.history.replaceState({}, '', normalized + window.location.search + window.location.hash);
  }

  if (!isGithubPages) return;

  var parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return;

  var repo = parts[0];
  var prefix = '/' + repo;

  document.querySelectorAll('a[href^="/"]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || href.startsWith('//')) return;

    if (href === '/') {
      link.setAttribute('href', prefix + '/');
      return;
    }

    if (href === prefix || href.startsWith(prefix + '/')) return;
    link.setAttribute('href', prefix + href);
  });
})();
