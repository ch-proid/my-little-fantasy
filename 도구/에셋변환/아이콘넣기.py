# -*- coding: utf-8 -*-
"""
아이콘 PNG → 게임 코드 (픽셀 하나도 바꾸지 않는다)

에셋/아이콘/*.png 를 모두 읽어 코드/그림/icons.js 를 만든다. 파일 이름(확장자 뺀 것)이 아이콘 이름이다.
 - 투명한 가장자리(고칠 때 쓰는 10px 여백)는 잘라 낸다.
 - 게임은 iconCanvas('이름') 으로 그린다. 칸 1개 = 1픽셀 그대로.
쓰는 법 (프로젝트 폴더에서): python 도구/에셋변환/아이콘넣기.py
"""
import os, glob, json
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
out = {}
for f in sorted(glob.glob(os.path.join(ROOT, '에셋', '아이콘', '*.png'))):
    im = Image.open(f).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox())
    pal, rows = {}, []
    for y in range(im.height):
        r = ''
        for x in range(im.width):
            c = im.getpixel((x, y))
            if c[3] < 128: r += '.'; continue
            hx = '#%02x%02x%02x' % c[:3]
            if hx not in pal:
                if len(pal) >= len(LETTERS): raise SystemExit(f'{f}: 색이 너무 많다')
                pal[hx] = LETTERS[len(pal)]
            r += pal[hx]
        rows.append(r)
    name = os.path.splitext(os.path.basename(f))[0]
    out[name] = {'pal': {v: k for k, v in pal.items()}, 'map': rows}
    print(f'{name}: {im.width}x{im.height}, {len(pal)}색')
js = ["'use strict';",
      '// 자동 생성: 도구/에셋변환/아이콘넣기.py — 에셋/아이콘/*.png 를 그대로 옮긴 것. 고칠 때는 PNG를 고치고 다시 만든다.',
      'const ICONS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';',
      '// 아이콘 그림 (칸 1개 = 1픽셀, 한 번 그리면 담아 둔다)',
      'const iconCache = new Map();',
      'function iconCanvas(name) {',
      '  let c = iconCache.get(name); if (c) return c;',
      "  const d = ICONS[name]; c = document.createElement('canvas'); c.width = d.map[0].length; c.height = d.map.length; const g = c.getContext('2d');",
      '  d.map.forEach((row, y) => [...row].forEach((ch, x) => { const col = d.pal[ch]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }));',
      '  iconCache.set(name, c); return c;',
      '}']
open(os.path.join(ROOT, '코드', '그림', 'icons.js'), 'w', encoding='utf-8').write('\n'.join(js) + '\n')
print('저장: 코드/그림/icons.js')
