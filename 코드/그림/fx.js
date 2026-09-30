'use strict';
// =====================================================================
// 그리기 도구 + 이펙트 도구
// 좌표는 게임 띠 모드와 같은 논리 좌표(480×110). 버퍼는 2배(960×220)라 이펙트가 촘촘하다.
// 레퍼런스 분석: 기록/스킬 이펙트 레퍼런스 분석.md
// =====================================================================
const W = 480, H = 110, GROUND = 100, HX = 120, PX = 2, RES = 2;
const FONT = '"Galmuri11","Malgun Gothic","Apple SD Gothic Neo",sans-serif'; // 갈무리 (글꼴/ 폴더, html에서 불러온다)

function makeBuf() {
  const c = document.createElement('canvas'); c.width = W * RES; c.height = H * RES;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  return [c, g];
}
const [buf, bctx] = makeBuf();
const [aux, actx] = makeBuf();
let L = bctx;
function resetCtx(g) { g.setTransform(RES, 0, 0, RES, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false; }

// ---------- 수학 ----------
function rnd(i) { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eo = k => 1 - (1 - k) * (1 - k), ei = k => k * k, eo3 = k => 1 - (1 - k) ** 3, eio = k => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
const inW = (t, a, b) => t >= a && t < b;
// 터진 뒤에만 1→0으로 옅어진다 (터지기 전엔 0)
const pulse = (t, a, b) => (t < a ? 0 : 1 - prog(t, a, b));
const fade = (t, a, b, f = 0.12) => (inW(t, a, b) ? Math.min(1, (t - a) / f, (b - t) / f) : 0);
const lerp = (a, b, k) => a + (b - a) * k;
const snap = v => Math.round(v / PX) * PX;
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mix(h1, h2, k) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, k)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
const col = c => (typeof COLORS !== 'undefined' && COLORS[c]) || c;

// ---------- 색 계단 (그늘은 보라 쪽, 밝은 곳은 노랑 쪽) ----------
function hexToHsl(hex) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function hslToHex(h, s, l) { h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l); const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join(''); }
const towards = (h, t, a) => { const d = ((t - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), a); };
const rampCache = new Map();
function ramp(hex) { // [밝음, 기본, 그늘, 깊은 그늘, 테두리]
  let r = rampCache.get(hex); if (r) return r;
  const [h, s, l] = hexToHsl(hex), grey = s < 0.08;
  r = [
    hslToHex(grey ? h : towards(h, 55, 10), s * 0.95, Math.min(0.97, l + 0.13)),
    hex,
    hslToHex(grey ? 250 : towards(h, 255, 12), grey ? 0.12 : Math.min(1, s + 0.06), l - 0.13),
    hslToHex(grey ? 255 : towards(h, 260, 22), grey ? 0.16 : Math.min(1, s + 0.1), l - 0.26),
    hslToHex(grey ? 262 : towards(h, 275, 35), grey ? 0.25 : Math.min(1, s * 0.75 + 0.1), Math.min(0.2, Math.max(0.07, l - 0.46))),
  ];
  rampCache.set(hex, r); return r;
}

