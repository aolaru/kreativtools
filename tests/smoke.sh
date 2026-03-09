#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

expect_file() {
  local file="$1"
  [[ -f "$file" ]] || fail "Missing file: $file"
}

expect_pattern() {
  local file="$1"
  local pattern="$2"
  rg -q "$pattern" "$file" || fail "Pattern not found in $file: $pattern"
}

expect_nav_order() {
  local file="$1"
  local audio_line file_line changes_line
  audio_line="$(rg -n '<a href="audio\.html"' "$file" | head -n1 | cut -d: -f1)"
  file_line="$(rg -n '<a href="file\.html"' "$file" | head -n1 | cut -d: -f1)"
  changes_line="$(rg -n '<a href="changes\.html"' "$file" | head -n1 | cut -d: -f1)"

  [[ -n "$audio_line" && -n "$file_line" && -n "$changes_line" ]] || fail "Could not read nav order markers in $file"
  (( audio_line < file_line )) || fail "Expected audio before file in nav for $file"
  (( file_line < changes_line )) || fail "Expected changes as last nav item in $file"
}

main() {
  local pages=(index.html pdf.html video.html fonts.html audio.html file.html changes.html)

  expect_file "styles.css"
  expect_file "theme.js"

  for p in "${pages[@]}"; do
    expect_file "$p"
    expect_pattern "$p" '<script src="theme\.js"></script>'
    expect_pattern "$p" 'id="themeToggle"'
    expect_pattern "$p" 'href="https://madebykreativ\.com/"'
    expect_nav_order "$p"
  done

  expect_pattern "index.html" 'id="toolResize"'
  expect_pattern "index.html" 'id="toolConvert"'
  expect_pattern "index.html" 'id="toolPdf"'

  expect_pattern "pdf.html" 'id="pdfImageInput"'
  expect_pattern "video.html" 'id="videoInput"'
  expect_pattern "fonts.html" 'id="fontInput"'
  expect_pattern "audio.html" 'id="audioInput"'
  expect_pattern "file.html" 'id="xmlInput"'

  expect_pattern "changes.html" 'class="changelog-list"'
  expect_pattern "changes.html" 'NEW -'
  expect_pattern "changes.html" 'FIX -|UPDATE -'

  echo "PASS: smoke checks completed"
}

main "$@"
