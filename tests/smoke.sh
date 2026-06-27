#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

has_rg() {
  command -v rg >/dev/null 2>&1
}

first_match_line() {
  local file="$1"
  local pattern="$2"

  if has_rg; then
    rg -n "$pattern" "$file" | head -n1 | cut -d: -f1 || true
    return
  fi

  grep -En "$pattern" "$file" | head -n1 | cut -d: -f1 || true
}

expect_file() {
  local file="$1"
  [[ -f "$file" ]] || fail "Missing file: $file"
}

expect_pattern() {
  local file="$1"
  local pattern="$2"
  if has_rg; then
    rg -q "$pattern" "$file" || fail "Pattern not found in $file: $pattern"
    return
  fi

  grep -Eq "$pattern" "$file" || fail "Pattern not found in $file: $pattern"
}

expect_nav_order() {
  local file="$1"
  local tools_line learn_line changes_line
  tools_line="$(first_match_line "$file" '<a href="/tools/?\"')"
  learn_line="$(first_match_line "$file" '<a href="/learn/?\"')"
  changes_line="$(first_match_line "$file" '<a href="/changes/?\"')"

  [[ -n "$tools_line" && -n "$learn_line" && -n "$changes_line" ]] || fail "Could not read nav order markers in $file"
  (( tools_line < learn_line )) || fail "Expected learn after tools in nav for $file"
  (( learn_line < changes_line )) || fail "Expected changes after learn in nav for $file"
}

