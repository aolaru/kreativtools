const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('offline click worker accepts only the expected method, path, and origin', async () => {
  const { default: worker } = await import('../../worker/offline-click.mjs');
  const request = (method, path, origin) => new Request(`https://counter.example${path}`, { method, headers: origin ? { Origin: origin } : {} });
  assert.equal((await worker.fetch(request('POST', '/click', 'https://kreativtools.com'))).status, 204);
  for (const input of [request('GET', '/click', 'https://kreativtools.com'), request('POST', '/other', 'https://kreativtools.com'), request('POST', '/click', 'https://example.com'), request('POST', '/click')]) {
    assert.equal((await worker.fetch(input)).status, 404);
  }
});

test('download counter sends an empty beacon only on click and tolerates failure', () => {
  const source = fs.readFileSync('offline-download-count.js', 'utf8');
  let listener;
  let calls = 0;
  const document = { querySelectorAll: () => [{ addEventListener: (name, fn) => { assert.equal(name, 'click'); listener = fn; } }] };
  const navigator = { sendBeacon: (...args) => { calls++; assert.deepEqual(args, ['https://kreativtools-offline-click-counter.andrei-olaru.workers.dev/click']); throw new Error('blocked'); } };
  vm.runInNewContext(source, { document, navigator });
  assert.equal(calls, 0);
  assert.doesNotThrow(() => listener());
  assert.equal(calls, 1);
});
