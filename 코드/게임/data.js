'use strict';
// =====================================================================
// 게임 데이터. 수치는 모두 임시값(밸런스 확정 전). 기획: 기록/My_Little_Fantasy_업데이트_작업목록_v0.1.md
// 세계관: 기록/세계관과 8개 지역.md
// =====================================================================
const GAME = { SAVE_KEY: 'mlf.v2', BACKUP_KEY: 'mlf.v2.backup', OLD_KEY: 'pixelIdleRpg.v1', SALT: 'kkoma-yongsa-2026' };

// 손맛 연출 수치 (기록/바이브코딩 게임 제작 디테일.md). 여기만 고치면 전체가 바뀐다.
const JUICE = {
  hitStop: 0.035, critHitStop: 0.07, bossHitStop: 0.1, // 맞는 순간 멈춤(초)
  shake: 1.2, critShake: 2.2, bossShake: 3.5,        // 화면 흔들림(논리 px)
  flashTime: 0.07,                                   // 맞은 적이 하얗게 번쩍이는 시간
  squash: 0.22,                                      // 맞을 때 찌그러짐 정도
  numPop: 1.45,                                      // 피해 숫자가 튀어나올 때 커지는 배율
  coinFly: 0.45,                                     // 동전이 금화 아이콘으로 날아가는 시간
};

const BAL = {
  stagesPerRegion: 10, regions: 8, killsPerStage: 10, bossTime: 30, respawn: 2,
  pack: s => Math.min(8, 3 + Math.floor((s - 1) / 3)),              // 한 무리 수: 3마리부터 8마리까지 (많을수록 생존이 걸려 파밍·레벨·환생이 중요해진다)
  // 몬스터 성장은 단계마다 지수. 장비도 아이템 레벨마다 지수(데이터/장비.json stats.grow)로 자라서 "그 단계 장비를 끼면 그 단계가 잡힌다"가 유지된다
  monHp: s => 14 * Math.pow(1.15, s - 1),
  monDmg: s => 3 * Math.pow(1.08, s - 1),
  monDef: s => 4 + s * 0.25,                                         // 방어는 완만하게: 피해 × 100/(100+방어×2). 80단계 일반 68%, 보스 58%
  statPct: { str: 0.015, vit: 0.015 },                               // 힘 1점 = 공격력 +1.5%, 근력 1점 = 체력 +1.5% (후반에도 스탯이 의미 있게 % 배율. 복리로 하면 레벨과 단계가 맞물려 끝없이 폭주해서 직선으로 둔다)
  monEva: s => 20 + s * 3,                                           // 회피: 지역·역할 배율(EVA_REGION·EVA_ROLE)을 곱한다. 명중률 = hitRate(명중, 회피)
  hitRate: (acc, eva) => clamp(0.9 + (acc - eva) / 250, 0.4, 0.98),   // 명중 = 회피면 90%, 회피가 100 앞서면 50%. 민첩 1점 = 명중 +2
  monGold: s => 2.2 * Math.pow(1.1, s - 1),
  monExp: s => 4.5 * Math.pow(1.09, s - 1),
  expNeed: lv => Math.floor(30 * Math.pow(1.2, lv - 1)),
  ptsPerLv: 3,
  offlineRate: 0.5, offlineCapSec: 8 * 3600, offlineMinSec: 60,
  regenOut: 0.1, regenIn: 0.004, healOnKill: 0.04,                  // 전투 밖 초당 회복, 전투 중 초당 회복, 처치당 회복(최대 체력 비율)
  drop: 0.04, bossDrops: 1, bagMax: 60,                               // 드롭은 빡빡하게: 파밍이 끝 콘텐츠 (처치당 3%, 보스 1개)
  gradeW: [70, 22, 6.5, 1.3, 0.2], bossGradeW: [0, 60, 30, 9.5, 0.5],
  // 환생: 8-10 보스를 잡으면(81단계 도달) 할 수 있다. 레벨·스탯·단계·잠그지 않은 장비가 초기화되고 강화·어빌리티·골드·외형·잠근 장비는 남는다.
  // gradeAt[등급] = 그 등급이 떨어지기 시작하는 환생 횟수, slotAt = 칸이 열리는 환생 횟수. 환생마다 몬스터 체력·피해가 세지고 골드·경험치 보너스가 붙는다.
  // 환생: 2단계부터 언제든. 그 바퀴의 최고 단계만큼 환생 점수를 받고(ptsPer), 점수 1점마다 영구로 공격·체력 +2%(powerPer), 골드·경험치 +1%(incomePer).
  // 레벨·스탯·단계·안 잠근 장비가 초기화되고 강화·어빌리티·골드·외형·잠근 장비·환생 점수는 남는다. 막히면 환생 → 파밍 → 더 밀기.
  rebirth: { minStage: 2, ptsPer: 1, powerPer: 0.02, incomePer: 0.01, gradeAt: [], slotAt: {} },
  enhCost: lv => Math.ceil(40 * Math.pow(1.4, lv)), enhMax: 30, enhPer: 0.06,
  abCost: lv => Math.ceil(150 * Math.pow(1.4, lv - 1)), abRoll: lv => Math.ceil(60 * Math.pow(1.17, lv - 1)), abMax: 30, abSlotAt: [1, 10, 20], abGrow: 0.2, // 레벨당 옵션 값 +20% (30레벨 = ×6.8. 0.06이면 같은 골드의 강화보다 4~5배 약했다)
  skillCd: 14, dismantle: g => [2, 8, 30, 120, 500][g],
  critCap: 0.75, aspdCap: 2.5,
};