main() {
  local pages=(
    index.html
    image/index.html
    image/crop/index.html
    pdf/index.html
    pdf/fill-sign/index.html
    pdf/to-docx/index.html
    image/resize/index.html
    image/compress/index.html
    pdf/image-to-pdf/index.html
    pdf/split/index.html
    pdf/merge/index.html
    video/convert-webm/index.html
    video/thumbnail/index.html
    video/trim/index.html
    fonts/webfont-convert/index.html
    fonts/preview/index.html
    audio/to-wav/index.html
    audio/to-mp3/index.html
    audio/trim/index.html
    audio/volume/index.html
    file/xml-to-csv/index.html
    file/json-to-csv/index.html
    file/csv-to-json/index.html
    changes/index.html
    learn/index.html
    learn/how-browser-based-file-tools-work/index.html
    learn/file-privacy-limits/index.html
    learn/choosing-the-right-kreativ-tool/index.html
    learn/webm-vs-mp4-for-browser-video/index.html
    learn/trim-video-clips-for-email-and-social/index.html
    learn/video-thumbnail-best-practices/index.html
    learn/json-to-csv-common-mistakes/index.html
    learn/clean-csv-before-import/index.html
    learn/xml-export-troubleshooting/index.html
    learn/font-licensing-checklist/index.html
    learn/woff2-vs-woff-font-formats/index.html
    learn/font-display-css-choices/index.html
    workflows/index.html
    workflows/image-prep/index.html
    workflows/pdf-delivery/index.html
    workflows/audio-delivery/index.html
    tools/index.html
    about/index.html
    privacy/index.html
    terms/index.html
    contact/index.html
  )

  expect_file "styles.css"
  expect_file "theme.js"
  expect_file "image-format-support.js"
  expect_file "analytics.js"
  expect_file "workflows-template-ui.js"
  expect_file "robots.txt"
  expect_file "workflows/pricing/index.html"
  expect_file "workflows/success/index.html"

  for p in "${pages[@]}"; do
    expect_file "$p"
    expect_pattern "$p" '<script src="[^"]*theme\.js"></script>'
    expect_pattern "$p" 'id="themeToggle"'
    expect_pattern "$p" 'id="shareButton"'
    expect_pattern "$p" 'application/ld\+json'
    expect_pattern "$p" 'BreadcrumbList'
    expect_pattern "$p" 'href="https://madebykreativ\.com/"'
    expect_nav_order "$p"
  done

  expect_pattern "analytics.js" "G-52WXEBLJY7"
  expect_pattern "analytics.js" "googletagmanager\\.com/gtag/js\\?id="
  expect_pattern "analytics.js" "window\\.gtag"
  expect_pattern "robots.txt" "Sitemap: https://kreativtools\\.com/sitemap\\.xml"

  expect_pattern "image/index.html" 'Which image tool should I use\\?'
  expect_pattern "pdf/index.html" 'Which PDF tool should I use\\?'
  expect_pattern "video/index.html" 'Which video tool should I use\\?'
  expect_pattern "fonts/index.html" 'Which font tool should I use\\?'
  expect_pattern "audio/index.html" 'Which audio tool should I use\\?'
  expect_pattern "file/index.html" 'Which data converter should I use\\?'

  expect_pattern "image/resize/index.html" 'id="toolResize"'
  expect_pattern "image/resize/index.html" 'id="toolConvert"'
  expect_pattern "image/resize/index.html" 'id="toolPdf"'
  expect_pattern "image/resize/index.html" 'image-format-support\.js'
  expect_pattern "image/resize/index.html" 'image/avif'
  expect_pattern "image/resize/index.html" 'Image resize and convert guide'
  expect_pattern "image/crop/index.html" 'id="cropImageInput"'
  expect_pattern "image/crop/index.html" 'id="cropApplyButton"'
  expect_pattern "image/crop/index.html" 'id="cropDownloadButton"'
  expect_pattern "image/crop/index.html" 'image-format-support\.js'
  expect_pattern "image/crop/index.html" 'image/avif'
  expect_pattern "image/compress/index.html" 'image-format-support\.js'
  expect_pattern "image/compress/index.html" 'image/avif'
  expect_pattern "image/to-webp/index.html" 'image-format-support\.js'
  expect_pattern "image/to-webp/index.html" 'Image to WebP guide'

  expect_pattern "pdf/image-to-pdf/index.html" 'id="pdfImageInput"'
  expect_pattern "pdf/image-to-pdf/index.html" 'Image to PDF guide'
  expect_pattern "pdf/fill-sign/index.html" 'id="pdfFillInput"'
  expect_pattern "pdf/fill-sign/index.html" 'id="pdfFillPages"'
  expect_pattern "pdf/fill-sign/index.html" 'id="pdfFillExportButton"'
  expect_pattern "pdf/fill-sign/index.html" 'id="pdfFillToolCheckbox"'
  expect_pattern "pdf/fill-sign/index.html" 'id="pdfSignatureSaveButton"'
  expect_pattern "pdf/fill-sign/index.html" 'id="pdfSavedSignatureList"'
  expect_pattern "pdf/fill-sign/index.html" 'pdfjs-dist@3\.11\.174'
  expect_pattern "pdf/to-docx/index.html" 'id="pdfDocxInput"'
  expect_pattern "pdf/to-docx/index.html" 'id="pdfDocxConvertButton"'
  expect_pattern "pdf/to-docx/index.html" 'id="pdfDocxDownloadButton"'
  expect_pattern "pdf/to-docx/index.html" 'jszip@3\.10\.1'
  expect_pattern "pdf/split/index.html" 'id="splitPdfInput"'
  expect_pattern "pdf/split/index.html" 'id="splitPdfActionButton"'
  expect_pattern "pdf/split/index.html" 'id="splitPdfDownloadAllButton"'
  expect_pattern "video/convert-webm/index.html" 'id="videoInput"'
  expect_pattern "video/convert-webm/index.html" 'WEBM conversion guide'
  expect_pattern "video/thumbnail/index.html" 'Video thumbnail guide'
  expect_pattern "video/trim/index.html" 'Video trim guide'
  expect_pattern "fonts/webfont-convert/index.html" 'id="fontInput"'
  expect_pattern "fonts/preview/index.html" 'Font preview guide'
  expect_pattern "fonts/css-generator/index.html" '@font-face CSS guide'
  expect_pattern "audio/to-wav/index.html" 'id="audioInput"'
  expect_pattern "audio/to-wav/index.html" 'Audio to WAV guide'
  expect_pattern "audio/to-mp3/index.html" 'id="mp3AudioInput"'
  expect_pattern "audio/trim/index.html" 'Audio trim guide'
  expect_pattern "audio/volume/index.html" 'Audio volume guide'
  expect_pattern "workflows/audio-delivery/index.html" 'id="workflowAudioInput"'
  expect_pattern "workflows/audio-delivery/index.html" 'id="workflowAudioGenerateButton"'
  expect_pattern "index.html" 'href="/workflows/"'
  expect_pattern "workflows/index.html" '<link rel="canonical" href="https://kreativtools\.com/workflows/"'
  expect_pattern "workflows/index.html" '<h1>Kreativ Workflows</h1>'
  expect_pattern "workflows/index.html" 'Which workflow should I use\\?'
  expect_pattern "workflows/index.html" 'Use a quick tool instead'
  expect_pattern "workflows/pricing/index.html" '<meta name="robots" content="noindex, follow"'
  expect_pattern "workflows/pricing/index.html" '<link rel="canonical" href="https://kreativtools\.com/workflows/"'
  expect_pattern "workflows/pricing/index.html" "window.location.replace\\('/workflows/'\\)"
  expect_pattern "workflows/image-prep/index.html" 'workflows-template-ui\.js'
  expect_pattern "workflows/pdf-delivery/index.html" 'workflows-template-ui\.js'
  expect_pattern "workflows/audio-delivery/index.html" 'workflows-template-ui\.js'
  expect_pattern "workflows/success/index.html" '<meta name="robots" content="noindex, nofollow"'
  expect_pattern "file/xml-to-csv/index.html" 'id="xmlInput"'
  expect_pattern "file/xml-to-csv/index.html" 'XML to CSV guide'
  expect_pattern "file/json-to-csv/index.html" 'JSON to CSV guide'
  expect_pattern "file/csv-to-json/index.html" 'CSV to JSON guide'
  expect_pattern "about/index.html" '<h1>Independent browser tools for practical file work</h1>'
  expect_pattern "privacy/index.html" 'Advertising partners'
  expect_pattern "terms/index.html" 'Advertising:'

  expect_pattern "changes/index.html" 'class="changelog-list"'
  expect_pattern "changes/index.html" 'NEW -'
  expect_pattern "changes/index.html" 'FIX -|UPDATE -'
  expect_pattern "learn/how-browser-based-file-tools-work/index.html" 'How Browser-Based File Tools Work'
  expect_pattern "learn/file-privacy-limits/index.html" 'File Privacy Limits in Browser Tools'
  expect_pattern "learn/choosing-the-right-kreativ-tool/index.html" 'Choosing the Right Kreativ Tool'
  expect_pattern "learn/webm-vs-mp4-for-browser-video/index.html" 'WEBM vs MP4 for Browser Video'
  expect_pattern "learn/json-to-csv-common-mistakes/index.html" 'Common JSON to CSV Mistakes'
  expect_pattern "learn/font-licensing-checklist/index.html" 'Font Licensing Checklist Before Web Use'

  echo "PASS: smoke checks completed"
}

main "$@"
