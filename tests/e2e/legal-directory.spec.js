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
  '/video/thumbnail',
  '/video/trim',
  '/fonts/webfont-convert',
  '/fonts/preview',
  '/audio/to-wav',
  '/audio/to-mp3',
  '/audio/trim',
  '/audio/volume',
  '/file/xml-to-csv',
  '/file/json-to-csv',
  '/file/csv-to-json',
  '/changes',
  '/workflows',
  '/workflows/image-prep',
  '/workflows/pdf-delivery',
  '/workflows/audio-delivery',
  '/tools',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
];

test('all tools directory shows cards that link to tools', async ({ page }) => {
  await page.goto('/tools');
  const cards = page.locator('.tool-card');
  await expect(cards).toHaveCount(26);

  await expect(page.locator('.tools-upsell').getByRole('link', { name: 'Read the chooser guide' })).toBeVisible();
  await expect(page.locator('.tool-card[href="/workflows/image-prep/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/workflows/pdf-delivery/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/workflows/audio-delivery/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/crop/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/compress/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/resize/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/to-webp/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/image-to-pdf/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/to-docx/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/fill-sign/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/split/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/merge/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/pdf/compress/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/video/convert-webm/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/video/thumbnail/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/video/trim/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/fonts/webfont-convert/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/fonts/preview/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/fonts/css-generator/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/to-wav/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/to-mp3/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/trim/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/volume/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/file/xml-to-csv/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/file/json-to-csv/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/file/csv-to-json/"]')).toBeVisible();
});

test('all tools directory supports search and media filters', async ({ page }) => {
  await page.goto('/tools');
  const visibleCards = page.locator('.category-grid .tool-card:not([hidden])');

  await expect(visibleCards).toHaveCount(26);
  await expect(page.locator('.tool-filter-button')).toHaveCount(6);
  await page.getByRole('button', { name: 'Quick Tools' }).click();
  await expect(visibleCards).toHaveCount(23);
  await expect(page.locator('.tool-card[href="/image/compress/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/workflows/image-prep/"]')).toBeHidden();

  await page.getByRole('button', { name: 'Guided' }).click();
  await expect(visibleCards).toHaveCount(3);
  await expect(page.locator('.tool-card[href="/workflows/image-prep/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/image/compress/"]')).toBeHidden();

  await page.getByRole('button', { name: 'PDF' }).click();
  await expect(visibleCards).toHaveCount(6);
  await expect(page.locator('.tool-card[href="/pdf/merge/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="/audio/to-mp3/"]')).toBeHidden();

  await page.fill('#toolDirectorySearch', 'signature');
  await expect(visibleCards).toHaveCount(1);
  await expect(page.locator('.tool-card[href="/pdf/fill-sign/"]')).toBeVisible();
  await expect(page.locator('#toolDirectorySummary')).toContainText('Showing 1 of 26');

  await page.getByRole('button', { name: 'All' }).click();
  await page.fill('#toolDirectorySearch', 'zzz-no-match');
  await expect(page.locator('#toolsEmptyState')).toBeVisible();
});

test('thin utility pages include practical guide sections', async ({ page }) => {
  const guidePages = [
    ['/audio/trim', 'Audio trim guide'],
    ['/audio/volume', 'Audio volume guide'],
    ['/video/trim', 'Video trim guide'],
    ['/video/convert-webm', 'WEBM conversion guide'],
    ['/video/thumbnail', 'Video thumbnail guide'],
    ['/file/json-to-csv', 'JSON to CSV guide'],
    ['/file/csv-to-json', 'CSV to JSON guide'],
    ['/fonts/preview', 'Font preview guide'],
    ['/pdf/image-to-pdf', 'Image to PDF guide'],
  ];

  for (const [route, heading] of guidePages) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Best uses' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Privacy and limits' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Next step' })).toBeVisible();
  }
});

test('category pages explain which tool to use first', async ({ page }) => {
  const categoryPages = [
    ['/image', 'Which image tool should I use?'],
    ['/pdf', 'Which PDF tool should I use?'],
    ['/video', 'Which video tool should I use?'],
    ['/fonts', 'Which font tool should I use?'],
    ['/audio', 'Which audio tool should I use?'],
    ['/file', 'Which data converter should I use?'],
  ];

  for (const [route, heading] of categoryPages) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Privacy and limits' })).toBeVisible();
    await expect(page.locator('.tool-guide-card')).toHaveCount(6);
  }
});

test('footer legal links exist across all pages', async ({ page }) => {
  for (const route of pages) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('footer a[href="/privacy/"]')).toBeVisible();
    await expect(page.locator('footer a[href="/terms/"]')).toBeVisible();
    await expect(page.locator('footer a[href="/about/"]')).toBeVisible();
    await expect(page.locator('script[src$="cookie-consent.js"]')).toHaveCount(1);
  }
});

test('trust and legal pages include visitor trust disclosures', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: 'Independent browser tools for practical file work' })).toBeVisible();
  await expect(page.getByText('Any future advertising will stay separate from tool buttons')).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  await expect(page.locator('text=Last updated:')).toBeVisible();
  await expect(page.getByText('Advertising and Google AdSense')).toBeVisible();
  await expect(page.getByText('Google-certified consent management platform')).toBeVisible();
  await expect(page.locator('a[href="https://policies.google.com/technologies/partner-sites"]')).toBeVisible();

  await page.goto('/terms');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeVisible();
  await expect(page.locator('text=Last updated:')).toBeVisible();
  await expect(page.getByText('Ads must not be interpreted as endorsements')).toBeVisible();
});
