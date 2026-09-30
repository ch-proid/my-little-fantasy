'use strict';
// =====================================================================
// 몬스터 40종 — 처음 게임의 슬라임·버섯·달팽이처럼 한 칸씩 손으로 찍은 도트 (글자 하나 = 1픽셀, 화면에서 2배)
// 크기로 강함을 보인다: 약한 무리 12~14줄(용사보다 작다) / 중간 16~18줄(용사와 비슷) / 탱커 20~23줄(조금 크다) / 보스 26줄 이상
// 공통 글자: o 테두리, e 눈·입(어두운색), w 흰색, c 볼. 나머지 글자는 몬스터마다 pal에서 정한다.
// =====================================================================
const MON_BASE = { o: '#4a3050', e: '#3a2440', w: '#ffffff', c: '#ff9eb5' };
const MON = {};
function M(id, n, role, pal, map, extra = {}) { if (MON[id]) { delete MON[id]._f; delete MON[id]._frames; } MON[id] = { id, n, role, pal, map, ...extra }; }
// 손도트 → 캔버스 (forgeArt가 map이 있으면 이걸 쓴다)
function mapArt(def) {
  if (def._f) return def._f;
  let c;
  if (def.raw) { // 사람이 다듬은 픽셀: 그대로
    const w = Math.max(...def.map.map(r => r.length)); c = document.createElement('canvas'); c.width = w; c.height = def.map.length; const g = c.getContext('2d');
    def.map.forEach((row, y) => [...row].forEach((ch, x) => { const col = def.pal[ch]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }));
  } else c = dotRefine(def.map, ch => def.pal[ch] || MON_BASE[ch] || null, { shade: !def.hd }); // 도트 규칙 자동 적용
  const k = def.hd ? 2 : 1; // hd: 도트 1칸 = 화면 1px (무기와 같은 밀도). w·h는 용사 도트 칸(2px) 단위
  def._f = { c, w: c.width / k, h: c.height / k }; return def._f;
}

