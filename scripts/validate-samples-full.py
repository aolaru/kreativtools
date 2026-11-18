#!/usr/bin/env python3
"""Independent validation of generated samples with the optional generator libraries."""
import io
import json
import shutil
import subprocess
from pathlib import Path

try:
    from PIL import Image
    from docx import Document
    from openpyxl import load_workbook
    from pptx import Presentation
    from pypdf import PdfReader
except ImportError as error:
    raise SystemExit(f'Missing validation dependency: {error}. Install scripts/sample-requirements.txt.') from error

root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'resources/sample-files/manifest.json').read_text(encoding='utf-8'))['samples']
for sample in catalog:
    path = root / sample['downloadUrl'].lstrip('/')
    data = path.read_bytes()
    if sample['category'] == 'pdf' and sample['validity'] != 'invalid':
        reader = PdfReader(io.BytesIO(data), strict=True)
        if sample['filename'] == 'password-protected.pdf':
            assert reader.is_encrypted and reader.decrypt('sample123')
        assert len(reader.pages) == (3 if sample['filename'] == 'multipage.pdf' else 2 if sample['filename'] == 'links-bookmarks.pdf' else 1)
        if sample['filename'] == 'attachment.pdf': assert 'note.txt' in reader.attachments
        if sample['filename'] == 'form.pdf': assert 'sample_name' in reader.get_fields()
        if sample['filename'] == 'links-bookmarks.pdf': assert len(reader.outline) == 2 and reader.pages[0].get('/Annots')
        if sample['filename'] == 'unusual-size.pdf': assert (float(reader.pages[0].mediabox.width), float(reader.pages[0].mediabox.height)) == (360, 720)
    if sample['category'] == 'images' and sample['format'] != 'SVG' and sample['validity'] != 'invalid':
        with Image.open(io.BytesIO(data)) as image:
            assert image.format == sample['format']
            image.load()
            if sample['filename'] == 'one-pixel.png': assert image.size == (1, 1)
            if sample['filename'] == 'large-dimensions.png': assert image.size == (3000, 2000)
            if sample['filename'] == 'transparent.png': assert image.mode == 'RGBA' and image.getpixel((0, 0))[3] < 255
    if sample['format'] == 'DOCX':
        document = Document(io.BytesIO(data)); assert document.paragraphs and document.core_properties.author == 'Kreativ Tools'
    if sample['format'] == 'XLSX':
        workbook = load_workbook(io.BytesIO(data)); assert workbook.active['D2'].value == '=B2*C2' and workbook.properties.creator == 'Kreativ Tools'
    if sample['format'] == 'PPTX':
        presentation = Presentation(io.BytesIO(data)); assert len(presentation.slides) == 1 and presentation.core_properties.last_modified_by == 'Kreativ Tools'
    if sample['format'] in ('MP3', 'MP4'):
        if not shutil.which('ffprobe'): raise SystemExit('Missing ffprobe: required for full media validation.')
        info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)]))
        kind = 'audio' if sample['format'] == 'MP3' else 'video'
        assert any(stream['codec_type'] == kind for stream in info['streams'])
print(f'Independently opened and checked specialized formats in {len(catalog)} samples.')
