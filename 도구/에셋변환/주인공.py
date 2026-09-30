# -*- coding: utf-8 -*-
"""
주인공 파츠 PNG ↔ 게임 코드

주인공 = 종이 인형. 몸(대머리 얼굴·목·손) 위에 하의 → 상의 → 헤어를 차례로 겹친다. 모두 24×28칸 틀이고, 쓰지 않는 칸은 투명.
  에셋/캐릭터/몸_<이름>.png      → 기본 뼈대 (지금은 몸_기본 하나)
  에셋/캐릭터/머리_<이름>.png    → 헤어 (머리칼만)       ┐
  에셋/캐릭터/상의_<이름>.png    → 상의 (셔츠·팔·손)     ├ 캐릭터를 만들 때 화살표로 고른다. 파일을 더하면 선택지가 늘어난다
  에셋/캐릭터/하의_<이름>.png    → 하의 (바지·신발)      ┘
  에셋/캐릭터/코스튬_<이름>.png  → 한 벌 옷. 입으면 상의·하의 대신 겹친다 (몸 → 코스튬 → 헤어)
PNG는 왼쪽을 보고 그린다(게임이 좌우를 뒤집어 오른쪽을 보게 한다). 걷기 그림은 게임이 자동으로 만든다.

쓰는 법 (프로젝트 폴더에서)
  python 도구/에셋변환/주인공.py 넣기       → PNG들을 읽어 코드/그림/art.js 의 HERO_PARTS 를 바꾼다
  python 도구/에셋변환/주인공.py 내보내기   → 반대로 art.js 에서 PNG들을 만든다

색 규칙
  - 어떤 색이든 그대로 들어간다. (하위 폴더에 넣어도 된다: 에셋/캐릭터/머리/머리_*.png 처럼. _이전판 폴더는 읽지 않는다)
  - 외형 상점의 머리색 바꾸기는 주인공 팔레트의 머리칼 색(h·H·g·G) 칸에만, 옷색 바꾸기는 셔츠 색(t·T) 칸에만 걸린다.
    팔레트 밖의 색으로 칠한 칸은 색이 바뀌지 않는다.
  - 파츠끼리 맞닿는 테두리는 양쪽 파츠에 다 그려 두면 된다(같은 칸에 같은 색이 겹칠 뿐).
"""
import re, sys, os, glob, json
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, '코드', '그림', 'art.js')
DIR = os.path.join(ROOT, '에셋', '캐릭터')
W, H = 24, 28  # 양옆 3칸은 옆으로 뻗는 머리칼·옷자락 자리 (2026-09-30 18 → 24)
BEGIN, END = '// <주인공 파츠>', '// </주인공 파츠>'
KINDS = (('base', '몸'), ('hair', '머리'), ('top', '상의'), ('bottom', '하의'), ('costume', '코스튬'))
EXACT = {'base', 'hair', 'top', 'bottom', 'costume'}  # 모두 색을 그대로 쓴다 (팔레트와 같은 색만 팔레트 글자 → 그 칸은 머리색·옷색 바꾸기가 걸림)
src = open(ART, encoding='utf-8').read()
colors = dict(re.findall(r"(\w+): '(#[0-9a-fA-F]{6})'", src[src.index('const COLORS = {'):src.index('};', src.index('const COLORS = {'))]))
hero_pal = dict(re.findall(r"(\w): '(\w+)'", re.search(r"  hero: \{([^}]*)\}", src).group(1)))
letter_hex = {ch: colors[tok].lower() for ch, tok in hero_pal.items() if tok in colors}
hex_letter = {}
for ch, hx in letter_hex.items(): hex_letter.setdefault(hx, ch)  # 같은 색이면 앞 글자 (테두리 o 와 눈 e)
def hex_rgb(h): return tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))

if len(sys.argv) < 2 or sys.argv[1] not in ('넣기', '내보내기'): raise SystemExit(__doc__)

def block_json(name):
    i = src.index(f'const {name} = ') + len(f'const {name} = ')
    return json.loads(src[i:src.index(';\n', i)])

if sys.argv[1] == '내보내기':
    parts, extra = block_json('HERO_PARTS'), block_json('HERO_EXTRA')
    for kind, pre in KINDS:
        for name, rows in parts.get(kind, {}).items():
            im = Image.new('RGBA', (W, H))
            for y, r in enumerate(rows):
                for x, ch in enumerate(r):
                    hx = letter_hex.get(ch) or extra.get(ch)
                    if hx: im.putpixel((x, y), hex_rgb(hx) + (255,))
            im.save(os.path.join(DIR, f'{pre}_{name}.png')); print(f'내보냄: {pre}_{name}.png (에셋/캐릭터 바로 아래)')
