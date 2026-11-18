# Sample files and QA resources

The public catalog contains synthetic files for upload, preview, parsing, and error-handling tests. Each file is free to download, and the repository's MIT license applies. Intentionally malformed files are labelled `invalid`; unusual but readable examples are labelled `edge`. Do not treat an edge case as universally acceptable: an application may legitimately reject encrypted PDFs or enforce its own size and type rules.

## Catalog and generation

`manifest.json` is the single public catalog, with the shape in `catalog.d.ts`. It records actual byte sizes and SHA-256 checksums. `mimeType` describes the intended or detected content, **not** an HTTP response-header guarantee. Hosting may choose a different type based on the filename, especially for deliberately mismatched extensions. Samples contain synthetic data only. The encrypted PDF password is `sample123`; it is not intended to protect sensitive data.

To add a sample, add its generation recipe and meaningful scenario and expected result to `scripts/generate-sample-files.py`, then regenerate and synchronize pages:

```sh
python3 -m venv .venv-samples
.venv-samples/bin/pip install -r scripts/sample-requirements.txt
PATH=".venv-samples/bin:$PATH" npm run samples:generate
npm run sync:site
npm run samples:validate
```

FFmpeg with the `libx264` encoder and WebP support in Pillow are required for generation; `ffprobe` is required for full media validation. Generation stops if dependencies are missing. Generated samples, manifest, and HTML are committed; ordinary site testing and deployment do not run the generator or require those optional libraries. The generator normalizes Office ZIP metadata and PDF timestamps where practical. Encryption, library versions, and FFmpeg builds can affect binary output: after regenerating, review updated hashes and commit the matching assets and manifest together. It never deletes uncatalogued files; validation reports them instead.

For stronger local validation, use the same virtual environment:

```sh
.venv-samples/bin/python scripts/validate-samples-full.py
```

This opens PDFs, checks the password, forms and attachments, decodes images, opens Office documents, and probes MP3/MP4. `npm run samples:validate` uses the existing Node libraries and Python standard library to check public inventory, sizes, SHA-256, major format structures, XML, CSV, ZIP checksums, WAV, and rendered-page consistency. Signature checks alone do not prove that every possible reader will accept a file. The intentionally malformed samples must remain malformed. Password-protected ZIP is deferred because no compatible generation/validation tooling is included; no archive bombs or executable payloads are included.

## Future private PRO kit

No PRO files or checkout are published. The landing page is informational and marked `noindex`. Keep all commercial samples **outside the entire website checkout**: Git ignore rules do not protect files from a static deployment. `scripts/package-private-qa-kit.js` requires both a private source directory and an output ZIP outside this checkout and refuses to overwrite an existing output.

The private source directory needs a `kit-manifest.json` like:

```json
{"files": [{"path": "pdf/example.pdf", "description": "A privately licensed test fixture"}]}
```

Package it with `node scripts/package-private-qa-kit.js /absolute/private-directory /absolute/output.zip`. The resulting ZIP contains the selected files and a computed size/checksum manifest. Review the files, rights, and ZIP before distribution; this does not implement payment, access control, or entitlement checks.

If a purchase destination is later configured, add an accurately labelled purchase link in `proContent()` in `scripts/render-sample-pages.js` after reviewing product terms, pricing, and delivery, then run `npm run sync:site` and update the tests. Review the `robotsForRoute` rule in `scripts/sync-site.js` if the real product page should become indexable. Do not publish a fake button. The current renderer intentionally exposes only free items; PRO material must not be added to `manifest.json` or `test-files/`.

For future Cloudflare R2 storage, first decide on access control and delivery. Keep public free samples at a stable HTTPS asset origin and validate each remote object's size, checksum, availability, and CORS/download headers. The current validator deliberately accepts only local `/test-files/` paths; extending it for R2 requires an explicit host allowlist and remote verification. Keep paid objects in a private bucket behind a separately implemented entitlement and signed-download flow, never in the Pages/GitHub Pages static output or this public catalog. This repository currently deploys via GitHub Pages, not Cloudflare Pages or R2.
