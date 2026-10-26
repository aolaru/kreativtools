# Third-Party Notices

Kreativ Tools uses the following third-party software in the browser. This file records the components and versions used by the current codebase. Each upstream license continues to apply to its respective component.

| Component | Version or source | License | Use in this project |
| --- | --- | --- | --- |
| [Font Awesome Free](https://fontawesome.com/) | 6.7.2, bundled | MIT (code), SIL OFL 1.1 (fonts), CC BY 4.0 (icons) | Interface icons and stylesheet |
| [Space Grotesk](https://github.com/floriankarsten/space-grotesk) | @fontsource/space-grotesk 5.3.0, bundled Latin WOFF2 | SIL Open Font License 1.1 | Interface typography |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | 1.17.1 | MIT | PDF creation and editing |
| [PDF.js](https://github.com/mozilla/pdf.js) | 5.4.296, bundled under `vendor/pdfjs/` | Apache-2.0 | PDF rendering and preview |
| [fontkit](https://github.com/Hopding/fontkit) | @pdf-lib/fontkit 1.1.1, bundled | MIT | Unicode PDF export font support |
| [Noto Sans](https://github.com/notofonts/noto-fonts) | bundled regular TTF | SIL Open Font License 1.1 | PDF text export |
| [Papa Parse](https://github.com/mholt/PapaParse) | 5.5.3, bundled | MIT | Quoted and multiline CSV parsing |
| [JSZip](https://github.com/Stuk/jszip) | 3.10.1 | MIT OR GPL-3.0-or-later | DOCX archive creation |
| [jsPDF](https://github.com/parallax/jsPDF) | 4.2.1, bundled | MIT | PDF export |
| [fonteditor-core](https://github.com/kekee000/fonteditor-core) | 2.6.3, bundled with WOFF2 WASM | MIT | Webfont conversion |
| [pako](https://github.com/nodeca/pako) | 2.1.0, bundled | MIT AND Zlib | WOFF compression |
| [xmldom](https://github.com/xmldom/xmldom) | bundled dependency; see package-lock.json | MIT | Font editor XML support |
| [LameJS](https://github.com/zhuker/lamejs) | bundled as `audio/lame.min.js` | LGPL-3.0 | MP3 encoding |

## Redistribution notes

- Processing libraries, icons, and interface fonts are served locally. Cloudflare Web Analytics remains an optional external request on the website; the standalone offline package contains no analytics.
- Bundled dependency versions are locked in `package-lock.json`. Rebuild them with `npm run vendor:build`. Licenses are retained under `vendor/`.
- The WOFF2 bundle replaces its three dynamic JavaScript binding factories with static argument-forwarding and type-conversion wrappers so it works with a Content Security Policy that blocks JavaScript eval. The transformation is recorded in `scripts/vendor-dependencies.js`.
- `audio/lame.min.js` is a minified LameJS distribution. Its upstream LGPL-3.0 obligations apply, including providing access to the corresponding source when required. The corresponding upstream source is available from the [LameJS repository](https://github.com/zhuker/lamejs).
- This notice does not replace upstream license texts or obligations. Anyone redistributing a fork is responsible for confirming license compatibility and preserving required notices.
