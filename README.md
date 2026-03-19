# Kreativ Tools

Kreativ Tools is a browser-based utility site for image, PDF, video, font, audio, and file workflows. The site includes dedicated tool pages, a Learn section with practical guides, a public changelog, and a shared UI/metadata generation step to keep static pages consistent.

## Current scope

### Main sections
- Home: product overview, featured workflows, and entry points into tools, Learn, and recent changes
- Tools directory: full listing of available tools
- Learn: practical how-to guides connected to real tools
- Changes: public changelog for launches, UX updates, and design improvements

### Tool categories
- Image: compress, resize, convert to WebP
- PDF: image to PDF, merge PDF, compress PDF
- Video: convert to WEBM, extract thumbnail, trim video
- Fonts: webfont convert, preview, CSS generator
- Audio: convert to WAV, trim audio, adjust volume
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
- `changes/index.html`: canonical changelog page
- `styles.css`: shared visual system
- `theme.js`: theme toggle and share menu behavior
- `scripts/sync-site.js`: shared metadata/header/footer generator
- `sitemap.xml`: canonical URL list
- `favicon.svg`: primary branded favicon

## Notes

- Favicon assets are available as SVG, `32x32`, `16x16`, and Apple touch icon variants.
- Legacy top-level `*.html` pages are kept as redirect aliases for compatibility.
- Playwright fixtures for PDF flows live in `tests/fixtures/`.
