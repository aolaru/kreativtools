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
const CURRENT_LASTMOD = '2026-07-15';

const TITLE_OVERRIDES = {
  '/learn/compress-images-for-faster-websites/': 'Compress Images for Faster Websites | Kreativ Tools',
  '/learn/merge-pdf-files-in-order/': 'Merge PDF Files in Order | Kreativ Tools Learn',
  '/learn/resize-before-compressing-images/': 'Resize Before Compressing | Kreativ Tools Learn',
  '/learn/when-pdf-compression-does-not-help/': 'PDF Compression Limits | Kreativ Tools Learn',
  '/learn/font-licensing-checklist/': 'Font Licensing Checklist | Kreativ Tools Learn',
};

const DESCRIPTION_SUFFIXES = {
  image: 'Includes private previews, local export, and practical quality checks.',
  pdf: 'Includes private browser handling, local export, and final-file checks.',
  video: 'Includes browser previews, export limits, and handoff checks.',
  font: 'Includes license reminders, browser export, and CSS delivery checks.',
  audio: 'Includes preview steps, local export, and sharing-quality checks.',
  data: 'Includes local parsing, preview checks, and import-ready export guidance.',
  workflow: 'Includes setup checks, reusable defaults, and local export guidance.',
  trust: 'Covers ownership, contact paths, policy limits, and visitor choices.',
  general: 'Includes practical decision rules, privacy notes, and next-step links.',
  short: 'Includes next-step links and privacy notes.',
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

function contentFamilyForRoute(route) {
  if (route === '/trust/') return 'trust';
  if (route.startsWith('/learn/')) {
    if (/privacy|limits/.test(route)) return 'trust';
    if (/image|png|webp|shopify|woocommerce|thumbnail|crop|resize|compress-images/.test(route)) return 'image';
    if (/pdf|sign|merge|split|handoff|compression/.test(route)) return 'pdf';
    if (/video|webm|mp4|thumbnail/.test(route)) return 'video';
    if (/font|woff|webfont|css/.test(route)) return 'font';
    if (/audio|wav|mp3|bitrate/.test(route)) return 'audio';
    if (/csv|json|xml|data/.test(route)) return 'data';
    if (/workflow|workflows|tool|update-labels/.test(route)) return 'workflow';
  }
  if (route.startsWith('/image/')) return 'image';
  if (route.startsWith('/pdf/')) return 'pdf';
  if (route.startsWith('/video/')) return 'video';
  if (route.startsWith('/fonts/')) return 'font';
  if (route.startsWith('/audio/')) return 'audio';
  if (route.startsWith('/file/')) return 'data';
  if (route.startsWith('/workflows/')) return 'workflow';
  return '';
}

function titleForRoute(route, title) {
  return TITLE_OVERRIDES[route] || title;
}

function descriptionForRoute(route, description) {
  if (description.length >= 120) return description;

  const family = contentFamilyForRoute(route) || (isCategoryRoute(route) ? 'general' : 'general');
  const fullSuffix = DESCRIPTION_SUFFIXES[family] || DESCRIPTION_SUFFIXES.general;
  const suffix = description.length > 112 ? DESCRIPTION_SUFFIXES.short : fullSuffix;
  const next = `${description} ${suffix}`;

  if (next.length <= 165) return next;
  if (description.length < 120) {
    return `${description} ${DESCRIPTION_SUFFIXES.short}`.slice(0, 165).replace(/\s+\S*$/, '.');
  }
  return description;
}

const FAMILY_NOTES = {
  image: {
    title: 'Before you export an image',
    copy: 'Check framing first, then dimensions, then file weight. A smaller image is not automatically better if it loses the detail the destination needs. For product images, thumbnails, and social posts, compare the exported file at the size where it will actually appear.',
    detail: 'If an upload limit is the main problem, reduce dimensions before lowering quality. If visual clarity is the main problem, keep the quality higher and change the format only after reviewing the preview. For ecommerce and portfolio images, consistent dimensions usually matter as much as raw file size.',
    list: ['Crop before resizing when the frame is wrong.', 'Resize before compressing when the source is much larger than needed.', 'Keep an original copy so you can re-export with a different format or quality setting.'],
  },
  pdf: {
    title: 'Before you send a PDF',
    copy: 'Decide whether the job changes visible content, page order, or file size. Fill and sign before final compression, split before merging if only some pages are needed, and review the exported PDF before sending it to a client, portal, or archive.',
    detail: 'PDF work often fails when the final destination is ignored. A portal may care about file size, an approval flow may care about signatures, and a handoff may care about page order. Work backward from that requirement and keep the final downloaded file separate from the original.',
    list: ['Keep the source PDF until the export has been checked.', 'Protected or damaged PDFs can fail even when the page loads normally.', 'Compression should be the last step after pages and overlays are final.'],
  },
  video: {
    title: 'Before you export video',
    copy: 'Browser video support depends on the file format, codec, and device. Short clips are usually easier to process than long recordings. For email or social delivery, trim first, capture the needed thumbnail, then convert only when the destination requires a different format.',
    detail: 'When a clip is for review, speed and compatibility usually matter more than maximum quality. When a clip is for publishing, check the playback target and keep the original source available. Browser exports are convenient for quick jobs, but long or high-resolution videos can be memory-heavy.',
    list: ['Use short source files when possible.', 'Check the start and end frame before downloading.', 'Keep the original video if the browser export needs to be adjusted.'],
  },
  font: {
    title: 'Before you ship webfonts',
    copy: 'A font file can convert successfully and still be wrong for a website if the license, character coverage, weight selection, or CSS loading strategy is not ready. Test headings, body copy, numbers, and accented characters before publishing.',
    detail: 'Treat conversion as one part of the webfont job. The final setup also needs correct file paths, fallback fonts, caching, and a font-display choice that matches the site. If the font is only used for headings, avoid shipping unnecessary weights that slow down every page.',
    list: ['Confirm the license allows web use.', 'Ship only the weights and styles the site needs.', 'Use CSS with sensible fallback fonts and a clear font-display choice.'],
  },
  audio: {
    title: 'Before you export audio',
    copy: 'Audio jobs are easier when trimming, volume changes, and format conversion happen in a clear order. Trim unwanted sections before converting, check loudness before sharing, and choose MP3 only when a smaller delivery file matters more than keeping WAV quality.',
    detail: 'For spoken audio, clarity and steady volume matter more than aggressive compression. For samples or music ideas, keep a higher-quality source and export a lighter copy for sharing. If the result sounds harsh, reduce gain or bitrate changes and export again from the original file.',
    list: ['Preview the selected section before downloading.', 'Avoid very high gain settings that can clip speech or music.', 'Keep WAV for editing and MP3 for lightweight sharing.'],
  },
  data: {
    title: 'Before you convert data files',
    copy: 'Data converters are most reliable when the source file is clean before conversion. Check headers, repeated records, delimiters, blank rows, and unexpected nested fields. A converter can preserve structure, but it cannot know the meaning of unclear source data.',
    detail: 'Before using the export in another system, compare a few rows against the source file. Look for shifted columns, empty fields, escaped quotes, and values that should stay as text, such as IDs or postal codes. Small cleanup before conversion prevents larger import mistakes later.',
    list: ['Keep headers unique and stable.', 'Preview row counts before using the export elsewhere.', 'Save the original file before cleaning or converting it.'],
  },
  workflow: {
    title: 'Before you run a guided workflow',
    copy: 'Use a guided workflow when the same job has several ordered steps. The workflow keeps the sequence visible, but the best result still depends on checking each stage before export. If you only need one quick action, use the matching single-purpose tool instead.',
    detail: 'Workflows are meant for repeatable delivery patterns, not for hiding complexity. If the same image, PDF, or audio preparation job happens often, save the settings and reuse the sequence. If the job changes every time, use the individual tools so each decision stays visible.',
    list: ['Load the source file once, then move through the steps in order.', 'Save defaults only after the settings match a repeat job.', 'Review the final export before reusing the workflow for a batch of similar files.'],
  },
  trust: {
    title: 'How to read this site information',
    copy: 'The trust pages explain ownership, contact paths, privacy limits, and terms. They are written to support real use of the tools, not to replace legal advice or platform-specific policy review.',
    detail: 'If a file is sensitive, review the relevant tool page before using it and keep your own copy of the source file. Browser extensions and third-party pages are separate from the Kreativ Tools interface unless clearly identified as part of the site.',
    list: ['Use Contact for bug reports, privacy questions, and unclear tool behavior.', 'Use Privacy to understand local file handling and browser storage.', 'Use Terms to understand responsibility for files and exported results.'],
  },
};

function buildQualityNote(route) {
  const family = contentFamilyForRoute(route);
  const note = FAMILY_NOTES[family];
  if (!note) return '';
  const listItems = note.list.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n        ');
  return `<section class="article-section page-quality-note" aria-labelledby="qualityNoteTitle">
      <h2 id="qualityNoteTitle">${escapeHtml(note.title)}</h2>
      <p>${escapeHtml(note.copy)}</p>
      <p>${escapeHtml(note.detail)}</p>
      <ul class="tool-guide-list">
        ${listItems}
      </ul>
      <p>After downloading the result, open it once before using it in a client send, upload form, website, or archive. This final check catches format support issues, unexpected file size changes, missing characters, clipped media, or page-order mistakes while the original file is still available.</p>
      <p>If the output will be reused, note the settings that produced it. That makes the next export easier to repeat and reduces guesswork when another file needs the same treatment.</p>
    </section>`;
}

function breadcrumbData(route, title) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Kreativ Tools',
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
      name: plainTitle(title),
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
  return readExistingSitemapLastmods().get(route) || CURRENT_LASTMOD;
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
    const published = previousLastmodForRoute(route);
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: plainTitle(title),
      description,
      url,
      image: OG_IMAGE,
      datePublished: published,
      dateModified: CURRENT_LASTMOD,
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
  <link rel="stylesheet" href="${FONT_AWESOME_HREF}" integrity="${FONT_AWESOME_INTEGRITY}" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <link rel="stylesheet" href="${prefix}styles.css" />
  ${structuredData}
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

function buildArticleTrustMeta() {
  return `<div class="article-trust-meta" aria-label="Article information">
        <span>Updated July 15, 2026</span>
        <span>By Andrei Olaru</span>
        <span>Reviewed for browser-tool accuracy</span>
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
  content = content.replace(/<nav class="breadcrumbs(?:\s+[^"]*)?" aria-label="Breadcrumb">[\s\S]*?<\/nav>\s*/g, '');
  const breadcrumbNav = buildBreadcrumbNav(route, title);
  const headerReplacement = breadcrumbNav ? `${buildHeader(route)}\n\n  ${breadcrumbNav}` : buildHeader(route);
  content = replaceBlock(content, /<header class="site-header">[\s\S]*?<\/header>/, headerReplacement, 'header', rel);
  content = replaceBlock(content, /<footer class="site-footer">[\s\S]*?<\/footer>/, footer, 'footer', rel);
  content = replaceJobRouters(content, rel);
  content = content.replace(/\s*<div class="article-trust-meta"[\s\S]*?<\/div>/g, '');
  if (route.startsWith('/learn/') && route !== '/learn/') {
    if (/<div class="article-meta">[\s\S]*?<\/div>/.test(content)) {
      content = content.replace(/(<div class="article-meta">[\s\S]*?<\/div>)/, `$1\n      ${buildArticleTrustMeta()}`);
    } else {
      content = content.replace(/(<h1>[\s\S]*?<\/h1>)/, `$1\n      ${buildArticleTrustMeta()}`);
    }
  }
  content = content.replace(/<input([^>]*type="file"(?:(?!aria-label)[^>])*?) hidden/g, '<input$1 aria-label="Upload file" hidden');
  content = content.replace(/\s*<section class="article-section page-quality-note"[\s\S]*?<\/section>/g, '');
  content = content.replace(/\n[ \t]+\n[ \t]+\n(\s*<\/main>)/g, '\n$1');
  if (['/about/', '/privacy/', '/terms/', '/contact/'].includes(route)) {
    const note = buildQualityNote('/trust/');
    if (note) content = content.replace(/(\s*)<\/main>/, `\n    ${note}$1</main>`);
  } else if (isToolRoute(route) || route.startsWith('/learn/') || ['/image/', '/pdf/', '/video/', '/fonts/', '/audio/', '/file/'].includes(route)) {
    const note = buildQualityNote(route);
    if (note) content = content.replace(/(\s*)<\/main>/, `\n    ${note}$1</main>`);
  }
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
    return `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${CURRENT_LASTMOD}</lastmod>
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
