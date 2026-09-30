# -*- coding: utf-8 -*-
"""
도트복원.py 결과(sprites.json + PNG) → 게임 에셋
 - 에셋/몬스터/<이름>.png (실제 크기), <이름>_x8.png (확인용 8배)
 - 코드/게임/mon_assets_<묶음이름>.js (게임이 읽는 글자 지도)
쓰는 법: python 게임에넣기.py <도트복원 출력폴더> <프로젝트폴더> <묶음이름> <이름들 JSON>
 묶음이름: 결과 파일 이름 (코드/게임/mon_assets_<묶음이름>.js). html에서 이 파일을 불러와야 한다.
 이름들 JSON: [{"i":0,"id":"mossStump","n":"이끼 그루터기","role":"tank", "cropBottom":0, "fly":8}, ...]  (i = 도트복원 번호)
   cropBottom: 아래 몇 줄을 잘라낸다 (떠다니는 몬스터의 땅 그림자 등)
"""
import sys, os, json

SRC, ROOT, TAG, META = sys.argv[1], sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
from PIL import Image
data = json.load(open(os.path.join(SRC, 'sprites.json'), encoding='utf-8'))
os.makedirs(os.path.join(ROOT, '에셋', '몬스터'), exist_ok=True)
lines = [
    "'use strict';",
    '// 자동 생성: 도구/에셋변환/도트복원.py → 게임에넣기.py. 손으로 고치지 말고 다시 만든다.',
    '// AI가 만든 가짜 도트에서 숨은 격자를 찾아 되살린 진짜 도트. hd: 도트 1칸 = 화면 1px (무기와 같은 밀도).',
]
for m in META:
    sp = next(s for s in data['sprites'] if s['i'] == m['i'])
    cb = m.get('cropBottom', 0)
    if cb: sp = dict(sp, rows=sp['rows'][:-cb])
    used = sorted(set(ch for row in sp['rows'] for ch in row if ch not in '.o'))
    pal = {ch: data['palette'][ch] for ch in used}
    extra = {'hd': True}
    if m.get('fly'): extra['fly'] = m['fly']
    lines.append(f"M('{m['id']}', '{m['n']}', '{m['role']}', {json.dumps(pal)}, {json.dumps(sp['rows'], ensure_ascii=False, indent=2)}, {json.dumps(extra)});")
    img = Image.open(os.path.join(SRC, f"monster_{m['i']}.png"))
    if cb: img = img.crop((0, 0, img.width, img.height - cb))
    img.save(os.path.join(ROOT, '에셋', '몬스터', f"{m['n']}.png"))
    img.resize((img.width * 8, img.height * 8), Image.NEAREST).save(os.path.join(ROOT, '에셋', '몬스터', f"{m['n']}_x8.png"))
open(os.path.join(ROOT, '코드', '게임', f'mon_assets_{TAG}.js'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('완료:', [m['n'] for m in META])
