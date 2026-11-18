const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const JSZip = require('jszip');
const { validateCatalog, categories } = require('../../scripts/validate-samples');

test('public samples have valid metadata and no uncatalogued private files', async () => {
  const catalog = await validateCatalog();
  assert.equal(catalog.samples.length, 45);
  assert.deepEqual([...new Set(catalog.samples.map((item) => item.category))].sort(), [...categories].sort());
  assert.ok(catalog.samples.every((item) => item.access === 'free'));
  execFileSync(process.execPath, ['scripts/render-sample-pages.js', '--check']);
});

test('private packaging stays outside the website and includes a checksum manifest', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kreativ-qa-kit-'));
  try {
    const source = path.join(base, 'private');
    fs.mkdirSync(path.join(source, 'pdf'), { recursive: true });
    fs.writeFileSync(path.join(source, 'pdf', 'example.txt'), 'synthetic');
    fs.writeFileSync(path.join(source, 'kit-manifest.json'), JSON.stringify({ files: [{ path: 'pdf/example.txt', description: 'Test' }] }));
    const output = path.join(base, 'kit.zip');
    execFileSync(process.execPath, ['scripts/package-private-qa-kit.js', source, output]);
    const zip = await JSZip.loadAsync(fs.readFileSync(output));
    assert.equal(await zip.file('pdf/example.txt').async('string'), 'synthetic');
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    assert.equal(manifest.files[0].sizeBytes, 9);
    assert.match(manifest.files[0].sha256, /^[a-f0-9]{64}$/);
    const denied = spawnSync(process.execPath, ['scripts/package-private-qa-kit.js', process.cwd(), path.join(base, 'blocked.zip')]);
    assert.notEqual(denied.status, 0);
    assert.equal(fs.existsSync(path.join(base, 'blocked.zip')), false);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});
