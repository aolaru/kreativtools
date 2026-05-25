const fs = require('fs');
const path = require('path');
const {
  FOOTER_SECTIONS,
  JOB_PATHS,
  JOB_ROUTER_VARIANTS,
  SITE_URL,
} = require('./site-content');

const ROOT = process.cwd();
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const OG_IMAGE_ALT = 'Kreativ Tools social preview card with the K mark and core browser-based creative workflows';
const FONT_AWESOME_HREF = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
const FONT_AWESOME_INTEGRITY = 'sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==';

const REDIRECTS = {
  'all-tools.html': '/tools/',
  'audio-trim.html': '/audio/trim/',
  'audio-volume.html': '/audio/volume/',
  'audio-to-mp3.html': '/audio/to-mp3/',
  'audio.html': '/audio/',
  'changes.html': '/changes/',
  'contact.html': '/contact/',
  'file-csv-to-json.html': '/file/csv-to-json/',
  'file-json-to-csv.html': '/file/json-to-csv/',
  'file.html': '/file/',
  'fonts-css-generator.html': '/fonts/css-generator/',
  'fonts-preview.html': '/fonts/preview/',
  'fonts.html': '/fonts/',
  'image-compress.html': '/image/compress/',
  'image-to-webp.html': '/image/to-webp/',
  'image-tools.html': '/image/resize/',
  'learn.html': '/learn/',
  'pdf-compress.html': '/pdf/compress/',
  'pdf-fill-sign.html': '/pdf/fill-sign/',
  'pdf-to-docx.html': '/pdf/to-docx/',
  'pdf-split.html': '/pdf/split/',
  'pdf-merge.html': '/pdf/merge/',
  'pdf.html': '/pdf/',
  'privacy.html': '/privacy/',
  'terms.html': '/terms/',
  'workflows.html': '/workflows/',
  'workflows-audio-delivery.html': '/workflows/audio-delivery/',
  'workflows-image-prep.html': '/workflows/image-prep/',
  'workflows-pdf-delivery.html': '/workflows/pdf-delivery/',
  'video-thumbnail.html': '/video/thumbnail/',
  'video-trim.html': '/video/trim/',
  'video.html': '/video/',
};

const LEGACY_CANONICAL_REDIRECTS = new Set([
  'learn/use-kreativ-studio-image-prep-for-web-ready-images/index.html',
  'learn/prepare-a-sendable-pdf-in-kreativ-studio/index.html',
  'workflows/pricing/index.html',
  'workflows/success/index.html',
]);

const LEGACY_DIRECTORY_REDIRECTS = {
  'learn/use-kreativ-studio-image-prep-for-web-ready-images/index.html': '/learn/use-kreativ-workflows-image-prep-for-web-ready-images/',
  'learn/prepare-a-sendable-pdf-in-kreativ-studio/index.html': '/learn/prepare-a-sendable-pdf-in-kreativ-workflows/',
};

const NAV_ITEMS = [
  { label: 'Tools', href: '/tools/', key: 'tools', icon: 'fa-toolbox' },
  { label: 'Learn', href: '/learn/', key: 'learn', icon: 'fa-book-open' },
  { label: 'Updates', href: '/changes/', key: 'changes', icon: 'fa-clock-rotate-left' },
];

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeHtmlEntities(value) {
  let decoded = value;
  for (let index = 0; index < 5; index += 1) {
    const next = decoded
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'test-results' || entry.name === 'playwright-report') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function canonicalFiles() {
  return walk(ROOT).filter((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    return (rel === 'index.html' || rel.endsWith('/index.html')) && !LEGACY_CANONICAL_REDIRECTS.has(rel);
  });
}

function routeForCanonicalFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/\/index\.html$/, '')}/`;
}

function prefixForFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const depth = rel === 'index.html' ? 0 : rel.split('/').length - 1;
  return depth === 0 ? '' : '../'.repeat(depth);
}

function normalizeInternalHref(href) {
  if (!href || !href.startsWith('/')) return href;
  if (href === '/' || href.startsWith('//')) return href;

  const [pathPart, suffix = ''] = href.split(/([?#].*)/, 2);
  if (/\.[a-z0-9]+$/i.test(pathPart)) return href;
  if (pathPart.endsWith('/')) return href;

  return `${pathPart}/${suffix}`;
}

function navKeyForRoute(route) {
  if (route === '/changes/') return 'changes';
  if (route.startsWith('/workflows')) return 'tools';
  if (route.startsWith('/tools')) return 'tools';
  if (route.startsWith('/learn')) return 'learn';
  if (
    route.startsWith('/image') ||
    route.startsWith('/pdf') ||
    route.startsWith('/video') ||
    route.startsWith('/fonts') ||
    route.startsWith('/audio') ||
    route.startsWith('/file')
  ) return 'tools';
  return '';
}

function ogTypeForRoute(route) {
  if (route.startsWith('/learn/') && route !== '/learn/') return 'article';
  return 'website';
}

function robotsForRoute(route) {
  if (route === '/workflows/pricing/') return 'noindex, follow';
  if (route === '/workflows/success/') return 'noindex, nofollow';
  return 'index, follow';
}

function buildHead({ title, description, route, prefix }) {
  const canonical = `${SITE_URL}${route}`;
  const ogType = ogTypeForRoute(route);
  const robots = robotsForRoute(route);
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}" />
  <meta name="robots" content="${robots}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeAttr(OG_IMAGE_ALT)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <meta name="twitter:image:alt" content="${escapeAttr(OG_IMAGE_ALT)}" />
  <link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="${prefix}favicon-32x32.png" sizes="32x32" type="image/png" />
  <link rel="icon" href="${prefix}favicon-16x16.png" sizes="16x16" type="image/png" />
  <link rel="apple-touch-icon" href="${prefix}apple-touch-icon.png" />
  <link rel="stylesheet" href="${FONT_AWESOME_HREF}" integrity="${FONT_AWESOME_INTEGRITY}" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <link rel="stylesheet" href="${prefix}styles.css" />
</head>`;
}

