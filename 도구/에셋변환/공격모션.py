# -*- coding: utf-8 -*-
"""
공격 모션 프레임 PNG 뽑기 (도구/장비 미리보기.html 의 공격 모션과 같은 규칙)

지역 세트마다, 무기마다 공격 순간 5장을 PNG로 저장한다. 칸 1개 = 1픽셀, 배경 투명, 게임 방향(오른쪽을 봄).
  에셋/모션/공격/<N지역_세트이름>/<무기>_<번호>_<이름>.png
그림 한 장 = 무대 46×36칸. 캐릭터는 왼쪽 3칸·위 6칸 떨어진 자리(발바닥 = 33줄)에 선다.
규칙: 무기는 90도 단위로만 돌린다(도트가 깨지지 않게). 무기 쥔 손(손목~손)을 몸에서 떼어 옮기고 무기 위에 다시 그린다.

사람이 고친 프레임: 에셋/모션/공격/_사용자 수정/<N지역_세트>/ 에 두면 규칙으로 만든 것 대신 그것을 쓴다(덮어쓴다).
  <무기>_<번호>_<이름>.png 한 장, 또는 <무기>_<번호>_<이름>-sheet.png (46칸씩 가로로 이어 붙인 여러 장 → 그 번호부터 차례로)
엽총 두 손 받치기 (2026-09-30 사용자가 고친 겨누기 시트에서 뽑은 규칙): 겨누기·쏘기·총알 장면에서
  뒷손(게임 방향 몸 그림 1~9칸, 18~22줄)을 앞손이 움직인 만큼 + 앞으로 3칸 옮기고, 뒷소매 끝 줄(17줄)을 앞으로 1칸.

쓰는 법 (프로젝트 폴더에서): python 도구/에셋변환/공격모션.py [헤어 이름=뾰족 머리]
"""
import os, sys, glob, math
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CH = os.path.join(ROOT, '에셋', '캐릭터')
GEAR = os.path.join(ROOT, '에셋', '장비')
OUT = os.path.join(ROOT, '에셋', '모션', '공격')
HAIR = sys.argv[1] if len(sys.argv) > 1 else '뾰족 머리'
W, H = 24, 28; LEG = H - 5; HALF = W // 2
SW, SH, OX, OY = W + 22, H + 8, 3, 6
HOLD = {'검': ((0.25, 0.75), (0.95, 0.05)), '완드': ((0.25, 0.75), (0.9, 0.08)), '엽총': ((0.28, 0.5), (0.98, 0.2))}
jsround = lambda v: math.floor(v + 0.5)  # 자바스크립트 Math.round 와 같게

def load(p):
    return Image.open(p).convert('RGBA') if p and os.path.exists(p) else None
def part(pre, name):
    for p in (os.path.join(CH, f'{pre}_{name}.png'), os.path.join(CH, pre, f'{pre}_{name}.png'), os.path.join(CH, '머리', f'{pre}_{name}.png')):
        if os.path.exists(p): return load(p)
def compose(setdir):
    g = lambda k: load(os.path.join(setdir, k + '.png'))
    im = Image.new('RGBA', (W, H))
    for L in (part('몸', '기본'), part('하의', '기본'), g('하의'), g('신발'), part('상의', '기본'), g('상의'), g('장갑'), part('머리', HAIR), g('머리')):
        if L: im.alpha_composite(L)
    return im
def step_down(src):  # 딛기(D): 다리 위 몸 전체가 1칸 내려앉는다
    out = Image.new('RGBA', (W, H)); out.alpha_composite(src.crop((0, LEG - 1, W, H)), (0, LEG - 1)); out.alpha_composite(src.crop((0, 0, W, LEG - 1)), (0, 1)); return out

