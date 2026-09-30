'use strict';
// =====================================================================
// 무기 벼리기: 벡터로 모양을 그리고 → 픽셀로 바꾸고 → 테두리·명암을 자동으로 입힌다.
// 각도마다 새로 벼리므로 휘두르는 동작에서도 픽셀이 깨지지 않는다.
// 무기 공간: 손잡이 쥔 곳이 (0,0). 검·완드는 위(-y)로, 엽총은 오른쪽(+x)으로 뻗는다. 단위 = 무기 픽셀 1칸(=게임 2px).
// =====================================================================
const MAT = { B: '#ff0000', D: '#800000', T: '#00ff00', P: '#0000ff', E: '#ffff00', A: '#ff00ff', W: '#00ffff' };
const MAT_RGB = Object.entries(MAT).map(([k, h]) => [k, parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
function makeF(g) {
  const set = m => { g.fillStyle = MAT[m]; g.strokeStyle = MAT[m]; };
  return {
    poly(pts, m) { set(m); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); },
    rect(x, y, w, h, m) { set(m); g.fillRect(x, y, w, h); },
    circle(x, y, r, m) { set(m); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); },
    ring(x, y, rx, ry, w, m) { set(m); g.lineWidth = w; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.stroke(); },
    line(pts, w, m) { set(m); g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); },
    curve(p0, c, p1, w, m) { set(m); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(...p0); g.quadraticCurveTo(...c, ...p1); g.stroke(); },
    cut(fn) { g.save(); g.globalCompositeOperation = 'destination-out'; fn(this); g.restore(); },
    mirror(pts) { return pts.map(([x, y]) => [-x, y]); },
  };
}
const forged = new Map();
function forge(d, deg) {
  deg = Math.round(deg / 5) * 5;
  const key = d.id + '|' + deg;
  let f = forged.get(key); if (f) return f;
  const S = Math.ceil(d.r * 2 * WRES + 6), c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2); g.rotate((deg * Math.PI) / 180); g.scale(WRES, WRES); d.draw(makeF(g));
  const src = g.getImageData(0, 0, S, S).data, cell = new Array(S * S).fill(null);
  for (let i = 0; i < S * S; i++) {
    if (src[i * 4 + 3] < 110) continue;
    let best = null, bd = 1e9;
    for (const [k, r, gg, b] of MAT_RGB) { const dd = (src[i * 4] - r) ** 2 + (src[i * 4 + 1] - gg) ** 2 + (src[i * 4 + 2] - b) ** 2; if (dd < bd) { bd = dd; best = k; } }
    cell[i] = best;
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? null : cell[y * S + x]);
  const out = cell.slice();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const m = at(x, y);
    if (!m) { if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out[y * S + x] = 'o'; continue; }
    const openTL = !at(x - 1, y) || !at(x, y - 1), openBR = !at(x + 1, y) || !at(x, y + 1);
    if (m === 'B' || m === 'W') out[y * S + x] = openTL ? m + 'h' : openBR ? m + 'd' : m;
    else if (m === 'T' || m === 'P' || m === 'D') out[y * S + x] = openBR ? m + 'd' : openTL && m === 'T' ? 'Th' : m;
    else if (m === 'E') out[y * S + x] = openTL && !at(x - 1, y - 1) ? 'Eh' : m;
  }
  const p = d.pal, C = {
    B: p.blade, Bh: p.hi, Bd: p.dark, D: p.steel || mix(p.dark, '#000000', 0.2), Dd: mix(p.steel || p.dark, '#000000', 0.35),
    T: p.trim, Th: mix(p.trim, '#ffffff', 0.45), Td: p.trimD || mix(p.trim, '#000000', 0.35),
    P: p.grip, Pd: mix(p.grip, '#000000', 0.35), E: p.gem, Eh: '#ffffff', A: p.accent || p.gem,
    W: p.pale || '#eef6ff', Wh: '#ffffff', Wd: mix(p.pale || '#eef6ff', p.dark, 0.45), o: p.outline || '#2a1a30',
  };
  const img = g.createImageData(S, S), accents = [];
  out.forEach((k, i) => {
    if (!k) return; const h = parseInt(C[k].slice(1), 16);
    img.data.set([h >> 16, (h >> 8) & 255, h & 255, 255], i * 4);
    if (k === 'A') accents.push([(i % S) - S / 2, Math.floor(i / S) - S / 2]);
  });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.putImageData(img, 0, 0);
  const rad = (deg * Math.PI) / 180, [tx, ty] = d.tip;
  f = { c, S, accents, tip: [(tx * Math.cos(rad) - ty * Math.sin(rad)) * WRES, (tx * Math.sin(rad) + ty * Math.cos(rad)) * WRES] };
  forged.set(key, f); return f;
}
const tinted = new Map();
function tintOf(f, tint) {
  const key = f.c; let m = tinted.get(key); if (!m) tinted.set(key, (m = new Map()));
  let c = m.get(tint); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = f.S; const g = c.getContext('2d');
  g.drawImage(f.c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, f.S, f.S);
  m.set(tint, c); return c;
}
// 무기 칸 = 용사·몬스터 칸(2px)과 같게: 설계도를 절반 크기(WRES)로 칸 그림을 만들고 1칸을 2px(WSCALE)로 그린다. 화면 크기는 그대로.
const WRES = 0.5, WSCALE = 2;
// 손(hx,hy)에 무기를 쥐어 그린다. 끝점(칼끝·총구·보석)의 논리 좌표를 돌려준다.
function drawWeapon(d, deg, hx, hy, tint = null) {
  const f = forge(d, deg), img = tint ? tintOf(f, tint) : f.c;
  L.drawImage(img, hx - (f.S / 2) * WSCALE, hy - (f.S / 2) * WSCALE, f.S * WSCALE, f.S * WSCALE);
  return [hx + f.tip[0] * WSCALE, hy + f.tip[1] * WSCALE, f];
}