// =====================================================================
// 몬스터 움직임 (도트 규칙 5-9): 그림을 늘이지 않고, 부위를 1~2칸씩 옮긴 프레임을 넘긴다.
// 몬스터마다 anim: { kind, ...부위 위치 }를 적는다. 안 적으면 떠다니면 날갯짓, 탱커·보스는 쿵쿵, 나머지는 걷기.
//  (2026-09-30 사용자: 움직임이 과하다 → 모두 1칸 안쪽으로 줄임)
//  kind  hop 통통(찌그러졌다 1칸 뛰어오름, 잎·귀는 한 박자 늦게) / walk 종종(발 번갈아, 발 딛을 때 머리 1칸 내려앉음)
//        heavy 쿵쿵(발을 번갈아 들고, 드는 발 반대쪽 팔을 1칸 올림, 발 딛을 때 머리 1칸 내려앉음)
//        scuttle 사각사각(다리 두 무리가 번갈아, 더듬이 까딱) / flap 날갯짓(날개 1칸 위·1칸 아래)
//        mimic 흉내쟁이(찌그렸다 폴짝 뛰고, 내려올 때 입을 쩍)
//  부위(줄·칸 번호는 글자 지도 기준): top 맨 위 장식 줄 수, head 머리 줄 수, upper 찌그러질 윗부분 줄 수, foot 발이 시작하는 줄,
//        arm [시작 줄, 끝 줄, 바깥 칸 수] 또는 false, tool [시작 칸, 끝 칸] (들고 있는 것), wing 바깥 칸 수(테두리까지), wingTop 날개가 시작하는 줄(귀는 빼고), jaw 글자들,
//        feeler [칸, 줄] 왼쪽 위 더듬이, band 다리 무리 너비, wingBox [x0, x1, y0, y1] 날개(또는 흔들 것)가 있는 상자, wingAmp 날개 폭(칸), fps 빠르기 바꾸기
// 프레임 = [부위, 가로, 세로] 목록. 앞에 적은 부위가 먼저 픽셀을 잡는다. ['widen', n] = 아래 n줄을 좌우로 1칸씩 넓힘(찌그러질 때). bob = 몸 전체 위아래.
// 부위를 옮겨 생긴 빈자리는 반대쪽 옆 칸 색으로 메운다(구멍이 안 나게).
// =====================================================================
const ANIM = {
  hop: { fps: 5, bob: [0, 0, -1, 0], f: [[], [['top', 0, 1], ['upper', 0, 1], ['widen', 2]], [['top', 0, 1]], []] },
  walk: { fps: 6, f: [[['tool', 0, 0], ['head', 0, 1]], [['footL', 0, -1], ['tool', 0, -1], ['armR', 0, -1]], [['tool', 0, 0], ['head', 0, 1]], [['footR', 0, -1], ['armL', 0, -1]]] },
  heavy: { fps: 4, f: [[['head', 0, 1]], [['footL', 0, -1], ['armR', 0, -1]], [['head', 0, 1]], [['footR', 0, -1], ['armL', 0, -1]]] },
  scuttle: { fps: 8, f: [[], [['legA', 0, -1], ['feeler', 0, 1]], [], [['legB', 0, -1]]] },
  flap: { fps: 8, bob: [0, 0, 0, 0, -1, 0], f: [[], [['wing', 0, -1]], [['wing', 0, -1]], [], [['wing', 0, 1]], [['wing', 0, 1]]] },
  mimic: { fps: 4, bob: [0, 0, -1, 0], f: [[], [['upper', 0, 1], ['widen', 2]], [], [['jaw', 0, 1]]] },
};
function monFrames(def) {
  if (def._frames) return def._frames;
  const base = forgeArt(def).c, w = base.width, h = base.height;
  const src = base.getContext('2d').getImageData(0, 0, w, h).data;
  const an = def.anim || {}, kind = an.kind || (def.fly ? 'flap' : def.role === 'tank' || def.role === 'boss' ? 'heavy' : 'walk');
  const K = ANIM[kind], letter = (x, y) => (def.map && !def.raw ? def.map[y][x] : '');
  const foot = an.foot ?? h - Math.max(2, Math.round(h * 0.18)), cx = w / 2;
  const head = an.head ?? Math.round(h * 0.45), top = an.top ?? Math.round(h * 0.2), upper = an.upper ?? Math.round(h * 0.6);
  const [ay0, ay1, aw] = an.arm === false ? [0, 0, 0] : an.arm || [Math.round(h * 0.35), foot, Math.round(w * 0.18)];
  const wingW = an.wing || Math.round(w * 0.28), band = an.band || 4;
  const PART = {
    top: (x, y) => y < top, head: (x, y) => y < head, upper: (x, y) => y < upper, body: (x, y) => y < foot,
    footL: (x, y) => y >= foot && x < cx, footR: (x, y) => y >= foot && x >= cx,
    armL: (x, y) => y >= ay0 && y < ay1 && x < aw, armR: (x, y) => y >= ay0 && y < ay1 && x >= w - aw,
    tool: (x, y) => !!an.tool && x >= an.tool[0] && x < an.tool[1],
    wing: (x, y) => (an.wingBox ? x >= an.wingBox[0] && x < an.wingBox[1] && y >= an.wingBox[2] && y < an.wingBox[3]
      : (x < wingW || x >= w - wingW) && y >= (an.wingTop || 0) && (an.wing || y < foot)),
    jaw: (x, y) => !!an.jaw && an.jaw.includes(letter(x, y)),
    feeler: (x, y) => !!an.feeler && x < an.feeler[0] && y < an.feeler[1],
    legA: (x, y) => y >= foot && Math.floor(x / band) % 2 === 0, legB: (x, y) => y >= foot && Math.floor(x / band) % 2 === 1,
  };
  // 옮길 자리: 위로 2칸, 옆으로 1칸 여유. 원래 그림은 (1, 2)에 두고 아래는 맞춘다(발바닥 그대로)
  const make = moves => {
    const c = document.createElement('canvas'); c.width = w + 2; c.height = h + 2; const g = c.getContext('2d');
    const img = g.createImageData(w + 2, h + 2), d = img.data;
    const put = (x, y, sx, sy) => { if (x < 0 || y < 0 || x >= w + 2 || y >= h + 2) return; const i = (y * (w + 2) + x) * 4, j = (sy * w + sx) * 4; d[i] = src[j]; d[i + 1] = src[j + 1]; d[i + 2] = src[j + 2]; d[i + 3] = 255; };
    const moved = [], op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] >= 128;
    const parts = moves.filter(([p]) => PART[p]), widen = moves.find(([p]) => p === 'widen');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!op(x, y)) continue;
      const m = parts.find(([p]) => PART[p](x, y));
      const dy = m && m[0] === 'wing' && an.wingAmp ? Math.max(-an.wingAmp, Math.min(an.wingAmp, m[2])) : m && m[2]; // 날개 폭 줄이기
      if (m && (m[1] || dy)) moved.push([x, y, m[1], dy]); else put(x + 1, y + 2, x, y);
    }
    // 빈자리 메우기: 옮긴 방향 반대쪽 칸이 제자리에 남는 픽셀이면 그 색으로
    const still = (x, y) => op(x, y) && !moved.some(([mx, my]) => mx === x && my === y);
    for (const [x, y, dx, dy] of moved) { const sx = x - Math.sign(dx), sy = y - Math.sign(dy); if (still(sx, sy)) put(x + 1, y + 2, sx, sy); }
    for (const [x, y, dx, dy] of moved) put(x + 1 + dx, y + 2 + dy, x, y); // 옮긴 부위를 위에 그린다
    // 구멍 메우기: 원래 몸 안쪽이었는데 비었고, 둘레 4칸 중 3칸 이상이 차 있으면 옆 칸 색으로
    const W2 = w + 2, full = (x, y) => x >= 0 && y >= 0 && x < W2 && y < h + 2 && d[(y * W2 + x) * 4 + 3] > 0;
    for (let y = 0; y < h + 2; y++) for (let x = 0; x < W2; x++) {
      if (full(x, y) || !op(x - 1, y - 2)) continue;
      const nb = [[x - 1, y], [x, y - 1], [x + 1, y], [x, y + 1]].filter(([a, b]) => full(a, b));
      if (nb.length < 3) continue;
      const [a, b] = nb[0], i = (y * W2 + x) * 4, j = (b * W2 + a) * 4; for (let k = 0; k < 4; k++) d[i + k] = d[j + k];
    }
    if (widen) { // 아래 n줄: 왼쪽 반은 1칸 왼쪽, 오른쪽 반은 1칸 오른쪽 (가운데 칸이 둘로 늘어난다)
      const W2 = w + 2, half = W2 >> 1;
      for (let y = h + 2 - widen[1]; y < h + 2; y++) {
        for (let x = 0; x < half - 1; x++) for (let k = 0; k < 4; k++) d[(y * W2 + x) * 4 + k] = d[(y * W2 + x + 1) * 4 + k];
        for (let x = W2 - 1; x > half; x--) for (let k = 0; k < 4; k++) d[(y * W2 + x) * 4 + k] = d[(y * W2 + x - 1) * 4 + k];
      }
    }
    g.putImageData(img, 0, 0); return c;
  };
  def._frames = { frames: K.f.map(make), bob: K.bob || K.f.map(() => 0), fps: an.fps || K.fps, kind };
  return def._frames;
}

