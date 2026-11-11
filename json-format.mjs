export const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_FORMATTED_LENGTH = 8 * 1024 * 1024;

export function validateJson(text) {
  if (new TextEncoder().encode(text).length > MAX_JSON_BYTES) throw new Error('JSON exceeds the 2 MB input limit.');
  if (!text.trim()) throw new Error('Enter JSON first.');
  JSON.parse(text);
}

// Preserve literal values, including large numbers, duplicate keys and escape sequences.
export function formatJson(text, pretty = true) {
  validateJson(text);
  let result = '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  const append = (value) => {
    if (result.length + value.length > MAX_FORMATTED_LENGTH) throw new Error('Formatted output is too large. Try minifying instead.');
    result += value;
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      append(char);
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; append(char); continue; }
    if (' \t\r\n'.includes(char)) continue;
    if (!pretty) { append(char); continue; }
    if (char === '{' || char === '[') {
      append(char);
      depth += 1;
      if (depth > 256) throw new Error('JSON is too deeply nested to format. Try minifying instead.');
      let next = i + 1;
      while (' \t\r\n'.includes(text[next]) && next < text.length) next += 1;
      if (text[next] !== '}' && text[next] !== ']') append(`\n${'  '.repeat(depth)}`);
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (!result.endsWith('{') && !result.endsWith('[')) append(`\n${'  '.repeat(depth)}`);
      append(char);
    } else if (char === ',') append(`,\n${'  '.repeat(depth)}`);
    else if (char === ':') append(': ');
    else append(char);
  }
  if (new TextEncoder().encode(result).length > MAX_JSON_BYTES) throw new Error('Formatted output exceeds the 2 MB limit. Try minifying instead.');
  return result;
}
