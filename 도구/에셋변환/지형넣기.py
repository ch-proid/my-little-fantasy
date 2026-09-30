# -*- coding: utf-8 -*-
# 에셋/지형/N지역/*.png → 코드/그림/terrain_list.js (게임이 읽는 지형지물 목록)
# 소품마다 겹(먼 배경 far / 가까운 소품 near / 작은 장식 small / 바닥 타일 tile)과 크기(칸, 여백 뺀 것)를 적는다.
# 겹은 기록/지형지물 프롬프트.md 의 [먼 배경]·[가까운 소품]·[작은 장식] 분류를 따른다. 문서에 없는 이름은 크기로 어림한다.
# 그림은 게임이 PNG를 그대로 불러 그린다(칸 색을 읽지 않으므로 브라우저로 열어도 된다). PNG를 고치면 게임에 바로 나온다.
# 소품을 더하거나 이름을 바꾸면 이것을 다시 돌린다:  python 도구/에셋변환/지형넣기.py
import glob, json, os, re
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
doc = open(os.path.join(ROOT, '기록', '지형지물 프롬프트.md'), encoding='utf-8').read()
KIND = {'먼 배경': 'far', '가까운 소품': 'near', '작은 장식': 'small'}
out = {}
for r in range(1, 9):
    block = doc.split(f'## [지역 {r}]')[1].split('## [지역')[0] if f'## [지역 {r}]' in doc else ''
    cat, cats = None, {}
    for line in block.splitlines():
        m = re.match(r'\[(.+?)\]', line.strip())
        if m and m.group(1) in KIND: cat = KIND[m.group(1)]; continue
        m = re.match(r'- (.+?)(?: \(|:|$)', line.strip())
        if m and cat: cats[m.group(1).strip()] = cat
    items = {'tile': None, 'far': [], 'near': [], 'small': []}
    for f in sorted(glob.glob(os.path.join(ROOT, '에셋', '지형', f'{r}지역', '*.png'))):
        name = os.path.splitext(os.path.basename(f))[0]
        im = Image.open(f).convert('RGBA'); b = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
        w, h = b[2] - b[0], b[3] - b[1]
        it = {'n': name, 'x': b[0], 'y': b[1], 'w': w, 'h': h}
        if name.startswith('바닥'): items['tile'] = it; continue
        k = cats.get(name) or next((v for kk, v in cats.items() if kk.startswith(name) or name.startswith(kk)), None)
        if not k: k = 'far' if w >= 50 or h >= 40 else 'small' if w * h < 260 else 'near'
        items[k].append(it)
    out[r] = items
    print(f'{r}지역: 먼 배경 {len(items["far"])}, 가까운 소품 {len(items["near"])}, 작은 장식 {len(items["small"])}, 바닥 타일 {"있음" if items["tile"] else "없음"}')
with open(os.path.join(ROOT, '코드', '그림', 'terrain_list.js'), 'w', encoding='utf-8') as fp:
    fp.write('// 자동 생성: 도구/에셋변환/지형넣기.py — 에셋/지형/N지역/*.png 목록 (x·y = PNG 안에서 그림이 시작하는 칸, w·h = 그림 크기 칸)\n')
    fp.write('const TERRAIN = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print('저장: 코드/그림/terrain_list.js')
