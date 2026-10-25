const { createHash } = require('node:crypto');

function contentSecurityPolicy(scriptHashes = [], forHeader = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://static.cloudflareinsights.com ${scriptHashes.join(' ')}`.trim(),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
    "font-src 'self' data: blob: https://cdnjs.cloudflare.com https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self' https://cdn.jsdelivr.net https://cloudflareinsights.com https://static.cloudflareinsights.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(forHeader ? ["frame-ancestors 'self'"] : []),
  ].join('; ');
}

function scriptHashes(content) {
  return Array.from(content.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))
    .filter(([, attributes, body]) => !/\bsrc\s*=/.test(attributes) && body.trim() && !/application\/ld\+json/.test(attributes))
    .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
}

function secureDocument(content) {
  const policy = contentSecurityPolicy(scriptHashes(content));
  const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
  return content.replace(/(<meta charset="UTF-8"\s*\/>)/, `$1\n  ${tag}`);
}

module.exports = { contentSecurityPolicy, scriptHashes, secureDocument };
