# Kreativ Tools

Kreativ Tools is a browser-based utility site for image, PDF, video, font, audio, and file workflows. The site now includes dedicated tool pages, a Learn section with practical guides, a changelog, and a shared design system across the static pages.

## Current scope

### Main sections
- Home: product overview, featured workflows, and entry points into tools, Learn, and recent changes
- Tools directory: full listing of available tools
- Learn: practical how-to guides connected to real tools
- Changes: public changelog for launches, UX updates, and design improvements

### Tool categories
- Image: resize, compress, convert to WebP, image-to-PDF flow on the main image app
- PDF: image to PDF, merge PDF, compress PDF
- Video: convert to WEBM, extract thumbnail, trim video
- Fonts: webfont convert, preview, CSS generator
- Audio: convert to WAV, trim audio, adjust volume
- File: XML to CSV, JSON to CSV, CSV to JSON

## Product direction

The current site direction is:
- focused browser-based tools instead of a single monolithic app
- stronger landing pages for high-intent workflows
- privacy-friendly processing where possible
- practical content in Learn to support search and user success
- a shared UI system with Font Awesome iconography and a branded favicon family

## Run locally

Open [index.html](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/index.html) in a browser, or serve the project root with any static file server.

## Tests

- Smoke tests: `bash tests/smoke.sh`
- E2E tests:
  1. `npm install`
  2. `npx playwright install`
  3. `npm run test:e2e`
- Full test run: `npm test`
- Lighthouse CI: `npm run test:lighthouse`

## Key files

- [index.html](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/index.html): homepage
- [tools/index.html](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/tools/index.html): tools directory
- [learn.html](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/learn.html): Learn landing page
- [changes.html](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/changes.html): changelog
- [styles.css](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/styles.css): shared visual system
- [theme.js](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/theme.js): theme toggle and share menu behavior
- [favicon.svg](/Users/andreiolaru/Library/CloudStorage/Dropbox/OLARUAI/kreativ-websites/kreativtools.com/favicon.svg): primary branded favicon

## Notes

- The site uses a static HTML structure with shared CSS and JavaScript.
- Favicon assets are available as SVG, `32x32`, `16x16`, and Apple touch icon variants.
- The footer and navigation are duplicated across static pages, so global content updates usually require a site-wide edit pass.