// =====================================================================
// 무기 모양. 등급이 오를수록 커지고, 장식이 늘고, 실루엣이 바뀐다.
// =====================================================================
const pal = (blade, hi, dark, trim, grip, gem, extra = {}) => ({ blade, hi, dark, trim, grip, gem, ...extra });
const hilt = (F, gw = 7, gy = -3.5, gem = false, pom = 'T') => { F.rect(-gw / 2, gy, gw, 2, 'T'); F.rect(-1, gy + 2, 2, 4, 'P'); F.circle(0, gy + 7, 1.5, pom); if (gem) F.circle(0, gy + 1, 1.3, 'E'); };
const DESIGNS = {};
function def(id, type, grade, name, r, tip, palette, draw, extra = {}) { DESIGNS[id] = { id, type, grade, name, r, tip, pal: palette, draw, ...extra }; return DESIGNS[id]; }

// ---------------- 검 ----------------
def('s0', 'sword', '일반', '낡은 검', 17, [0, -15], pal('#c9d6ee', '#ffffff', '#7c8db3', '#a8704a', '#6b4a2b', '#c9d6ee'), F => {
  F.poly([[-1.5, -3], [1.5, -3], [1.5, -12], [0, -15], [-1.5, -12]], 'B'); hilt(F, 6, -3.5);
});
def('s1', 'sword', '레어', '기사의 검', 20, [0, -19], pal('#dff1ff', '#ffffff', '#6a8fc8', '#a9bdd8', '#3a4a6a', '#4aa8ff'), F => {
  F.poly([[-2, -3], [2, -3], [2, -15], [0, -19], [-2, -15]], 'B'); F.line([[0, -5], [0, -15]], 1, 'D');
  F.poly([[-6, -4.5], [6, -4.5], [5, -2.5], [-5, -2.5]], 'T'); F.rect(-6.5, -4.5, 2, 3.5, 'T'); F.rect(4.5, -4.5, 2, 3.5, 'T');
  F.rect(-1, -2.5, 2, 5, 'P'); F.circle(0, 3.8, 1.8, 'T'); F.circle(0, -3.5, 1.3, 'E'); F.circle(0, 3.8, 0.9, 'E');
});
def('s2', 'sword', '유니크', '검객의 검', 23, [0, -22], pal('#fff4d6', '#ffffff', '#d4a64a', '#ffc83d', '#6b3a1f', '#44d4ff', { accent: '#ff5e7a' }), F => {
  F.poly([[-2, -4], [2, -4], [3.2, -12], [2.6, -18], [0, -22], [-2.6, -18], [-3.2, -12]], 'B'); F.line([[0, -6], [0, -17]], 1, 'D');
  const wing = [[-2, -5], [-9, -9], [-8, -6], [-9.5, -4.5], [-2, -2.5]]; F.poly(wing, 'T'); F.poly(F.mirror(wing), 'T');
  F.rect(-1, -3, 2, 6, 'P'); F.poly([[0, 2.5], [2, 4.5], [0, 6.5], [-2, 4.5]], 'T'); F.circle(0, -4, 1.7, 'E');
  F.curve([0, 6], [3, 8], [2, 11], 1.3, 'A');
});
def('s3', 'sword', '레전더리', '검성의 검', 25, [0, -24], pal('#ffd6d6', '#ffffff', '#b8233a', '#3a2a2a', '#2a1a1a', '#ff4d5e', { accent: '#ffb347', trimD: '#1a1010' }), F => {
  const L1 = [], R1 = [];
  for (let y = -4; y >= -20; y -= 1) { const w = 2.6 + Math.sin(y * 0.9) * 0.9; L1.push([-w, y]); R1.push([w, y]); }
  F.poly([...L1, [0, -24], ...R1.reverse()], 'B'); F.line([[0, -5], [0, -19]], 1.2, 'A');
  const sp = [[-3, -6], [-11, -9], [-8, -5], [-12, -2], [-3, -3]]; F.poly(sp, 'T'); F.poly(F.mirror(sp), 'T');
  F.rect(-1.2, -3, 2.4, 6, 'P'); F.poly([[0, 2.5], [2.5, 5], [0, 9], [-2.5, 5]], 'T'); F.circle(0, -4.5, 2.2, 'E'); F.circle(0, 5, 1, 'E');
}, { aura: '#ff4d5e' });
// 판타지아 검
def('f_musang', 'sword', '판타지아', '천하무쌍', 27, [0, -25], pal('#fff0b8', '#ffffff', '#c98a12', '#ffc83d', '#5a2a10', '#ff5e3a', { accent: '#fff7c2', trimD: '#8a5a10' }), F => {
  F.poly([[-5, -4], [5, -4], [5.5, -18], [0, -25], [-5.5, -18]], 'T');
  F.poly([[-3.8, -5], [3.8, -5], [4.2, -17.5], [0, -23], [-4.2, -17.5]], 'B');
  F.cut(G => G.poly([[-1.2, -9], [1.2, -9], [1.2, -17], [0, -19.5], [-1.2, -17]], 'B'));
  F.line([[0, -10], [0, -17]], 0.8, 'A');
  const wing = [[-3, -6], [-12, -12], [-10, -8], [-13, -6], [-10, -4.5], [-3, -3]]; F.poly(wing, 'T'); F.poly(F.mirror(wing), 'T');
  F.rect(-1.3, -3, 2.6, 7, 'P'); F.circle(0, 5.5, 2.2, 'T'); F.circle(0, 5.5, 1.1, 'E'); F.circle(0, -4.5, 2.2, 'E');
}, { aura: '#ffc83d' });
def('f_dawn', 'sword', '판타지아', '새벽가르개', 27, [0, -26], pal('#ffffff', '#ffffff', '#c8d2f0', '#ffd24d', '#8a5a2b', '#ff9a3c', { accent: '#fff09a', pale: '#fffaf0' }), F => {
  F.poly([[-2.6, -4], [2.6, -4], [2.6, -21], [0, -26], [-2.6, -21]], 'W'); F.line([[0, -6], [0, -20]], 1, 'T');
  F.ring(0, -13, 5.5, 1.6, 1.1, 'A');
  const f1 = [[-3, -4], [-13, -12], [-11, -9], [-13, -9], [-10, -6], [-12, -5], [-3, -2]]; F.poly(f1, 'W'); F.poly(F.mirror(f1), 'W');
  F.rect(-4, -4.5, 8, 2.2, 'T'); F.rect(-1, -2.3, 2, 6, 'P'); F.circle(0, 5, 2.2, 'T'); F.circle(0, 5, 1.1, 'E');
}, { aura: '#ffe27a' });
def('f_sakura', 'sword', '판타지아', '벚꽃무희', 27, [4.5, -25], pal('#fff0f6', '#ffffff', '#ff8fb8', '#ffb3d1', '#5a2a4a', '#ff5e9a', { accent: '#ff8fb8' }), F => {
  F.curve([0, -3], [1, -15], [4.5, -25], 2.8, 'B'); F.curve([0.8, -4], [2, -15], [4.5, -24], 0.9, 'A');
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; F.circle(Math.cos(a) * 2.2, -3 + Math.sin(a) * 1.2, 1.4, 'T'); }
  F.rect(-1, -2, 2, 7, 'P'); F.curve([0, 5], [-2, 8], [-4, 11], 1.1, 'A'); F.circle(-4.2, 11.5, 1.6, 'E');
}, { aura: '#ff8fb8' });
def('f_thunder', 'sword', '판타지아', '천둥송곳니', 26, [2.5, -24], pal('#fff7b0', '#ffffff', '#d4a012', '#e8f4ff', '#2a2a4a', '#6fd3ff', { accent: '#6fd3ff' }), F => {
  F.poly([[-2, -4], [2, -4], [3.4, -10], [0.8, -10], [3.8, -17], [1.2, -17], [2.6, -24], [-2.8, -15], [-0.2, -15], [-3.2, -10], [-0.6, -10]], 'B');
  F.line([[0, -5], [1.8, -10], [-0.6, -12], [2, -17], [1.2, -20]], 0.8, 'A');
  const fang = [[-6.5, -5.5], [-2, -4.5], [-3, -0.5]]; F.poly(fang, 'T'); F.poly(F.mirror(fang), 'T'); F.rect(-3, -5.5, 6, 2, 'D');
  F.rect(-1, -3.5, 2, 7, 'P'); F.circle(0, 4.5, 1.8, 'E');
}, { aura: '#6fd3ff' });
def('f_moon', 'sword', '판타지아', '달그림자', 26, [5, -24], pal('#d9c8ff', '#ffffff', '#6a4fb0', '#2a1f40', '#1a1228', '#fff09a', { accent: '#b48cff', trimD: '#120c1c' }), F => {
  F.circle(3, -14, 10, 'B'); F.cut(G => G.circle(7, -15.5, 9, 'B'));
  F.poly([[-1.5, -4], [1.5, -4], [0.2, -9], [-1.8, -8]], 'B'); F.curve([-5, -10], [-6, -16], [-3, -21], 0.8, 'A');
  F.poly([[-4, -5], [4, -5], [3, -3], [-3, -3]], 'T'); F.rect(-1, -3, 2, 6, 'P'); F.circle(0, 4, 1.6, 'T');
  F.poly([[0, -6.5], [0.7, -4.7], [2.3, -4.7], [1, -3.7], [1.5, -2], [0, -3], [-1.5, -2], [-1, -3.7], [-2.3, -4.7], [-0.7, -4.7]], 'E');
}, { aura: '#8a63e0' });
def('f_volcano', 'sword', '판타지아', '화산의 심장', 27, [1, -25], pal('#5a4a4a', '#8a7070', '#2a2020', '#3a2a2a', '#4a2a1a', '#ff7a2a', { accent: '#ffb347', outline: '#140a0a' }), F => {
  F.poly([[-3.5, -4], [5, -4], [6.2, -19], [1, -25], [-4.5, -18]], 'B');
  F.line([[0.5, -6], [2.5, -11], [0, -15], [3, -20]], 1, 'A'); F.line([[-2, -8], [-1, -13], [-2.5, -16]], 0.9, 'A'); F.line([[3.5, -8], [4.5, -13]], 0.8, 'A');
  F.rect(-5.5, -6, 12, 2.8, 'T'); F.rect(-1.3, -3.2, 2.6, 7, 'P'); F.circle(0, 5.2, 2.2, 'E');
}, { aura: '#ff7a2a' });

