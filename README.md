# Kreativ Tools

Kreativ Tools is a privacy-first static website of browser-based utilities for image, PDF, video, font, audio, and file workflows. Files are processed locally in the browser by the tools; the site does not include product analytics or an upload backend.

The project is in maintenance mode. It is a good base for a private tool library, a client-facing utility site, or a focused fork that keeps only the tools you need. Small fixes, compatibility improvements, accessibility work, and documentation corrections are welcome.

**Live site:** [kreativtools.com](https://kreativtools.com/)

## Reuse status

The repository is being prepared for public reuse. A software license has not yet been selected, so cloning and reviewing the code is welcome, but permission to redistribute, modify, or use it in another project is not granted until a `LICENSE` file is added. See [CONTRIBUTING.md](CONTRIBUTING.md) for the intended contribution scope and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled and CDN-loaded dependencies.

## Current version

- Current product version: `v0.9.8`
- Version source of truth: `package.json`
- Current release stage: maintenance mode; stable tools remain online without planned catalogue expansion

## Current scope

### Main sections
- Home: simplified job-first router into the right tool, guided workflow, or Learn path
- Tools directory: primary action hub for quick tools and guided workflows
- Learn: compact start-here guide hub with focused follow-up articles in an archive
- Updates: public product log for launches, UX updates, and design improvements
- Workflows: short explainer route for the guided workflow format, with Image Prep, PDF Delivery, and Audio Delivery listed inside the Tools directory
- About, Privacy, Terms, and Contact: trust and policy pages linked site-wide for transparency

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

Requirements: Node.js 20 or newer for the generation and test commands. Python 3 is only used in the example static server command.

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
npx playwright install chromium
npm test
```

## Shared generation

Canonical pages live at clean routes such as `section/index.html` and `tool/index.html`.

Use `npm run sync:site` after shared layout or metadata changes. The sync script:
- normalizes title, description, canonical, Open Graph, and Twitter metadata on public pages
- applies the shared header and footer markup across canonical pages
- regenerates legacy `*.html` route aliases as redirect stubs to the clean routes

Do not manually edit generated headers, footers, metadata, or top-level `*.html` redirect aliases. Change the source layout or metadata in `scripts/sync-site.js`, then run `npm run sync:site` and include the generated files in the same pull request.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. In short:

- Keep changes focused on maintenance: break/fix work, browser compatibility, security, accessibility, performance, or documentation.
- Preserve local browser processing. Do not add file-upload services, visitor analytics, advertising, or tracking without an explicit maintainer decision.
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

## Privacy

Kreativ Tools does not load Google Analytics or product analytics. Tool activity and uploaded files are not used for site analytics. Theme selection and some workflow settings can be stored locally in the visitor's browser.

## Maintenance mode

Kreativ Tools is kept online as a free, privacy-first utility library. Do not add generic tools, Learn articles, workflows, monetization, or analytics unless the project is deliberately restarted.

Prioritize these existing tools when another Kreativ project needs a practical utility:

- Kreativ WP and ecommerce work: Image Compress, Image to WebP, Image Resize, and Font to Webfont.
- Client and creative handoffs: PDF Fill & Sign, PDF Merge, PDF Split, and Image to PDF.
- Media delivery: Audio to MP3, Video Trim, and Video Thumbnail.

Review Google Search Console once every 90 days without adding visitor tracking. Keep a tool active when it supports another Kreativ project or receives meaningful non-branded search traffic. Otherwise, leave it unchanged rather than expanding it.

## Community files

- [Contributing guide](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Support guide](SUPPORT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Security headers

- `_headers` contains the intended security-header baseline for hosts or CDNs that support Netlify-style header files.
- GitHub Pages does not serve custom headers from `_headers`; use a CDN/proxy such as Cloudflare if those headers must appear on the live response.
- Canonical pages still include a `strict-origin-when-cross-origin` referrer meta tag so the static HTML has a privacy-safe browser fallback.

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
