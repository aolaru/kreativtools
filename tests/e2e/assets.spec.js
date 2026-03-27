const { test, expect } = require('@playwright/test');

const pages = [
  '/',
  '/image',
  '/image/crop',
  '/pdf',
  '/image/resize',
  '/image/compress',
  '/pdf/image-to-pdf',
  '/pdf/split',
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

    await page.goto(route, { waitUntil: 'domcontentloaded' });

    expect(cssJsResponses.length).toBeGreaterThan(0);
    for (const asset of cssJsResponses) {
      expect(
        asset.status,
        `Asset failed on ${route}: ${asset.url} returned ${asset.status}`
      ).toBeLessThan(400);
    }
  }
});

test('social preview assets and favicon assets resolve', async ({ page, baseURL }) => {
  const assets = ['/og-image.png', '/og-image.svg', '/favicon.svg', '/favicon-32x32.png', '/apple-touch-icon.png'];

  for (const asset of assets) {
    const response = await page.goto(`${baseURL}${asset}`);
    expect(response, `Missing response for ${asset}`).not.toBeNull();
    expect(response.status(), `Asset failed: ${asset} returned ${response.status()}`).toBeLessThan(400);
  }
});

test('key pages expose canonical and social metadata for their own routes', async ({ page }) => {
  const routes = ['/', '/learn/', '/studio/', '/studio/image-prep/', '/studio/pdf-delivery/', '/pdf/split/'];

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://kreativtools.com${route}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://kreativtools.com${route}`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://kreativtools.com/og-image.png');
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', 'https://kreativtools.com/og-image.png');
  }
});
