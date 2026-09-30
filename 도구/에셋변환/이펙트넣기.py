# -*- coding: utf-8 -*-
# 에셋/이펙트/*.json (이펙트 에디터에서 저장한 설정) → 코드/그림/pixfx_list.js
# 에디터의 "게임에 저장"이 같은 일을 한다. 폴더 연결을 못 쓸 때(다른 브라우저 등) 이것을 돌린다.
#   python 도구/에셋변환/이펙트넣기.py
import glob, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC, OUT = os.path.join(ROOT, '에셋', '이펙트'), os.path.join(ROOT, '코드', '그림', 'pixfx_list.js')
items = []
for f in sorted(glob.glob(os.path.join(SRC, '*.json'))):
    with open(f, encoding='utf-8') as fp: items.append(json.load(fp))
with open(OUT, 'w', encoding='utf-8') as fp:
    fp.write('// 이펙트 에디터에서 저장한 이펙트 (에셋/이펙트/*.json 에서 만든다. 손으로 고치지 않는다)\n')
    fp.write('const PIXFX_LIST = [\n' + ''.join('  ' + json.dumps(it, ensure_ascii=False) + ',\n' for it in items) + '];\n')
print(f'이펙트 {len(items)}개 → 코드/그림/pixfx_list.js')
for it in items: print(' ', it.get('name'), '·', it.get('slot') or '안 씀')
