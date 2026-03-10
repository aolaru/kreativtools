const { test, expect } = require('@playwright/test');

const pages = [
  '/',
  '/image/resize',
  '/image/compress',
  '/pdf/image-to-pdf',
  '/pdf/merge',
  '/video/convert-webm',
  '/fonts/webfont-convert',
  '/audio/to-wav',
  '/file/xml-to-csv',
  '/changes',
  '/tools',
  '/privacy',
  '/terms',
  '/contact',
];

test('all pages load CSS/JS assets without 404/500', async ({ page }) => {
  for (const route of pages) {
    const cssJsResponses = [];
    page.removeAllListeners('response');
    page.on('response', (response) => {
      const type = response.request().resourceType();
      if (type === 'stylesheet' || type === 'script') {
        cssJsResponses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto(route, { waitUntil: 'networkidle' });

    expect(cssJsResponses.length).toBeGreaterThan(0);
    for (const asset of cssJsResponses) {
      expect(
        asset.status,
        `Asset failed on ${route}: ${asset.url} returned ${asset.status}`
      ).toBeLessThan(400);
    }
  }
});