def pose(u, weapon):  # 장비 미리보기.html 의 attackPose 와 같다
    p = dict(k='A', bdx=0, rot=0, hdx=0, hdy=0, wdx=0, wdy=0, fx=None)
    if weapon == '검':
        if u < 0.28: p.update(rot=-1, bdx=-1, hdy=-2)
        elif u < 0.36: p.update(k='D', bdx=1, rot=0, hdx=1, hdy=-1, fx=('slash', 0))
        elif u < 0.5: p.update(k='D', bdx=1, rot=1, hdx=1, hdy=-2, wdy=-1, fx=('slash', 1))
        elif u < 0.62: p.update(k='D', rot=1, hdy=-2, wdy=-1, fx=('slash', 2))
    elif weapon == '엽총':  # bh: 뒷손으로 개머리판을 받친다
        if u < 0.25: p.update(hdy=-1, bh=True)
        elif u < 0.33: p.update(hdx=-1, hdy=-1, bh=True, fx=('muzzle', 0))
        elif u < 0.5: p.update(hdy=-1, bh=True, fx=('bullet', (u - 0.33) / 0.17))
        else: p.update(hdy=-1, bh=True)  # 제자리도 두 손으로 든 채 (엽총 기본 자세 = 겨누기)
    else:
        if u < 0.3: p.update(k='D', hdy=-2)
        elif u < 0.6: p.update(k='D', hdx=1, hdy=-2, fx=('magic', (u - 0.3) / 0.3))
    return p
KEYS = {'검': [(0.1, '치켜들기'), (0.3, '내리베기'), (0.4, '끝까지'), (0.55, '여운'), (0.9, '제자리')],
        '엽총': [(0.1, '겨누기'), (0.3, '쏘기'), (0.36, '총알1'), (0.45, '총알2'), (0.9, '제자리')],
        '완드': [(0.1, '들어올리기'), (0.35, '마법1'), (0.45, '마법2'), (0.55, '마법3'), (0.9, '제자리')]}

def rgba(c):
    if c.startswith('#'): return tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
    v = c[c.index('(') + 1:-1].split(','); return (int(v[0]), int(v[1]), int(v[2]), int(float(v[3]) * 255))
def fx(stage, kind, v, hx, hy, tip):
    def cell(x, y, c):
        x, y = jsround(x), jsround(y)
        if 0 <= x < SW and 0 <= y < SH:
            dot = Image.new('RGBA', (1, 1), rgba(c)); stage.alpha_composite(dot, (x, y))
    if kind == 'slash':
        r = 10; frm = [-80, -40, -10][v]; to = [10, 60, 70][v]
        cols = ['rgba(255,255,255,0.45)', 'rgba(255,240,190,0.3)'] if v == 2 else ['#ffffff', '#fff0bf']
        for a in range(frm, to + 1, 5):
            rad = a * math.pi / 180
            for d in range(2): cell(hx + math.cos(rad) * (r - d), hy + math.sin(rad) * (r - d), cols[d])
    elif kind == 'muzzle':
        x, y = hx + tip[0] + 1, hy + tip[1]
        for dx, dy, c in [(0, 0, '#ffffff'), (1, 0, '#ffe27a'), (-1, 0, '#ffe27a'), (0, 1, '#ffe27a'), (0, -1, '#ffe27a'), (2, -1, '#ffb347'), (1, -2, '#ffb347')]: cell(x + dx, y + dy, c)
    elif kind == 'bullet':
        n = 1 + math.floor(v * 4); x0, y0 = hx + tip[0] + 1, hy + tip[1]
        for i in range(3): cell(x0 + n + i, y0, '#ffffff' if i == 2 else f'rgba(255,240,190,{0.35 + i * 0.25})')
    elif kind == 'magic':
        x, y, R = hx + tip[0], hy + tip[1], 1 + math.floor(v * 5)
        for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]: cell(x + dx, y + dy, '#c9f1ff' if dx or dy else '#ffffff')
        for a in range(0, 360, 30):
            rad = a * math.pi / 180; cell(x + math.cos(rad) * R, y + math.sin(rad) * R, f'rgba(180,230,255,{1 - v})')

def support_hand(s, P):  # 게임 방향 몸 그림에서 뒷손을 앞으로 (엽총 두 손 받치기)
    patch = s.crop((1, 18, 10, 23)); out = s.copy(); out.paste((0, 0, 0, 0), (1, 17, 10, 23))
    out.alpha_composite(s.crop((1, 17, 10, 18)), (2, 17))                 # 뒷소매 끝 줄 1칸 앞
    out.alpha_composite(patch, (1 + 3 + P['hdx'], 18 + P['hdy']))         # 뒷손: 앞손과 함께 + 앞으로 3칸
    return out
def seal(im):  # 테두리 메우기: 테두리색(RGB 합 200 미만)이 아닌 칸 옆 빈칸에 테두리를 그린다 (art.js sealLine 과 같다)
    px = im.load(); w, h = im.size; add = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= 128: continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] >= 128 and sum(px[x + dx, y + dy][:3]) >= 200 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): add.append((x, y))
    for p in add: px[p] = (0x34, 0x18, 0x16, 255)