// =====================================================================
// 도트 규칙 자동 적용 (기록/도트 규칙.md). 손도트 글자 지도 → 캔버스
//  1) 더블 없애기: 바깥 테두리의 ㄱ자 모서리 점 중 몸에 닿지 않은 점을 지운다 → 선 굵기 1칸
//  2) 바깥 테두리 = 옆 재료 색을 아주 어둡게(같은 계열). 안쪽 선 = 한 단계 밝게(한 몸으로 이어져 보이게)
//  3) 몸의 주 재료 중 바로 아래가 테두리인 점 = 그늘 한 단계 (빛은 왼쪽 위)
// colorOf(글자) → 색 문자열 또는 null. 'o'는 테두리, 'e'·'w'·'c'는 눈·흰색·볼이라 손대지 않는다.
// =====================================================================
function dotRefine(rows, colorOf, opts = {}) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), g = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.push(rows[y][x] || '.');
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y * w + x]);
  const isFill = ch => ch !== '.' && ch !== 'o' && !!colorOf(ch);
  const solid = ch => ch === 'o' || isFill(ch);
  for (let pass = 0; pass < 2; pass++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (at(x, y) !== 'o') continue;
    const nb = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)], [U, D, Lf, Rt] = nb.map(c => c === 'o');
    if (nb.some(isFill) || !nb.some(c => !solid(c))) continue;
    if ((U && Lf && !D && !Rt) || (U && Rt && !D && !Lf) || (D && Lf && !U && !Rt) || (D && Rt && !U && !Lf)) g[y * w + x] = '.';
  }
  const cnt = {}; for (const ch of g) if (isFill(ch) && !'ewc'.includes(ch)) cnt[ch] = (cnt[ch] || 0) + 1;
  const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = at(x, y); let col = null;
    if (ch === 'o') {
      const near = {};
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) { const n = at(x + dx, y + dy); if (isFill(n)) near[n] = (near[n] || 0) + ('ewc'.includes(n) ? 0.1 : 1); }
      const pick = Object.keys(near).sort((a, b) => near[b] - near[a])[0];
      const outer = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)].some(n => !solid(n));
      const base = pick ? colorOf(pick) : '#4a3050';
      col = base.startsWith('#') ? ramp(base)[outer ? 4 : 3] : base;
    } else if (isFill(ch)) {
      col = colorOf(ch);
      if (opts.shade !== false && ch === main && at(x, y + 1) === 'o' && col.startsWith('#')) col = ramp(col)[2];
    }
    if (col) { cx.fillStyle = col; cx.fillRect(x, y, 1, 1); }
  }
  return c;
}

