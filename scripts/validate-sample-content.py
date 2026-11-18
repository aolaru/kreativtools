#!/usr/bin/env python3
"""Dependency-free structural checks for text and Office fixtures."""
import csv
import io
import json
import wave
import zipfile
from pathlib import Path
from xml.etree import ElementTree

root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'resources/sample-files/manifest.json').read_text(encoding='utf-8'))
for item in catalog['samples']:
    data = (root / item['downloadUrl'].lstrip('/')).read_bytes()
    if item['format'] in ('XML', 'SVG'):
        try:
            ElementTree.fromstring(data)
            valid = True
        except ElementTree.ParseError:
            valid = False
        if valid != (item['validity'] != 'invalid'):
            raise SystemExit(f'Unexpected XML validity: {item["id"]}')
    if item['format'] in ('DOCX', 'XLSX', 'PPTX'):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if archive.testzip() is not None:
                raise SystemExit(f'Invalid Office archive: {item["id"]}')
            for name in archive.namelist():
                if name.endswith(('.xml', '.rels')):
                    ElementTree.fromstring(archive.read(name))
    if item['filename'] == 'quoted.csv':
        rows = list(csv.reader(io.StringIO(data.decode('utf-8'), newline='')))
        if rows[1] != ['Alpha', 'comma, and "quotes"']:
            raise SystemExit('Quoted CSV did not parse as expected.')
    if item['format'] == 'WAV':
        with wave.open(io.BytesIO(data)) as audio:
            if audio.getnchannels() != 1 or audio.getframerate() != 8000 or audio.getnframes() != 4000:
                raise SystemExit('Unexpected WAV parameters.')
print('Verified XML, Office XML, CSV, and WAV structure.')
