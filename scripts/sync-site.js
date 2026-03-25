const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SITE_URL = 'https://kreativtools.com';
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
  'pdf-split.html': '/pdf/split/',
  'pdf-merge.html': '/pdf/merge/',
  'pdf.html': '/pdf/',
  'privacy.html': '/privacy/',
  'terms.html': '/terms/',
  'video-thumbnail.html': '/video/thumbnail/',
  'video-trim.html': '/video/trim/',
  'video.html': '/video/',
};

const NAV_ITEMS = [
  { label: 'Image', href: '/image/', key: 'image' },
  { label: 'PDF', href: '/pdf/', key: 'pdf' },
  { label: 'Video', href: '/video/', key: 'video' },
  { label: 'Fonts', href: '/fonts/', key: 'fonts' },
  { label: 'Audio', href: '/audio/', key: 'audio' },
  { label: 'File', href: '/file/', key: 'file' },
  { label: 'Learn', href: '/learn/', key: 'learn' },
  { label: 'Updates', href: '/changes/', key: 'changes' },
];

const FOOTER_SECTIONS = {
  navigate: [
    ['Home', '/'],
    ['All Tools', '/tools/'],
    ['Learn', '/learn/'],
    ['Updates', '/changes/'],
    ['Privacy Policy', '/privacy/'],
    ['Terms', '/terms/'],
    ['Contact', '/contact/'],
  ],
  core: [
    ['Image Compress', '/image/compress/'],
    ['PDF Merge', '/pdf/merge/'],
    ['PDF Compress', '/pdf/compress/'],
    ['Font to Webfont', '/fonts/webfont-convert/'],
  ],
  more: [
    ['Learn Guides', '/learn/'],
    ['Video Thumbnail', '/video/thumbnail/'],
    ['XML to CSV', '/file/xml-to-csv/'],
    ['Browse Directory', '/tools/'],
  ],
};

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    return rel === 'index.html' || rel.endsWith('/index.html');
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
  if (route.startsWith('/learn')) return 'learn';
  if (route.startsWith('/image')) return 'image';
  if (route.startsWith('/pdf')) return 'pdf';
  if (route.startsWith('/video')) return 'video';
  if (route.startsWith('/fonts')) return 'fonts';
  if (route.startsWith('/audio')) return 'audio';
  if (route.startsWith('/file')) return 'file';
  return '';
}

function ogTypeForRoute(route) {
  if (route.startsWith('/learn/') && route !== '/learn/') return 'article';
  return 'website';
}

function buildHead({ title, description, route, prefix }) {
  const canonical = `${SITE_URL}${route}`;
  const ogType = ogTypeForRoute(route);
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}" />
  <meta name="robots" content="index, follow" />
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
    return `      <a href="${item.href}"${current}>${item.label}</a>`;
  }).join('\n');

  const allToolsCurrent = route === '/tools/' ? ' aria-current="page"' : '';

  return `<header class="site-header">
    <a class="brand" href="/" aria-label="Kreativ Tools Home">
      <div class="brand-mark">K</div>
      <div class="brand-copy"><strong>Kreativ Tools</strong></div>
    </a>

    <nav class="top-nav" aria-label="Primary">
${navLinks}
    </nav>

    <div class="header-actions">
      <a class="ghost header-link" href="/tools/"${allToolsCurrent}>All Tools</a>
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
      <p>Kreativ Tools is a growing browser-based toolkit for image, PDF, video, font, audio, and file workflows. Explore focused utilities, practical Learn guides, and privacy-friendly tools for repeat creative work.</p>
    </section>

    <section>
      <h4>Navigate</h4>
      <ul>
${listMarkup(FOOTER_SECTIONS.navigate)}
      </ul>
    </section>

    <section>
      <h4>Core Tools</h4>
      <ul>
${listMarkup(FOOTER_SECTIONS.core)}
      </ul>
    </section>

    <section>
      <h4>More Tools</h4>
      <ul>
${listMarkup(FOOTER_SECTIONS.more)}
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

function extractMeta(content, pattern, label, file) {
  const match = content.match(pattern);
  if (!match) throw new Error(`Missing ${label} in ${file}`);
  return match[1].trim();
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
}

main();
