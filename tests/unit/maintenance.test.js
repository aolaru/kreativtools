const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { scriptHashes } = require('../../scripts/security-policy');

const root = path.resolve(__dirname, '../..');
const ignored = new Set(['.git', 'node_modules', 'vendor', 'dist', 'downloads', '.playwright-mcp', 'test-results', 'playwright-report', '.lighthouseci']);

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (ignored.has(entry.name)) return [];
    if (entry.isDirectory()) return htmlFiles(file);
    return entry.name.endsWith('.html') ? [file] : [];
  });
}

test('every HTML route has a strict CSP allowing exactly its trusted inline scripts', () => {
  const files = htmlFiles(root);
  assert.ok(files.length > 100);
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    assert.ok(policy, file);
    const scripts = policy.split(';').find((directive) => directive.trim().startsWith('script-src '));
    assert.doesNotMatch(scripts, /'unsafe-inline'|'unsafe-eval'/, file);
    assert.match(policy, /script-src-attr 'none'/, file);
    assert.match(policy, /object-src 'none'/, file);
    for (const hash of scriptHashes(html)) assert.ok(scripts.includes(hash), `${file}: ${hash}`);
    const expectedHashes = scriptHashes(html).sort();
    assert.deepEqual(scripts.match(/'sha256-[^']+'/g)?.sort() || [], expectedHashes, file);
  }
});

test('PDF previews use a pinned local renderer with eval disabled', () => {
  const engine = fs.readFileSync(path.join(root, 'pdf-engine.mjs'), 'utf8');
  assert.match(engine, /isEvalSupported: false/);
  assert.match(engine, /vendor\/pdfjs\/pdf.min.mjs/);
  for (const route of ['fill-sign', 'to-docx']) {
    const html = fs.readFileSync(path.join(root, 'pdf', route, 'index.html'), 'utf8');
    assert.match(html, /loadPdfPreview/);
    assert.doesNotMatch(html, /pdfjs-dist@3|pdfjsLib.getDocument/);
  }
});

test('publishing depends on successful tests and Lighthouse, with limited deployment permissions', () => {
  const pages = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
  assert.match(pages, /verify:\s+uses: \.\/\.github\/workflows\/test.yml/);
  assert.match(pages, /lighthouse:\s+uses: \.\/\.github\/workflows\/lighthouse.yml/);
  assert.match(pages, /deploy:\s+needs: \[verify, lighthouse\]\s+permissions:/);
  assert.doesNotMatch(pages, /if:.*always\(/);
  for (const workflow of ['test', 'lighthouse']) {
    assert.match(fs.readFileSync(path.join(root, `.github/workflows/${workflow}.yml`), 'utf8'), /workflow_call:/);
  }
});

test('generation is repeatable and only changed content receives a new modification date', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'kreativ-dates-'));
  try {
    fs.cpSync(root, temporary, { recursive: true, filter: (file) => !ignored.has(path.basename(file)) });
    const run = () => execFileSync(process.execPath, ['scripts/sync-site.js'], { cwd: temporary, stdio: 'pipe' });
    const stateFile = path.join(temporary, 'scripts/page-dates.json');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const published = state['/'].published;
    state['/'].modified = '2026-01-01';
    fs.writeFileSync(stateFile, JSON.stringify(state));
    run();
    const first = fs.readFileSync(stateFile, 'utf8');
    const sitemap = fs.readFileSync(path.join(temporary, 'sitemap.xml'), 'utf8');
    assert.equal(JSON.parse(first)['/'].modified, '2026-01-01');
    run();
    assert.equal(fs.readFileSync(stateFile, 'utf8'), first);
    assert.equal(fs.readFileSync(path.join(temporary, 'sitemap.xml'), 'utf8'), sitemap);
    const home = path.join(temporary, 'index.html');
    fs.writeFileSync(home, fs.readFileSync(home, 'utf8').replace('</main>', '<p>Changed content for date regression.</p></main>'));
    run();
    const changed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date());
    assert.equal(changed['/'].modified, today);
    assert.equal(changed['/'].published, published);
    assert.deepEqual(changed['/privacy/'], state['/privacy/']);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
