#!/usr/bin/env python3
# OUTMOVE logosu (V31, 22 Kasım 2026): piksel halter + "seviye atla" oku. Bütün ikonlar bu ızgaradan üretilir.
# Kullanım: python3 scripts/brand-icons.py   (Pillow gerekir: pip install pillow)
# Çıktılar: public/icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png,
#           android mipmap-*/ic_launcher*.png, docs/play-store/icon-512.png
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID = """
................................
................................
................................
...............yf...............
..............ppFf.........G....
.............pFpFFf.............
.......h....pFFpFFFf............
......hyh..pFFFpFFFFf...........
.......h..pFFFFFFFFFFf...h......
.........pFFFFFFFFFFFFf.hyh.....
........pFFFFFFFFFFFFFFf.h......
....G........pFFFFf.............
.............pFFFFf.............
.............pFFFFf.............
.............pFFFFf.............
......yGg....pFFFFf....yGg......
......hGg....frrrrr....hGg......
......hGghg..........hghGg......
......hGghg..........hghGg......
......hGghgL........LhghGg......
..WWWWhGghgLWWWWWWWWLhghGgWWWW..
..wwwwhGghgLwwwwwwwwLhghGgwwww..
......hGghgL........LhghGg......
......hGghg..........hghGg......
......hGghg..........hghGg......
......hGg..............hGg......
......ggg..............ggg......
................................
................................
................................
................................
................................
""".strip().split('\n')
N = 32
PAL = {
    'F': '#ff5b3a', 'p': '#ff8a66', 'f': '#b8321f', 'r': '#d9432a',   # ok (ateş)
    'G': '#ffc53d', 'h': '#ffe39a', 'g': '#c98a12', 'y': '#fff2c2',   # plakalar ve parıltılar (altın)
    'W': '#f5f1e8', 'w': '#bdb7d6', 'L': '#3c3660',                   # bar ve kilitler
}
BG, GRIDLINE, SHADOW = '#100e1b', '#151225', '#07060d'
assert len(GRID) == N and all(len(r) == N for r in GRID)


def motif(cell, shadow=True):
    """Yalnız logo (şeffaf zemin), hücre başına `cell` piksel, 1 hücrelik koyu gölgeyle."""
    im = Image.new('RGBA', (N * cell, N * cell), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shadow:
        for y, row in enumerate(GRID):
            for x, c in enumerate(row):
                if c != '.' and x + 1 < N and y + 1 < N:
                    d.rectangle([(x + 1) * cell, (y + 1) * cell, (x + 2) * cell - 1, (y + 2) * cell - 1], fill=SHADOW)
    for y, row in enumerate(GRID):
        for x, c in enumerate(row):
            if c != '.':
                d.rectangle([x * cell, y * cell, (x + 1) * cell - 1, (y + 1) * cell - 1], fill=PAL[c])
    return im


def tile(size, cell, shape='square', grid=True):
    """Koyu zemin (+ piksel ızgara) üstünde ortalanmış logo. shape: square | rounded | circle."""
    bg = Image.new('RGBA', (size, size), BG)
    if grid:
        d = ImageDraw.Draw(bg)
        step = max(2, round(size / 16))
        for i in range(0, size, step):
            d.line([(i, 0), (i, size)], fill=GRIDLINE, width=max(1, size // 256))
            d.line([(0, i), (size, i)], fill=GRIDLINE, width=max(1, size // 256))
    m = motif(cell)
    off = (size - m.width) // 2
    bg.alpha_composite(m, (off, off))
    if shape != 'square':
        mask = Image.new('L', (size, size), 0)
        md = ImageDraw.Draw(mask)
        if shape == 'circle':
            md.ellipse([0, 0, size - 1, size - 1], fill=255)
        else:
            md.rounded_rectangle([0, 0, size - 1, size - 1], radius=round(size * 0.225), fill=255)
        bg.putalpha(mask)
    return bg


def scaled(size, shape, grid=True):
    """Tam sayı ölçeğe uymayan küçük boyutlar: büyük çiz, yumuşak küçült."""
    return tile(512, 16, shape, grid).resize((size, size), Image.LANCZOS)


def save(im, *parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    print('✓', os.path.relpath(path, ROOT), im.size)


# Web / PWA
save(tile(512, 16, 'rounded'), 'public', 'icon-512.png')
save(scaled(192, 'rounded'), 'public', 'icon-192.png')
save(tile(512, 12, 'square'), 'public', 'icon-maskable-512.png')      # logo güvenli alanın (%80) içinde
save(scaled(180, 'square', grid=False), 'public', 'apple-touch-icon.png')

# favicon (SVG): yatay piksel dizileri tek dikdörtgen
runs = []
for y, row in enumerate(GRID):
    x = 0
    while x < N:
        c = row[x]
        if c == '.':
            x += 1
            continue
        x0 = x
        while x < N and row[x] == c:
            x += 1
        runs.append(f'<rect x="{x0}" y="{y}" width="{x - x0}" height="1" fill="{PAL[c]}"/>')
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">'
       f'<rect width="32" height="32" rx="7" fill="{BG}"/>' + ''.join(runs) + '</svg>\n')
with open(os.path.join(ROOT, 'public', 'icon.svg'), 'w') as fh:
    fh.write(svg)
print('✓ public/icon.svg')

# Android: adaptive ön plan (108 dp tuval, logo ~%59 = güvenli daire içinde, tam sayı ölçek) + eski ikonlar
RES = ('android', 'app', 'src', 'main', 'res')
for dens, fg, cell, legacy in (('mdpi', 108, 2, 48), ('hdpi', 162, 3, 72), ('xhdpi', 216, 4, 96),
                               ('xxhdpi', 324, 6, 144), ('xxxhdpi', 432, 8, 192)):
    canvas = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
    m = motif(cell)
    canvas.alpha_composite(m, ((fg - m.width) // 2, (fg - m.height) // 2))
    save(canvas, *RES, f'mipmap-{dens}', 'ic_launcher_foreground.png')
    save(scaled(legacy, 'rounded'), *RES, f'mipmap-{dens}', 'ic_launcher.png')
    save(scaled(legacy, 'circle'), *RES, f'mipmap-{dens}', 'ic_launcher_round.png')

# Google Play mağaza ikonu: 512×512, 32 bit, köşesiz (Play kendi maskesini uygular)
save(tile(512, 16, 'square'), 'docs', 'play-store', 'icon-512.png')
