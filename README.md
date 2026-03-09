# KreativTools

A lightweight browser-based image tools app.

## Current tools
- Resize Image: change width/height with optional aspect ratio lock
- Convert Image: convert format (JPG, PNG, WEBP) with quality control for JPG/WEBP
- Image to PDF: export uploaded image to a single-page PDF with page size/orientation options

## Run locally
Open `index.html` in your browser.

## Tests
- Smoke tests (shell): `bash tests/smoke.sh`
- E2E tests (Playwright):
  1. `npm install`
  2. `npx playwright install`
  3. `npm run test:e2e`

## Files
- `index.html` - app structure and metadata
- `styles.css` - visual design and responsive layout
- `script.js` - tool logic, image processing, and downloads
- `favicon.svg` - site icon

## Roadmap
- Batch processing (multiple files)
- Drag and drop upload
- Crop and rotate tools
- Metadata handling options