// ---------- 기본 도형 ----------
function rect(x, y, w, h, c) { L.fillStyle = col(c); L.fillRect(x, y, w, h); }
function prect(x, y, w, h, c) { L.fillStyle = col(c); L.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function blob(cx, cy, r, c) {
  L.fillStyle = col(c); cx = snap(cx); cy = snap(cy);
  for (let dy = -r; dy <= r - PX; dy += PX) { const w = snap(Math.sqrt(Math.max(0, r * r - (dy + 1) * (dy + 1)))); L.fillRect(cx - w, cy + dy, w * 2, PX); }
}
function disc(x, y, r, c) { if (r <= 0) return; L.fillStyle = col(c); L.beginPath(); L.arc(x, y, r, 0, 7); L.fill(); }
function ring(x, y, r, w, c, sy = 1, rot = 0) { if (r <= 0.3 || w <= 0) return; L.strokeStyle = col(c); L.lineWidth = w; L.beginPath(); L.ellipse(x, y, r, Math.max(0.3, r * sy), rot, 0, 7); L.stroke(); }
function line(x1, y1, x2, y2, w, c) { if (w <= 0) return; L.strokeStyle = col(c); L.lineWidth = w; L.lineCap = 'round'; L.beginPath(); L.moveTo(x1, y1); L.lineTo(x2, y2); L.stroke(); }
function poly(pts, c) { L.fillStyle = col(c); L.beginPath(); pts.forEach(([x, y], i) => (i ? L.lineTo(x, y) : L.moveTo(x, y))); L.closePath(); L.fill(); }
// 빛번짐: 칸 경계가 계단진 도트 원 세 겹 (가운데로 갈수록 진하다). 넓은 빛을 점으로 솎으면 모기장 무늬가 되어 겹 원으로 한다
const glowCache = new Map();
function pixDisc(R, c0) { // 칸 단위 원 한 장 (다시 쓴다)
  const key = R + c0; let c = glowCache.get(key); if (c) return c;
  const n = 2 * R + 1, v = parseInt(c0.slice(1), 16); c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) if (Math.hypot(xx - R, yy - R) <= R + 0.3) { const i = (yy * n + xx) * 4; d[i] = v >> 16; d[i + 1] = (v >> 8) & 255; d[i + 2] = v & 255; d[i + 3] = 255; }
  g.putImageData(img, 0, 0); glowCache.set(key, c); if (glowCache.size > 300) glowCache.delete(glowCache.keys().next().value);
  return c;
}
function glow(x, y, r, hex, a = 1) {
  if (r <= 0 || a <= 0) return;
  const c0 = col(hex), sm = L.imageSmoothingEnabled, o = L.globalAlpha; L.imageSmoothingEnabled = false;
  for (const [k, al] of [[1, 0.12], [0.62, 0.2], [0.3, 0.38]]) { // 옛 그러데이션(가운데 a → 0.35에서 0.45a → 끝 0)과 비슷한 진하기
    const R = Math.max(0, Math.round(r * k / PX)), c = pixDisc(R, c0);
    L.globalAlpha = o * Math.min(1, a) * al; L.drawImage(c, Math.round(x - (R + 0.5) * PX), Math.round(y - (R + 0.5) * PX), (2 * R + 1) * PX, (2 * R + 1) * PX);
  }
  L.globalAlpha = o; L.imageSmoothingEnabled = sm;
}
function withA(a, fn) { if (a <= 0) return; const o = L.globalAlpha; L.globalAlpha = o * Math.min(1, a); fn(); L.globalAlpha = o; }
function lighter(fn) { const o = L.globalCompositeOperation; L.globalCompositeOperation = 'lighter'; fn(); L.globalCompositeOperation = o; }
// 겹치는 도형을 한 장으로 합쳐 반투명하게 (소환수, 분신)
function layer(a, fn) {
  if (a <= 0) return;
  const prev = L; actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, aux.width, aux.height);
  resetCtx(actx); L = actx; fn(); L = prev;
  const tr = L.getTransform(); L.save(); L.setTransform(1, 0, 0, 1, tr.e, tr.f); withA(a, () => L.drawImage(aux, 0, 0)); L.restore();
}
function star4(x, y, r, c, thin = 0.3) { poly([[x, y - r], [x + r * thin, y - r * thin], [x + r, y], [x + r * thin, y + r * thin], [x, y + r], [x - r * thin, y + r * thin], [x - r, y], [x - r * thin, y - r * thin]], c); }

// ---------- 화면 연출 ----------
function flash(a, c = '#ffffff') { withA(a, () => rect(-20, -20, W + 40, H + 40, c)); }
// 화면을 한 색으로 어둡게 물들인다 (스킬 쓰는 동안 배경을 눌러 이펙트를 돋보이게)
function dim(a, hex = '#05030f') { withA(a, () => rect(-20, -20, W + 40, H + 40, hex)); }
function vignette(a, hex) {
  if (a <= 0) return;
  const g = L.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.6);
  g.addColorStop(0, rgba(hex, 0)); g.addColorStop(1, rgba(hex, a));
  lighter(() => { L.fillStyle = g; L.fillRect(-20, -20, W + 40, H + 40); });
}

// ---------- 번개 ----------
function bolt(x1, y1, x2, y2, seed, w, c, jag = 8) {
  const n = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 8));
  const nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
  L.strokeStyle = col(c); L.lineWidth = w; L.lineJoin = 'round'; L.lineCap = 'round'; L.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i / n, o = i === 0 || i === n ? 0 : (rnd(seed * 97 + i) - 0.5) * jag;
    const x = x1 + (x2 - x1) * k + (nx / len) * o, y = y1 + (y2 - y1) * k + (ny / len) * o;
    i ? L.lineTo(x, y) : L.moveTo(x, y);
  }
  L.stroke();
}
function zap(x1, y1, x2, y2, seed, w = 2, hex = '#7fe0ff', jag = 10) {
  lighter(() => { withA(0.35, () => bolt(x1, y1, x2, y2, seed, w * 4, hex, jag)); withA(0.8, () => bolt(x1, y1, x2, y2, seed, w * 1.8, hex, jag)); bolt(x1, y1, x2, y2, seed, w * 0.7, '#ffffff', jag); });
  // 곁가지
  for (let b = 0; b < 2; b++) {
    const k = 0.3 + rnd(seed * 7 + b) * 0.4, bx = lerp(x1, x2, k), by = lerp(y1, y2, k), a = rnd(seed * 3 + b) * 6.28;
    lighter(() => withA(0.7, () => bolt(bx, by, bx + Math.cos(a) * 14, by + Math.sin(a) * 14, seed + b * 11, w * 0.6, hex, 6)));
  }
}