// ---------------- 엽총 (오른쪽으로 뻗음) ----------------
const stock = (F, big = false) => F.poly(big ? [[-12, -4], [-3, -4], [-3, 1], [-7, 3], [-12, 2]] : [[-10, -3.5], [-3, -3.5], [-3, 1], [-6, 2], [-10, 1]], 'P');
def('g0', 'gun', '일반', '낡은 엽총', 17, [14, -3], pal('#a9b8d6', '#dbe5f7', '#7c8db3', '#ffc83d', '#9a5b3a', '#ffc83d'), F => {
  stock(F); F.rect(-3.5, -4.5, 6, 4.5, 'D'); F.rect(2, -4.5, 12, 2.2, 'B'); F.rect(2, -2.3, 9, 1.6, 'D'); F.rect(-0.5, 0, 1.2, 2, 'T');
});
def('g1', 'gun', '레어', '쌍열 엽총', 20, [17, -3.5], pal('#dff1ff', '#ffffff', '#4a78b8', '#a9bdd8', '#6b4a3a', '#4aa8ff'), F => {
  stock(F); F.rect(-12, -3.8, 1.5, 5.5, 'T'); F.rect(-3.5, -5, 6, 5, 'D'); F.rect(2, -5.2, 15, 1.9, 'B'); F.rect(2, -3.2, 15, 1.9, 'B');
  F.rect(6, -5.6, 1.3, 4.2, 'T'); F.rect(12, -5.6, 1.3, 4.2, 'T'); F.rect(-0.5, 0, 1.2, 2, 'T'); F.circle(-1, -2.5, 1, 'E');
});
def('g2', 'gun', '유니크', '황금 사냥총', 22, [18, -3.5], pal('#fff4d6', '#ffffff', '#b88a3a', '#ffc83d', '#7a3b1f', '#44d4ff'), F => {
  stock(F, true); F.line([[-11, -1], [-5, -1]], 0.8, 'T'); F.rect(-4, -5.5, 7, 6, 'T'); F.rect(2, -5.4, 16, 3.2, 'B'); F.rect(2, -2.4, 12, 1.4, 'D');
  F.rect(-2, -9, 9, 2.4, 'D'); F.circle(7.5, -7.8, 1.3, 'E'); F.rect(-0.5, 0.5, 1.2, 2, 'T'); F.poly([[17, -6], [19, -4], [17, -2]], 'T');
});
def('g3', 'gun', '레전더리', '진홍 폭풍총', 24, [19, -3.5], pal('#ffb3b3', '#ffffff', '#8a1a2a', '#3a2a2a', '#2a1a1a', '#ff4d5e', { accent: '#ffb347', steel: '#4a3040' }), F => {
  stock(F, true); F.rect(-4, -6, 8, 6.5, 'D'); F.circle(0, 2, 3.4, 'T'); F.circle(0, 2, 1.2, 'E');
  F.rect(3, -5.8, 16, 3.4, 'B'); F.line([[6, -4.2], [16, -4.2]], 0.9, 'A'); F.poly([[12, -2.4], [23, -1.2], [12, -0.2]], 'W'); F.poly([[18, -7], [20, -4], [18, -1.8]], 'T');
}, { aura: '#ff4d5e' });
// 판타지아 엽총
def('f_storm', 'gun', '판타지아', '폭풍의 나팔총', 22, [18, -3.5], pal('#ffe08a', '#ffffff', '#b8801a', '#ffc83d', '#6b3a1f', '#ff5e3a', { accent: '#fff09a', steel: '#8a5a1a' }), F => {
  stock(F, true); F.line([[-11, -2], [-5, -2]], 0.8, 'T'); F.rect(-4, -5.5, 7, 6, 'D');
  F.poly([[2, -5.5], [13, -5.2], [18, -9], [18, 2], [13, -1.8], [2, -1.5]], 'B'); F.ring(18, -3.5, 1.2, 5.5, 1, 'T');
  F.rect(6, -6, 1.2, 5, 'T'); F.rect(10, -6, 1.2, 5, 'T'); F.circle(-0.5, -3, 1.2, 'E');
}, { aura: '#ffc83d' });
def('f_star', 'gun', '판타지아', '별비 사냥꾼', 25, [22, -3.5], pal('#c8d4ff', '#ffffff', '#4a5a9a', '#ffe27a', '#2a2f55', '#fff09a', { accent: '#fff5b8', steel: '#3a4478' }), F => {
  stock(F, true); F.rect(-4, -5.5, 7, 6, 'D'); F.rect(2, -4.8, 18, 2.4, 'B'); F.rect(2, -2.4, 13, 1.3, 'D');
  const st = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 - 1.57, r = i % 2 ? 1.4 : 3.4; st.push([21 + Math.cos(a) * r, -3.6 + Math.sin(a) * r]); } F.poly(st, 'E');
  F.line([[-6, 2], [-5, 6]], 0.7, 'T'); F.circle(-5, 7, 1.3, 'A');
}, { aura: '#fff09a' });
def('f_crow', 'gun', '판타지아', '붉은 까마귀', 23, [20, -3.5], pal('#4a4a58', '#8a8aa0', '#1e1e26', '#2b2b33', '#1a1a22', '#ff4d5e', { accent: '#ff4d5e', outline: '#0a0a10' }), F => {
  for (let i = 0; i < 4; i++) F.poly([[-3, -4 + i * 1.5], [-13 + i, -6 + i * 3.2], [-10 + i, -3 + i * 2.8], [-3, -1.5 + i]], 'P');
  F.rect(-4, -5.5, 7, 6, 'D'); F.rect(2, -5.2, 14, 2.8, 'B'); F.poly([[15.5, -6.5], [20.5, -3.6], [15.5, -1.8]], 'T'); F.circle(-0.5, -3, 1.4, 'E');
}, { aura: '#ff4d5e' });
def('f_raijin', 'gun', '판타지아', '뇌명', 22, [18, -3.4], pal('#9fb0e8', '#ffffff', '#3a4478', '#e8f4ff', '#2a2a3a', '#7fe0ff', { accent: '#7fe0ff', steel: '#2a3358' }), F => {
  stock(F, true); F.rect(-4, -5.5, 7, 6, 'D'); F.rect(2, -4.6, 15, 2.6, 'B');
  for (const x of [6, 10, 14]) F.ring(x, -3.3, 1.1, 3.6, 1, 'A');
  F.line([[17, -5.5], [19.5, -6.5]], 0.9, 'T'); F.line([[17, -1.2], [19.5, -0.2]], 0.9, 'T'); F.circle(-0.5, -3, 1.2, 'E');
}, { aura: '#7fe0ff' });
def('f_bubble', 'gun', '판타지아', '방울방울', 20, [16, -3.5], pal('#bfeaff', '#ffffff', '#6ab8e8', '#fff09a', '#ff9ed6', '#ff9ed6', { pale: '#e8f8ff', accent: '#ffb3d9' }), F => {
  F.poly([[-9, -4], [-3, -4], [-3, 1], [-6, 2.5], [-9, 1.5]], 'P'); F.rect(-4, -5.5, 14, 4.5, 'B');
  F.circle(0, -8, 4, 'W'); F.circle(-1.2, -9.2, 1, 'A'); F.rect(10, -4.8, 4.5, 2.6, 'T'); F.circle(15.5, -3.5, 1.8, 'T'); F.circle(4, -1, 1, 'E');
}, { aura: '#bfeaff' });
def('f_galaxy', 'gun', '판타지아', '은하 관통자', 24, [20, -3.7], pal('#d0c4ff', '#ffffff', '#6a4fd0', '#7fe0ff', '#2a2248', '#b48cff', { accent: '#7fe0ff', steel: '#2a2248' }), F => {
  F.poly([[-12, -4], [-4, -5], [-4, 1], [-8, 3], [-12, 0]], 'P'); F.rect(-4.5, -7, 8, 8, 'D');
  F.rect(2, -7.2, 18, 2.2, 'B'); F.rect(2, -1.4, 18, 2.2, 'B'); F.rect(2, -4.6, 15, 1.8, 'A'); F.circle(-0.5, -3, 1.5, 'E');
}, { aura: '#b48cff' });

