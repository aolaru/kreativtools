(function () {
  var isGithubPages = window.location.hostname.endsWith('github.io');
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