// ---------- 장비 데이터: 데이터/장비.json (등급·지역 장비 이름·판타지아 스킬·능력치 공식) ----------
// 게임 창(Electron)은 켜질 때 json을 바로 읽는다. 브라우저(Edge·크롬)로 열면 보안 때문에 로컬 json을 못 읽어서,
// 같은 내용의 복사본 데이터/장비.js(ITEMS_DATA)를 쓴다 — 게임 실행.cmd 로 켜면 저절로, 또는 도구/에셋변환/장비넣기.py 로 새로 만든다.
const ITEMS = (() => {
  for (const p of ['데이터/장비.json', '../데이터/장비.json']) {
    let txt = ''; try { const x = new XMLHttpRequest(); x.open('GET', p, false); x.send(); txt = x.responseText; } catch (e) { /* 브라우저(file://)는 못 읽는다 — 다음 길로 */ }
    if (txt) { try { return JSON.parse(txt); } catch (e) { console.error('데이터/장비.json 이 깨졌어요 (복사본 장비.js 로 대신 갑니다):', e.message); } }
  }
  return typeof ITEMS_DATA !== 'undefined' ? ITEMS_DATA : null;
})();
const GRADES = (ITEMS ? ITEMS.grades : [
  { name: '일반', prefix: '일반적인', color: '#ffffff', stat: { atk: 1, hp: 1, def: 1 }, lines: 0, lineMul: 1, fx: 1, aura: 0 },
  { name: '레어', prefix: '희귀한', color: '#4aa8ff', stat: { atk: 1.15, hp: 1.15, def: 1.15 }, lines: 1, lineMul: 1.2, fx: 1.1, aura: 0 },
  { name: '유니크', prefix: '유니크', color: '#ffc83d', stat: { atk: 1.35, hp: 1.35, def: 1.3 }, lines: 2, lineMul: 1.45, fx: 1.25, aura: 1 },
  { name: '레전더리', prefix: '전설의', color: '#ff4d5e', stat: { atk: 1.6, hp: 1.6, def: 1.5 }, lines: 3, lineMul: 1.75, fx: 1.4, aura: 2 },
  { name: '판타지아', prefix: '판타지아', color: '#b48cff', stat: { atk: 2.0, hp: 2.0, def: 1.8 }, lines: 4, lineMul: 2.1, fx: 1.6, aura: 3 },
]).map(g => ({ ...g, n: g.name, c: g.color, stat: g.stat || { atk: g.mul, hp: g.mul, def: g.mul }, lineMul: g.lineMul || 1 }));
if (ITEMS) { BAL.gradeW = GRADES.map(g => g.drop); BAL.bossGradeW = GRADES.map(g => g.bossDrop); BAL.dismantle = g => GRADES[g].dismantle; }
const regionSet = r => (ITEMS ? ITEMS.regions[Math.min(ITEMS.regions.length, Math.max(1, r)) - 1] : null);