// ---------------- 1 풀꽃 들판: 버려진 밭, 작물이 살아났다 ----------------
M('slimeG', '초록 슬리미', 'swarm', { a: '#7ee07a', A: '#46b85a', l: '#c8ffb8', g: '#3aa44a' }, [
  '....gg....gg....',
  '.....gg..gg.....',
  '......gggg......',
  '......oooo......',
  '....oowlaaoo....',
  '...owlaaaaaao...',
  '..olaaaaaaaaao..',
  '.olaaeaaaaeaaao.',
  '.oaaaeaaaaeaaao.',
  'oaaacaaaaaacaaao',
  'oaaaaaaeeaaaaaao',
  'oAaaaaaaaaaaaaAo',
  '.oAAaaaaaaaaAAo.',
  '..oooooooooooo..',
]);
M('turnip', '새싹돌이', 'swarm', { g: '#46b04a', p: '#c070e0', P: '#8a40b0', u: '#fbf4ff', U: '#d8c8ec' }, [
  '...g..g..g....',
  '....ggggg.....',
  '...oooooooo...',
  '..oppppppPPo..',
  '.oppppppppPPo.',
  '.oPPpppppPPPo.',
  '.ouuuuuuuuuUo.',
  '.ouueuuueuuUo.',
  '.ouueuuueuuUo.',
  '.oucuuuuucuUo.',
  '..ouuueuuuUo..',
  '...ouuuuuUo...',
  '....ouuUUo....',
  '......oo......',
]);
M('hornbun', '뿔토끼', 'charger', { f: '#fff1e4', F: '#e8cdbf', r: '#ffadc4', y: '#ffc83d' }, [
  '...oo..oo........',
  '..offo.offo......',
  '..ofro.ofro......',
  '..ofro.ofro......',
  '..offoyoffo......',
  '...offyyffo......',
  '..offffffffoo....',
  '.offffffffffoo...',
  '.ofeefffffffffo..',
  '.ofeeffffffffffo.',
  'ofcfffffffffffffo',
  'offfffffffffffffo',
  '.offffffffffffFFo',
  '..oFfffffffffFFo.',
  '...ooFFooooFFoo..',
  '....oooo..ooo....',
]);
M('strawman', '허수아비', 'tank', { h: '#d8b070', r: '#c04040', s: '#ecd6a8', j: '#b04a3a', J: '#7a2a20', y: '#ffd04d', b: '#6b4a2b' }, [
  '......oooooo......',
  '.....ohhhhhho.....',
  '.....ohhhhhho.....',
  '..ooorrrrrrrrooo..',
  '.ohhhhhhhhhhhhhho.',
  '..oooooooooooooo..',
  '.....osssssso.....',
  '....osesssesso....',
  '....osssssssso....',
  '....osseseseso....',
  '.....osssssso.....',
  '..ooojjjjjjjjooo..',
  '.oyyojjJjjjjjoyyo.',
  '.oyyojjjjjjJjoyyo.',
  '..ooojjjjjjjjooo..',
  '....ojjjJjjjjo....',
  '....oyyooooyyo....',
  '.....oyo..oyo.....',
  '.......obbo.......',
  '.......obbo.......',
  '.......obbo.......',
  '......obbbbo......',
]);
M('kingSlime', '밀짚모자 왕슬라임', 'boss', { a: '#7ee07a', A: '#46b85a', l: '#c8ffb8', h: '#ffd04d', H: '#d8a030', r: '#ff5e7a' }, [
  '...........oooooo...........',
  '.........oohhhhhhoo.........',
  '........ohhhhhhhhhho........',
  '........orrrrrrrrrro........',
  '....oooohhhhhhhhhhhhoooo....',
  '...ohhhhHhhhhhhhhhhHhhhho...',
  '....oooooooooooooooooooo....',
  '......oowllaaaaaaaaaaoo.....',
  '....oowllaaaaaaaaaaaaaaoo...',
  '...owlaeeaaaaaaaaaaaeeaaao..',
  '..olaaaaeeaaaaaaaaaeeaaaaao.',
  '..olaaaaweaaaaaaaaaweaaaaao.',
  '.oaaaaaaeeaaaaaaaaaeeaaaaaao',
  '.oaaaaaaeeaaaaaaaaaeeaaaaaao',
  'oaaacaaaaaaaaaaaaaaaaaacaaao',
  'oaaaaaaaaaeeeeeeeeaaaaaaaaao',
  'oaaaaaaaaaewewewewaaaaaaaaao',
  'oaaaaaaaaaaeeeeeeaaaaaaaaaao',
  'oAaaaaaaaaaaaaaaaaaaaaaaaaAo',
  'oAAaaaaaaaaaaaaaaaaaaaaaaAAo',
  '.oAAAaaaaaaaaaaaaaaaaaaAAAo.',
  '..ooAAAAaaaaaaaaaaaaAAAAoo..',
  '....oooooooooooooooooooo....',
]);

