const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');

test('shared page generator does not add tracking scripts', () => {
  const generator = fs.readFileSync(path.join(root, 'scripts/sync-site.js'), 'utf8');
  assert.doesNotMatch(generator, /`\$\{prefix\}analytics\.js`/);
  assert.doesNotMatch(generator, /`\$\{prefix\}cookie-consent\.js`/);
  assert.doesNotMatch(generator, /googletagmanager\.com/);
});

test('Google Analytics implementation is not present', () => {
  assert.equal(fs.existsSync(path.join(root, 'analytics.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'cookie-consent.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'worker', 'analytics-worker.mjs')), false);
  assert.equal(fs.existsSync(path.join(root, 'ads.txt')), false);
  assert.equal(fs.existsSync(path.join(root, '.env.example')), false);
});

test('homepage has one generated breadcrumb navigation', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const breadcrumbs = home.match(/<nav class="breadcrumbs(?:\s+[^"]*)?" aria-label="Breadcrumb">/g) || [];
  assert.equal(breadcrumbs.length, 1);
});