// ---------- 섬광·방사선·불똥·연기·파편·마법진: 이펙트 에디터의 '공용 ○○' 이펙트로 그린다 ----------
// 게임(스킬 포함)은 위치·크기·색·개수·시간만 정하고, 입자 모양·흐트러짐·사라짐·명암 같은 결은 에디터에서 정한다 (코드/그림/pixfx.js).
const pq = (v, s) => Math.round(v / s) * s; // 값을 몇 단계로 묶어 같은 그림을 다시 쓴다
const deg = r => (r == null ? null : pq(r * 180 / Math.PI, 5));
function hexRamp(hex) { const h = col(hex); return [mix(h, '#000000', 0.62), mix(h, '#000000', 0.32), h, mix(h, '#ffffff', 0.5), '#ffffff']; }
function pixFx(slot, over, x, y, k) {
  const p = Object.assign({}, pixfxBase(slot), { loop: false, anchor: 'center', at: -1, alpha: 1 }, over);
  pixfxDraw(L, p, x, y, k, PX);
}
// 맞는 순간의 섬광: a(1→0)에 따라 별이 줄어든다 + 빛번짐
function flare(x, y, r, hex, a = 1, rot = 0) {
  if (a <= 0 || r <= 0) return;
  const B = pixfxBase('공용 섬광'), ps = Math.max(1, Math.round(1.1 * r / PX * pixfxMul(B, '공용 섬광', 'psize')));
  lighter(() => glow(x, y, r * 1.6, hex, 0.9 * a));
  pixFx('공용 섬광', { colors: hexRamp(hex), psize: ps, reach: Math.max(1, Math.round(ps * (B.speed || 0))), size: 2 * ps + 8, at: pq(1 - Math.min(1, a), 0.1) }, x, y, 0);
}
// 한 점에서 퍼지는 속도선
function rays(x, y, r0, r1, n, seed, w, hex, a = 1) {
  if (a <= 0 || r1 <= r0) return;
  const B = pixfxBase('공용 방사선'), R = Math.max(2, pq(r1 / PX, 2)), ps = Math.max(1, Math.round((r1 - r0) / PX / 2 * 0.6 * pixfxMul(B, '공용 방사선', 'psize')));
  pixFx('공용 방사선', { seed, count: Math.max(1, Math.round(n * pixfxMul(B, '공용 방사선', 'count'))), colors: hexRamp(hex), reach: R, psize: ps, size: 2 * Math.ceil(R * Math.max(1, B.speed) * 1.3) + 6, at: 1, alpha: pq(Math.min(1, a), 0.125) }, x, y, 0);
}
// 불똥
function sparks(t, t0, x, y, n, seed, sp, hex, life = 0.4, dir = null, spread = 6.28, grav = 120) {
  const age = t - t0; if (age < 0 || age >= life) return;
  const B = pixfxBase('공용 불똥'), R = Math.max(3, Math.round(sp * 1.2 * life / PX)), g = pq(grav * life * life / PX / R, 0.1);
  pixFx('공용 불똥', { seed, count: Math.max(1, Math.round(n * pixfxMul(B, '공용 불똥', 'count'))), colors: hexRamp(hex), reach: R, gravity: g, dir: deg(dir), spread: pq(spread * 180 / Math.PI, 10),
    frames: Math.max(4, Math.round(life * B.fps)), size: 2 * Math.ceil(R * Math.max(1, B.speed) * 1.3 + Math.max(0, g) * R) + 6 }, x, y, age / life);
}
// 연기·먹: 흩어지며 커지고 옅어지는 덩어리
function smoke(t, t0, x, y, r, n, seed, hex, life = 0.6, drift = [0, -14], a0 = 0.8) {
  const age = t - t0; if (age < 0 || age >= life) return;
  const B = pixfxBase('공용 연기'), R = Math.max(2, Math.round(r * 0.8 / PX)), ps = Math.max(1, Math.round(r * 0.7 / PX * pixfxMul(B, '공용 연기', 'psize'))), dx = pq(drift[0] / PX, 1), dy = pq(drift[1] / PX, 1);
  pixFx('공용 연기', { seed, count: Math.max(1, Math.round(n * pixfxMul(B, '공용 연기', 'count'))), colors: hexRamp(hex), reach: R, psize: ps, driftX: dx, driftY: dy, alpha: pq(Math.min(1, a0), 0.125),
    frames: Math.max(4, Math.round(life * B.fps)), size: 2 * Math.ceil(R * Math.max(1, B.speed) * 1.3 + ps * 1.5 + Math.max(Math.abs(dx), Math.abs(dy))) + 6 }, x, y, age / life);
}
// 파편: 돌거나 빛나는 조각
function shards(t, t0, x, y, n, seed, sp, hex, life = 0.6, size = 3, dir = null, spread = 6.28) {
  const age = t - t0; if (age < 0 || age >= life) return;
  const B = pixfxBase('공용 파편'), R = Math.max(3, Math.round(sp * 1.5 * life / PX)), g = pq(150 * life * life / PX / R, 0.1), ps = Math.max(1, Math.round(size * 1.2 / PX * pixfxMul(B, '공용 파편', 'psize')));
  pixFx('공용 파편', { seed, count: Math.max(1, Math.round(n * pixfxMul(B, '공용 파편', 'count'))), colors: hexRamp(hex), reach: R, psize: ps, gravity: g, dir: deg(dir), spread: pq(spread * 180 / Math.PI, 10),
    frames: Math.max(4, Math.round(life * B.fps)), size: 2 * Math.ceil(R * Math.max(1, B.speed) * 1.3 + Math.max(0, g) * R + ps) + 6 }, x, y, age / life);
}
// 마법진: 도는 점 고리 몇 겹. sy<1이면 바닥에 눕힌 모양
function circle(x, y, r, t, hex, a = 1, sy = 1, spin = 1) {
  if (a <= 0 || r <= 0) return;
  const B = pixfxBase('공용 마법진'), R = Math.max(3, Math.round(r / PX)), ref = pixfxR(pixfxFill(PIXFX_BASE['공용 마법진']));
  lighter(() => glow(x, y, r * 1.3, hex, 0.35 * a));
  pixFx('공용 마법진', { count: Math.max(6, Math.round(B.count * R / ref)), colors: hexRamp(hex), reach: R, squash: pq(sy, 0.05), spin: B.spin * (pq(spin, 0.5) || 0.5), loop: true, alpha: pq(Math.min(1, a), 0.125), size: 2 * R + 8 },
    x, y, ((t * B.fps / B.frames) % 1 + 1) % 1);
}