// ---------------- 완드 (위로 뻗음) ----------------
def('w0', 'wand', '일반', '나무 완드', 17, [0, -14], pal('#ff9a3c', '#ffe08a', '#d8384f', '#ffc83d', '#9a5b3a', '#ff9a3c'), F => {
  F.line([[0, 3], [0, -11]], 1.8, 'P'); F.rect(-1.5, -12, 3, 1.6, 'T'); F.circle(0, -14, 2.1, 'E');
});
def('w1', 'wand', '레어', '수정 지팡이', 21, [0, -18], pal('#bfeaff', '#ffffff', '#4aa8ff', '#a9bdd8', '#5a4a6a', '#4aa8ff'), F => {
  F.line([[0, 4], [0, -14]], 1.9, 'P'); F.rect(-1.6, -14, 3.2, 1.6, 'T');
  F.line([[0, -14], [-2.8, -17], [-1.6, -20.5]], 1, 'T'); F.line([[0, -14], [2.8, -17], [1.6, -20.5]], 1, 'T'); F.circle(0, -18, 2.3, 'E');
});
def('w2', 'wand', '유니크', '황금 나선 지팡이', 23, [0, -19], pal('#fff4d6', '#ffffff', '#b88a3a', '#ffc83d', '#6b3a1f', '#44d4ff', { accent: '#aef0ff' }), F => {
  F.line([[0, 5], [0, -14]], 2, 'P'); for (const y of [-2, -8]) F.rect(-1.6, y, 3.2, 1.3, 'T');
  const sp = []; for (let i = 0; i <= 20; i++) { const a = i * 0.55, r = 1.5 + i * 0.19; sp.push([Math.cos(a) * r, -19 + Math.sin(a) * r * 1.1]); } F.line(sp, 1.1, 'T');
  F.circle(0, -19, 2.6, 'E'); F.circle(0, -19, 1, 'A');
});
def('w3', 'wand', '레전더리', '진홍 수정관', 25, [0, -22], pal('#ffd6d6', '#ffffff', '#b8233a', '#3a2a2a', '#2a1a1a', '#ff4d5e', { accent: '#ffb347', pale: '#fff0f0' }), F => {
  F.line([[0, 6], [0, -14]], 2.1, 'P'); F.rect(-2.4, -15, 4.8, 2, 'T');
  const w = [[-2, -15], [-9, -20], [-7, -17], [-9, -15], [-2, -13]]; F.poly(w, 'W'); F.poly(F.mirror(w), 'W');
  F.poly([[0, -26], [2, -20], [0, -16], [-2, -20]], 'E'); F.poly([[-3.5, -22], [-2, -19], [-3, -16], [-4.5, -19]], 'E'); F.poly([[3.5, -22], [4.5, -19], [3, -16], [2, -19]], 'E');
  F.line([[0, -24], [0, -18]], 0.7, 'A');
}, { aura: '#ff4d5e' });
// 판타지아 완드
def('f_dragon', 'wand', '판타지아', '용심장 지팡이', 26, [3, -22], pal('#b48cff', '#e2d2ff', '#4f2d8a', '#8f5bd6', '#3a2a4a', '#ff7a2a', { accent: '#ffe27a' }), F => {
  F.line([[0, 6], [0, -12]], 2.2, 'P'); F.rect(-2, -12, 4, 1.8, 'T');
  F.poly([[-2, -12], [-3, -18], [-1, -23], [5, -24], [8, -21], [4, -20], [3, -18], [6, -16], [2, -15]], 'T');
  F.line([[-1.5, -22], [-5, -26]], 1, 'D'); F.line([[0.5, -23.5], [-2, -27]], 0.9, 'D'); F.circle(2.8, -19.5, 2.4, 'E'); F.circle(2.8, -19.5, 1, 'A'); F.circle(1.5, -22, 0.6, 'A');
}, { aura: '#b48cff' });
def('f_phoenix', 'wand', '판타지아', '불사조 깃털', 26, [0, -24], pal('#ffb347', '#fff09a', '#e0521f', '#ffe27a', '#8a3a1f', '#ff4d2a', { accent: '#fff7c2' }), F => {
  F.line([[0, 6], [0, -8]], 1.4, 'P');
  F.poly([[0, -5], [3.5, -11], [3.5, -18], [0, -25], [-2.5, -17], [-2.5, -9]], 'B'); F.line([[0, -6], [0, -22]], 0.8, 'T');
  for (let i = 0; i < 4; i++) F.line([[0, -9 - i * 3.5], [2.6, -11 - i * 3.5]], 0.6, 'T');
  F.poly([[0, -19], [2.4, -21], [0, -26.5], [-1.8, -21]], 'A');
}, { aura: '#ff9a3c' });
def('f_frost', 'wand', '판타지아', '서리여왕의 홀', 26, [0, -20], pal('#bfeaff', '#ffffff', '#6ab8e8', '#e0f6ff', '#6a86b8', '#8fd8ff', { pale: '#e0f6ff', accent: '#ffffff' }), F => {
  F.line([[0, 6], [0, -13]], 2, 'W'); F.rect(-2.2, -14, 4.4, 1.8, 'T');
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 - 1.57, x = Math.cos(a) * 5.5, y = -19.5 + Math.sin(a) * 5.5; F.line([[0, -19.5], [x, y]], 1, 'B'); F.line([[x * 0.6, -19.5 + (y + 19.5) * 0.6], [x * 0.6 + Math.cos(a + 1.2) * 1.6, -19.5 + (y + 19.5) * 0.6 + Math.sin(a + 1.2) * 1.6]], 0.7, 'B'); }
  F.circle(0, -19.5, 2, 'E');
}, { aura: '#8fd8ff' });
def('f_storm_eye', 'wand', '판타지아', '폭풍의 눈', 26, [0, -18], pal('#b8fff0', '#ffffff', '#2fa890', '#4fd1b8', '#3a5a5a', '#7ff0d8', { accent: '#e0fff8' }), F => {
  F.line([[0, 6], [0, -12]], 2, 'P'); F.ring(0, -18.5, 6, 6.5, 1.5, 'T'); F.circle(0, -18.5, 2.4, 'E'); F.circle(0, -18.5, 1, 'A');
  F.curve([-6, -16], [-3, -12], [2, -12.5], 0.8, 'B'); F.curve([6, -21], [3, -25], [-2, -24.5], 0.8, 'B');
}, { aura: '#7ff0d8' });
def('f_stella', 'wand', '판타지아', '별자리 지팡이', 26, [3, -23], pal('#b8c8ff', '#ffffff', '#3a3f7a', '#ffc83d', '#2a2f55', '#fff5b8', { accent: '#fff5b8' }), F => {
  F.line([[0, 6], [0, -13]], 2, 'P'); F.rect(-1.8, -13.5, 3.6, 1.6, 'T');
  F.circle(-0.5, -18.5, 5.5, 'T'); F.cut(G => G.circle(2.2, -19.5, 4.8, 'T'));
  const st = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 - 1.57, r = i % 2 ? 1.1 : 2.6; st.push([3 + Math.cos(a) * r, -23 + Math.sin(a) * r]); } F.poly(st, 'E');
  F.line([[-5, -16], [-6, -11]], 0.6, 'T'); F.circle(-6, -10.5, 0.9, 'A');
}, { aura: '#b8c8ff' });
def('f_forest', 'wand', '판타지아', '숲의 노래', 26, [0, -23], pal('#8fdc84', '#d8ffc8', '#3a9a44', '#6b4a2b', '#6b4a2b', '#ffb3d1', { accent: '#ffe27a' }), F => {
  F.curve([0, 6], [-2, -4], [0, -12], 2.4, 'P'); F.curve([0, -12], [2, -17], [0, -21], 1.8, 'P'); F.curve([0, -14], [-4, -17], [-5, -21], 1.1, 'P');
  F.poly([[0, -13], [5, -15], [7, -19], [2, -17]], 'B'); F.poly([[-4, -18], [-8, -20], [-9, -24], [-5, -22]], 'B'); F.poly([[1, -19], [4, -22], [3, -26], [0, -23]], 'B');
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; F.circle(Math.cos(a) * 1.6, -22.5 + Math.sin(a) * 1.6, 1.1, 'E'); } F.circle(0, -22.5, 0.8, 'A');
}, { aura: '#8fdc84' });

const GRADE_OF = { sword: ['s0', 's1', 's2', 's3'], gun: ['g0', 'g1', 'g2', 'g3'], wand: ['w0', 'w1', 'w2', 'w3'] };
