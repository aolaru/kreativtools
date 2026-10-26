const fs = require('fs');
const path = require('path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { secureDocument, contentSecurityPolicy, scriptHashes } = require('./security-policy');
const TOOL_EXPORTS = require('./tool-exports');
const {
  FOOTER_SECTIONS,
  JOB_PATHS,
  JOB_ROUTER_VARIANTS,
  SITE_URL,
} = require('./site-content');

const ROOT = process.cwd();
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const OG_IMAGE_ALT = 'Kreativ Tools social preview card with the K mark and focused browser-based creative tools';
const CLOUDFLARE_WEB_ANALYTICS_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';
const CLOUDFLARE_WEB_ANALYTICS_TOKEN = 'f7acecd16c454cfbbb4704b4e665a173';
const RUN_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date());
const CONTENT_STATE_PATH = path.join(ROOT, 'scripts/page-dates.json');
const PAGE_DATES = fs.existsSync(CONTENT_STATE_PATH) ? JSON.parse(fs.readFileSync(CONTENT_STATE_PATH, 'utf8')) : {};
const POLICY_HASHES = new Set();

function pageDates(route) {
  if (PAGE_DATES[route]) return PAGE_DATES[route];
  let published = previousLastmodForRoute(route);
  try {
    const file = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
    const history = execFileSync('git', ['log', '--follow', '--diff-filter=A', '--format=%cs', '--', file], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (history) published = history.split('\n').at(-1);
  } catch {
    // Source archives without Git retain their existing publication dates.
  }
  PAGE_DATES[route] = { published, modified: previousLastmodForRoute(route) };
  return PAGE_DATES[route];
}
const ARCHIVED_WORKFLOW_LEARN_ROUTES = new Set([
  '/learn/choose-kreativ-workflows-or-single-tools/',
  '/learn/prepare-a-sendable-pdf-in-kreativ-workflows/',
  '/learn/save-time-with-kreativ-workflows-defaults/',
  '/learn/use-kreativ-workflows-audio-delivery-for-shareable-audio/',
  '/learn/use-kreativ-workflows-image-prep-for-web-ready-images/',
  '/learn/what-are-kreativ-workflows/',
]);

const TITLE_OVERRIDES = {
  '/learn/compress-images-for-faster-websites/': 'Compress Images for Faster Websites | Kreativ Tools',
  '/learn/merge-pdf-files-in-order/': 'Merge PDF Files in Order | Kreativ Tools Learn',
  '/learn/resize-before-compressing-images/': 'Resize Before Compressing | Kreativ Tools Learn',
  '/learn/when-pdf-compression-does-not-help/': 'PDF Compression Limits | Kreativ Tools Learn',
  '/learn/font-licensing-checklist/': 'Font Licensing Checklist | Kreativ Tools Learn',
};

const REDIRECTS = {
  'about.html': '/about/',
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
  'workflows/pricing/index.html': '/workflows/',
  'workflows/success/index.html': '/workflows/',
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
    if (['.git', 'node_modules', 'vendor', 'dist', 'downloads', '.playwright-mcp', 'test-results', 'playwright-report', '.lighthouseci'].includes(entry.name)) continue;
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
  if (route.startsWith('/workflows/') || ARCHIVED_WORKFLOW_LEARN_ROUTES.has(route)) return 'noindex, nofollow';
  return 'index, follow';
}

function plainTitle(title) {
  return title
    .replace(/\s*\|\s*Kreativ Tools(?: Learn)?$/i, '')
    .replace(/^Kreativ Tools Learn\s*\|\s*/i, '')
    .replace(/^Kreativ Tools\s*\|\s*/i, '')
    .trim();
}

function sectionLabelForRoute(route) {
  if (route === '/') return 'Home';
  if (route.startsWith('/learn/')) return 'Learn';
  if (route.startsWith('/workflows/')) return 'Workflows';
  if (route.startsWith('/image/')) return 'Image Tools';
  if (route.startsWith('/pdf/')) return 'PDF Tools';
  if (route.startsWith('/video/')) return 'Video Tools';
  if (route.startsWith('/fonts/')) return 'Font Tools';
  if (route.startsWith('/audio/')) return 'Audio Tools';
  if (route.startsWith('/file/')) return 'File Tools';
  if (route.startsWith('/tools/')) return 'Tools';
  if (route.startsWith('/changes/')) return 'Updates';
  return plainTitle(route.split('/').filter(Boolean).pop() || 'Kreativ Tools');
}

function sectionRouteForRoute(route) {
  if (route.startsWith('/learn/')) return '/learn/';
  if (route.startsWith('/workflows/')) return '/workflows/';
  if (route.startsWith('/image/')) return '/image/';
  if (route.startsWith('/pdf/')) return '/pdf/';
  if (route.startsWith('/video/')) return '/video/';
  if (route.startsWith('/fonts/')) return '/fonts/';
  if (route.startsWith('/audio/')) return '/audio/';
  if (route.startsWith('/file/')) return '/file/';
  if (route.startsWith('/tools/')) return '/tools/';
  if (route.startsWith('/changes/')) return '/changes/';
  return route;
}

function isCategoryRoute(route) {
  return ['/image/', '/pdf/', '/video/', '/fonts/', '/audio/', '/file/', '/tools/', '/learn/', '/workflows/'].includes(route);
}

function isToolRoute(route) {
  return (
    route !== '/image/' &&
    route !== '/pdf/' &&
    route !== '/video/' &&
    route !== '/fonts/' &&
    route !== '/audio/' &&
    route !== '/file/' &&
    (
      route.startsWith('/image/') ||
      route.startsWith('/pdf/') ||
      route.startsWith('/video/') ||
      route.startsWith('/fonts/') ||
      route.startsWith('/audio/') ||
      route.startsWith('/file/') ||
      route.startsWith('/workflows/')
    )
  );
}


function titleForRoute(route, title) {
  return TITLE_OVERRIDES[route] || title;
}

function descriptionForRoute(route, description) {
  return description.replace(/ Includes (?:private previews|private browser handling|browser previews|license reminders|preview steps|local parsing|setup checks|practical decision rules|next-step links)[\s\S]*$/, '')
    .replace(/ Covers ownership, contact paths,[\s\S]*$/, '');
}

function breadcrumbData(route, title) {
  const labels = {
    '/tools/': 'Tools', '/learn/': 'Learn', '/changes/': 'Updates',
    '/about/': 'About', '/contact/': 'Contact', '/privacy/': 'Privacy', '/terms/': 'Terms',
  };
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    },
  ];

  const sectionRoute = sectionRouteForRoute(route);
  if (route !== '/' && sectionRoute !== route) {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: sectionLabelForRoute(route),
      item: `${SITE_URL}${sectionRoute}`,
    });
  }

  if (route !== '/') {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: labels[route] || (isCategoryRoute(route) ? sectionLabelForRoute(route) : plainTitle(title)),
      item: `${SITE_URL}${route}`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function previousLastmodForRoute(route) {
  return readExistingSitemapLastmods().get(route) || RUN_DATE;
}

function primaryStructuredData({ title, description, route }) {
  const url = `${SITE_URL}${route}`;
  if (route === '/') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Kreativ Tools',
      url,
      description,
      publisher: {
        '@type': 'Organization',
        name: 'KREATIV',
        url: 'https://madebykreativ.com/',
      },
    };
  }

  if (route.startsWith('/learn/') && route !== '/learn/') {
    const dates = pageDates(route);
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: plainTitle(title),
      description,
      url,
      image: OG_IMAGE,
      datePublished: dates.published,
      dateModified: dates.modified,
      author: {
        '@type': 'Person',
        name: 'Andrei Olaru',
      },
      publisher: {
        '@type': 'Organization',
        name: 'KREATIV',
        url: 'https://madebykreativ.com/',
      },
    };
  }

  if (isToolRoute(route)) {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: plainTitle(title),
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Any modern browser',
      url,
      description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      publisher: {
        '@type': 'Organization',
        name: 'KREATIV',
        url: 'https://madebykreativ.com/',
      },
    };
  }

  if (isCategoryRoute(route)) {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: plainTitle(title),
      url,
      description,
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: plainTitle(title),
    url,
    description,
  };
}