// ---- 2·3·4지역: 사용자 컨셉 PNG (에셋/몬스터/N지역/*.png → mon_assets_r2~r8.js, 목록·움직임은 에셋/몬스터/N지역/목록.json) ----

// ---------------- 5 태양 사막 신전: 해가 지지 않는다 ----------------
M('sunSprite', '햇살 정령', 'swarm', { y: '#ffc83d', l: '#fff09a', Y: '#ff8a2a' }, [
  '.......Y........',
  '..Y....Y....Y...',
  '...Y.oooooo.Y...',
  '....oyyyyyyo....',
  '...oyyllyyyyo...',
  'YYoyylyyyyyyyoYY',
  '..oyyeyyyyeyyo..',
  '..oyyeyyyyeyyo..',
  'YYoycyyeeyycyoYY',
  '...oyyyyyyyyo...',
  '....oYyyyyYo....',
  '...Y.oooooo.Y...',
  '..Y....Y....Y...',
  '.......Y........',
], { fly: 10 });
M('scorpion', '전갈', 'charger', { a: '#e0923a', A: '#a05a20', l: '#ffd08a', r: '#ff4a3a' }, [
  '.............ooo....',
  '............orrro...',
  '...........oaarro...',
  '...........oao.oo...',
  '............oao.....',
  '.oo..........oao....',
  'oaao..........oao...',
  'oeaao....ooooaaAo...',
  'oaaoooooaaaaaaaAo...',
  '.oaaaaaeaaaaaaAAo...',
  '..ooaaeaaaAaaAAo....',
  '...olllllllllllo....',
  '..o.oo.oo.oo.o.o....',
  '.o..o..o..o..o..o...',
]);
M('clayGuard', '흙 병사', 'tank', { a: '#c9885a', A: '#8a5a3a', m: '#d8c8a8', M: '#9a8a70', b: '#6b4a2b', h: '#3a8ab0', y: '#ffe27a', Y: '#ff9a2a' }, [
  '..m.........h...',
  '.mMm.......hh...',
  '..b.....ooohoo..',
  '..b....oaaaaaao.',
  '..b...oaaaaaaaao',
  '..b...oeeeeeeeeo',
  '..b...oaeyaaeyao',
  '..b...oaaaaaaaao',
  '..b....oaAAAAao.',
  '..b...ooooooooo.',
  '..b..oaaaaaaaaao',
  '.ooooaaaYYYaaaAo',
  '.oaaaaaYyyyYaaAo',
  '..b..oaYyyyYaaAo',
  '..b..oaaYYYaaaAo',
  '..b..oaaaaaaaAAo',
  '..b..oAaaaaaaAAo',
  '..b...oAAaaaAAo.',
  '..b....oaao.aao.',
  '..b....oaao.aao.',
  '..b...oAAAo.AAAo',
  '......ooooo.oooo',
]);
M('sandSnake', '모래 뱀', 'ranged', { a: '#e0b060', A: '#9a6a28', l: '#fff0c0', y: '#ff9a2a', r: '#ff5e7a' }, [
  '....oooooo......',
  '..ooaaaaaaoo....',
  '.oaaaaaaaaaao...',
  'oaayeaaaayeaao..',
  'oaaaaaaaaaaaao..',
  'oaaallllllaaao..',
  '.oaaaeeeeaaao...',
  'r.ooaaaaaaoo....',
  '.rr.oalllao.....',
  '....oalllao.....',
  '.....oallao.....',
  '.....oallaoooo..',
  '....oaalaaaaaaoo',
  '...oaaAaaaaAaaAo',
  '..oaaaaAaaaaaAAo',
  '..oAAaaaaAaaAAo.',
  '...oooooooooooo.',
]);
M('sunGolem', '태양 석상 골렘', 'boss', { a: '#c8ac7a', A: '#8a7048', l: '#e8d4a8', y: '#ffc83d', Y: '#ff8a2a', h: '#3a8ab0' }, [
  '..........oooooo..........',
  '.........ohhhhhho.........',
  '........oaaaaaaaao........',
  '........oaaaaaaaao........',
  '........oeeeeeeeeo........',
  '........oayaaaayao........',
  '........oaaaaaaaao........',
  '.....ooooaaAAAAaaoooo.....',
  '...ooaaaaoooooooooaaaaoo..',
  '..oaaaaaaaaaYYaaaaaaaaaao.',
  '.oaaaaaaaYYyyyyYYaaaaaaaao',
  '.oaaalaaYyyyyyyyyYaaaaaAAo',
  '.oaaaaaYyyeyyyeyyyYaaaaAAo',
  '.oaaaaaYyyyyyyyyyyYaaaaAAo',
  '.oalaaaYyyyeeeyyyyYaaaaAAo',
  '.oAaaaaaYyyyyyyyyYaaaaaAAo',
  '.oAAaaaaaYYyyyyYYaaaaaAAAo',
  '.oAAAaaaaaaaYYaaaaaaaaAAAo',
  '..oAAaaaalaaaaaaaaaaaAAAo.',
  '..oaaooaaaaaaaaaaaaaoaaao.',
  '..oaao.oaaaaaaaaaaao.oaao.',
  '.oaaaao.oaaaAAaaaao.oaaaao',
  '.oAAAAo.oaaao.oaaao.oAAAAo',
  '..oooo..oaaao.oaaao..oooo.',
  '........oaaao.oaaao.......',
  '.......oAAAAo.oAAAAo......',
  '.......oooooo.oooooo......',
]);