function buildHeader(route) {
  const activeKey = navKeyForRoute(route);
  const navLinks = NAV_ITEMS.map((item) => {
    const current = item.key === activeKey ? ' aria-current="page"' : '';
    return `      <a href="${item.href}"${current}><i class="fa-solid ${item.icon}" aria-hidden="true"></i><span>${item.label}</span></a>`;
  }).join('\n');

  return `<header class="site-header">
    <a class="brand" href="/" aria-label="Kreativ Tools Home">
      <div class="brand-mark">K</div>
      <div class="brand-copy"><strong>Kreativ Tools</strong></div>
    </a>

    <nav class="top-nav" aria-label="Primary">
${navLinks}
    </nav>

    <div class="header-actions">
      <button id="shareButton" type="button" class="icon-toggle" aria-label="Share this page" title="Share this page"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i></button>
      <button id="themeToggle" type="button" class="icon-toggle" aria-label="Toggle dark mode" title="Toggle dark mode"><i class="fa-solid fa-moon" aria-hidden="true"></i></button>
    </div>
  </header>`;
}

function listMarkup(items, indent = '        ') {
  return items.map(([label, href]) => `${indent}<li><a href="${href}">${label}</a></li>`).join('\n');
}

function buildFooter() {
  return `<footer class="site-footer">
  <div class="footer-topline"></div>
  <div class="footer-inner">
    <section class="footer-about">
      <h3>Kreativ<span>Tools</span></h3>
      <p>Private browser tools for creative, document, media, font, and data jobs.</p>
    </section>

    <section>
      <h4>Product</h4>
      <ul>
${listMarkup(FOOTER_SECTIONS.product)}
      </ul>
    </section>

    <section>
      <h4>Popular</h4>
      <ul>
${listMarkup(FOOTER_SECTIONS.popular)}
      </ul>
    </section>

    <section>
      <h4>Company</h4>
      <ul>
${listMarkup(FOOTER_SECTIONS.company)}
      </ul>
    </section>
  </div>

  <div class="footer-bottom">
    <p class="footer-brand-links"><a href="https://kreativfont.com/" target="_blank" rel="noopener noreferrer">Kreativ Font</a><span aria-hidden="true">·</span><a href="https://kreativsound.com/" target="_blank" rel="noopener noreferrer">Kreativ Sound</a><span aria-hidden="true">·</span><a href="https://kreativwp.com/" target="_blank" rel="noopener noreferrer">Kreativ WP</a><span aria-hidden="true">·</span><a href="/">Kreativ Tools</a></p>
    <p>© 2026 <a href="https://madebykreativ.com/" target="_blank" rel="noopener noreferrer">Made by KREATIV</a> · Independent creative tools and assets by Andrei Olaru</p>
    <p class="footer-meta-actions"></p>
  </div>
</footer>`;
}

function buildJobRouter(variantKey) {
  const variant = JOB_ROUTER_VARIANTS[variantKey];
  if (!variant) return null;

  const cards = JOB_PATHS.slice(0, variant.limit || JOB_PATHS.length).map((job) => {
    const featured = job.featured ? ' is-featured' : '';
    const tags = job.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    return `        <a class="job-router-card${featured}" href="${job.href}">
          <span class="job-router-label"><i class="fa-solid ${job.icon}" aria-hidden="true"></i>${escapeHtml(job.label)}</span>
          <strong>${escapeHtml(job.title)}</strong>
          <span>${escapeHtml(job.description)}</span>
          <span class="job-router-tags">${tags}</span>
        </a>`;
  }).join('\n');

  return `<!-- job-router:start ${variantKey} -->
    <section class="home-section job-router-section" aria-labelledby="${variantKey}JobRouterTitle">
      <div class="home-section-heading">
        <p class="eyebrow">${escapeHtml(variant.eyebrow)}</p>
        <h2 id="${variantKey}JobRouterTitle">${escapeHtml(variant.title)}</h2>
        <p>${escapeHtml(variant.description)}</p>
      </div>
      <div class="job-router-grid">
${cards}
      </div>
    </section>
<!-- job-router:end -->`;
}