function buildStructuredData(meta) {
  const graph = [
    primaryStructuredData(meta),
    breadcrumbData(meta.route, meta.title),
  ];
  return `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
}

function buildHead({ title, description, route, prefix }) {
  const canonical = `${SITE_URL}${route}`;
  const ogType = ogTypeForRoute(route);
  const robots = robotsForRoute(route);
  const structuredData = buildStructuredData({ title, description, route });
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
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
  <link rel="stylesheet" href="${prefix}vendor/fontawesome/css/all.min.css" />
  <link rel="stylesheet" href="${prefix}styles.css" />
  ${structuredData}
  <script type="module" src="${CLOUDFLARE_WEB_ANALYTICS_SRC}" data-cf-beacon='{"token":"${CLOUDFLARE_WEB_ANALYTICS_TOKEN}"}'></script>
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

function buildBreadcrumbNav(route, title) {
  const data = breadcrumbData(route, title).itemListElement;
  if (data.length < 2) {
    return `<nav class="breadcrumbs breadcrumbs-home" aria-label="Breadcrumb">
    <span aria-current="page">Kreativ Tools</span>
  </nav>`;
  }
  const links = data.map((item, index) => {
    const label = escapeHtml(item.name);
    if (index === data.length - 1) return `<span aria-current="page">${label}</span>`;
    return `<a href="${new URL(item.item).pathname}">${label}</a>`;
  }).join('<span aria-hidden="true">/</span>');

  return `<nav class="breadcrumbs" aria-label="Breadcrumb">
    ${links}
  </nav>`;
}

function buildArticleTrustMeta(route) {
  const updated = new Date(`${pageDates(route).modified}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
  return `<div class="article-trust-meta" aria-label="Article information">
        <span>Updated ${updated}</span>
        <span>By Andrei Olaru</span>
      </div>`;
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
  const rawTitle = extractMeta(content, /<title>([^<]+)<\/title>/, 'title', rel);
  const rawDescription = extractMeta(content, /<meta name="description" content="([^"]+)"\s*\/?>/, 'description', rel);
  const title = titleForRoute(route, rawTitle);
  const description = descriptionForRoute(route, rawDescription);
  const head = buildHead({ title, description, route, prefix });
  const footer = buildFooter();
  const scripts = [
    `${prefix}github-pages-prefix.js`,
    `${prefix}theme.js`,
  ];

  content = replaceBlock(content, /<head>[\s\S]*?<\/head>/, head, 'head', rel);
  if (isToolRoute(route) && !route.startsWith('/workflows/')) {
    content = content.replace(/<body(?: class="tool-page")?>/, '<body class="tool-page">');
    // Keep useful help in the HTML without letting it dominate the tool workspace.
    content = content.replace(/(<section class="(?:article-section[^\"]*|tool-intro)"[^>]*>)([\s\S]*?)(<\/section>)/g, (match, opening, body, closing, offset, source) => {
      if (source.slice(Math.max(0, offset - 150), offset).includes('<details class="tool-help">')) return match;
      const title = body.match(/<h2[^>]*>([^<]+)<\/h2>/)?.[1] || 'Help and file limits';
      return `<details class="tool-help"><summary>${title}</summary>\n${opening}${body}${closing}\n    </details>`;
    });
  }
  content = content.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/pdf-lib@1\.17\.1\/dist\/pdf-lib\.min\.js/g, `${prefix}vendor/pdf-lib.min.js`)
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/jszip@3\.10\.1\/dist\/jszip\.min\.js/g, `${prefix}vendor/jszip.min.js`)
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/jspdf@2\.5\.1\/dist\/jspdf\.umd\.min\.js/g, `${prefix}vendor/jspdf.umd.min.js`);
  content = content.replace(/<nav class="breadcrumbs(?:\s+[^"]*)?" aria-label="Breadcrumb">[\s\S]*?<\/nav>\s*/g, '');
  const breadcrumbNav = buildBreadcrumbNav(route, title);
  const headerReplacement = breadcrumbNav ? `${buildHeader(route)}\n\n  ${breadcrumbNav}` : buildHeader(route);
  content = replaceBlock(content, /<header class="site-header">[\s\S]*?<\/header>/, headerReplacement, 'header', rel);
  content = replaceBlock(content, /<footer class="site-footer">[\s\S]*?<\/footer>/, footer, 'footer', rel);
  if (TOOL_EXPORTS[route]) {
    const [prepareId, downloadId, prepareLabel, downloadLabel] = TOOL_EXPORTS[route];
    if (!content.includes(`id="${downloadId}"`)) {
      const prepare = new RegExp(`(<button\\b[^>]*id="${prepareId}"[^>]*>[\\s\\S]*?<\\/button>)`);
      content = content.replace(prepare, `$1\n        <button id="${downloadId}" type="button" class="secondary-button" disabled>${downloadLabel}</button>`);
    }
    for (const [id, marker, label] of [[prepareId, 'prepare', prepareLabel], [downloadId, 'download', downloadLabel]]) {
      const button = new RegExp(`<button\\b([^>]*id="${id}"[^>]*)>[\\s\\S]*?<\\/button>`);
      if (!button.test(content)) throw new Error(`Missing export button ${id} in ${rel}`);
      content = content.replace(button, (_, attributes) => `<button${attributes.replace(/\s+data-export-(?:prepare|download)(?:="[^"]*")?/g, '')} data-export-${marker}>${label}</button>`);
    }
    if (!content.includes(`${prefix}tool-export-ui.js`)) {
      content = content.replace(`<script src="${prefix}tool-upload-ui.js">`, `<script src="${prefix}tool-export-ui.js"></script>\n  <script src="${prefix}tool-upload-ui.js">`);
    }
  }
  content = replaceJobRouters(content, rel);
  content = content.replace(/\s*<div class="article-trust-meta"[\s\S]*?<\/div>/g, '');
  if (route.startsWith('/learn/') && route !== '/learn/') {
    if (/<div class="article-meta">[\s\S]*?<\/div>/.test(content)) {
      content = content.replace(/(<div class="article-meta">[\s\S]*?<\/div>)/, `$1\n      ${buildArticleTrustMeta(route)}`);
    } else {
      content = content.replace(/(<h1>[\s\S]*?<\/h1>)/, `$1\n      ${buildArticleTrustMeta(route)}`);
    }
  }
  content = content.replace(/<input([^>]*type="file"(?:(?!aria-label)[^>])*?) hidden/g, '<input$1 aria-label="Upload file" hidden');
  content = content.replace(/\s*<section class="article-section page-quality-note"[\s\S]*?<\/section>/g, '');
  content = content.replace(/\s*<section class="home-panel[^\"]*\bworkflow-bridge\b[^\"]*"[\s\S]*?<\/section>/g, '');
  content = content.replace(/\n[ \t]+\n[ \t]+\n(\s*<\/main>)/g, '\n$1');
  content = content.replace(/<div\b[^>]*class="[^"]*\bdropzone\b[^"]*"[^>]*>/g, (tag) => tag.replace(/role="button"/g, 'role="group"').replace(/\s+tabindex="0"/g, ''));
  content = content.replace(/href="(\/[^"]*)"/g, (_match, href) => `href="${normalizeInternalHref(href)}"`);
  // Remove retired tracking and consent assets before ensuring the current shared scripts.
  content = content.replace(/\s*<script src="[^"]*(?:analytics|cookie-consent)\.js"><\/script>/g, '');

  for (const script of scripts) {
    const scriptRegex = new RegExp(`<script src="${script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"><\\/script>`);
    if (!scriptRegex.test(content)) {
      content = content.replace(
        /<\/body>/,
        `  <script src="${script}"></script>\n</body>`
      );
    }
  }

  content = content.replace(/\n[ \t]+\n/g, '\n\n');

  const stableContent = content.replace(/<head>[\s\S]*?<\/head>/, JSON.stringify({ title, description }))
    .replace(/<div class="article-trust-meta"[\s\S]*?<\/div>/g, '');
  const hash = createHash('sha256').update(stableContent).digest('hex');
  const oldDates = pageDates(route);
  PAGE_DATES[route] = { published: oldDates.published, modified: PAGE_DATES[route]?.hash === hash ? oldDates.modified : RUN_DATE, hash };
  content = content.replace(/<head>[\s\S]*?<\/head>/, buildHead({ title, description, route, prefix }));
  content = content.replace(/<div class="article-trust-meta"[\s\S]*?<\/div>/g, () => buildArticleTrustMeta(route));
  content = secureDocument(content);
  scriptHashes(content).forEach((hash) => POLICY_HASHES.add(hash));
  fs.writeFileSync(file, content);
  return { route, title, description, modified: pageDates(route).modified };
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
    return `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${metaByRoute.get(route).modified}</lastmod>
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
  <meta name="referrer" content="strict-origin-when-cross-origin" />
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
  <meta name="robots" content="noindex, ${route.startsWith('/workflows/') ? 'nofollow' : 'follow'}" />
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
    const page = secureDocument(buildRedirectPage(route, meta.title, meta.description));
    scriptHashes(page).forEach((hash) => POLICY_HASHES.add(hash));
    fs.writeFileSync(path.join(ROOT, alias), page);
  }

  for (const [legacyPath, route] of Object.entries(LEGACY_DIRECTORY_REDIRECTS)) {
    const page = secureDocument(buildDirectoryRedirectPage(route));
    scriptHashes(page).forEach((hash) => POLICY_HASHES.add(hash));
    fs.writeFileSync(path.join(ROOT, legacyPath), page);
  }

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(metaByRoute));
  fs.writeFileSync(CONTENT_STATE_PATH, `${JSON.stringify(PAGE_DATES, null, 2)}\n`);
  fs.writeFileSync(path.join(ROOT, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Content-Security-Policy: ${contentSecurityPolicy(Array.from(POLICY_HASHES).sort(), true)}
`);
}

main();