// ---------------- 6 얼어붙은 축제 산: 축제의 밤이 끝나지 않는다 ----------------
M('snowman', '목도리 눈사람', 'swarm', { p: '#6fd3ff', P: '#3a9ad0', y: '#ffd24d', n: '#ff8a2a', r: '#ff4d6a', R: '#c02a4a', W: '#c8d4f0' }, [
  '....opo.....',
  '...opPpo....',
  '..ooooooo...',
  '.owwwwwwwo..',
  '.owewwewwo..',
  'onnnwwwwwo..',
  '.owwweewwo..',
  'orrrrrrrrrro',
  '.oRrrwwwwwo.',
  'owwwwwewwwwo',
  'owwwwwwwwwwo',
  'owwwwwewwwWo',
  '.oWwwwwwwWo.',
  '..oooooooo..',
]);
M('iceTurtle', '얼음 거북', 'tank', { i: '#c8f0ff', I: '#6ab8e8', g: '#5ab890', G: '#2a7a60', a: '#7ac8a0', A: '#3a8a6a' }, [
  '...........oo.........',
  '..........oiio........',
  '......oo..oiIo...oo...',
  '.....oiio.oiIo..oiio..',
  '....oiiIioiiIIooiiIo..',
  '...oiiIIiiiiIIiiiIIo..',
  '...oiiiIiiiiiIiiiIIio.',
  '..oiiiiiiiiiiiiiiiiiio',
  '..oIiiiIiiiiIiiiIiiIIo',
  '..oggggggggggggggggggo',
  '.ooGgggGggggGgggGgggGo',
  'oaaooooooooooooooooooo',
  'oaeaaao..........oo...',
  'oaaaaaoaaao....oaao...',
  '.oaaAAoaaAo....oaAo...',
  '..oooooooo.....oooo...',
]);
M('penguin', '펭귄 병사', 'charger', { r: '#ff4d6a', b: '#34395a', B: '#1a1a30', y: '#ffb347' }, [
  '.....ooo......',
  '....orrro.....',
  '...orrrrro....',
  '..owwwwwwwo...',
  '..obbbbbbbo...',
  '.obbwwbbbbbo..',
  '.obwewbbbbbo..',
  'oyybbbbbbbbbo.',
  '.oobwwwwwwbbo.',
  '.obwwwwwwwbbbo',
  '.obwwwwwwwwbbo',
  '.obwwwwwwwwbBo',
  '..obwwwwwwbBo.',
  '...obbbbbbBo..',
  '..oyyo..oyyo..',
  '..oooo..oooo..',
]);
M('yeti', '설인', 'tank', { b: '#6a86d0', W: '#b8c4e8', B: '#3a5aa8' }, [
  '......o.o.o.o.......',
  '.....owowowowo......',
  '....owwwwwwwwwo.....',
  '...owwwwwwwwwwwo....',
  '..owwwbbbbbbbwwwo...',
  '..owwbbbbbbbbbwwo...',
  '..owbbebbbbebbbwo...',
  '..owbbebbbbebbbwo...',
  '..owbbbbBBbbbbbwo...',
  '.oowbbewwewbbbwwoo..',
  'owwwwbbbbbbbwwwwwwo.',
  'owwwwwwwwwwwwwwwwwwo',
  'owwWwwwwwwwwwwwwwWwo',
  'owwWowwwwwwwwwwwoWwo',
  'oWWo.owwwwwwwwwo.oWo',
  '.oo..owwwwwwwwwo..o.',
  '.....owwwwwwwwWo....',
  '.....owwwWWwwwWo....',
  '.....owwwo.owwWo....',
  '....owwwWo.oWwwWo...',
  '....oooooo.oooooo...',
]);
M('snowKing', '모자 쓴 눈사람 왕', 'boss', { k: '#23233a', K: '#44445e', r: '#ff4d6a', R: '#c02a4a', y: '#ffd24d', n: '#ff8a2a', W: '#c8d4f0', b: '#6b4a2b', l: '#ffe27a' }, [
  '.........o.o.o.o.........',
  '........oyoyoyoyo........',
  '........oyyyryyyo........',
  '........okkkkkkko........',
  '........okKkkkkko........',
  '........okkkkkkko........',
  '........orrrrrrro........',
  '......ooooooooooooo......',
  '.......owwwwwwwwwo.......',
  '......owwwwwwwwwwwo......',
  '......owweewwweewwo...o..',
  '.o....owweewwweewwo..olo.',
  'obo...onnnnnwwwwwwo..oyo.',
  '.ob...owwwweeewwwwo...b..',
  '..bo...owwwwwwwwwo...ob..',
  '...bo.orrrrrrrrrrrrrrob..',
  '....bborRrrrrrrrRrrrRo...',
  '......owwwwwwwrRrwwwo....',
  '.....owwwwwwwwwrRwwwwo...',
  '....owwwwwwwwwwwwwwwwwo..',
  '....owwwwwwwkwwwwwwwwwo..',
  '...owwwwwwwwwwwwwwwwwwwo.',
  '...owwwwwwwwkwwwwwwwwwWo.',
  '...owwwwwwwwwwwwwwwwwWWo.',
  '...oWwwwwwwwkwwwwwwwwWWo.',
  '....oWwwwwwwwwwwwwwwWWo..',
  '.....oWWwwwwwwwwwwWWWo...',
  '......ooooooooooooooo....',
]);