function replaceJobRouters(content, file) {
  const markerPattern = /<!-- job-router:start ([a-z0-9-]+) -->[\s\S]*?<!-- job-router:end -->/g;
  return content.replace(markerPattern, (match, variantKey) => {
    const router = buildJobRouter(variantKey);
    if (!router) throw new Error(`Unknown job router variant ${variantKey} in ${file}`);
    return router;
  });
}

function extractMeta(content, pattern, label, file) {
  const match = content.match(pattern);
  if (!match) throw new Error(`Missing ${label} in ${file}`);
  return decodeHtmlEntities(match[1].trim());
}

function replaceBlock(content, pattern, replacement, label, file) {
  if (!pattern.test(content)) {
    throw new Error(`Missing ${label} block in ${file}`);
  }
  pattern.lastIndex = 0;
  return content.replace(pattern, replacement);
}

function syncCanonicalPage(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const route = routeForCanonicalFile(file);
  const prefix = prefixForFile(file);
  let content = fs.readFileSync(file, 'utf8');
  const title = extractMeta(content, /<title>([^<]+)<\/title>/, 'title', rel);
  const description = extractMeta(content, /<meta name="description" content="([^"]+)"\s*\/?>/, 'description', rel);
  const head = buildHead({ title, description, route, prefix });
  const footer = buildFooter();
  const scripts = [
    `${prefix}cookie-consent.js`,
    `${prefix}github-pages-prefix.js`,
    `${prefix}analytics.js`,
    `${prefix}theme.js`,
  ];

  content = replaceBlock(content, /<head>[\s\S]*?<\/head>/, head, 'head', rel);
  content = replaceBlock(content, /<header class="site-header">[\s\S]*?<\/header>/, buildHeader(route), 'header', rel);
  content = replaceBlock(content, /<footer class="site-footer">[\s\S]*?<\/footer>/, footer, 'footer', rel);
  content = replaceJobRouters(content, rel);
  content = content.replace(/href="(\/[^"]*)"/g, (_match, href) => `href="${normalizeInternalHref(href)}"`);

  for (const script of scripts) {
    const scriptRegex = new RegExp(`<script src="${script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"><\\/script>`);
    if (!scriptRegex.test(content)) {
      content = content.replace(
        /<\/body>/,
        `  <script src="${script}"></script>\n</body>`
      );
    }
  }

  fs.writeFileSync(file, content);
  return { route, title, description };
}

function readExistingSitemapLastmods() {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return new Map();

  const content = fs.readFileSync(sitemapPath, 'utf8');
  const entries = new Map();
  const pattern = /<url>\s*<loc>https:\/\/kreativtools\.com([^<]*)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g;
  let match;
  while ((match = pattern.exec(content))) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

function buildSitemap(metaByRoute) {
  const previousLastmods = readExistingSitemapLastmods();
  const previousOrder = Array.from(previousLastmods.keys());
  const routes = Array.from(metaByRoute.keys()).filter((route) => robotsForRoute(route) !== 'noindex, nofollow');
  const routeSet = new Set(routes);
  const orderedRoutes = [
    ...previousOrder.filter((route) => routeSet.has(route)),
    ...routes.filter((route) => !previousLastmods.has(route)).sort(),
  ];

  const entries = orderedRoutes.map((route) => {
    const lastmod = previousLastmods.get(route) || '2026-05-23';
    return `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function buildRedirectPage(route, title, description) {
  const target = `${SITE_URL}${route}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeAttr(description);
  const redirectScript = `(function () {
  var route = ${JSON.stringify(route)};
  var isGithubPages = window.location.hostname.endsWith('github.io');
  var target = route;
  if (isGithubPages) {
    var parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      var prefix = '/' + parts[0];
      target = route === '/' ? prefix + '/' : prefix + route;
    }
  }
  window.location.replace(target);
})();`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${target}" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${target}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="favicon-32x32.png" sizes="32x32" type="image/png" />
  <link rel="icon" href="favicon-16x16.png" sizes="16x16" type="image/png" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />
  <script>${redirectScript}</script>
</head>
<body>
  <p>Redirecting to <a href="${route}">${route}</a>...</p>
</body>
</html>
`;
}

function buildDirectoryRedirectPage(route) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting...</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${SITE_URL}${route}" />
  <script>
    window.location.replace(${JSON.stringify(route)});
  </script>
</head>
<body>
  <p>Redirecting to <a href="${route}">${route}</a>...</p>
</body>
</html>
`;
}

function main() {
  const metaByRoute = new Map();
  for (const file of canonicalFiles()) {
    const meta = syncCanonicalPage(file);
    metaByRoute.set(meta.route, meta);
  }

  for (const [alias, route] of Object.entries(REDIRECTS)) {
    const meta = metaByRoute.get(route);
    if (!meta) {
      throw new Error(`Missing canonical metadata for redirect target ${route}`);
    }
    fs.writeFileSync(path.join(ROOT, alias), buildRedirectPage(route, meta.title, meta.description));
  }

  for (const [legacyPath, route] of Object.entries(LEGACY_DIRECTORY_REDIRECTS)) {
    fs.writeFileSync(path.join(ROOT, legacyPath), buildDirectoryRedirectPage(route));
  }

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(metaByRoute));
}

main();
