const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const esbuild = require('esbuild');
const JSZip = require('jszip');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist/offline');
const tools = {
  '/pdf/merge/': ['pdf-merge.html', 'Merge PDFs'],
  '/pdf/compress/': ['pdf-compress.html', 'Compress PDFs'],
  '/pdf/split/': ['pdf-split.html', 'Split PDFs'],
  '/pdf/organize/': ['pdf-organize.html', 'Organize PDF pages'],
  '/pdf/to-images/': ['pdf-images.html', 'PDF to images'],
  '/image/compress/': ['image-compress.html', 'Compress images'],
  '/image/resize/': ['image-resize.html', 'Resize and convert images'],
};
const read = (filename) => fs.readFileSync(path.join(root, filename), 'utf8');
const mime = (filename) => filename.endsWith('.woff2') ? 'font/woff2' : filename.endsWith('.ttf') ? 'font/ttf' : 'image/svg+xml';
const dataUrl = (filename) => `data:${mime(filename)};base64,${fs.readFileSync(filename).toString('base64')}`;
const css = (filename) => fs.readFileSync(filename, 'utf8').replace(/url\(['"]?([^)'"?#]+)(?:[?#][^)'" ]*)?['"]?\)/g, (_, asset) => `url('${dataUrl(path.resolve(path.dirname(filename), asset))}')`);
const script = (code) => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;
const hash = (body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`;

function secure(html) {
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, body]) => hash(body));
  const policy = `default-src 'none'; script-src blob: 'wasm-unsafe-eval' ${hashes.join(' ')}; script-src-attr 'none'; style-src 'unsafe-inline'; font-src data: blob:; img-src data: blob:; media-src blob:; connect-src blob: data:; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'`;
  return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="${policy}" />`);
}

async function bundle(filename, format = 'iife') {
  const result = await esbuild.build({ entryPoints: [path.join(root, filename)], bundle: true, minify: true, write: false, format, platform: 'browser', target: 'es2022', logLevel: 'silent' });
  return result.outputFiles[0].text;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const style = `<style>${css(path.join(root, 'styles.css'))}\n.fa-solid, .fa-brands, .fa-regular { display: none; }</style>`;
  const worker = await bundle('pdf-worker.mjs');
  const previewWorker = await bundle('vendor/pdfjs/pdf.worker.min.mjs');
  const assets = {};
  for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
    assets[directory] = {};
    const folder = path.join(root, 'vendor/pdfjs', directory);
    for (const name of fs.readdirSync(folder).sort()) {
      if (/\.(?:bcmap|pfb|ttf|wasm)$/.test(name)) assets[directory][name] = fs.readFileSync(path.join(folder, name)).toString('base64');
    }
  }
  const bootstrap = script(`globalThis.kreativOfflinePdfWorker=${JSON.stringify(worker)};globalThis.kreativOfflinePdfAssets=${JSON.stringify(assets)};globalThis.kreativOfflinePreviewWorkerUrl=URL.createObjectURL(new Blob([${JSON.stringify(previewWorker)}],{type:'text/javascript'}));globalThis.kreativOfflinePreviewWorkerPort=new Worker(globalThis.kreativOfflinePreviewWorkerUrl);`);
  const processingBootstrap = script(`globalThis.kreativOfflinePdfWorker=${JSON.stringify(worker)};`);
  const zip = new JSZip();
  const add = (name, content) => {
    fs.writeFileSync(path.join(output, name), content);
    // Fixed archive dates make repeat builds byte-for-byte reproducible.
    zip.file(name, content, { date: new Date('2026-10-26T00:00:00Z') });
  };
  for (const [route, [name, label]] of Object.entries(tools)) {
    const file = path.join(root, route.slice(1), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    const scripts = [];
    for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(attributes)) continue;
      const src = attributes.match(/src="([^"]+)"/)?.[1];
      if (src?.startsWith('https:') || src?.includes('github-pages-prefix') || src?.includes('offline-download-count')) continue;
      if (src) {
        const relative = path.relative(root, path.resolve(path.dirname(file), src));
        scripts.push(script(/type="module"/.test(attributes) ? await bundle(relative) : read(relative)));
      } else if (body.trim()) scripts.push(script(body));
    }
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<head>[\s\S]*?<\/head>/, () => `<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${label} | Kreativ Tools Offline</title>${style}</head>`)
      .replace(/<header class="site-header">[\s\S]*?<\/header>/, '<header class="site-header"><a class="brand" href="index.html">Kreativ Tools Offline</a><button id="themeToggle" type="button" class="icon-toggle" aria-label="Toggle dark mode">Theme</button></header>')
      .replace(/<nav class="breadcrumbs[\s\S]*?<\/nav>/, '')
      .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, '')
      .replace(/<p><a href="[^"]*downloads\/kreativ-pdf-offline\.zip"[\s\S]*?<\/p>/, '')
      .replace(/<a\b([^>]*href="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/g, (match, attributes, href, body) => {
        if (href === 'index.html' || href.startsWith('#')) return match;
        if (tools[href]) return `<a href="${tools[href][0]}">${body}</a>`;
        return body;
      });
    html = html.replace('</body>', () => `${['/pdf/merge/', '/pdf/organize/', '/pdf/to-images/'].includes(route) ? bootstrap : route === '/pdf/compress/' ? processingBootstrap : ''}\n${scripts.join('\n')}\n</body>`);
    add(name, secure(html));
  }
  add('index.html', secure(`<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Kreativ Tools Offline</title>${style}</head><body><main class="container"><section class="hero"><h1>Kreativ Tools Offline</h1><p>Open a tool below. No internet, account, installation, or server is needed. Your files stay on this device.</p></section><div class="tools-grid">${Object.values(tools).map(([name, label]) => `<a class="tool-card" href="${name}"><h2>${label}</h2><p>Open tool</p></a>`).join('')}</div><p>Use a current desktop browser. Extract the complete ZIP before opening index.html. Mobile file viewers may not run local HTML; use the website on those devices instead.</p><p>Metadata cleanup is not redaction. Rewriting signed PDFs may invalidate their digital signatures. Keep your originals.</p></main></body></html>`));
  add('README.txt', 'Kreativ Tools Offline\n\nExtract this ZIP and open index.html in a current desktop browser. No server or internet is required. Includes PDF Merge, Compress, Split, Page Organizer, PDF to Images, Image Compress, and Image Resize.\n\nPDF input limit: 100 MB per file. Merge: 100 files / 200 MB combined. Organizer: 200 source/output pages. Images: 50 pages per batch, 100 MB of image output. Complex documents can still exceed device memory.\n\nMetadata cleanup is not redaction. Digital signatures may be invalidated. Keep your originals. No analytics are included.\n\nSource: https://github.com/aolaru/kreativtools\nBuild: npm ci && npm run vendor:build && npm run sync:site && npm run build:offline\n');
  add('LICENSE.txt', read('LICENSE'));
  add('THIRD_PARTY_NOTICES.txt', read('THIRD_PARTY_NOTICES.md'));
  add('JSZIP-LICENSE.txt', read('vendor/JSZIP-LICENSE'));
  for (const [name, file] of Object.entries({ 'PDF-LIB-LICENSE.txt': 'vendor/PDF-LIB-LICENSE', 'PDFJS-LICENSE.txt': 'vendor/pdfjs/LICENSE', 'JSPDF-LICENSE.txt': 'vendor/JSPDF-LICENSE', 'SPACE-GROTESK-LICENSE.txt': 'vendor/fonts/SPACE-GROTESK-LICENSE', 'FONTAWESOME-LICENSE.txt': 'vendor/fontawesome/LICENSE.txt' })) add(name, read(file));
  for (const name of ['LICENSE_FOXIT', 'LICENSE_LIBERATION']) add(`${name}.txt`, read(`vendor/pdfjs/standard_fonts/${name}`));
  for (const directory of ['cmaps', 'wasm']) {
    for (const name of fs.readdirSync(path.join(root, 'vendor/pdfjs', directory)).filter((name) => name.startsWith('LICENSE'))) {
      add(`${directory}-${name}.txt`, read(`vendor/pdfjs/${directory}/${name}`));
    }
  }
  fs.mkdirSync(path.join(root, 'downloads'), { recursive: true });
  const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.writeFileSync(path.join(root, 'downloads/kreativ-pdf-offline.zip'), archive);
  console.log(`Built ${Object.keys(tools).length} offline tools: downloads/kreativ-pdf-offline.zip (${(archive.length / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
