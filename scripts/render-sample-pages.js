const fs = require('node:fs');
const path = require('node:path');
const { categories } = require('./validate-samples');
const root = path.resolve(__dirname, '..');
/** @type {import('../resources/sample-files/catalog').SampleCatalog} */
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'resources/sample-files/manifest.json'), 'utf8'));
const definitions = {
  pdf: { name: 'PDF', intro: 'Test document uploads and viewers with forms, bookmarks, encryption, attachments, and damaged files.', tool: '/pdf/', toolName: 'PDF tools' },
  images: { name: 'Image', intro: 'Test image uploads, dimensions, transparency, formats, and misleading extensions.', tool: '/image/', toolName: 'Image tools' },
  documents: { name: 'Document', intro: 'Test common Office, rich-text, and plain-text uploads with small synthetic files.', tool: '/pdf/image-to-pdf/', toolName: 'Image to PDF' },
  archives: { name: 'Archive', intro: 'Test archive handling with empty, nested, and deliberately truncated ZIP files. No archive bombs are included.', tool: '/tools/', toolName: 'Browse tools' },
  data: { name: 'Data', intro: 'Test structured data parsing, Unicode, quoted CSV fields, empty input, and malformed syntax.', tool: '/file/', toolName: 'Data converters' },
  'audio-video': { name: 'Audio & Video', intro: 'Test media uploads and playback with short synthetic tones and a silent video.', tool: '/audio/', toolName: 'Audio tools' },
};
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const size = (bytes) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
const markerStart = '<!-- sample-library:start -->';
const markerEnd = '<!-- sample-library:end -->';
const checkOnly = process.argv.includes('--check');

function card(sample) {
  const label = sample.validity === 'invalid' ? 'Intentionally invalid' : sample.validity === 'edge' ? 'Edge case' : 'Valid';
  return `<article class="sample-card" data-sample-card data-category="${esc(sample.category)}" data-tags="${esc(sample.tags.join(' '))}">
  <div class="sample-card-top"><span class="sample-type">${esc(sample.format)}</span><span class="sample-validity sample-validity-${esc(sample.validity)}">${label}</span></div>
  <h3>${esc(sample.title)}</h3><p>${esc(sample.description)}</p>
  <p class="sample-file-meta"><code>${esc(sample.filename)}</code> · ${size(sample.sizeBytes)} · ${esc(sample.mimeType)}</p>
  <p><strong>Test:</strong> ${esc(sample.testScenario)}<br /><strong>Expected:</strong> ${esc(sample.expectedResult)}</p>
  <details><summary>Checksum and details</summary><p>SHA-256: <code class="sample-hash">${esc(sample.sha256)}</code></p><p>Content type is an intended or detected type; HTTP headers can differ for extension-mismatch samples.</p></details>
  <a class="ghost header-link" href="${esc(sample.downloadUrl)}" download aria-label="Download ${esc(sample.title)} (${esc(sample.filename)})">Download ${esc(sample.filename)}</a>
</article>`;
}

function categoryLinks(active) {
  return `<nav class="sample-category-links" aria-label="Sample file categories"><a href="/resources/sample-files/"${!active ? ' aria-current="page"' : ''}>All samples</a>${categories.map((category) => `<a href="/resources/sample-files/${category}/"${category === active ? ' aria-current="page"' : ''}>${esc(definitions[category].name)}</a>`).join('')}</nav>`;
}

function listing(category) {
  const samples = catalog.samples.filter((item) => item.access === 'free' && (!category || item.category === category));
  const options = categories.map((id) => `<option value="${id}">${esc(definitions[id].name)}</option>`).join('');
  return `${categoryLinks(category)}
  <section class="sample-controls" aria-label="Find sample files" hidden><label for="sampleSearch">Search by name, format or scenario</label><input id="sampleSearch" type="search" placeholder="Search PDF, Unicode, invalid..." autocomplete="off" />${category ? '' : `<label for="sampleCategory">Category</label><select id="sampleCategory"><option value="all">All categories</option>${options}</select>`}<p id="sampleCount" role="status" aria-live="polite">${samples.length} samples available.</p></section>
  <div class="sample-grid">${samples.map(card).join('\n')}</div><p id="sampleEmpty" hidden>No samples match. Try another search or category.</p>`;
}

