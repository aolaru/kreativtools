#!/usr/bin/env python3
"""Generate synthetic public fixtures. Requires the libraries in sample-requirements.txt and ffmpeg."""
import csv
import hashlib
import io
import json
import math
import os
import re
import shutil
import struct
import subprocess
import tempfile
import wave
import zipfile
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image, ImageDraw
    from docx import Document
    from openpyxl import Workbook
    from pptx import Presentation
    from pptx.util import Inches
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.pdfgen import canvas
except ImportError as error:
    raise SystemExit(f'Missing generation dependency: {error}. Install scripts/sample-requirements.txt.') from error

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'test-files'
MANIFEST = ROOT / 'resources' / 'sample-files' / 'manifest.json'
FIXED_DATE = datetime(2020, 1, 1, tzinfo=timezone.utc)
items = []

def save(category, filename, data, title, description, fmt, mime, scenario, expected, validity='valid', tags=()):
    path = OUT / category / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    items.append({
        'id': f'{category}-{filename.replace(".", "-")}', 'title': title, 'description': description,
        'category': category, 'format': fmt, 'filename': filename, 'mimeType': mime,
        'sizeBytes': len(data), 'downloadUrl': f'/test-files/{category}/{filename}',
        'tags': list(tags), 'testScenario': scenario, 'expectedResult': expected,
        'validity': validity, 'access': 'free', 'sha256': hashlib.sha256(data).hexdigest(),
    })

def add(category, filename, data, title, description, fmt, mime, validity='valid', tags=(), scenario=None, expected=None):
    save(category, filename, data, title, description, fmt, mime,
         scenario or f'Test handling of {title.lower()}.',
         expected or ('The file should parse or open in a compatible application.' if validity == 'valid' else
                      'Handle this case according to your validation rules; do not assume that filename alone proves its format.'),
         validity, tags)

