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
  local workflows_line tools_line learn_line changes_line
  workflows_line="$(first_match_line "$file" '<a href="/workflows/?\"')"
  tools_line="$(first_match_line "$file" '<a href="/tools/?\"')"
  learn_line="$(first_match_line "$file" '<a href="/learn/?\"')"
  changes_line="$(first_match_line "$file" '<a href="/changes/?\"')"

  [[ -n "$workflows_line" && -n "$tools_line" && -n "$learn_line" && -n "$changes_line" ]] || fail "Could not read nav order markers in $file"
  (( workflows_line < learn_line )) || fail "Expected learn after workflows in nav for $file"
  (( workflows_line < tools_line )) || fail "Expected tools after workflows in nav for $file"
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
    fonts/webfont-convert/index.html
    audio/to-wav/index.html
    audio/to-mp3/index.html
    file/xml-to-csv/index.html
    changes/index.html
    learn/index.html
    workflows/index.html
    workflows/pricing/index.html
    workflows/image-prep/index.html
    workflows/pdf-delivery/index.html
    workflows/audio-delivery/index.html
    tools/index.html
    privacy/index.html
    terms/index.html
    contact/index.html
  )

  expect_file "styles.css"
  expect_file "theme.js"
  expect_file "image-format-support.js"
  expect_file "analytics.js"

  for p in "${pages[@]}"; do
    expect_file "$p"
    expect_pattern "$p" '<script src="[^"]*theme\.js"></script>'
    expect_pattern "$p" 'id="themeToggle"'
    expect_pattern "$p" 'id="shareButton"'
    expect_pattern "$p" 'href="https://madebykreativ\.com/"'
    expect_nav_order "$p"
  done

  expect_pattern "analytics.js" "G-52WXEBLJY7"
  expect_pattern "analytics.js" "googletagmanager\\.com/gtag/js\\?id="
  expect_pattern "analytics.js" "window\\.gtag"

  expect_pattern "image/resize/index.html" 'id="toolResize"'
  expect_pattern "image/resize/index.html" 'id="toolConvert"'
  expect_pattern "image/resize/index.html" 'id="toolPdf"'
  expect_pattern "image/resize/index.html" 'image-format-support\.js'
  expect_pattern "image/resize/index.html" 'image/avif'
  expect_pattern "image/crop/index.html" 'id="cropImageInput"'
  expect_pattern "image/crop/index.html" 'id="cropApplyButton"'
  expect_pattern "image/crop/index.html" 'id="cropDownloadButton"'
  expect_pattern "image/crop/index.html" 'image-format-support\.js'
  expect_pattern "image/crop/index.html" 'image/avif'
  expect_pattern "image/compress/index.html" 'image-format-support\.js'
  expect_pattern "image/compress/index.html" 'image/avif'
  expect_pattern "image/to-webp/index.html" 'image-format-support\.js'

  expect_pattern "pdf/image-to-pdf/index.html" 'id="pdfImageInput"'
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
  expect_pattern "fonts/webfont-convert/index.html" 'id="fontInput"'
  expect_pattern "audio/to-wav/index.html" 'id="audioInput"'
  expect_pattern "audio/to-mp3/index.html" 'id="mp3AudioInput"'
  expect_pattern "workflows/audio-delivery/index.html" 'id="workflowAudioInput"'
  expect_pattern "workflows/audio-delivery/index.html" 'id="workflowAudioGenerateButton"'
  expect_pattern "index.html" 'href="/workflows/"'
  expect_pattern "workflows/index.html" '<link rel="canonical" href="https://kreativtools\.com/workflows/"'
  expect_pattern "workflows/index.html" '<h1>Kreativ Workflows</h1>'
  expect_pattern "workflows/pricing/index.html" '<link rel="canonical" href="https://kreativtools\.com/workflows/pricing/"'
  expect_pattern "workflows/pricing/index.html" 'Kreativ Workflows Pricing'
  expect_pattern "workflows/pricing/index.html" 'Buy with Lemon Squeezy'
  expect_pattern "workflows/pricing/index.html" 'data-workflows-checkout-status'
  expect_pattern "file/xml-to-csv/index.html" 'id="xmlInput"'

  expect_pattern "changes/index.html" 'class="changelog-list"'
  expect_pattern "changes/index.html" 'NEW -'
  expect_pattern "changes/index.html" 'FIX -|UPDATE -'

  echo "PASS: smoke checks completed"
}

main "$@"
