# -*- coding: utf-8 -*-
# 데이터/장비.json → 데이터/장비.js (브라우저용 복사본)
# 브라우저(Edge·크롬)로 마리판.html 을 열면 보안 때문에 로컬 JSON 파일을 읽지 못한다. 그래서 같은 내용을 JS로 한 벌 더 둔다.
# 게임을 `게임 실행.cmd`로 켜면 이 복사본을 저절로 새로 만든다. 브라우저로만 할 때는 JSON을 고친 뒤 이것을 돌린다.
#   python 도구/에셋변환/장비넣기.py
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src, out = os.path.join(ROOT, '데이터', '장비.json'), os.path.join(ROOT, '데이터', '장비.js')
data = json.load(open(src, encoding='utf-8'))  # 깨진 JSON이면 여기서 멈춘다 (복사본을 망가뜨리지 않게)
with open(out, 'w', encoding='utf-8') as f:
    f.write('// 데이터/장비.json 의 브라우저용 복사본 (자동 생성 — 고치지 말고 장비.json 을 고친다)\n')
    f.write('const ITEMS_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
print(f'데이터/장비.js 를 새로 만들었다 (지역 {len(data["regions"])}개, 등급 {len(data["grades"])}개)')
