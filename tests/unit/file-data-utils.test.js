const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escapeCsv, parseJsonSafely, checkTableSize, MAX_INPUT_BYTES } = require('../../file-data-utils.js');

test('CSV quotes delimiters and carriage returns and protects formula-like cells', () => {
  assert.equal(escapeCsv('hello\rworld', false), '"hello\rworld"');
  assert.equal(escapeCsv('a,"b"', false), '"a,""b"""');
  for (const value of ['=1+2', '+cmd', '-1', '@value', '  =SUM(A1)', '\tformula', '＝1']) {
    assert.equal(escapeCsv(value, true), `"\t${value}"`);
    assert.equal(escapeCsv(value, false), /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
  }
  assert.equal(MAX_INPUT_BYTES, 5 * 1024 * 1024);
  assert.doesNotThrow(() => checkTableSize(1000, 1000));
  assert.throws(() => checkTableSize(1001, 1000), /1 million cell limit/);
});

test('JSON parser rejects unsafe integer and non-finite numbers before conversion', () => {
  assert.throws(() => parseJsonSafely('[{"id":9007199254740993}]'), /safe integer/);
  assert.throws(() => parseJsonSafely('[{"id":1e1000}]'), /safe integer/);
  assert.throws(() => parseJsonSafely('[{"id":9007199254740991.1}]'), /precision/);
  assert.throws(() => parseJsonSafely('[{"id":1e-400}]'), /precision/);
  assert.throws(() => parseJsonSafely('[{"id":1.234567890123456}]'), /precision/);
  assert.deepEqual(parseJsonSafely('[{"id":"9007199254740993","n":9007199254740991}]'), [{ id: '9007199254740993', n: 9007199254740991 }]);
});