// ---------------- 7 그림자 폐성: 왕국 사람들은 그림자가 되었다 ----------------
M('wraith', '그림자 망령', 'ranged', { p: '#4a3a70', P: '#2a1e48', k: '#07030f', g: '#f0c8ff', m: '#b8b8d0' }, [
  '.....oooooo.....',
  '....oppppppo....',
  '...opppppppPo...',
  '..oppkkkkkkpPo..',
  '..opkkkkkkkkPo..',
  '..opkgkkkkgkPo..',
  '..opkgkkkkgkPo..',
  '..opkkkkkkkkPo..',
  '.oppkkkggkkkPPo.',
  '.opppkkkkkkpPPo.',
  'oppppppppppPPPo.',
  'opPppppppppPPPo.',
  'oppPpppppPppPPo.',
  '.opPppPppPpPPo..',
  '.oPoPPoPPoPPo...',
  '..o.oo.oo.oo....',
], { fly: 8 });
M('hollowKnight', '빈 갑옷 기사', 'tank', { m: '#9aa2c0', M: '#5a6080', k: '#07030f', g: '#e8c0ff', r: '#8a2a3a', R: '#5a1a2a', s: '#d8dcec', y: '#ffd24d' }, [
  '..s.......rr......',
  '..s......rr.......',
  '..s....oooooo.....',
  '..s...ommmmmmo....',
  '..s..ommmmmmmmo...',
  '..s..okkkkkkkMo...',
  '..s..okgkkgkkMo...',
  '..s..ommmmmmmMo...',
  '..s...oMMMMMMo....',
  '.oyo.oooooooooo...',
  '..omoommmmmmmmoo..',
  '..ommmmrrrrrmmmoro',
  '....ommrryrrmmMorR',
  '....ommrrrrRmmMoro',
  '....ommmrrRmmmMorR',
  '....ommmmmmmmMMoro',
  '....oMmmmmmmmMMo.o',
  '.....oMMMMMMMMo...',
  '.....ommo..ommo...',
  '.....ommo..ommo...',
  '.....ommo..ommo...',
  '....oMMMo.oMMMo...',
  '....ooooo.ooooo...',
]);
M('shadowBat', '그림자 박쥐', 'swarm', { a: '#3a2e58', B: '#5a4a88', g: '#ffd0ff' }, [
  '.oo..........oo.',
  '.oBo..o..o..oBo.',
  '.oBBo.oaao.oBBo.',
  '..oBBoaaaaoBBo..',
  '..oBBagaagaBBo..',
  '...oBaaaaaaBo...',
  '...oBawaawaBo...',
  '....o.oaao.o....',
  '.......oo.......',
], { fly: 14 });
M('shadowHound', '그림자 사냥개', 'charger', { a: '#2c2440', A: '#16101f', g: '#e8c0ff', r: '#8a2a5a', y: '#d8b048', p: '#4a3a70' }, [
  '..o..o..............',
  '.oao.oao............',
  '.oaaoaaao......oo...',
  'oaaaaaaaao....opo...',
  'oagaaaaaaao..oppo...',
  'oaaaaaaaaaoooppo....',
  'wwaaaaaaaaaaaapo....',
  'owaaaaarryaaaaao....',
  '.ooaaaarraaaaaAo....',
  '...oaaaaaaaaaAAo....',
  '...oaaAoooooaaAo....',
  '...oaAo.....oaAo....',
  '...oAAo.....oAAo....',
  '...ooo......ooo.....',
]);
M('shadowKing', '그림자 기사왕', 'boss', { m: '#6a6a8e', M: '#3a3a56', k: '#07030f', g: '#e8c0ff', y: '#ffc83d', r: '#5a1a2e', R: '#3a0a1a', s: '#b8a0e8', S: '#6a4aa8' }, [
  '..s.........o.o.o.o......',
  '..s........oyoyoyoyo.....',
  '..s........oyyygyyyo.....',
  '..s.......ooooooooooo....',
  '..s......ommmmmmmmmmo....',
  '..s......okkkkkkkkkMo....',
  '..s......okkgkkgkkkMo....',
  '..s......ommmmmmmmmMo....',
  '..s.......oMMMMMMMMo.....',
  '.oyo...ooooooooooooooo...',
  '..oroommmmmmmmmmmmmmmmoo.',
  '..rmmmmmmmmMMMMMmmmmmmmro',
  '..rrrommmmMggggMmmmmmoRro',
  '..rrrrommmMgMMgMmmmmoRRro',
  '..rrrrommmMMggMMmmmmoRRro',
  '...rrrommmmMMMMmmmmMoRRro',
  '...rrrrommmmmmmmmmMMoRRRo',
  '...rrrrommmmmmmmmMMMoRRRo',
  '...rrrroMMMMMMMMMMMoRRRRo',
  '...rrrrrommmo.ommmoRRRRo.',
  '....rrrrommmo.ommmoRRRo..',
  '....rrrrommmo.ommmoRRo...',
  '.....rrroMMMo.oMMMoRo....',
  '......rroMMMo.oMMMoo.....',
  '.......oMMMMo.oMMMMo.....',
  '.......oooooo.oooooo.....',
]);

