// 데이터/장비.json 의 브라우저용 복사본 (자동 생성 — 고치지 말고 장비.json 을 고친다)
const ITEMS_DATA = {
 "설명": "장비 데이터. 게임(마리판)이 켜질 때 읽는다. 고친 뒤 게임을 다시 켜면 바뀐다. 이름 = 등급 앞말 + 지역 장비 이름 (예: 일반적인 들판 목검). 그림은 에셋/장비/<folder>/ 의 PNG. 판타지아 무기는 그 지역 스킬(skill)을 쓴다.",
 "grades": [
  {
   "name": "일반",
   "prefix": "일반적인",
   "color": "#ffffff",
   "mul": 1.0,
   "lines": 0,
   "drop": 62,
   "bossDrop": 0,
   "dismantle": 2,
   "fx": 1.0,
   "aura": 0
  },
  {
   "name": "레어",
   "prefix": "희귀한",
   "color": "#4aa8ff",
   "mul": 1.15,
   "lines": 1,
   "drop": 27,
   "bossDrop": 45,
   "dismantle": 8,
   "fx": 1.1,
   "aura": 0
  },
  {
   "name": "유니크",
   "prefix": "유니크",
   "color": "#ffc83d",
   "mul": 1.35,
   "lines": 2,
   "drop": 8.5,
   "bossDrop": 38,
   "dismantle": 30,
   "fx": 1.25,
   "aura": 1
  },
  {
   "name": "레전더리",
   "prefix": "전설의",
   "color": "#ff4d5e",
   "mul": 1.6,
   "lines": 3,
   "drop": 2.3,
   "bossDrop": 15,
   "dismantle": 120,
   "fx": 1.4,
   "aura": 2
  },
  {
   "name": "판타지아",
   "prefix": "판타지아",
   "color": "#b48cff",
   "mul": 2.0,
   "lines": 4,
   "drop": 0.2,
   "bossDrop": 2,
   "dismantle": 500,
   "fx": 1.6,
   "aura": 3
  }
 ],
 "stats": {
  "설명": "능력치 = (기본 + 아이템 레벨 × 레벨당) × 등급 배율. 아이템 레벨 = 떨어진 스테이지. 방어구는 부위 비중을 한 번 더 곱한다.",
  "weaponAtk": [
   4,
   1.7
  ],
  "armorHp": [
   10,
   4.5
  ],
  "armorDef": [
   1,
   0.5
  ],
  "armorWeight": {
   "head": 0.8,
   "body": 1.4,
   "arms": 0.7,
   "legs": 1.0,
   "feet": 0.7
  },
  "accessory": {
   "atk": [
    2,
    0.8
   ],
   "hp": [
    6,
    2.5
   ],
   "def": [
    0.6,
    0.3
   ],
   "acc": [
    3,
    0.9
   ],
   "pick": 2
  },
  "lineGrow": 0.2
 },
 "regions": [
  {
   "region": 1,
   "set": "초보 모험가",
   "folder": "1지역_초보 모험가",
   "color": "#ffd23d",
   "fantasia": {
    "skill": "f_sakura",
    "name": "꽃보라 베기"
   },
   "items": {
    "sword": "들판 목검",
    "gun": "들판 사냥 엽총",
    "wand": "들판 나뭇가지 완드",
    "head": "들판 가죽 모자",
    "body": "들판 가죽 조끼",
    "arms": "들판 천 장갑",
    "legs": "들판 덧댄 바지",
    "feet": "들판 끈 장화",
    "ring": "들판 풀꽃 반지",
    "neck": "들판 풀잎 목걸이"
   }
  },
  {
   "region": 2,
   "set": "숲지기",
   "folder": "2지역_숲지기",
   "color": "#5becd5",
   "fantasia": {
    "skill": "f_forest",
    "name": "옛 뿌리"
   },
   "items": {
    "sword": "숲지기 벌목검",
    "gun": "숲지기 덩굴 엽총",
    "wand": "숲지기 새싹 완드",
    "head": "숲지기 잎사귀 두건",
    "body": "숲지기 이끼 튜닉",
    "arms": "숲지기 나뭇잎 토시",
    "legs": "숲지기 초록 바지",
    "feet": "숲지기 뿌리 장화",
    "ring": "숲지기 이끼 반지",
    "neck": "숲지기 포자 목걸이"
   }
  },
  {
   "region": 3,
   "set": "고블린 약탈품",
   "folder": "3지역_고블린 약탈품",
   "color": "#ffc83d",
   "fantasia": {
    "skill": "f_crow",
    "name": "까마귀 떼"
   },
   "items": {
    "sword": "고블린 녹슨 검",
    "gun": "고블린 나팔 엽총",
    "wand": "고블린 뼈 완드",
    "head": "고블린 냄비 투구",
    "body": "고블린 기운 조끼",
    "arms": "고블린 짝짝이 장갑",
    "legs": "고블린 헝겊 바지",
    "feet": "고블린 큰 장화",
    "ring": "고블린 훔친 반지",
    "neck": "고블린 이빨 목걸이"
   }
  },
  {
   "region": 4,
   "set": "등불 항해사",
   "folder": "4지역_등불 항해사",
   "color": "#ffe27a",
   "fantasia": {
    "skill": "f_bubble",
    "name": "거품 감옥"
   },
   "items": {
    "sword": "등불 선원 검",
    "gun": "등불 황동 엽총",
    "wand": "등불 완드",
    "head": "등불 방수 모자",
    "body": "등불 방수 코트",
    "arms": "등불 고무장갑",
    "legs": "등불 선원 바지",
    "feet": "등불 장화",
    "ring": "등불 닻 반지",
    "neck": "등불 조개 목걸이"
   }
  },
  {
   "region": 5,
   "set": "태양 신전",
   "folder": "5지역_태양 신전",
   "color": "#3fe2cd",
   "fantasia": {
    "skill": "f_dawn",
    "name": "천공낙검"
   },
   "items": {
    "sword": "태양 곡검",
    "gun": "태양 황금 엽총",
    "wand": "태양석 완드",
    "head": "태양 머리띠",
    "body": "태양 신전 로브",
    "arms": "태양 붕대 손목",
    "legs": "태양 흰 바지",
    "feet": "태양 황금 샌들",
    "ring": "태양석 반지",
    "neck": "태양 문양 목걸이"
   }
  },
  {
   "region": 6,
   "set": "서리 축제",
   "folder": "6지역_서리 축제",
   "color": "#8fd8ff",
   "fantasia": {
    "skill": "f_frost",
    "name": "고드름 폭포"
   },
   "items": {
    "sword": "서리 고드름 검",
    "gun": "서리 눈꽃 엽총",
    "wand": "서리 눈결정 완드",
    "head": "서리 털모자",
    "body": "서리 겨울 외투",
    "arms": "서리 벙어리장갑",
    "legs": "서리 누빈 바지",
    "feet": "서리 털장화",
    "ring": "서리 얼음 반지",
    "neck": "서리 방울 목걸이"
   }
  },
  {
   "region": 7,
   "set": "그림자 기사",
   "folder": "7지역_그림자 기사",
   "color": "#b487f6",
   "fantasia": {
    "skill": "f_moon",
    "name": "그림자 분신"
   },
   "items": {
    "sword": "그림자 기사 검",
    "gun": "그림자 흑철 엽총",
    "wand": "그림자 수정 완드",
    "head": "그림자 뿔 투구",
    "body": "그림자 판금 갑옷",
    "arms": "그림자 건틀릿",
    "legs": "그림자 다리 보호대",
    "feet": "그림자 쇠장화",
    "ring": "그림자 문장 반지",
    "neck": "그림자 수정 목걸이"
   }
  },
  {
   "region": 8,
   "set": "용비늘",
   "folder": "8지역_용비늘",
   "color": "#ff7a2a",
   "fantasia": {
    "skill": "f_dragon",
    "name": "드래곤 브레스"
   },
   "items": {
    "sword": "용이빨 검",
    "gun": "용머리 엽총",
    "wand": "용의 눈 완드",
    "head": "용뿔 투구",
    "body": "용비늘 갑옷",
    "arms": "용비늘 건틀릿",
    "legs": "용비늘 바지",
    "feet": "용발톱 장화",
    "ring": "용비늘 반지",
    "neck": "용의 심장 목걸이"
   }
  }
 ]
};