def frame(base, weapon_img, wname, u):
    P = pose(u, wname)
    src = step_down(base) if P['k'] == 'D' else base
    src = src.transpose(Image.FLIP_LEFT_RIGHT)  # 게임 방향
    if P.get('bh'): src = support_hand(src, P)
    dy = 1 if P['k'] == 'D' else 0; bdx = P['bdx']
    stage = Image.new('RGBA', (SW, SH))
    HX, HY, HW, HH = W - 9, LEG - 4 + dy, 6, 4
    body = src.copy(); body.paste((0, 0, 0, 0), (HX, HY, HX + HW, HY + HH))
    stage.alpha_composite(body, (OX + bdx, OY))
    hand = src.crop((HX, HY, HX + HW, HY + HH)); hand_at = (OX + bdx + HX + P['hdx'], OY + HY + P['hdy'])
    stage.alpha_composite(hand, hand_at); seal(stage)  # 몸+옮긴 손에서 드러난 곳에 테두리 (무기·효과는 제 테두리가 있다)
    ww, wh = weapon_img.width - 20, weapon_img.height - 20
    (gfx, gfy), (tfx, tfy) = HOLD[wname]
    gx, gy = jsround(10 + ww * gfx), jsround(10 + wh * gfy)
    hx = OX + bdx + HALF + 5 + P['hdx'] + P['wdx']; hy = OY + H - 8 + dy + P['hdy'] + P['wdy']
    px = weapon_img.load()
    for y in range(weapon_img.height):
        for x in range(weapon_img.width):
            c = px[x, y]
            if c[3] == 0: continue
            if P['rot'] == 0: X, Y = hx + x - gx, hy + y - gy
            elif P['rot'] == 1: X, Y = hx - (y - gy) - 1, hy + (x - gx)   # 시계 방향 90도
            else: X, Y = hx + (y - gy), hy - (x - gx) - 1                  # 반시계 방향 90도
            if 0 <= X < SW and 0 <= Y < SH:
                dot = Image.new('RGBA', (1, 1), c); stage.alpha_composite(dot, (X, Y))
    stage.alpha_composite(hand, hand_at)  # 손은 무기 위에 한 번 더
    if P['fx']: fx(stage, P['fx'][0], P['fx'][1], hx, hy, (jsround(10 + ww * tfx) - gx, jsround(10 + wh * tfy) - gy))
    return stage

n = 0
for setdir in sorted(glob.glob(os.path.join(GEAR, '*지역_*'))):
    base = compose(setdir); name = os.path.basename(setdir); od = os.path.join(OUT, name); os.makedirs(od, exist_ok=True)
    for wname, keys in KEYS.items():
        wimg = load(os.path.join(setdir, wname + '.png'))
        if not wimg: continue
        for i, (u, label) in enumerate(keys, 1):
            frame(base, wimg, wname, u).save(os.path.join(od, f'{wname}_{i}_{label}.png')); n += 1
    fixed = os.path.join(OUT, '_사용자 수정', name)  # 사람이 고친 프레임이 있으면 그것으로 덮어쓴다
    for f in sorted(glob.glob(os.path.join(fixed, '*.png'))):
        b = os.path.basename(f)[:-4]
        if b.endswith('-sheet'):
            wname, num, _ = b[:-6].split('_', 2); sheet = Image.open(f).convert('RGBA')
            labels = [lab for _, lab in KEYS[wname]]
            for k in range(sheet.width // SW):
                i = int(num) + k
                if i <= len(labels): sheet.crop((k * SW, 0, (k + 1) * SW, SH)).save(os.path.join(od, f'{wname}_{i}_{labels[i - 1]}.png'))
            print(f'  사용자 수정 반영: {os.path.basename(f)} → {sheet.width // SW}장')
        elif b.count('_') == 2 and b.split('_')[1].isdigit() and b.split('_')[0] in KEYS and 1 <= int(b.split('_')[1]) <= len(KEYS[b.split('_')[0]]) and KEYS[b.split('_')[0]][int(b.split('_')[1]) - 1][1] == b.split('_')[2]:  # 이름까지 맞는 것만
            Image.open(f).save(os.path.join(od, os.path.basename(f))); print(f'  사용자 수정 반영: {os.path.basename(f)}')
    print(f'{name}: 저장')
print(f'모두 {n}장 → 에셋/모션/공격/')