// ---------------- 8 용의 둥지: 가장 큰 조각이 아직 빛난다 ----------------
M('dragonling', '아기 용', 'charger', { a: '#ff7040', A: '#b83a1a', l: '#ffd08a', p: '#c09aff', y: '#fff09a' }, [
  '..o..o............',
  '.olo.olo..........',
  '.olooolo....oo....',
  'oaaaaaaao..oAAo...',
  'oaweaaaaaooAAAo...',
  'oaeeaaaaaaAApAo...',
  'oaaaaaaaaaaaApo...',
  'ollcaaaaaaaaaao...',
  '.oeeeaaaaaaaaaoo..',
  '..oooaaalllaaaaoo.',
  '....oaalllllaaaAoo',
  '....oaalllllaaAAao',
  '....oaaallaaaAAo.o',
  '.....oaaAooaaAo...',
  '.....ooAo..oAo....',
  '......oo...oo.....',
]);
M('lavaGolem', '용암 골렘', 'tank', { a: '#4a3a3e', A: '#2a1e22', l: '#6a5a5e', y: '#ff8a2a', Y: '#ffe27a' }, [
  '......oooooo........',
  '.....oaaalaao.......',
  '....oaaaaaaaao......',
  '....oAAAAAAAAo......',
  '....oaYaaaaYao......',
  '....oaaaaaaaao......',
  '..ooooaayyaaoooo....',
  '.oaaaaooooooaaaao...',
  'oaalaaaaaaaaaaaaao..',
  'oaaaayaaaalaaayaaao.',
  'oaaaayYaaaaaaayaAao.',
  'oaaaaaYyaaaaayYaAAo.',
  'oaoaaaaYyaaayYaaoAo.',
  'oao.oaaaYyyyYaaoAAo.',
  'oyo.oaaaaYYaaaaoAyo.',
  'oyo.oaaaaaaaaaaoAyo.',
  '.o..oaaaaaaaaaAo.o..',
  '....oaaaAoooaaAo....',
  '....oaayAo.oaaAo....',
  '....oaaYAo.oayAo....',
  '...oaaaaAAooaaaAo...',
  '...oooooooooooooo...',
]);
M('crystalWisp', '수정 정령', 'ranged', { p: '#b48cff', P: '#6a4fb0', l: '#eee4ff', t: '#80e8ff' }, [
  '.....oo.....',
  't...olpo...t',
  '...ollppo...',
  '..ollpppPo..',
  '..olppppPo..',
  '.olpppppPPo.',
  '.oppeppeppo.',
  '.oppeppePPo.',
  'oppcppppcPPo',
  'oppppeepPPPo',
  '.oppppppPPo.',
  '.oPppppPPPo.',
  't.oPpppPPo.t',
  '...oPPPPo...',
  '....oPPo....',
  '.....oo.....',
  '..t......t..',
], { fly: 10 });
M('fallenKnight', '타락한 별 기사', 'charger', { m: '#d4cce8', M: '#8a80b0', k: '#140a24', r: '#c060ff', y: '#ffe27a', c2: '#3a2a6a', v: '#3a2a6a', s: '#f0ecff' }, [
  '......rr........',
  '.......rr.......',
  '....oooooo......',
  '...ommmmmmo.....',
  '..ommmmmmmmo....',
  '..okkkkkkkMo....',
  '..okrkkrkkMo....',
  '..ommmmmmmMo....',
  's..oMMMMMMo.....',
  '.s.oooooooooo...',
  '..somvmmmmmmvo..',
  '...smmmmyymmmvo.',
  '...ommmyyyymmvvo',
  '...ommmmyymmMvvo',
  '....ommmmmmMMvvo',
  '....oMmmmmmMMvo.',
  '.....oMMMMMMo...',
  '.....ommoommo...',
  '.....ommoommo...',
  '....oMMMooMMMo..',
  '....ooooooooooo.',
]);
M('aurumShade', '고룡 아우룸의 그림자', 'boss', { a: '#d09a38', A: '#8a5a18', l: '#ffe49a', p: '#9a70f0', y: '#ffe27a', d: '#6a4a18', r: '#8a3a1a' }, [
  '...o.o.................ooo....',
  '..olool.............oodddo....',
  '..olloo...........oodddddo....',
  '.oaaaaao.........odddaddddo...',
  'oaaaaaaao.......odddaaaddddo..',
  'oaaypaaaao.....odddaaaaadddo..',
  'oaaaaaaaaaooo.oddaaaaaaaaddo..',
  'eeaaaaaaaaaaaoddaaaaaaaaaaddo.',
  'owaaaaaaaaaaaaaaaaaaaaaaaaado.',
  'oeeeeeaaaaaaaaaaaaaaaaaaaaaoo.',
  '.ooooaaaaaaaaaaaaaaaaaaaaaao..',
  '....oaaaaaaapapapaaaaaaaaaao..',
  '....oaaaaaalllllllllaaaaaaAo..',
  '...oaaaaaalllllllllllaaaaaAo..',
  '...oaaaaalllllllllllllaaaaAAo.',
  '...oaaaaallllllllllllaaaaAAAo.',
  '...oAaaaaaalllllllllaaaaAAAAoo',
  '....oAaaaaaaaaaaaaaaaaaAAAAoAo',
  '....oAAaaaaAAoooooaaaaAAAo.oAo',
  '.....oaaaaAAo.....oaaaAAo...o.',
  '.....oaaaAAo......oaaaAAo.....',
  '.....oaaaAAo......oaaaAAo.....',
  '....oaaaaAAAo....oaaaaAAAo....',
  '....ooooooooo....ooooooooo....',
]);