else:
    parts, extra = {k: {} for k, _ in KINDS}, {}
    hex_extra = {}  # 코스튬 색 → 글자 (사용자 영역 유니코드 문자 U+E000~)
    for kind, pre in KINDS:
        for f in sorted(glob.glob(os.path.join(DIR, '**', f'{pre}_*.png'), recursive=True)):
            if '_이전판' in f: continue
            name = os.path.splitext(os.path.basename(f))[0][len(pre) + 1:]
            im = Image.open(f).convert('RGBA')
            if im.size != (W, H): raise SystemExit(f'{os.path.basename(f)}: 크기가 {im.size} — 주인공 틀은 {W}×{H} 이어야 한다 (자리가 어긋나지 않게)')
            rows, fixed = [], 0
            for y in range(H):
                r = ''
                for x in range(W):
                    c = im.getpixel((x, y))
                    if c[3] < 128: r += '.'; continue
                    hx = '#%02x%02x%02x' % c[:3]
                    if kind in EXACT and hx not in hex_letter:
                        if hx not in hex_extra: hex_extra[hx] = chr(0xE000 + len(hex_extra)); extra[hex_extra[hx]] = hx
                        r += hex_extra[hx]; continue
                    if hx not in hex_letter:
                        hx = min(hex_letter, key=lambda k: sum((a - b) ** 2 for a, b in zip(hex_rgb(k), c[:3]))); fixed += 1
                    r += hex_letter[hx]
                rows.append(r)
            parts[kind][name] = rows
            print(f'넣음: {pre}_{name}' + (f' (팔레트에 없는 색 {fixed}칸을 가까운 색으로)' if fixed else ''))
    if not all(parts[k] for k in ('base', 'hair', 'top', 'bottom')): raise SystemExit('몸_·머리_·상의_·하의_ PNG가 하나씩은 있어야 한다')
    # 장비 방어구: 에셋/장비/<N>지역_<세트>/머리·상의·장갑·하의·신발.png → HERO_PARTS.gear[N][부위]. 색은 늘 그대로 (머리 염색·옷 색 바꾸기가 걸리지 않게 팔레트 글자로 바꾸지 않는다. 테두리색만 o)
    GEAR = (('head', '머리'), ('body', '상의'), ('arms', '장갑'), ('legs', '하의'), ('feet', '신발'))
    parts['gear'] = {}
    for d in sorted(glob.glob(os.path.join(ROOT, '에셋', '장비', '*지역_*'))):
        n = os.path.basename(d).split('지역')[0]
        if not n.isdigit(): continue
        for key, fn in GEAR:
            f = os.path.join(d, fn + '.png')
            if not os.path.exists(f): continue
            im = Image.open(f).convert('RGBA')
            if im.size != (W, H): raise SystemExit(f'{f}: 크기가 {im.size} — 장비 방어구는 {W}×{H}')
            rows = []
            for y in range(H):
                r = ''
                for x in range(W):
                    c = im.getpixel((x, y))
                    if c[3] < 128: r += '.'; continue
                    hx = '#%02x%02x%02x' % c[:3]
                    if hex_letter.get(hx) == 'o': r += 'o'; continue
                    if hx not in hex_extra: hex_extra[hx] = chr(0xE000 + len(hex_extra)); extra[hex_extra[hx]] = hx
                    r += hex_extra[hx]
                rows.append(r)
            parts['gear'].setdefault(n, {})[key] = rows
        print(f'넣음: 장비 {os.path.basename(d)} ({", ".join(parts["gear"].get(n, {}).keys())})')
    block = (BEGIN + ' 자동 생성: 도구/에셋변환/주인공.py 넣기 — 에셋/캐릭터/몸_·머리_·상의_·하의_·코스튬_*.png 를 옮긴 것\n'
             'const HERO_PARTS = ' + json.dumps(parts, ensure_ascii=False, indent=1) + ';\n'
             '// 코스튬 색 (글자 → 색)\nconst HERO_EXTRA = ' + json.dumps(extra) + ';\n' + END)
    i, j = src.index(BEGIN), src.index(END) + len(END)
    open(ART, 'w', encoding='utf-8').write(src[:i] + block + src[j:])
    print(f'저장: 코드/그림/art.js (HERO_PARTS, 코스튬 색 {len(extra)}개)')