// ---------- 무기 ----------
const WEAPONS = {
  sword: { n: '검', aspd: 1.15, mul: 1.0, range: 56, stun: 0.45 }, // 검기가 닿는 곳(용사 앞 56px)의 적을 모두 벤다
  gun: { n: '엽총', aspd: 0.8, mul: 1.3, range: 190, pierce: 0.6, bleed: 0.3, bleedTicks: 5, bleedCd: 1.5, kb: 10 }, // 출혈: 중첩 없음, 0.5초마다 5번(한 번에 맞은 피해의 30%×0.5초) 끝나면 1.5초 동안 다시 안 걸림
  wand: { n: '완드', aspd: 0.9, mul: 1.05, range: 210, radius: 38, travel: 0.35 },
};

// ---------- 장비 칸 ----------
const SLOTS = [
  { id: 'weapon', n: '무기', type: 'weapon' }, { id: 'head', n: '머리', type: 'head' }, { id: 'body', n: '몸통', type: 'body' },
  { id: 'arms', n: '팔', type: 'arms' }, { id: 'legs', n: '다리', type: 'legs' }, { id: 'feet', n: '신발', type: 'feet' },
  { id: 'ring1', n: '반지', type: 'ring' }, { id: 'ring2', n: '반지', type: 'ring' }, { id: 'neck', n: '목걸이', type: 'neck' },
];
const ARMOR = (ITEMS && ITEMS.stats.armorWeight) || { head: 0.8, body: 1.4, arms: 0.7, legs: 1.0, feet: 0.7 }; // 체력·방어력 비중
// 장비 그림 파일 이름 (에셋/장비/<지역 폴더>/)
const GEAR_FILE = { sword: '검', gun: '엽총', wand: '완드', head: '머리', body: '상의', arms: '장갑', legs: '하의', feet: '신발' };
const STAT_NAMES = { atk: '공격력', hp: '체력', def: '방어력', acc: '명중' };

// 추가 능력치 (장비) + 어빌리티 전용
const LINES = {
  dmg: { n: '데미지', lo: 3, hi: 8, unit: '%' },
  crit: { n: '치명타 확률', lo: 1, hi: 3, unit: '%p' },
  critDmg: { n: '치명타 피해', lo: 5, hi: 15, unit: '%' },
  strP: { n: '힘', lo: 3, hi: 8, unit: '%' },
  vitP: { n: '근력', lo: 3, hi: 8, unit: '%' },
  dexP: { n: '민첩', lo: 3, hi: 8, unit: '%' },
  minD: { n: '최소 데미지', lo: 3, hi: 8, unit: '%' },
  maxD: { n: '최대 데미지', lo: 3, hi: 8, unit: '%' },
  gold: { n: '골드 획득', lo: 5, hi: 15, unit: '%', ab: true },
  exp: { n: '경험치 획득', lo: 5, hi: 15, unit: '%', ab: true },
  aspd: { n: '공격 속도', lo: 3, hi: 8, unit: '%', ab: true },
};
const EQUIP_LINES = Object.keys(LINES).filter(k => !LINES[k].ab);
const AB_LINES = Object.keys(LINES);

