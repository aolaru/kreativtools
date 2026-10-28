# Kreativ Tools

Kreativ Tools is a privacy-first static website of browser-based utilities for image, PDF, video, font, audio, and file workflows. Files are processed locally in the browser by the tools; Cloudflare measures aggregate visits and offline download-link clicks. There is no file-upload backend.

The project is in maintenance mode. It is a good base for a private tool library, a client-facing utility site, or a focused fork that keeps only the tools you need. Small fixes, compatibility improvements, accessibility work, and documentation corrections are welcome.

**Live site:** [kreativtools.com](https://kreativtools.com/)

## Reuse

This project is available under the [MIT License](LICENSE). You may use, modify, and distribute the project, including in commercial work, provided the license notice is retained. See [CONTRIBUTING.md](CONTRIBUTING.md) for the maintenance scope and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled dependencies that carry their own terms.

## Current version

- Current product version: `v0.9.8`
- Version source of truth: `package.json`
- Current release stage: maintenance mode; stable tools remain online without planned catalogue expansion

## Current scope

### Main sections
- Home: simplified job-first router into the right focused tool or Learn path
- Tools directory: primary action hub for focused browser tools
- Learn: compact start-here guide hub with focused follow-up articles in an archive
- Updates: public product log for launches, UX updates, and design improvements
- Workflows: archived, functional routes retained for existing links but removed from primary discovery and search indexing
- About, Privacy, Terms, and Contact: trust and policy pages linked site-wide for transparency

### Tool categories
- Image: crop, compress, resize, convert to WebP
- PDF: image to PDF, fill and sign, text to DOCX, split, merge, compress, organize pages, and export pages to images
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

Requirements: Node.js 24 or newer for the generation and test commands. CI uses Node 24 on Ubuntu 24.04. Python 3 is only used in the example static server command.

```bash
git clone git@github.com:aolaru/kreativtools.git
cd kreativtools
npm install
npm run sync:site
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). Stop the server with `Ctrl+C`.

To run the full test suite locally, install the Playwright browser once and then run the tests:

```bash
npx playwright install chromium firefox webkit
npm test
```

The complete website suite runs in Chromium. PDF validation, cancellation, metadata, rendering, ordering, and mobile-action tests also run in Firefox and WebKit. This is desktop engine coverage, not certification on every Android device.

## Offline toolkit

```bash
npm ci
npm run vendor:build
npm run sync:site
npm run build:offline
npm run test:offline
```

The build creates `downloads/kreativ-pdf-offline.zip` and an unpacked copy in `dist/offline/`. Extract the ZIP and open `index.html` in a current desktop browser. No server, internet connection, or account is required. Its seven tools are PDF Merge, Compress, Split, Page Organizer, PDF to Images, Image Compress, and Image Resize/Convert. Mobile file viewers may not execute local HTML; use the website on those devices. The offline tests open actual `file://` pages with browser networking disabled and verify exports in Chromium, Firefox, and WebKit.

The package embeds the same processing code used by the website, including its PDF workers, preview resources, and metadata cleanup. It has no analytics and does not store uploaded files. The ZIP and unpacked build are ignored by Git; CI builds, tests, and passes the resulting ZIP to the deployment job. Rebuild after changing a packaged tool or shared dependency. The website itself does not gain persistent offline caching from this package.

PDF Merge and Compress check readability, encryption, page counts, and signature fields before export. Merge detects duplicate contents and keeps valid files if another input fails. Limits are 100 MB per PDF, 100 files and 200 MB combined per merge; unusually complex PDFs may still exceed device memory. Cancellation terminates the processing worker. Metadata cleanup is not redaction, and rewriting a digitally signed document can invalidate its signature. Merge copies pages, not document-level editable forms or attachments; flatten completed forms before merging when needed.

Page Organizer uses the same PDF worker to copy, reorder, rotate, duplicate, and remove pages, with a 200-page input/output limit and 20 Undo steps. It does not preserve document-level form structure, bookmarks, or attachments. PDF to Images renders up to 50 selected pages per batch, at 72/144/216 DPI, with PNG or JPG output and a ZIP. It caps each image at 16 million pixels and 8192 pixels per side, and the combined images at 100 MB. Raster exports are not editable or digitally signed PDFs. `pdf-page-model.mjs` holds selection/rotation validation, and `pdf-page-render.mjs` provides bounded, cancellable rendering.

## Shared generation

Canonical pages live at clean routes such as `section/index.html` and `tool/index.html`.

Use `npm run sync:site` after shared layout or metadata changes. The sync script:
- normalizes title, description, canonical, Open Graph, and Twitter metadata on public pages
- applies the shared header and footer markup across canonical pages
- regenerates legacy `*.html` route aliases as redirect stubs to the clean routes
- creates per-page Content Security Policies with hashes for each inline script
- tracks content hashes and publication/modification dates in `scripts/page-dates.json`, so an unchanged page keeps its date

Processing libraries, PDF previews, export/UI fonts, icons, the CSV parser, and the font converter are bundled under `vendor/`. After updating their pinned npm versions, run `npm run vendor:build` and include the generated assets and notices. The WOFF2 converter loads its encoder from the bundled WASM file.

PDF Merge and Compress use `pdf-operations.mjs` for loading, validation, and export, `pdf-job.mjs` for cancellable worker lifecycle, and `pdf-tool-ui.mjs` for shared upload, download, warning, and thumbnail helpers. Keep heavy operations in `pdf-worker.mjs`, not in page event handlers. Tool-page help is collapsed by the generator; the shared export UI adds a mobile action bar only when the original action is outside the viewport.

Shared tool UI lives in `tool-upload-ui.js` and `tool-export-ui.js`. Keep live feedback outside the hidden dropzone after upload. Exporting tools follow Prepare, Review, Download; `scripts/tool-exports.js` defines their button IDs and labels. New conversion handlers should return a `{ blob, filename }` result through the export controller instead of starting a download automatically. Settings changes invalidate a prepared result.

Do not manually edit generated headers, footers, metadata, or top-level `*.html` redirect aliases. Change the source layout or metadata in `scripts/sync-site.js`, then run `npm run sync:site` and include the generated files in the same pull request.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. In short:

- Keep changes focused on maintenance: break/fix work, browser compatibility, security, accessibility, performance, or documentation.
- Preserve local browser processing. Do not add file-upload services, advertising, or additional analytics/tracking without an explicit maintainer decision.
- Run `npm run sync:site` after shared site changes and run `npm test` before requesting review.
- Use the issue templates for bugs and compatibility reports. Report security issues privately as described in [SECURITY.md](SECURITY.md).

## Tests

- Smoke tests: `bash tests/smoke.sh`
- Unit tests: `npm run test:unit`
- E2E tests:
  1. `npm install`
  2. `npx playwright install`
  3. `npm run test:e2e`
- Full test run: `npm test`
- Standalone package: `npm run build:offline && npm run test:offline`
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

## Private usage statistics

Cloudflare Web Analytics shows visits to tool pages. Offline toolkit download-link clicks send an empty, best-effort request to the dedicated `kreativtools-offline-click-counter` Worker; view its request metrics in Cloudflare under Workers & Pages. The metrics are private to the account and are estimates: requests can be blocked, lost, repeated, or made directly by bots, and a click does not guarantee a completed download. The counter has no database and does not collect filenames or file content. Its code and Wrangler configuration are in `worker/`. Wrangler's Worker request metrics include invalid requests, too. Offline packages exclude this counter and remain usable without network access.

## Privacy

Kreativ Tools does not load Google Analytics. Cloudflare Web Analytics measures aggregate page visits and performance. Kreativ Tools does not add uploaded files, file contents, or conversion results to its analytics implementation. Theme selection and some workflow settings can be stored locally in the visitor's browser. Saving a signature in PDF Fill & Sign also stores its image on that device until the visitor removes it or clears site storage; Start Over does not delete saved signatures.

## Maintenance mode

Kreativ Tools is kept online as a free, privacy-first utility library. Do not add generic tools, Learn articles, workflows, monetization, or further analytics/tracking unless the project is deliberately restarted.

Prioritize these existing tools when another Kreativ project needs a practical utility:

- Kreativ WP and ecommerce work: Image Compress, Image to WebP, Image Resize, and Font to Webfont.
- Client and creative handoffs: PDF Fill & Sign, PDF Merge, PDF Split, and Image to PDF.
- Media delivery: Audio to MP3, Video Trim, and Video Thumbnail.

Follow the review and archive decision rule in [MAINTENANCE.md](MAINTENANCE.md). Keep a tool active when it supports another Kreativ project or receives meaningful non-branded search traffic. Otherwise, leave it unchanged rather than expanding it.

## Community files

- [Contributing guide](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Support guide](SUPPORT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Security headers

- `npm run sync:site` generates matching CSP rules in the HTML and `_headers` for hosts that support Netlify-style header files.
- GitHub Pages enforces the HTML Content Security Policy, which blocks unapproved inline scripts and event handlers. GitHub Pages does not serve custom response headers from `_headers`; response-only protections such as `frame-ancestors`, HSTS, and `nosniff` require a host/CDN configuration.
- Canonical pages still include a `strict-origin-when-cross-origin` referrer meta tag so the static HTML has a privacy-safe browser fallback.
- The Pages deployment waits for the reusable test and Lighthouse jobs to pass.
- CI uses two browser-test workers, GitHub failure annotations, and retained test reports. A failed test still blocks publishing; do not bypass that gate to deploy a change.

## Versioning

Use lightweight semantic versioning for the product:

- Patch: security, compatibility, or break/fix maintenance only
- Minor: a deliberate restart of active product development
- Major: a deliberate product repositioning or ownership transfer

For Kreativ Tools right now:

- keep the current version unless a maintenance release must be published
- restart active versioning only if the project leaves maintenance mode

## Release workflow

1. Make only a security, dependency, compatibility, or break/fix change.
2. Update the Updates page only when the change affects visitors.
3. Bump the version only when a release is necessary:
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