def fixed_zip(entries):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name, (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return buf.getvalue()

def normalize_office(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = {name: archive.read(name) for name in archive.namelist() if not name.endswith('/')}
    if 'docProps/core.xml' in entries:
        entries['docProps/core.xml'] = re.sub(rb'(<dcterms:modified[^>]*>)[^<]*(</dcterms:modified>)', rb'\g<1>2020-01-01T00:00:00Z\g<2>', entries['docProps/core.xml'])
    return fixed_zip(entries)

def pdf(kind):
    buf = io.BytesIO()
    size = (360, 720) if kind == 'unusual' else letter
    c = canvas.Canvas(buf, pagesize=size, invariant=1, pageCompression=1)
    c.setTitle('Kreativ Tools synthetic sample')
    if kind != 'blank':
        c.setFont('Helvetica', 18)
        c.drawString(48, size[1] - 70, 'Synthetic PDF sample')
        c.setFont('Helvetica', 11)
        c.drawString(48, size[1] - 95, f'Test case: {kind}')
    if kind == 'table':
        for row in range(4):
            c.drawString(60, 640 - row * 22, f'Item {row + 1}        Quantity: {row + 2}')
    if kind == 'image':
        image = Image.new('RGB', (64, 64), '#3498db')
        from reportlab.lib.utils import ImageReader
        c.drawImage(ImageReader(image), 50, 500, width=128, height=128)
    if kind == 'links':
        c.bookmarkPage('start')
        c.addOutlineEntry('Start', 'start', 0)
        c.drawString(48, 600, 'Go to page 2')
        c.linkRect('', 'second', (45, 592, 180, 620), relative=0)
        c.showPage()
        c.bookmarkPage('second')
        c.addOutlineEntry('Second page', 'second', 0)
        c.drawString(48, 700, 'Second page')
    if kind == 'form':
        c.acroForm.textfield(name='sample_name', tooltip='Sample name', x=48, y=600, width=220, height=22)
    if kind == 'multi':
        c.showPage()
        c.drawString(48, 700, 'Second synthetic page')
        c.showPage()
        c.drawString(48, 700, 'Third synthetic page')
    if kind == 'blank':
        c.showPage()
    c.save()
    return buf.getvalue()

def image_bytes(fmt, size=(96, 64), mode='RGB'):
    image = Image.new(mode, size, (38, 132, 190, 100) if mode == 'RGBA' else (38, 132, 190))
    if size[0] >= 20:
        ImageDraw.Draw(image).rectangle((5, 5, min(size[0]-1, 40), min(size[1]-1, 30)), fill=(255, 190, 50, 180) if mode == 'RGBA' else (255, 190, 50))
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return buf.getvalue()

def wav_bytes():
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(8000)
        audio.writeframes(b''.join(struct.pack('<h', int(8000 * math.sin(2 * math.pi * 440 * i / 8000))) for i in range(4000)))
    return buf.getvalue()

def generate():
    if not shutil.which('ffmpeg'):
        raise SystemExit('Missing ffmpeg. Install it before generating media samples.')
    for kind, filename, title in [
        ('basic', 'basic.pdf', 'One-page PDF'), ('multi', 'multipage.pdf', 'Three-page PDF'),
        ('image', 'image.pdf', 'PDF with an image'), ('table', 'table.pdf', 'PDF with a table'),
        ('links', 'links-bookmarks.pdf', 'PDF with links and bookmarks'), ('form', 'form.pdf', 'PDF with an interactive form'),
        ('unusual', 'unusual-size.pdf', 'PDF with unusual page dimensions'), ('blank', 'blank-page.pdf', 'Blank-page PDF')]:
        add('pdf', filename, pdf(kind), title, f'Synthetic {title.lower()} for document testing.', 'PDF', 'application/pdf', tags=(kind,))
    writer = PdfWriter(); writer.append(io.BytesIO(pdf('basic'))); writer.add_attachment('note.txt', b'Synthetic attachment.\n')
    buf = io.BytesIO(); writer.write(buf)
    add('pdf', 'attachment.pdf', buf.getvalue(), 'PDF with attachment', 'A PDF containing a harmless text attachment.', 'PDF', 'application/pdf', tags=('attachment',))
    writer = PdfWriter(); writer.append(io.BytesIO(pdf('basic'))); writer.encrypt('sample123')
    buf = io.BytesIO(); writer.write(buf)
    add('pdf', 'password-protected.pdf', buf.getvalue(), 'Password-protected PDF', 'Encrypted PDF; password: sample123.', 'PDF', 'application/pdf', 'edge', ('encrypted',), expected='A reader should request the password sample123 or report encrypted input.')
    add('pdf', 'truncated.pdf', b'%PDF-1.7\n1 0 obj\n<< /Type /Catalog', 'Truncated PDF', 'PDF header with an incomplete object and no trailer.', 'PDF', 'application/pdf', 'invalid', ('truncated',), expected='A PDF parser should reject the incomplete document.')
    add('pdf', 'pdf-with-txt-extension.txt', pdf('basic'), 'PDF with TXT extension', 'Valid PDF bytes saved with a .txt filename.', 'PDF', 'application/pdf', 'edge', ('extension-mismatch',), expected='Content sniffing identifies PDF; extension-only rules may reject or misclassify it.')

    for fmt, ext, mime in [('JPEG','jpg','image/jpeg'), ('PNG','png','image/png'), ('GIF','gif','image/gif'), ('WEBP','webp','image/webp')]:
        add('images', f'basic.{ext}', image_bytes(fmt), f'Basic {fmt} image', f'A small synthetic {fmt} image.', fmt, mime, tags=('basic',))
    add('images', 'transparent.png', image_bytes('PNG', mode='RGBA'), 'Transparent PNG', 'PNG with a partially transparent alpha channel.', 'PNG', 'image/png', tags=('alpha',))
    add('images', 'one-pixel.png', image_bytes('PNG', (1, 1)), 'One-pixel PNG', 'A valid 1 by 1 pixel PNG.', 'PNG', 'image/png', 'edge', ('small',))
    add('images', 'large-dimensions.png', image_bytes('PNG', (3000, 2000)), 'Large-dimension PNG', 'A small compressed file with 3000 by 2000 pixel dimensions.', 'PNG', 'image/png', 'edge', ('large-resolution',))
    add('images', 'shapes.svg', b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#2684be"/><circle cx="50" cy="30" r="15" fill="#ffbe32"/></svg>\n', 'Simple SVG', 'A small vector image with a rectangle and circle.', 'SVG', 'image/svg+xml', tags=('vector',))
    add('images', 'broken.png', b'not a png\n', 'Invalid PNG', 'Text bytes with a .png filename and no PNG signature.', 'PNG', 'text/plain', 'invalid', ('extension-mismatch',), expected='An image decoder should reject the file.')
    add('images', 'jpeg-with-png-extension.png', image_bytes('JPEG'), 'JPEG with PNG extension', 'Valid JPEG bytes saved with a .png filename.', 'JPEG', 'image/jpeg', 'edge', ('extension-mismatch',), expected='Content sniffing identifies JPEG despite the .png filename.')

    doc = Document(); doc.add_heading('Synthetic test document', 0); doc.add_paragraph('A small DOCX upload fixture.')
    doc.core_properties.author = 'Kreativ Tools'; doc.core_properties.last_modified_by = 'Kreativ Tools'
    doc.core_properties.created = FIXED_DATE; doc.core_properties.modified = FIXED_DATE
    buf = io.BytesIO(); doc.save(buf)
    add('documents', 'basic.docx', normalize_office(buf.getvalue()), 'Basic DOCX', 'A Word document with a heading and paragraph.', 'DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    book = Workbook(); sheet = book.active; sheet.title = 'Data'; sheet.append(['Item', 'Quantity', 'Price', 'Total']); sheet.append(['Synthetic item', 2, 3, '=B2*C2'])
    book.properties.creator = 'Kreativ Tools'; book.properties.lastModifiedBy = 'Kreativ Tools'
    book.properties.created = FIXED_DATE; book.properties.modified = FIXED_DATE
    buf = io.BytesIO(); book.save(buf)
    add('documents', 'formula.xlsx', normalize_office(buf.getvalue()), 'Spreadsheet with formula', 'XLSX with a data row and a multiplication formula; recalculation depends on the spreadsheet app.', 'XLSX', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    slides = Presentation(); slide = slides.slides.add_slide(slides.slide_layouts[1]); slide.shapes.title.text = 'Synthetic test slide'; slide.placeholders[1].text = 'A small presentation fixture.'
    slides.core_properties.author = 'Kreativ Tools'; slides.core_properties.last_modified_by = 'Kreativ Tools'
    slides.core_properties.created = FIXED_DATE; slides.core_properties.modified = FIXED_DATE
    buf = io.BytesIO(); slides.save(buf)
    add('documents', 'basic.pptx', normalize_office(buf.getvalue()), 'Basic PPTX', 'A one-slide synthetic presentation.', 'PPTX', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    add('documents', 'plain.txt', b'Synthetic plain text document.\nSecond line.\n', 'Plain text document', 'A short UTF-8 text file.', 'TXT', 'text/plain')
    add('documents', 'basic.rtf', b'{\\rtf1\\ansi Synthetic \\b bold\\b0  text.}\n', 'Basic RTF', 'An RTF document with a bold word.', 'RTF', 'application/rtf')

    archive = fixed_zip({'readme.txt': b'Synthetic ZIP fixture.\n', 'data.csv': b'item,count\nalpha,2\n'})
    add('archives', 'multiple-files.zip', archive, 'ZIP with files', 'An archive containing a text file and CSV.', 'ZIP', 'application/zip')
    add('archives', 'empty.zip', fixed_zip({}), 'Empty ZIP', 'A valid ZIP archive with no entries.', 'ZIP', 'application/zip', 'edge', ('empty',))
    add('archives', 'nested-directories.zip', fixed_zip({'folder/subfolder/note.txt': b'Synthetic nested file.\n'}), 'ZIP with nested directories', 'An archive containing a file in nested directories.', 'ZIP', 'application/zip')
    add('archives', 'nested-zip.zip', fixed_zip({'inner.zip': archive}), 'Nested ZIP', 'A ZIP containing a small ZIP archive.', 'ZIP', 'application/zip', 'edge', ('nested',))
    add('archives', 'truncated.zip', archive[:30], 'Truncated ZIP', 'A ZIP cut off before its central directory.', 'ZIP', 'application/zip', 'invalid', ('truncated',), expected='An archive reader should reject the incomplete archive.')

    data = [
        ('valid.json', b'{"items":[{"name":"alpha","count":2}]}\n', 'Valid JSON', 'A JSON object containing an array.', 'JSON', 'application/json', 'valid'),
        ('invalid.json', b'{"items": [1, 2,]}\n', 'Invalid JSON', 'JSON with a trailing comma in an array.', 'JSON', 'application/json', 'invalid'),
        ('valid.xml', b'<?xml version="1.0" encoding="UTF-8"?><items><item id="1">alpha</item><item id="2">beta</item></items>\n', 'Valid XML', 'Well-formed XML with two records.', 'XML', 'application/xml', 'valid'),
        ('malformed.xml', b'<items><item>alpha</items>\n', 'Malformed XML', 'XML with a missing closing item tag.', 'XML', 'application/xml', 'invalid'),
        ('quoted.csv', b'name,note\r\nAlpha,"comma, and ""quotes"""\r\nBeta,plain\r\n', 'CSV with quoted delimiters', 'CSV with a comma and escaped quotes inside a quoted field.', 'CSV', 'text/csv', 'valid'),
        ('simple.tsv', b'name\tcount\nalpha\t2\nbeta\t3\n', 'Simple TSV', 'Tab-separated data with a header.', 'TSV', 'text/tab-separated-values', 'valid'),
        ('simple.yaml', b'name: example\nitems:\n  - alpha\n  - beta\n', 'Simple YAML', 'A simple YAML mapping with a sequence.', 'YAML', 'application/yaml', 'valid'),
        ('unicode.txt', 'Synthetic Unicode: café, 日本語, العربية, 😀\n'.encode(), 'Unicode text', 'UTF-8 text containing accented, CJK, Arabic, and emoji characters.', 'TXT', 'text/plain', 'valid'),
        ('empty.txt', b'', 'Empty text file', 'A zero-byte text file.', 'TXT', 'text/plain', 'edge'),
        ('empty.json', b'', 'Empty JSON file', 'A zero-byte file with a JSON extension; empty content is not valid JSON.', 'JSON', 'application/json', 'invalid'),
    ]
    for filename, content, title, description, fmt, mime, validity in data:
        add('data', filename, content, title, description, fmt, mime, validity, ('empty',) if not content else (), expected='A JSON parser should reject empty input.' if filename == 'empty.json' else ('A JSON parser should reject the trailing comma.' if filename == 'invalid.json' else ('An XML parser should reject the mismatched tags.' if filename == 'malformed.xml' else None)))

    wav = wav_bytes()
    add('audio-video', 'tone.wav', wav, 'Short WAV tone', 'A half-second 440 Hz synthetic mono WAV.', 'WAV', 'audio/wav')
    mp3 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'wav', '-i', 'pipe:0', '-map_metadata', '-1', '-write_xing', '0', '-f', 'mp3', 'pipe:1'], input=wav, stdout=subprocess.PIPE, check=True).stdout
    add('audio-video', 'tone.mp3', mp3, 'Short MP3 tone', 'A half-second synthetic MP3 tone.', 'MP3', 'audio/mpeg')
    mp4 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=4:d=1', '-an', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1'], stdout=subprocess.PIPE, check=True).stdout
    add('audio-video', 'blue.mp4', mp4, 'Short silent MP4', 'A one-second silent blue video, encoded as H.264 MP4.', 'MP4', 'video/mp4', tags=('silent',))

    scenarios = {
        'multipage.pdf': ('Verify page count and page order.', 'A compatible PDF reader should show three pages in order.'),
        'image.pdf': ('Verify embedded image rendering.', 'A compatible PDF reader should render the blue and yellow image.'),
        'table.pdf': ('Check layout and text extraction from a table-like document.', 'A compatible reader should display four synthetic rows; extraction layout can vary.'),
        'links-bookmarks.pdf': ('Check internal navigation and document outlines.', 'A compatible reader should expose two bookmarks and a link to page two.'),
        'form.pdf': ('Check interactive form handling.', 'A compatible reader should expose a text field named sample_name.'),
        'attachment.pdf': ('Check embedded-file handling.', 'A compatible reader should list the harmless note.txt attachment.'),
        'unusual-size.pdf': ('Check nonstandard page dimensions.', 'A compatible reader should report a 360 by 720 point page.'),
        'blank-page.pdf': ('Check a PDF with no visible content.', 'A compatible reader should open a one-page blank document.'),
        'transparent.png': ('Check alpha-channel handling.', 'A compatible image reader should preserve partial transparency.'),
        'one-pixel.png': ('Check minimum image dimensions.', 'A compatible image reader should report one by one pixel.'),
        'large-dimensions.png': ('Check pixel-dimension limits separately from file size.', 'A compatible image reader should report 3000 by 2000 pixels; application limits may reject it.'),
        'formula.xlsx': ('Check workbook and formula import.', 'The sheet contains data and the formula =B2*C2; the reader may need to recalculate.'),
        'empty.zip': ('Check empty archive handling.', 'An archive reader should open a valid ZIP with zero entries.'),
        'nested-directories.zip': ('Check archive path handling.', 'A compatible archive reader should list folder/subfolder/note.txt.'),
        'nested-zip.zip': ('Check nested archive handling without automatic extraction.', 'An archive reader should list inner.zip; nested extraction depends on application policy.'),
        'quoted.csv': ('Check quoted delimiters and escaped quotes.', 'The first data row has two fields; its second value contains a comma and quotes.'),
        'unicode.txt': ('Check UTF-8 text handling.', 'A UTF-8 reader should preserve accented, CJK, Arabic, and emoji characters.'),
        'empty.txt': ('Check zero-byte file handling.', 'The file exists and contains zero bytes; acceptance depends on application rules.'),
        'tone.wav': ('Check short uncompressed audio playback.', 'A compatible reader should decode a half-second mono 440 Hz tone.'),
        'tone.mp3': ('Check compressed audio playback.', 'A compatible MP3 decoder should play a short synthetic tone.'),
        'blue.mp4': ('Check silent video playback.', 'A compatible H.264 MP4 player should show a short blue video with no audio track.'),
    }
    for item in items:
        if item['filename'] in scenarios:
            item['testScenario'], item['expectedResult'] = scenarios[item['filename']]
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({'version': 1, 'samples': items}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generated {len(items)} synthetic samples in {OUT}')

if __name__ == '__main__':
    public_out, public_manifest = OUT, MANIFEST
    try:
        with tempfile.TemporaryDirectory(prefix='kreativ-samples-') as temp:
            OUT = Path(temp) / 'test-files'
            MANIFEST = Path(temp) / 'manifest.json'
            generate()
            for fixture in OUT.rglob('*'):
                if fixture.is_file():
                    target = public_out / fixture.relative_to(OUT)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(fixture, target)
            public_manifest.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=public_manifest.parent, delete=False) as staged_manifest:
                staged_path = Path(staged_manifest.name)
                staged_manifest.write(MANIFEST.read_bytes())
            try:
                os.replace(staged_path, public_manifest)
            finally:
                staged_path.unlink(missing_ok=True)
            print(f'Updated public fixtures and catalog in {public_out}')
    except subprocess.CalledProcessError as error:
        raise SystemExit(f'Media generation failed. Check that FFmpeg supports MP3 and libx264: {error}') from error