// ---------- 지역 (8) ----------
// props: 이야기 단서 소품, mons: 일반 몬스터 4종, boss (fanta: 예전 판타지아 무기 목록 — 옛 저장을 옮길 때만 쓴다. 지금은 데이터/장비.json 의 지역 스킬)
const REGIONS = [
  { n: '풀꽃 들판', hint: '버려진 밭에 작물이 너무 잘 자란다.', ground: ['#6fd05f', '#e0a86e', '#c98f58'], deco: '#ff8fb8', tint: '#8fdc84',
    props: ['scarecrow', 'cart', 'fence', 'crater'], mons: ['sproutling', 'acornling', 'mushShaman', 'mossStump'], boss: 'leafOwl', fanta: ['f_sakura', 'f_bubble'] },
  { n: '이끼 숲', hint: '베인 나무들이 다시 일어섰다.', ground: ['#5aa84a', '#7a5a3a', '#5a4028'], deco: '#9fffc0', tint: '#5cc85a',
    props: ['axeStump', 'mossHut', 'saw', 'sporeCap'], mons: ['logWorm', 'sporeFly', 'sawCrab', 'mossBear'], boss: 'angryTree', fanta: ['f_forest', 'f_crow'] },
  { n: '고블린 고개', hint: '토템마다 남의 물건이 걸려 있다.', ground: ['#c9a060', '#a07040', '#7a5030'], deco: '#e0c080', tint: '#e0a060',
    props: ['totem', 'tent', 'barricade', 'boarSkull'], mons: ['goblin', 'warBoar', 'shaman', 'ogre'], boss: 'goblinChief', fanta: ['f_musang', 'f_storm'] },
  { n: '잠긴 호수 마을', hint: '비는 아직도 그치지 않았다.', ground: ['#8fd0c0', '#5a8a9a', '#3a6a7a'], deco: '#ffe27a', tint: '#6fd3ff',
    props: ['roof', 'lamppost', 'boat', 'bellTower'], mons: ['jelly', 'frogKnight', 'crab', 'lampGhost'], boss: 'bellOctopus', fanta: ['f_storm_eye', 'f_raijin'] },
  { n: '태양 사막 신전', hint: '해가 한 번도 지지 않았다.', ground: ['#f2d99a', '#e0b870', '#c09050'], deco: '#ffc83d', tint: '#ffc83d',
    props: ['sunHead', 'pillar', 'skull', 'steps'], mons: ['sunSprite', 'scorpion', 'clayGuard', 'sandSnake'], boss: 'sunGolem', fanta: ['f_dawn', 'f_phoenix'] },
  { n: '얼어붙은 축제 산', hint: '축제의 밤이 끝나지 않는다.', ground: ['#ffffff', '#dfe8f8', '#b8c8e8'], deco: '#ff5e7a', tint: '#bfeaff',
    props: ['lanternLine', 'stall', 'carouselHorse', 'scarfSnowman'], mons: ['iceSlime', 'crystalBeetle', 'frostOwl', 'frostYeti', 'iglooMimic'], boss: 'snowKing', fanta: ['f_frost', 'f_star'] },
  { n: '그림자 폐성', hint: '갑옷 안에 아무도 없다.', ground: ['#5a5a7a', '#3a3a52', '#2a2a3e'], deco: '#b48cff', tint: '#8a63e0',
    props: ['banner', 'emptyArmor', 'throne', 'thorns'], mons: ['wraith', 'hollowKnight', 'shadowBat', 'shadowHound'], boss: 'shadowKing', fanta: ['f_moon', 'f_thunder', 'f_stella'] },
  { n: '용의 둥지', hint: '가장 큰 조각이 아직 빛난다.', ground: ['#ffa15e', '#6a3a3a', '#3a1a1a'], deco: '#ffe04d', tint: '#ff7a2a',
    props: ['ribs', 'lavaVein', 'crystal', 'brokenStar'], mons: ['dragonling', 'lavaGolem', 'crystalWisp', 'fallenKnight'], boss: 'aurumShade', fanta: ['f_volcano', 'f_dragon', 'f_galaxy'] },
];

