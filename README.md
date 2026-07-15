# Kreativ Tools

Kreativ Tools is a browser-based utility site for image, PDF, video, font, audio, and file workflows. The site includes dedicated tool pages, guided workflows inside the Tools directory, a focused Learn section, a public Updates page, and a shared UI/metadata generation step to keep static pages consistent.

## Current version

- Current product version: `v0.9.8`
- Version source of truth: `package.json`
- Current release stage: pre-`1.0`, stable enough to promote, still actively evolving

## Current scope

### Main sections
- Home: simplified job-first router into the right tool, guided workflow, or Learn path
- Tools directory: primary action hub for quick tools and guided workflows
- Learn: compact start-here guide hub with focused follow-up articles in an archive
- Updates: public product log for launches, UX updates, and design improvements
- Workflows: short explainer route for the guided workflow format, with Image Prep, PDF Delivery, and Audio Delivery listed inside the Tools directory
- About, Privacy, Terms, and Contact: trust and policy pages linked site-wide for transparency and monetization readiness

### Tool categories
- Image: crop, compress, resize, convert to WebP
- PDF: image to PDF, fill and sign PDF, split PDF, merge PDF, compress PDF
- Video: convert to WEBM, extract thumbnail, trim video
- Fonts: webfont convert, preview, CSS generator
- Audio: convert to WAV, convert to MP3, trim audio, adjust volume
- File: XML to CSV, JSON to CSV, CSV to JSON

### Hero Learn workflows
- Compress a PDF for email
- Merge PDF files in the right order
- Convert OTF or TTF to WOFF2
- Compress images for faster websites
- Resize images for Shopify or WooCommerce

## Run locally

Serve the project root with any static file server.

## Shared generation

Canonical pages live at clean routes such as `section/index.html` and `tool/index.html`.

Use `npm run sync:site` after shared layout or metadata changes. The sync script:
- normalizes title, description, canonical, Open Graph, and Twitter metadata on public pages
- applies the shared header and footer markup across canonical pages
- regenerates legacy `*.html` route aliases as redirect stubs to the clean routes

## Tests

- Smoke tests: `bash tests/smoke.sh`
- Unit tests: `npm run test:unit`
- E2E tests:
  1. `npm install`
  2. `npx playwright install`
  3. `npm run test:e2e`
- Full test run: `npm test`
- Lighthouse CI: `npm run test:lighthouse`

## Key files

- `index.html`: homepage
- `tools/index.html`: tools directory
- `learn/index.html`: canonical Learn landing page
- `changes/index.html`: canonical Updates page
- `styles.css`: shared visual system
- `theme.js`: theme toggle and share menu behavior
- `analytics.js`: Google Analytics plus anonymous product analytics event forwarding
- `worker/`: Cloudflare Worker and D1 schema for private product analytics
- `scripts/sync-site.js`: shared metadata/header/footer generator
- `sitemap.xml`: canonical URL list
- `favicon.svg`: primary branded favicon

## Private Product Analytics

The static site emits anonymous product events from `analytics.js` after analytics consent. Google Analytics receives the broad event stream, and `/api/analytics/events` can receive the same privacy-safe events for the owned Cloudflare D1 dashboard.

The Worker implementation lives in `worker/`:

- `worker/analytics-worker.mjs`: event ingest, protected JSON API, and private HTML dashboard
- `worker/schema.sql`: D1 table and indexes
- `worker/wrangler.toml.example`: deployment template

Use `worker/README.md` for setup commands. The dashboard is designed for metrics like most used tools, upload starts, export/download completion, output formats, size buckets, and daily/weekly trends.

## Advertising readiness

- Do not add AdSense tags until the real publisher ID is available.
- `ads.txt` is present as a documented placeholder so the route returns `200`; replace the example with the real `google.com, pub-...` record only after AdSense provides the exact publisher ID.
- To generate AdSense head tags, run `KREATIVTOOLS_ADSENSE_PUBLISHER_ID=ca-pub-... npm run sync:site` after the real publisher ID is available.
- For EEA, UK, and Switzerland visitors, configure Google AdSense Privacy & messaging or another Google-certified CMP before serving ads.
- Keep ad slots clearly separated from tool buttons, download actions, cards, and form controls.

## Security headers

- `_headers` contains the intended security-header baseline for hosts or CDNs that support Netlify-style header files.
- GitHub Pages does not serve custom headers from `_headers`; use a CDN/proxy such as Cloudflare if those headers must appear on the live response.
- Canonical pages still include a `strict-origin-when-cross-origin` referrer meta tag so the static HTML has a privacy-safe browser fallback.

## Versioning

Use lightweight semantic versioning for the product:

- Patch: single shipped tool or workflow, small fixes, copy changes, small UI polish, metadata cleanup, test-only maintenance
- Minor: grouped tool or workflow expansions, meaningful UX improvements across multiple areas, new Learn article batches, structural site improvements
- Major: a real public milestone, major product repositioning, or a release you want to promote as a stable foundation

For Kreativ Tools right now:

- stay in `0.x` while the product is still expanding quickly
- use `1.0.0` only when the core tool set, site structure, and public positioning feel stable enough for a stronger launch push

## Release workflow

1. Ship the product changes.
2. Update the Updates page with the important release notes.
3. Bump the version:
   - `npm run version:patch`
   - `npm run version:minor`
   - `npm run version:major`
4. Re-run:
   - `bash tests/smoke.sh`
   - `npm run test:e2e`
5. Commit the version bump and release notes.
6. Optionally create a matching git tag like `v0.9.8`.

## Notes

- Favicon assets are available as SVG, `32x32`, `16x16`, and Apple touch icon variants.
- Legacy top-level `*.html` pages are kept as redirect aliases for compatibility.
- Playwright fixtures for PDF flows live in `tests/fixtures/`.
