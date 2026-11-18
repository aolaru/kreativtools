// Private source and output must remain outside the static website and Git checkout.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const JSZip = require('jszip');
const repo = fs.realpathSync(path.resolve(__dirname, '..'));
const outside = (value) => value !== repo && !value.startsWith(`${repo}${path.sep}`);

async function main() {
  const [sourceArg, outputArg] = process.argv.slice(2);
  if (!sourceArg || !outputArg) throw new Error('Usage: node scripts/package-private-qa-kit.js /absolute/private-directory /absolute/output.zip');
  if (!path.isAbsolute(sourceArg) || !path.isAbsolute(outputArg) || path.extname(outputArg).toLowerCase() !== '.zip') throw new Error('Use absolute paths and a .zip output.');
  const source = fs.realpathSync(sourceArg);
  const outputDir = fs.realpathSync(path.dirname(outputArg));
  const output = path.join(outputDir, path.basename(outputArg));
  if (!outside(source) || !outside(outputDir)) throw new Error('Private input and output must both be outside the website checkout.');
  const definitions = JSON.parse(fs.readFileSync(path.join(source, 'kit-manifest.json'), 'utf8'));
  if (!Array.isArray(definitions.files) || !definitions.files.length) throw new Error('kit-manifest.json must contain a non-empty files array.');
  const zip = new JSZip(), manifest = [], seen = new Set();
  for (const record of definitions.files) {
    if (!record || typeof record.path !== 'string' || typeof record.description !== 'string' || !record.description.trim() || !/^[a-zA-Z0-9_.\/-]+$/.test(record.path) || record.path.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Invalid private file entry.');
    if (record.path === 'manifest.json' || seen.has(record.path)) throw new Error(`Reserved or duplicate private path: ${record.path}`);
    const full = fs.realpathSync(path.join(source, record.path));
    if (!full.startsWith(`${source}${path.sep}`) || !outside(full) || !fs.statSync(full).isFile()) throw new Error(`Invalid private file path: ${record.path}`);
    const data = fs.readFileSync(full);
    seen.add(record.path);
    zip.file(record.path, data, { date: new Date('2020-01-01T00:00:00Z'), createFolders: false });
    manifest.push({ path: record.path, description: record.description, sizeBytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  zip.file('manifest.json', JSON.stringify({ version: 1, files: manifest }, null, 2) + '\n', { date: new Date('2020-01-01T00:00:00Z') });
  fs.writeFileSync(output, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), { flag: 'wx' });
  console.log(`Packaged ${manifest.length} private files outside the website: ${output}`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