function content(category) {
  const title = category ? `${definitions[category].name} sample files` : 'Sample Files & QA Testing Resources';
  const intro = category ? definitions[category].intro : 'Download small, synthetic files for upload checks, parsers, previews, and error handling. Each sample includes its scenario, expected result, and checksum.';
  const info = category ? `<section class="article-section"><h2>Testing ${esc(definitions[category].name.toLowerCase())} files</h2><p>Check both successful handling and clear error messages. Expected results are starting points: your application may have stricter rules for size, encryption, or supported formats.</p><p>Related: <a href="${definitions[category].tool}">${esc(definitions[category].toolName)}</a>.</p></section>` : `<section class="article-section"><h2>How to use these samples</h2><p>Start with a valid file, then try edge cases and intentionally invalid examples to verify rejection and error messages. Compare file size and SHA-256 to confirm the fixture was transferred unchanged. These files contain synthetic content and are not security exploit payloads.</p><p>For related utilities, use <a href="/pdf/">PDF tools</a>, <a href="/image/">image tools</a>, or <a href="/file/">data converters</a>.</p></section>`;
  return `<section class="hero"><p class="eyebrow">Developer &amp; QA Resources</p><h1>${esc(title)}</h1><p>${esc(intro)}</p></section>
  ${listing(category)}
  ${info}
  <section class="home-panel compact-panel slim-panel"><div><p class="eyebrow">Planned</p><h2>Kreativ QA File Test Kit PRO</h2><p>A possible future collection of extended test cases and checklists. The free files on this page are available now; no purchase is available yet.</p></div><a class="ghost header-link" href="/resources/sample-files/pro/">About the planned kit</a></section>`;
}

function proContent() {
  return `<section class="hero"><p class="eyebrow">Planned Resource</p><h1>Kreativ QA File Test Kit PRO</h1><p>A possible future collection of file-testing scenarios and practical QA resources.</p></section>
  <section class="article-section"><h2>What is planned</h2><p>The proposed kit may include organized file suites, manifests, QA checklists, and example automated tests. Scope, price, and availability are not yet confirmed. There is no checkout or purchase available.</p><p>Meanwhile, the <a href="/resources/sample-files/">free sample library</a> is ready to use without an account.</p></section>`;
}

function render(route, title, description, body) {
  const directory = path.join(root, route.slice(1));
  const file = path.join(directory, 'index.html');
  const depth = route.split('/').filter(Boolean).length;
  const prefix = '../'.repeat(depth);
  const section = `${markerStart}\n${body}\n${markerEnd}`;
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8');
    const start = existing.indexOf(markerStart), end = existing.indexOf(markerEnd);
    if (start < 0 || end < start) throw new Error(`Missing resource markers: ${file}`);
    if (checkOnly) {
      if (existing.slice(start, end + markerEnd.length) !== section) throw new Error(`Stale resource page: ${file}. Run npm run sync:site.`);
      return;
    }
    fs.writeFileSync(file, existing.slice(0, start) + section + existing.slice(end + markerEnd.length));
  } else {
    if (checkOnly) throw new Error(`Missing resource page: ${file}. Run npm run sync:site.`);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(file, `<!doctype html>\n<html lang="en">\n<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)} | Kreativ Tools</title><meta name="description" content="${esc(description)}" /><link rel="stylesheet" href="${prefix}styles.css" /></head>\n<body><div class="bg-glow bg-glow-1"></div><div class="bg-glow bg-glow-2"></div><header class="site-header"></header><main class="container sample-library">\n${section}\n</main><footer class="site-footer"></footer><script src="${prefix}sample-library.js"></script><script src="${prefix}github-pages-prefix.js"></script><script src="${prefix}theme.js"></script></body>\n</html>\n`);
  }
}

render('/resources/sample-files/', 'Sample Files & QA Testing Resources', 'Download synthetic sample files for software testing, uploads, parsers, and QA.', content());
for (const category of categories) render(`/resources/sample-files/${category}/`, `${definitions[category].name} Sample Files for Testing`, definitions[category].intro, content(category));
render('/resources/sample-files/pro/', 'Kreativ QA File Test Kit PRO', 'Learn about a proposed future QA file testing kit and explore free sample files.', proContent());
