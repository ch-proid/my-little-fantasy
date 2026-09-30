# -*- coding: utf-8 -*-
"""
손으로 다듬은 PNG → 게임 에셋 (픽셀 하나도 바꾸지 않는다)

도트복원.py 결과를 사람이 직접 고친 뒤 게임에 넣을 때 쓴다.
 - 색마다 글자를 하나씩 붙여 글자 지도로 바꾼다 (투명 = '.')
 - raw: true → 게임이 자동 도트 규칙(테두리 색 바꾸기, 더블 지우기)을 적용하지 않는다
 - hd: true  → 도트 1칸 = 화면 1px

쓰는 법: python PNG넣기.py <프로젝트폴더> <묶음이름> <목록 JSON 또는 목록.json 파일>
 목록 JSON (에셋/몬스터/N지역/목록.json): [{"file":"에셋/몬스터/1지역/새싹 방울.png","id":"sproutling","n":"새싹 방울","role":"swarm","fly":0,"scale":1}, ...]
   scale: 1 = 도트 1칸이 화면 1px, 2 = 2px (용사와 같은 밀도 — 지금 게임의 기본)
   anim: 움직임 설정 (코드/게임/mon_sprites.js 의 ANIM 설명 참고). 그대로 넘긴다.
   flip: true = 그림이 오른쪽을 보고 있으면 좌우를 뒤집는다 (몬스터는 왼쪽의 용사 쪽으로 걸어온다)
 - 투명한 가장자리는 잘라낸다. (몬스터 PNG는 고칠 여유로 사방 10px 여백을 둔다 — 게임에는 영향 없음)
 - foot: 칠한 칸이 2개 이상인 가장 낮은 줄을 발바닥으로 본다. 그 아래 외톨이 점 줄 수를 적어 두면 게임이 발바닥을 땅에 맞춘다.
 결과: 코드/게임/mon_assets_<묶음이름>.js  (html에서 불러와야 한다)
"""
import sys, os, json
from PIL import Image

ROOT, TAG = sys.argv[1], sys.argv[2]
ITEMS = json.load(open(sys.argv[3], encoding='utf-8')) if sys.argv[3].endswith('.json') else json.loads(sys.argv[3])
LETTERS = list('abdfghijklmnpqrstuvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
lines = [
    "'use strict';",
    '// 자동 생성: 도구/에셋변환/PNG넣기.py — 손으로 다듬은 PNG를 그대로 옮긴 것. 고칠 때는 PNG를 고치고 다시 만든다.',
    '// hd: 도트 1칸 = 화면 1px, raw: 자동 도트 규칙을 적용하지 않음 (사람이 다듬은 픽셀 그대로)',
]
for it in ITEMS:
    im = Image.open(os.path.join(ROOT, it['file'])).convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox())  # 투명한 가장자리 잘라내기
    w, h = im.size; px = im.load()
    foot = 0
    for y in range(h - 1, -1, -1):
        if sum(1 for x in range(w) if px[x, y][3] >= 128) >= 2: break
        foot += 1
    pal, rows = {}, []
    for y in range(h):
        row = ''
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128: row += '.'; continue
            hx = '#%02x%02x%02x' % (r, g, b)
            if hx not in pal:
                if len(pal) >= len(LETTERS): raise SystemExit(f"{it['file']}: 색이 {len(LETTERS)}개를 넘는다")
                pal[hx] = LETTERS[len(pal)]
            row += pal[hx]
        rows.append(row[::-1] if it.get('flip') else row)
    extra = {'hd': it.get('scale', 1) == 1, 'raw': True}
    if foot: extra['foot'] = foot
    if it.get('fly'): extra['fly'] = it['fly']
    if it.get('anim'): extra['anim'] = it['anim']
    letters = {v: k for k, v in pal.items()}
    lines.append(f"M('{it['id']}', '{it['n']}', '{it['role']}', {json.dumps(letters)}, {json.dumps(rows, ensure_ascii=False, indent=2)}, {json.dumps(extra)});")
    print(f"{it['n']}: {w}x{h}, {len(pal)}색, 발바닥 아래 외톨이 줄 {foot}")
out = os.path.join(ROOT, '코드', '게임', f'mon_assets_{TAG}.js')
open(out, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('저장:', out)
