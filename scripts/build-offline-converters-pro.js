const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const esbuild = require('esbuild');
const JSZip = require('jszip');

const root = path.resolve(__dirname, '..');
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination)) throw new Error('Provide an absolute output ZIP path outside the website checkout.');
const parent = fs.realpathSync(path.dirname(destination));
const repository = fs.realpathSync(root);
const inside = (base, target) => target === base || target.startsWith(`${base}${path.sep}`);
if (inside(repository, parent) || fs.existsSync(destination)) throw new Error('Output must be outside the website checkout and must not already exist.');

const groups = [
  ['Images', [
    ['/image/crop/', 'image-crop.html', 'Image Crop'], ['/image/compress/', 'image-compress.html', 'Image Compress'],
    ['/image/resize/', 'image-resize.html', 'Image Resize and Convert'], ['/image/to-webp/', 'image-webp.html', 'Image to WebP'],
    ['/pdf/image-to-pdf/', 'image-pdf.html', 'Image to PDF'],
  ]],
  ['Audio', [
    ['/audio/to-wav/', 'audio-wav.html', 'Audio to WAV'], ['/audio/to-mp3/', 'audio-mp3.html', 'Audio to MP3'],
    ['/audio/trim/', 'audio-trim.html', 'Audio Trim'], ['/audio/volume/', 'audio-volume.html', 'Audio Volume'],
  ]],
  ['Video', [
    ['/video/convert-webm/', 'video-webm.html', 'Video to WEBM'], ['/video/thumbnail/', 'video-thumbnail.html', 'Video Thumbnail'],
    ['/video/trim/', 'video-trim.html', 'Video Trim'],
  ]],
  ['Fonts', [
    ['/fonts/webfont-convert/', 'font-convert.html', 'Font to Webfont'], ['/fonts/preview/', 'font-preview.html', 'Font Preview'],
    ['/fonts/css-generator/', 'font-css.html', 'Font CSS Generator'],
  ]],
  ['Data', [
    ['/file/json-validator/', 'json-validator.html', 'JSON Validator and Formatter'], ['/file/xml-to-csv/', 'xml-csv.html', 'XML to CSV'],
    ['/file/json-to-csv/', 'json-csv.html', 'JSON to CSV'], ['/file/csv-to-json/', 'csv-json.html', 'CSV to JSON'],
  ]],
];
const entries = groups.flatMap(([, tools]) => tools);
const routeMap = new Map(entries.map(([route, file]) => [route, file]));
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const script = (code) => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;
const hash = (body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
const styleFile = path.join(root, 'styles.css');
const style = fs.readFileSync(styleFile, 'utf8').replace(/url\(['"]?([^)'"?#]+)(?:[?#][^)'" ]*)?['"]?\)/g, (_, asset) => {
  const file = path.resolve(path.dirname(styleFile), asset);
  const mime = file.endsWith('.woff2') ? 'font/woff2' : file.endsWith('.ttf') ? 'font/ttf' : 'image/svg+xml';
  return `url('data:${mime};base64,${fs.readFileSync(file).toString('base64')}')`;
});
const styleTag = `<style>${style}\n.fa-solid, .fa-brands, .fa-regular { display: none; }</style>`;

function secure(html) {
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, body]) => hash(body));
  const policy = `default-src 'none'; script-src blob: 'wasm-unsafe-eval' ${hashes.join(' ')}; script-src-attr 'none'; style-src 'unsafe-inline'; font-src data: blob:; img-src data: blob:; media-src blob:; connect-src blob: data:; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'`;
  return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="${policy}" />`);
}

async function bundle(options) {
  const result = await esbuild.build({ ...options, bundle: true, minify: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', logLevel: 'silent' });
  return result.outputFiles[0].text;
}

async function main() {
  const zip = new JSZip();
  const add = (name, content) => zip.file(name, content, { date: new Date('2026-01-01T00:00:00Z') });
  for (const [route, name, label] of entries) {
    const file = path.join(root, route.slice(1), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    const scripts = [];
    for (const [, attributes, originalBody] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(attributes)) continue;
      const src = attributes.match(/src="([^"]+)"/)?.[1];
      if (src?.startsWith('https:') || src?.includes('github-pages-prefix') || src?.includes('offline-download-count')) continue;
      if (src) {
        const source = path.resolve(path.dirname(file), src);
        if (!inside(root, source)) throw new Error(`Script outside checkout: ${src}`);
        scripts.push(script(/type="module"/.test(attributes) ? await bundle({ entryPoints: [source] }) : fs.readFileSync(source, 'utf8')));
      } else if (originalBody.trim()) {
        let body = originalBody;
        if (route === '/pdf/image-to-pdf/' && body.includes('const preparePdf = () =>')) {
          const loaded = 'prepareButton.disabled = false;\n        downloadButton.disabled = false;';
          const ready = "drawPreview(sourceImage);\n      setStatus('PDF is ready. Download when ready.');";
          if (!body.includes(loaded) || !body.includes(ready)) throw new Error('Image-to-PDF export handling changed; update the offline adapter.');
          body = body.replace(loaded, 'prepareButton.disabled = false;\n        downloadButton.disabled = true;')
            .replace(ready, "drawPreview(sourceImage);\n      downloadButton.disabled = false;\n      setStatus('PDF is ready. Download when ready.');");
        }
        if (/type="module"/.test(attributes)) {
          const wasm = fs.readFileSync(path.join(root, 'vendor/fonteditor/woff2.wasm')).toString('base64');
          body = body.replace("new URL('../../vendor/fonteditor/woff2.wasm', import.meta.url).href", JSON.stringify(`data:application/wasm;base64,${wasm}`));
          body = await bundle({ stdin: { contents: body, resolveDir: path.dirname(file), sourcefile: file, loader: 'js' } });
        }
        scripts.push(script(body));
      }
    }
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<head>[\s\S]*?<\/head>/, () => `<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${label} | Kreativ Offline Converters PRO</title>${styleTag}</head>`)
      .replace(/<header class="site-header">[\s\S]*?<\/header>/, '<header class="site-header"><a class="brand" href="index.html">Kreativ Offline Converters PRO</a><button id="themeToggle" type="button" class="icon-toggle" aria-label="Toggle dark mode">Theme</button></header>')
      .replace(/<nav class="breadcrumbs[\s\S]*?<\/nav>/, '')
      .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, '')
      .replace(/<a\b([^>]*href="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/g, (match, attributes, href, body) => {
        if (href === 'index.html' || href.startsWith('#')) return match;
        if (routeMap.has(href)) return `<a href="${routeMap.get(href)}">${body}</a>`;
        return body;
      })
      .replace('</body>', () => `${scripts.join('\n')}\n</body>`);
    add(name, secure(html));
  }
  const sections = groups.map(([group, tools]) => `<section class="home-section"><h2>${group}</h2><div class="tools-grid">${tools.map(([, file, label]) => `<a class="tool-card" href="${file}"><h3>${label}</h3><p>Open tool</p></a>`).join('')}</div></section>`).join('\n');
  add('index.html', secure(`<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Kreativ Offline Converters PRO</title>${styleTag}</head><body><main class="container"><section class="hero"><h1>Kreativ Offline Converters PRO</h1><p>File tools that run in your desktop browser without an internet connection or account.</p></section>${sections}<p>Extract the entire ZIP before opening this page. Browser codec support and file-size limits vary; video exports are silent. Keep your original files.</p></main></body></html>`));
  add('README.txt', 'Kreativ Offline Converters PRO\n\nExtract the complete ZIP, then open index.html in a current desktop browser. No server, account, or internet connection is required for file processing. Includes image, audio, video, font, and data tools.\n\nFormats and maximum sizes depend on each tool and browser. Video to WEBM and Video Trim output silent video; audio is not preserved. Font licenses may restrict conversion or redistribution. Keep original files.\n\nThis package contains open-source software. See LICENSE.txt, THIRD_PARTY_NOTICES.txt and the included dependency licenses. The source project is available at https://github.com/aolaru/kreativtools. LameJS is LGPL-3.0; see the notices and upstream source at https://github.com/zhuker/lamejs.\n');
  for (const [name, source] of Object.entries({
    'LICENSE.txt': 'LICENSE', 'THIRD_PARTY_NOTICES.txt': 'THIRD_PARTY_NOTICES.md',
    'JSZIP-LICENSE.txt': 'vendor/JSZIP-LICENSE', 'JSPDF-LICENSE.txt': 'vendor/JSPDF-LICENSE',
    'PAPAPARSE-LICENSE.txt': 'vendor/PAPAPARSE-LICENSE', 'FONTEDITOR-LICENSE.txt': 'vendor/fonteditor/LICENSE',
    'PAKO-LICENSE.txt': 'vendor/fonteditor/PAKO-LICENSE', 'XMLDOM-LICENSE.txt': 'vendor/fonteditor/XMLDOM-LICENSE',
    'LGPL-3.0.txt': 'vendor/LGPL-3.0.txt', 'GPL-3.0.txt': 'vendor/GPL-3.0.txt',
    'SPACE-GROTESK-LICENSE.txt': 'vendor/fonts/SPACE-GROTESK-LICENSE', 'FONTAWESOME-LICENSE.txt': 'vendor/fontawesome/LICENSE.txt',
  })) add(name, read(source));
  const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.writeFileSync(path.join(parent, path.basename(destination)), archive, { flag: 'wx', mode: 0o600 });
  console.log(`Built ${entries.length} tools: ${destination} (${(archive.length / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
