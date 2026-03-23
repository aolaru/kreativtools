# Kreativ Tools

Kreativ Tools is a browser-based utility site for image, PDF, video, font, audio, and file workflows. The site includes dedicated tool pages, a Learn section with practical guides, a public Updates page, and a shared UI/metadata generation step to keep static pages consistent.

## Current version

- Current product version: `v0.9.2`
- Version source of truth: `package.json`
- Current release stage: pre-`1.0`, stable enough to promote, still actively evolving

## Current scope

### Main sections
- Home: product overview, featured workflows, and entry points into tools, Learn, and recent changes
- Tools directory: full listing of available tools
- Learn: practical how-to guides connected to real tools
- Updates: public product log for launches, UX updates, and design improvements

### Tool categories
- Image: crop, compress, resize, convert to WebP
- PDF: image to PDF, split PDF, merge PDF, compress PDF
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
- `scripts/sync-site.js`: shared metadata/header/footer generator
- `sitemap.xml`: canonical URL list
- `favicon.svg`: primary branded favicon

## Versioning

Use lightweight semantic versioning for the product:

- Patch: small fixes, copy changes, small UI polish, metadata cleanup, test-only maintenance
- Minor: new tools, meaningful UX improvements, new Learn article batches, structural site improvements
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
6. Optionally create a matching git tag like `v0.9.2`.

## Notes

- Favicon assets are available as SVG, `32x32`, `16x16`, and Apple touch icon variants.
- Legacy top-level `*.html` pages are kept as redirect aliases for compatibility.
- Playwright fixtures for PDF flows live in `tests/fixtures/`.