// ---------- 칼자국 (레퍼런스의 핵심 모양) ----------
// 타원 호를 따라 가운데가 굵고 끝이 뾰족한 띠. s0~s1 구간만 만든다.
function arcBand(o, s0, s1, wmul) {
  const n = 28, out = [], inn = [], cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
  for (let i = 0; i <= n; i++) {
    const s = lerp(s0, s1, i / n), a = lerp(o.a0, o.a1, s);
    const ex = o.rx * Math.cos(a), ey = o.ry * Math.sin(a);
    const dx = -o.rx * Math.sin(a) * (o.a1 - o.a0), dy = o.ry * Math.cos(a) * (o.a1 - o.a0);
    const px = o.cx + ex * cr - ey * sr, py = o.cy + ex * sr + ey * cr;
    let tx = dx * cr - dy * sr, ty = dx * sr + dy * cr; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const w = o.w * wmul * Math.pow(Math.sin(Math.PI * clamp(s)), 0.85) * (0.55 + 0.45 * s);
    out.push([px - ty * w * 0.5, py + tx * w * 0.5]); inn.push([px + ty * w * 0.5, py - tx * w * 0.5]);
  }
  return out.concat(inn.reverse());
}
function arcPoint(o, s) {
  const a = lerp(o.a0, o.a1, s), ex = o.rx * Math.cos(a), ey = o.ry * Math.sin(a), cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
  return [o.cx + ex * cr - ey * sr, o.cy + ex * sr + ey * cr];
}
// 세 겹 칼자국: 먹(바깥 대비) → 원색 → 흰 심지, 앞머리 섬광, 꼬리에서 흩어지는 연기
// o = {cx,cy,rx,ry,rot,a0,a1,w,t0,dur,ink,mid,core,hot,smokeHex}
function slash(o, t) {
  const grow = o.grow ?? 0.07, tail = ei(prog(t, o.t0 + grow * 0.6, o.t0 + o.dur));
  if (t < o.t0 || tail >= 0.999) return;
  const head = eo3(prog(t, o.t0, o.t0 + grow)), s1 = Math.max(tail + 0.001, head);
  // 띠는 이펙트 에디터의 '공용 칼자국'으로 그린다 (먹 → 원색 → 흰 심지 순서의 5단계 색)
  const B = pixfxBase('공용 칼자국'), rx = o.rx / PX, ry = o.ry / PX, wC = o.w * 1.45 / PX, arcLen = Math.abs(o.a1 - o.a0) * (rx + ry) / 2, hot = o.hot || o.mid;
  pixFx('공용 칼자국', {
    colors: [col(o.ink || mix(col(o.mid), '#000000', 0.6)), mix(col(hot), '#000000', 0.15), col(o.mid), mix(col(o.mid), '#ffffff', 0.55), col(o.core || '#ffffff')],
    sRx: pq(rx, 1), sRy: pq(ry, 1), sRot: pq((o.rot || 0) * 180 / Math.PI, 1), sA0: pq(o.a0 * 180 / Math.PI, 1), sA1: pq(o.a1 * 180 / Math.PI, 1), sW: pq(wC, 0.5), sGrow: pq(clamp(grow / o.dur, 0.05, 0.9), 0.05),
    count: Math.round(clamp(arcLen * wC / (B.psize * B.psize) * 1.4 * pixfxMul(B, '공용 칼자국', 'count'), 20, 900)), seed: 1 + Math.abs(Math.round(o.cx * 7 + o.cy * 13 + o.a0 * 100)) % 97, // 모양이 같으면 같은 그림 (시간으로 정하면 칠 때마다 새로 만든다)
    frames: Math.max(6, Math.round(o.dur * B.fps)), size: 2 * Math.ceil(Math.max(rx, ry) + wC) + 6,
  }, o.cx, o.cy, (t - o.t0) / o.dur);
  if (head < 1 || t < o.t0 + grow + 0.05) { const [hx, hy] = arcPoint(o, s1); flare(hx, hy, o.w * 0.7, o.hot || o.mid, pulse(t, o.t0 + grow, o.t0 + grow + 0.1)); }
  const sm = o.smokeHex || o.ink;
  if (sm) for (let i = 0; i < 7; i++) { const s = (i + 0.5) / 7, tp = o.t0 + grow * 0.6 + Math.sqrt(s) * (o.dur - grow * 0.6); const [px, py] = arcPoint(o, s); smoke(t, tp, px, py, o.w * 0.9, 3, i * 7 + 1, sm, 0.45, [0, -8], 0.55); }
}
