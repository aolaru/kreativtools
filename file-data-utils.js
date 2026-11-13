(function (root) {
  const MAX_INPUT_BYTES = 5 * 1024 * 1024;
  const MAX_TABLE_CELLS = 1000000;

  function checkTableSize(rows, columns) {
    if (rows * columns > MAX_TABLE_CELLS) throw new Error('This table exceeds the 1 million cell limit. Split the file into smaller tables.');
  }

  function escapeCsv(value, spreadsheetMode = true) {
    let text = String(value ?? '');
    const dangerous = /^[\s\u0000-\u001f]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text);
    if (spreadsheetMode && dangerous) text = `\t${text}`;
    if ((spreadsheetMode && dangerous) || /[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  }

  function parseJsonSafely(text) {
    const parsed = JSON.parse(text, (key, value) => {
      if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) {
        throw new Error('JSON contains a number outside the safe integer range. Put large IDs in quotes before converting.');
      }
      return value;
    });
    const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === '-' || (char >= '0' && char <= '9')) {
        numberPattern.lastIndex = i;
        const literal = numberPattern.exec(text)[0];
        const mantissa = literal.split(/[eE]/)[0];
        const significant = mantissa.replace(/[^0-9]/g, '').replace(/^0+|0+$/g, '');
        if ((/[.eE]/.test(literal) && significant.length > 15) ||
            (Number(literal) === 0 && /[1-9]/.test(mantissa))) {
          throw new Error('JSON contains a number that may lose precision. Quote it as a string before converting.');
        }
        i = numberPattern.lastIndex - 1;
      }
    }
    return parsed;
  }

  const api = { MAX_INPUT_BYTES, MAX_TABLE_CELLS, checkTableSize, escapeCsv, parseJsonSafely };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.kreativFileData = api;
})(typeof window !== 'undefined' ? window : null);