// =====================================================================
// 새 컨셉 11종 (레퍼런스/몬스터 → 우리 그림체로 다시 찍음): 컨셉의 모양·색만 가져오고, 칸은 용사와 같은 2px, 모양은 단순하게.
// sym: 왼쪽 절반만 적으면 오른쪽은 거울로 채운다.
// =====================================================================
const sym = rows => rows.map(r => r + [...r].reverse().join(''));

// ---- 1 풀꽃 들판: 사용자가 단순화한 PNG (에셋/몬스터/1지역/*.png → mon_assets_forest.js, 목록·움직임은 에셋/몬스터/1지역/목록.json) ----
// 부엉이 모양은 서리 부엉이가 색만 바꿔 쓴다
const OWL = sym([
  '.......o...',
  '......oao..',
  '.oo..oaaaoo',
  'ogGo.oaaaaa',
  'oggGooaffff',
  '.ogggoafwef',
  '..oggoafeef',
  '..oGGoaaffy',
  '...oooaafff',
  '....oaaafff',
  '....oAaaaFf',
  '.....oAAaaa',
  '......ooooy',
]);

// ---- 6 얼음 동굴 ----
M('iceSlime', '얼음 방울', 'swarm', { a: '#eef8ff', A: '#b0d0ec', l: '#ffffff', i: '#9ad8ff', I: '#4a90d0' }, sym([
  '..o....',
  '.oio...',
  '.oiIo..',
  'ooiIooo',
  'olaaaaa',
  'olaaaaa',
  'oaaeeaa',
  'oacaaaa',
  'oaaaaaa',
  'oAaaaaa',
  '.oAAaaa',
  '..ooooo',
]), { anim: { kind: 'hop', top: 4, upper: 9 } });
M('crystalBeetle', '수정 딱정벌레', 'charger', { i: '#bce8ff', I: '#6ab0e8', j: '#4a78c0', l: '#ffffff', K: '#3a4a7a', t: '#9ad8ff' }, [
  '..oo.......ooooo....',
  '.o..o....ooiliiIoo..',
  '.oo.o...oiliiiIIIIo.',
  '..o.o..oiliiiIIiIIIo',
  '....o.oiiiiIIiiiIIjo',
  '....ooiiiIIiiiiIIjjo',
  '...ooeeeoIiiiiIIjjjo',
  '..oeeeeeeoIIiiIjjjjo',
  '..oetetteeoIIIjjjjo.',
  '..oeeeeeeeooooooooo.',
  '...oeeeeeo.oKo.oKo..',
  '..oKo.oKo..oKo..oKo.',
  '..oo..oo...oo...oo..',
], { anim: { kind: 'scuttle', foot: 11, band: 5, feeler: [5, 6] } });
M('frostOwl', '서리 부엉이', 'ranged', { a: '#dceeff', A: '#9ab8e0', f: '#ffffff', F: '#c8dcf0', g: '#9ad8ff', G: '#4a90d0', y: '#ffc83d' }, OWL, { fly: 8, anim: { kind: 'flap', wing: 5 } });
M('frostYeti', '서리 설인', 'tank', { a: '#f4f8ff', A: '#b8c8e8', f: '#8ab0e0', F: '#6a90c8', i: '#9ad8ff', I: '#4a90d0' }, sym([
  '..o.......',
  '.oio......',
  '.oiIo.oooo',
  '..oiIoaaaa',
  '..oiaaaaaa',
  '...oaaffff',
  '..oaaffeff',
  '..oaaffeff',
  '..oaafcfff',
  '.ooaaaFFFF',
  'oaaaaaaaaa',
  'oaaAaaaaaa',
  'oaaAoaaaaa',
  'oaaAoaaaaa',
  'oaaaoaaaaa',
  'oaaaAoaaaa',
  'oAaaAoaaaa',
  '.oAAoaaaaa',
  '..oooaaaaa',
  '....oAaaaa',
  '...oaaaAoo',
  '...oAAAAo.',
  '...ooooo..',
]), { anim: { kind: 'heavy', top: 0, head: 10, foot: 20, arm: [10, 18, 5] } });
M('iglooMimic', '이글루 흉내쟁이', 'tank', { i: '#eef8ff', I: '#b0d0ec', j: '#8ab8e0', k: '#1a2240', r: '#ff5a5a', s: '#ffffff', S: '#c8dcf0' }, [
  '.........oooooo.........',
  '.......ooiiiiiioo.......',
  '.....ooiiiiiiiiiioo.....',
  '....oiijjjjjjjjjjjIIo...',
  '...oiiiIiiiiiIiiiiIIo...',
  '..ojjjjjjjjjjjjjjjjjjo..',
  '..oiiIiiiiiIiiiiiIiIIo..',
  '.oiiiIioooooooiiiIiiIIo.',
  '.ojjjjokkkkkkkojjjjjjjo.',
  '.oiiIokkkkkkkkkoiiIiiIo.',
  '.oiiiokkrkkkrkkoiiiIiIo.',
  'ojjjjokkkkkkkkkojjjjjjjo',
  'oiiIiokkkkkkkkkoiiiIiiIo',
  'oiiiIokwkwkwkwkoiiiiIiIo',
  'ojjjjokkkkkkkkkojjjjjjjo',
  'osssssoooooooooossssssso',
  'oSsssssssssssssssssssSSo',
  '.oSSSsssssssssssssSSSSo.',
  '..oooooooooooooooooooo..',
], { anim: { kind: 'mimic', upper: 15, jaw: 'w' } });
