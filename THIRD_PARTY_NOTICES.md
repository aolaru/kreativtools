# Third-Party Notices

Kreativ Tools uses the following third-party software in the browser. This file records the components and versions used by the current codebase. Each upstream license continues to apply to its respective component.

| Component | Version or source | License | Use in this project |
| --- | --- | --- | --- |
| [Font Awesome Free](https://fontawesome.com/) | 6.7.2, loaded from cdnjs | See upstream terms | Interface icons and stylesheet |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | 1.17.1 | MIT | PDF creation and editing |
| [PDF.js](https://github.com/mozilla/pdf.js) | 3.11.174 | Apache-2.0 | PDF rendering and preview |
| [JSZip](https://github.com/Stuk/jszip) | 3.10.1 | MIT OR GPL-3.0-or-later | DOCX archive creation |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | MIT | PDF export |
| [fonteditor-core](https://github.com/kekee000/fonteditor-core) | 2.6.3 | MIT | Webfont conversion |
| [LameJS](https://github.com/zhuker/lamejs) | bundled as `audio/lame.min.js` | LGPL-3.0 | MP3 encoding |

## Redistribution notes

- CDN imports are third-party distributions. Forks should pin and review every external URL before production use.
- `audio/lame.min.js` is a minified LameJS distribution. Its upstream LGPL-3.0 obligations apply, including providing access to the corresponding source when required. The corresponding upstream source is available from the [LameJS repository](https://github.com/zhuker/lamejs).
- This notice does not replace upstream license texts or obligations. Anyone redistributing a fork is responsible for confirming license compatibility and preserving required notices.