// ---------- 회피 (명중과 맞선다) ----------
const EVA_ROLE = { swarm: 1.2, ranged: 1.15, charger: 1.0, tank: 0.7, boss: 0.9 };
const EVA_REGION = [1, 1, 1.1, 1.2, 1, 1.15, 1.3, 1.1]; // 지역마다: 고블린 고개·호수·축제 산·폐성이 잘 피한다
const foeEva = (s, role) => BAL.monEva(s) * (EVA_ROLE[role] || 1) * EVA_REGION[regionOf(s) - 1];

// ---------- 스킬트리·펫 자리 (아직 비어 있음) ----------
// 스킬트리: 무기마다 탭 하나. 노드는 { id, n, cost, lines: [{ k, v }] } 꼴로 두면 stats()의 treeLines()가 그대로 더한다.
const SKILL_TREE = {
  sword: { n: '검', concept: '빠른 속도감과 화려함', nodes: [] },
  gun: { n: '엽총', concept: '단일 대상의 강력한 피해', nodes: [] },
  wand: { n: '완드', concept: '원거리 다수 타격과 군중 제어', nodes: [] },
};
// 펫: { id, n, lines: [{ k, v }] } 꼴. S.pet 에 id를 넣으면 petLines()가 능력치에 더하고, render.js drawPet 자리에 그린다.
const PETS = [];

// ---------- 몬스터 역할 ----------
const ROLES = {
  swarm: { hp: 0.7, dmg: 0.7, spd: 34, range: 16, atkIv: 1.1 },
  tank: { hp: 2.3, dmg: 0.9, spd: 18, range: 18, atkIv: 1.6, def: 2 },
  ranged: { hp: 0.8, dmg: 0.85, spd: 26, range: 120, atkIv: 1.8 },
  charger: { hp: 1.0, dmg: 1.3, spd: 52, range: 16, atkIv: 1.3 },
  boss: { hp: 16, dmg: 1.2, spd: 20, range: 24, atkIv: 1.5, def: 3 },
};

// ---------- 어빌리티 ----------
const AB_NAMES = ['첫째 칸', '둘째 칸', '셋째 칸'];

// ---------- 외형 (성능과 무관) ----------
const LOOKS = {
  hair: [
    { id: 'h0', n: '금발', c: ['#f3deb9', '#f9ecd5'], cost: 0 }, { id: 'h1', n: '초콜릿', c: ['#8a5a3a', '#c08a5a'], cost: 800 },
    { id: 'h2', n: '벚꽃', c: ['#ff8fb8', '#ffd6e8'], cost: 2500 }, { id: 'h3', n: '하늘', c: ['#6fd3ff', '#c9f1ff'], cost: 2500 },
    { id: 'h4', n: '은하', c: ['#8a63e0', '#d0c4ff'], cost: 12000 }, { id: 'h5', n: '황금', c: ['#ffc83d', '#fff09a'], cost: 40000 },
  ],
  tunic: [
    { id: 't0', n: '생성', c: ['#f0e7d1', '#e0d3b8'], cost: 0 }, { id: 't1', n: '풀잎', c: ['#5cc85a', '#3a9a44'], cost: 800 },
    { id: 't2', n: '장미', c: ['#ff5e7a', '#d8384f'], cost: 2500 }, { id: 't3', n: '밤하늘', c: ['#3a3f7a', '#23264a'], cost: 6000 },
    { id: 't4', n: '눈꽃', c: ['#f4f7ff', '#c7cdf0'], cost: 12000 }, { id: 't5', n: '용비늘', c: ['#e0521f', '#8a2a10'], cost: 40000 },
  ],
};

const regionOf = s => Math.min(BAL.regions, Math.ceil(s / BAL.stagesPerRegion));
const stageLabel = s => { const r = regionOf(s); return `${r}-${s - (r - 1) * BAL.stagesPerRegion}`; };
