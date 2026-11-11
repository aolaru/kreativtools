const { test } = require('node:test');
const assert = require('node:assert/strict');

test('JSON formatter preserves literal values and formats nested structures', async () => {
  const { formatJson } = await import('../../json-format.mjs');
  const input = '{"n":900719925474099312345,"a":[],"o":{},"a":"escaped \\\" quote","x":[true,null]}';
  const formatted = formatJson(input);
  assert.match(formatted, /900719925474099312345/);
  assert.equal(formatJson(formatted, false), input);
  assert.equal(formatJson(' { "a" : [ 1, 2 ] } '), '{\n  "a": [\n    1,\n    2\n  ]\n}');
  assert.equal(formatJson('" a b "', false), '" a b "');
});

test('JSON formatter rejects malformed, oversized and deeply nested input', async () => {
  const { formatJson, validateJson, MAX_JSON_BYTES } = await import('../../json-format.mjs');
  assert.throws(() => validateJson('{"x":}'));
  assert.throws(() => validateJson(''));
  assert.throws(() => validateJson(' '.repeat(MAX_JSON_BYTES + 1)), /2 MB/);
  assert.throws(() => formatJson('['.repeat(257) + '0' + ']'.repeat(257)), /deeply nested/);
  assert.equal(formatJson('['.repeat(257) + '0' + ']'.repeat(257), false).length, 515);
  assert.throws(() => formatJson('[' + '0,'.repeat(450000) + '0]'), /2 MB limit/);
});
