#!/usr/bin/env python3
"""Generate transparent coupon glyph PNGs for commissioner story banners."""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'comissionado', 'glyphs')
CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
SIZES = [160, 130, 105, 82]
FONT_PATH = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

os.makedirs(OUT, exist_ok=True)

try:
    font_cache = {}
    def get_font(size):
        if size not in font_cache:
            font_cache[size] = ImageFont.truetype(FONT_PATH, size)
        return font_cache[size]
except Exception:
    get_font = lambda s: ImageFont.load_default()

metrics = {}
for size in SIZES:
    size_dir = os.path.join(OUT, str(size))
    os.makedirs(size_dir, exist_ok=True)
    font = get_font(size)
    max_h = 0
    advances = {}
    for ch in CHARS:
        bbox = font.getbbox(ch)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        pad = max(8, size // 12)
        img = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.text((pad - bbox[0], pad - bbox[1]), ch, fill=(0, 0, 0, 255), font=font)
        img.save(os.path.join(size_dir, f'{ch}.png'))
        advances[ch] = w + pad
        max_h = max(max_h, h + pad * 2)
    metrics[size] = {'height': max_h, 'advances': advances}

# write metrics json for worker
import json
with open(os.path.join(OUT, 'metrics.json'), 'w') as f:
    json.dump(metrics, f)
print('glyphs ok', OUT)
