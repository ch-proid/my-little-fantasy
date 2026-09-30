'use strict';
// 픽셀 이펙트: 설정 몇 개로 도트 이펙트 그림 여러 장을 만든다.
// 이펙트 에디터(도구/이펙트 에디터.html)와 게임이 이 파일 하나를 함께 쓴다 → 에디터에서 본 그대로 게임에 나온다.
// 칸 1개 = 게임 화면 2px (주인공·몬스터·무기와 같은 칸 크기).

// 팔레트: 어두운 색 → 밝은 색 5단계
const PIXFX_PAL = {
  불꽃: ['#5a1e1e', '#b0361c', '#f07a1e', '#ffc83d', '#fff4b0'],
  얼음: ['#1d3a6e', '#2f6fc2', '#6bb8f0', '#b8e8ff', '#ffffff'],
  번개: ['#2a2a6e', '#5a4ad0', '#8f8cff', '#d2d0ff', '#ffffff'],
  독: ['#1f3a1e', '#3e7a2a', '#7ac43a', '#c8f06a', '#f4ffc0'],
  빛: ['#7a5a1e', '#d4a23a', '#ffd86a', '#fff2b0', '#ffffff'],
  어둠: ['#140a1e', '#3a1a5a', '#6a2e9a', '#a86ad6', '#e0c8ff'],
  은하: ['#1a1040', '#3a2a8a', '#6a4ad8', '#b08cff', '#f0e0ff'],
  피: ['#3a0a10', '#7a1420', '#c42a30', '#f0605a', '#ffb0a0'],
  풀잎: ['#1e3a20', '#2e6a30', '#5aa83a', '#a8d860', '#e8ffb0'],
  금화: ['#6a3a10', '#b0701e', '#e8b040', '#ffe070', '#fffbd0'],
  물: ['#102a4a', '#1a5a9a', '#3aa0e0', '#90d8ff', '#e8f8ff'],
  연기: ['#2a2430', '#4a4450', '#7a7480', '#b0aab4', '#e8e4ec'],
  꽃잎: ['#6a1e4a', '#b83a7a', '#f07ab0', '#ffc0dc', '#fff0f6'],
};
// 게임에서 쓰는 자리 (에디터에서 고른다)
const PIXFX_SLOTS = { '': '안 씀', 타격: '몬스터를 때릴 때', 치명타: '치명타가 터질 때', 처치: '몬스터를 쓰러뜨릴 때', 레벨업: '레벨이 오를 때',
  // 공용: 게임의 모든 공격·스킬 이펙트가 이 모양으로 그려진다 (위치·크기·색·개수는 게임이 정하고, 모양·움직임 결은 에디터가 정한다)
  '공용 불똥': '모든 불똥 (공용)', '공용 연기': '모든 연기·먹 (공용)', '공용 파편': '모든 파편 (공용)', '공용 섬광': '모든 섬광 (공용)',
  '공용 방사선': '모든 방사선 (공용)', '공용 마법진': '모든 마법진 (공용)', '공용 칼자국': '모든 칼자국 (공용)' };
const PIXFX_MOVES = { burst: '터짐', ring: '퍼지는 고리', implode: '모임', rise: '솟음', fall: '떨어짐', swirl: '소용돌이', float: '떠다님', fountain: '분수', orbit: '도는 고리(마법진)', slash: '칼자국' };
const PIXFX_EMITTERS = { point: '점', circle: '원 안', ring: '원 둘레', rhombus: '마름모', square: '네모', line: '가로줄', column: '세로줄' };
const PIXFX_SHAPES = { dot: '점', circle: '원', ring: '고리', plus: '십자', x: '엑스', star: '반짝이', diamond: '마름모', streak: '꼬리', square: '네모' };
const PIXFX_SIZELIFE = { same: '그대로', shrink: '작아짐', grow: '커짐', pulse: '부풀었다 줄기' };
const PIXFX_FADES = { none: '없음', out: '사라짐', inout: '나타났다 사라짐', blink: '깜빡임' };

const PIXFX_DEFAULT = {
  name: '새 이펙트', slot: '', seed: 1,
  frames: 16, size: 48, fps: 16, loop: false, anchor: 'center',
  move: 'burst', emitter: 'point', emitR: 0.15, chaos: 0.35, count: 24, spawn: 0.2,
  psize: 2, sizeLife: 'shrink', shapes: ['dot'], speed: 1, gravity: 0, spin: 1,
  fade: 'out', fadeStr: 1, palette: '불꽃', colors: null, shades: true, range: 0.5, colorLife: true,
  outline: false, glow: false,
  dir: null, spread: 360, squash: 1, driftX: 0, driftY: 0, rings: 1, // 방향(도, 없으면 사방)·퍼짐 각도·눕히기(1=그대로)·흐름(칸)·고리 수(도는 고리)
  sRx: 20, sRy: 6, sRot: 0, sA0: -80, sA1: 75, sW: 5, sGrow: 0.25, // 칼자국: 가로·세로 반지름(칸), 기울기·시작·끝(도), 굵기(칸), 머리가 끝까지 가는 비율
  reach: 0, alpha: 1, at: -1, // 게임이 정하는 값: 뻗는 거리(칸, 0=틀 크기로), 전체 진하기, 멈춘 순간(0~1, -1=시간대로)
};
const pixfxFill = p => Object.assign({}, PIXFX_DEFAULT, p || {});
const pixfxColors = p => (p.colors && p.colors.length ? p.colors : PIXFX_PAL[p.palette] || PIXFX_PAL.불꽃);

// 씨앗이 같으면 늘 같은 난수 (에디터와 게임이 똑같은 그림을 만든다)
function pixfxRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PIXFX_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; // 흐려질 때 반투명 대신 점을 솎아 낸다 (도트 느낌 유지)

// 모양 → 칸 목록 (가운데 기준)
const pixfxStampCache = {};
function pixfxStamp(shape, s) {
  const key = shape + s; if (pixfxStampCache[key]) return pixfxStampCache[key];
  const out = [], a = Math.floor(s / 2), sq = (x0, x1) => { for (let y = x0; y <= x1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); };
  if (s <= 1 && shape !== 'star' && shape !== 'streak') out.push([0, 0]);
  else if (shape === 'dot') { sq(-a, s - 1 - a); if (s >= 3) for (const [cx, cy] of [[-a, -a], [s - 1 - a, -a], [-a, s - 1 - a], [s - 1 - a, s - 1 - a]]) out.splice(out.findIndex(([x, y]) => x === cx && y === cy), 1); }
  else if (shape === 'circle' || shape === 'ring') {
    const r = s / 2, c = (s - 1) / 2 - a;
    for (let y = -a; y < s - a; y++) for (let x = -a; x < s - a; x++) { const d = Math.hypot(x - c, y - c); if (d <= r - 0.25 && (shape === 'circle' || d > r - 1.35)) out.push([x, y]); }
  } else if (shape === 'plus' || shape === 'star') { const k = shape === 'star' ? s : a; out.push([0, 0]); for (let i = 1; i <= k; i++) out.push([i, 0], [-i, 0], [0, i], [0, -i]); if (shape === 'star' && s >= 3) out.push([1, 1], [-1, 1], [1, -1], [-1, -1]); }
  else if (shape === 'x') { out.push([0, 0]); for (let i = 1; i <= a; i++) out.push([i, i], [-i, i], [i, -i], [-i, -i]); }
  else if (shape === 'diamond') { for (let y = -a; y <= a; y++) for (let x = -a; x <= a; x++) if (Math.abs(x) + Math.abs(y) <= a) out.push([x, y]); }
  else if (shape === 'square') { for (let y = -a; y < s - a; y++) for (let x = -a; x < s - a; x++) if (y === -a || y === s - 1 - a || x === -a || x === s - 1 - a) out.push([x, y]); }
  else out.push([0, 0]); // streak 은 그릴 때 방향을 따라 늘인다
  return (pixfxStampCache[key] = out);
}

const pixfxR = p => (p.reach > 0 ? p.reach : p.size / 2 - 2);
// 입자 하나의 성질 (씨앗으로 정해진다)
function pixfxParticles(p) {
  const rnd = pixfxRng(p.seed * 7919 + 17), rnd2 = pixfxRng(p.seed * 104729 + 7), R = pixfxR(p), list = []; // rnd2: 새로 더한 값 (예전 이펙트 모양이 그대로 남게 따로 뽑는다)
  for (let i = 0; i < p.count; i++) {
    const r = () => rnd(), c = p.chaos;
    let ex = 0, ey = 0; const e = p.emitR * R, t = r() * Math.PI * 2, q = r();
    if (p.emitter === 'circle') { const d = Math.sqrt(q) * e; ex = Math.cos(t) * d; ey = Math.sin(t) * d; }
    else if (p.emitter === 'ring') { ex = Math.cos(t) * e; ey = Math.sin(t) * e; }
    else if (p.emitter === 'rhombus' || p.emitter === 'square') {
      const k = q * 4, side = Math.floor(k), f = k - side, pts = p.emitter === 'rhombus' ? [[0, -1], [1, 0], [0, 1], [-1, 0]] : [[-1, -1], [1, -1], [1, 1], [-1, 1]], A = pts[side], B = pts[(side + 1) % 4];
      ex = (A[0] + (B[0] - A[0]) * f) * e; ey = (A[1] + (B[1] - A[1]) * f) * e;
    } else if (p.emitter === 'line') ex = (q * 2 - 1) * e;
    else if (p.emitter === 'column') ey = (q * 2 - 1) * e;
    let ang = ex || ey ? Math.atan2(ey, ex) : t;
    if (p.move === 'ring') ang = (i / p.count) * Math.PI * 2;
    ang += (r() - 0.5) * c * Math.PI * (p.move === 'ring' ? 0.3 : 1);
    const sp = p.speed * (1 + (r() - 0.5) * c), size = Math.max(1, Math.round(p.psize * (1 + (r() - 0.5) * c * 0.8)));
    const shape = p.shapes.length ? p.shapes[Math.floor(r() * p.shapes.length)] : 'dot', shade = p.shades ? r() * p.range : 0, ph = r() * Math.PI * 2;
    let start, life;
    if (p.loop) { start = r(); life = 0.5 + 0.5 * r(); } else { start = r() * p.spawn * 0.7; life = (1 - start) * (0.55 + 0.45 * r()); }
    const fx = (r() - 0.5) * 2; // 분수·떠다님의 옆 흔들림
    const r2 = () => rnd2();
    if (p.dir != null && p.move !== 'ring') ang = (p.dir + (r2() - 0.5) * p.spread) * Math.PI / 180;
    if (p.move === 'orbit') ang = (i / p.count) * Math.PI * 2 + (r2() - 0.5) * c * 0.4;
    const ring = i % Math.max(1, p.rings), s0 = (i + r2()) / p.count, off = r2() * 2 - 1; // 칼자국: 호 위 자리와 띠 안 자리
    list.push({ ex, ey, ang, sp, size, shape, shade, ph, start, life, fx, ring, s0, off });
  }
  return list;
}

// 입자 위치 (u = 0 태어남 → 1 사라짐), 가운데 기준 칸
function pixfxPos(p, a, u, R, t = 0) {
  const eo = 1 - (1 - u) * (1 - u), c = Math.cos(a.ang), s = Math.sin(a.ang);
  let x = a.ex, y = a.ey;
  if (p.move === 'burst') { x += c * R * a.sp * eo; y += s * R * a.sp * eo; }
  else if (p.move === 'ring') { const r = p.emitR * R + (R - p.emitR * R) * eo * a.sp; x = c * r; y = s * r; }
  else if (p.move === 'implode') { const d = R * a.sp * Math.pow(1 - u, 1.4); x += c * d; y += s * d; }
  else if (p.move === 'rise') { x += Math.sin(u * Math.PI * 2 + a.ph) * (1 + p.chaos * 3); y -= R * a.sp * u * 1.6; }
  else if (p.move === 'fall') { x += a.fx * p.chaos * 4 * u + Math.sin(u * 6 + a.ph) * p.chaos * 2; y += -R + R * 2 * a.sp * u; }
  else if (p.move === 'swirl') { const t = a.ang + p.spin * u * Math.PI * 2, r = R * a.sp * (0.25 + 0.75 * eo); x = a.ex + Math.cos(t) * r; y = a.ey + Math.sin(t) * r; }
  else if (p.move === 'float') { x += Math.sin(u * Math.PI * 2 + a.ph) * 2 * a.sp; y += Math.cos(u * Math.PI * 2 + a.ph) * 1.5 * a.sp - u * R * 0.4 * a.sp; }
  else if (p.move === 'orbit') { const r = R * (1 - a.ring * 0.28), an = a.ang + p.spin * t * Math.PI * 2; x = Math.cos(an) * r; y = Math.sin(an) * r; }
  else if (p.move === 'fountain') { const up = -Math.PI / 2 + a.fx * (0.35 + p.chaos * 0.8); x += Math.cos(up) * R * a.sp * 1.1 * u; y += Math.sin(up) * R * a.sp * 2.2 * u + R * 2.2 * a.sp * u * u; }
  y = y * p.squash + p.gravity * R * u * u;
  return [x + p.driftX * u, y + p.driftY * u];
}

// 설정 → 그림 여러 장 (각 장은 size×size 캔버스). 같은 설정이면 다시 만들지 않는다
const pixfxCache = new Map();
function pixfxFrames(p0) {
  const p = pixfxFill(p0), key = JSON.stringify(p);
  if (pixfxCache.has(key)) return pixfxCache.get(key);
  const S = p.size, R = pixfxR(p), cols = pixfxColors(p), n = cols.length, parts = pixfxParticles(p), frames = [];
  const rgb = cols.map(h => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; });
  const ox = S / 2, oy = p.anchor === 'bottom' ? S - 3 : S / 2;
  const still = p.at >= 0, nf = still ? 1 : p.frames; // 멈춘 순간이면 한 장만
  const d2r = Math.PI / 180, cr = Math.cos(p.sRot * d2r), sr = Math.sin(p.sRot * d2r);
  const arcAt = s => { const an = (p.sA0 + (p.sA1 - p.sA0) * s) * d2r, ex = p.sRx * Math.cos(an), ey = p.sRy * Math.sin(an); return [ex * cr - ey * sr, ex * sr + ey * cr, -p.sRx * Math.sin(an) * cr - p.sRy * Math.cos(an) * sr, -p.sRx * Math.sin(an) * sr + p.sRy * Math.cos(an) * cr]; };
  for (let k = 0; k < nf; k++) {
    const t = still ? p.at : k / p.frames, buf = new Int8Array(S * S).fill(-1);
    // 칼자국: 머리가 호를 따라 나가고 꼬리가 뒤따라 사라진다. 띠 가운데일수록 밝다
    const head = 1 - Math.pow(1 - Math.min(1, t / p.sGrow), 3), tq = Math.max(0, Math.min(1, (t - p.sGrow * 0.6) / (1 - p.sGrow * 0.6))), tail = tq * tq;
    for (const a of parts) {
      let px, py, u, alpha = p.alpha;
      if (p.move === 'slash') {
        const sv = a.s0; if (sv > head || sv < tail) continue;
        const [ax, ay, tx, ty] = arcAt(sv), tl = Math.hypot(tx, ty) || 1, w = p.sW * Math.pow(Math.sin(Math.PI * sv), 0.85) * (0.55 + 0.45 * sv) / 2;
        px = ax - ty / tl * w * a.off; py = ay + tx / tl * w * a.off; u = Math.abs(a.off); // u: 띠 가장자리일수록 1 (어둡게)
        alpha *= Math.min(1, (sv - tail) / 0.12);
      } else {
        u = still ? p.at : p.loop ? (((t - a.start) % 1) + 1) % 1 : t - a.start;
        if (!still && p.move !== 'orbit') { if (u < 0 || u > a.life) continue; u /= a.life; } // 도는 고리는 늘 보인다
        [px, py] = pixfxPos(p, a, u, R, t);
      }
      if (p.move === 'slash') { /* 칼자국은 꼬리 쪽에서 성겨진다 (위에서 정함) */ }
      else if (p.fade === 'out') alpha *= 1 - p.fadeStr * u * u;
      else if (p.fade === 'inout') alpha *= Math.min(1, u * 6) * (1 - p.fadeStr * u * u);
      else if (p.fade === 'blink') alpha *= Math.floor(u * 8) % 2 ? 1 - p.fadeStr * 0.85 : 1;
      if (alpha <= 0) continue;
      const sz = p.sizeLife === 'shrink' ? a.size * (1 - u * 0.85) : p.sizeLife === 'grow' ? a.size * (0.35 + 0.65 * u) : p.sizeLife === 'pulse' ? a.size * (0.5 + 0.5 * Math.sin(u * Math.PI)) : a.size;
      const s = Math.max(1, Math.round(sz));
      let ci = (p.colorLife ? (1 - u) : 1) * (n - 1) - a.shade * (n - 1);
      ci = Math.max(0, Math.min(n - 1, Math.round(ci)));
      const cx = Math.round(ox + px), cy = Math.round(oy + py);
      let pts = pixfxStamp(a.shape, s);
      if (a.shape === 'streak') { // 움직이는 쪽 반대로 꼬리
        const [qx, qy] = pixfxPos(p, a, Math.max(0, u - 0.08), R, t), dx = px - qx, dy = py - qy, L = Math.max(1, Math.hypot(dx, dy)), len = s * 2;
        pts = []; for (let j = 0; j < len; j++) pts.push([Math.round(-dx / L * j), Math.round(-dy / L * j)]);
      }
      for (const [dx, dy] of pts) {
        const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= S || y >= S) continue;
        if (alpha < 1 && alpha * 16 <= PIXFX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) continue;
        buf[y * S + x] = ci;
      }
    }
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
    for (let i = 0; i < S * S; i++) {
      let ci = buf[i];
      if (ci < 0 && p.outline) { const x = i % S, y = (i / S) | 0; if ((x > 0 && buf[i - 1] >= 0) || (x < S - 1 && buf[i + 1] >= 0) || (y > 0 && buf[i - S] >= 0) || (y < S - 1 && buf[i + S] >= 0)) ci = 0; }
      if (ci < 0) continue;
      d[i * 4] = rgb[ci][0]; d[i * 4 + 1] = rgb[ci][1]; d[i * 4 + 2] = rgb[ci][2]; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0); frames.push(c);
  }
  const out = { p, frames };
  if (pixfxCache.size > 250) pixfxCache.delete(pixfxCache.keys().next().value); // 가장 오래된 것부터 버린다
  pixfxCache.set(key, out); return out;
}
// 그림 여러 장을 가로 한 줄로 이은 시트
function pixfxSheet(p) { const { frames } = pixfxFrames(p), S = frames[0].width, c = document.createElement('canvas'); c.width = S * frames.length; c.height = S; const g = c.getContext('2d'); frames.forEach((f, i) => g.drawImage(f, i * S, 0)); return c; }
// 그리기: k = 0~1 (지나간 비율), (x, y) = 기준점(가운데 또는 발밑), scale = 칸 1개의 화면 크기
function pixfxDraw(g, p0, x, y, k, scale = 2) {
  const { p, frames } = pixfxFrames(p0), i = p.at >= 0 ? 0 : p.loop ? Math.floor(k * frames.length) % frames.length : Math.min(frames.length - 1, Math.floor(k * frames.length));
  if (i < 0) return;
  const S = p.size * scale, oy = p.anchor === 'bottom' ? (p.size - 3) * scale : S / 2, o = g.globalCompositeOperation, sm = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false; if (p.glow) g.globalCompositeOperation = 'lighter';
  g.drawImage(frames[i], Math.round(x - S / 2), Math.round(y - oy), S, S);
  g.globalCompositeOperation = o; g.imageSmoothingEnabled = sm;
}
// 게임: 그 자리에 정한 이펙트 (여럿이면 번갈아 무작위)
function pixfxFor(slot) { const L = (typeof PIXFX_LIST !== 'undefined' ? PIXFX_LIST : []).filter(e => e.slot === slot); return L.length ? L[Math.floor(Math.random() * L.length)] : null; }
// 공용 기본 이펙트 (에디터에서 같은 자리로 저장한 것이 있으면 그것을 쓴다). 게임은 위치·크기·색·개수·시간만 바꿔 그린다.
// 에디터에서 입자 크기·개수·멀리 가기를 바꾸면, 게임에서도 이 기본값에 견준 배율만큼 바뀐다.
const PIXFX_BASE = {
  '공용 불똥': { name: '기본 불똥', slot: '공용 불똥', move: 'burst', count: 14, psize: 2, shapes: ['streak'], palette: '불꽃', frames: 10, size: 40, fps: 20, spawn: 0, chaos: 0.6, speed: 1, sizeLife: 'same', fade: 'out', range: 0.3, glow: true },
  '공용 연기': { name: '기본 연기', slot: '공용 연기', move: 'burst', count: 8, psize: 4, shapes: ['circle'], palette: '연기', frames: 12, size: 32, fps: 16, spawn: 0, chaos: 0.6, speed: 0.8, sizeLife: 'grow', fade: 'out', colorLife: false, range: 0.5, squash: 0.6, driftY: -4 },
  '공용 파편': { name: '기본 파편', slot: '공용 파편', move: 'burst', count: 10, psize: 2, shapes: ['diamond', 'dot'], palette: '빛', frames: 12, size: 40, fps: 20, spawn: 0, chaos: 0.6, speed: 1, gravity: 0.6, sizeLife: 'same', fade: 'out', range: 0.4, outline: true },
  '공용 섬광': { name: '기본 섬광', slot: '공용 섬광', move: 'burst', count: 1, psize: 6, shapes: ['star'], palette: '빛', frames: 8, size: 24, fps: 20, spawn: 0, chaos: 0, speed: 0, sizeLife: 'shrink', fade: 'out', fadeStr: 0.5, shades: false, glow: true },
  '공용 방사선': { name: '기본 방사선', slot: '공용 방사선', move: 'burst', count: 14, psize: 3, shapes: ['streak'], palette: '빛', frames: 10, size: 48, fps: 20, spawn: 0, chaos: 0.5, speed: 1, sizeLife: 'same', fade: 'out', colorLife: false, range: 0.6, glow: true },
  '공용 마법진': { name: '기본 마법진', slot: '공용 마법진', move: 'orbit', emitter: 'ring', rings: 3, count: 72, psize: 1, shapes: ['dot', 'dot', 'plus'], palette: '은하', frames: 24, size: 48, fps: 12, loop: true, spin: 0.5, chaos: 0.2, sizeLife: 'same', fade: 'none', colorLife: false, range: 0.6, glow: true },
  '공용 칼자국': { name: '기본 칼자국', slot: '공용 칼자국', move: 'slash', count: 160, psize: 2, shapes: ['dot'], palette: '빛', frames: 10, size: 64, fps: 24, spawn: 0, chaos: 0, sizeLife: 'same', fade: 'none', range: 0.25, sRx: 26, sRy: 8, sRot: 0, sA0: -80, sA1: 75, sW: 6, sGrow: 0.25 },
};
// 공용 자리는 여럿 두지 않고 처음 것만 쓴다
function pixfxBase(slot) { const L = typeof PIXFX_LIST !== 'undefined' ? PIXFX_LIST : []; return pixfxFill(L.find(e => e.slot === slot) || PIXFX_BASE[slot]); }
// 에디터에서 바꾼 배율 (기본값에 견줘)
const pixfxMul = (B, slot, k) => { const d = pixfxFill(PIXFX_BASE[slot])[k]; return d ? B[k] / d : 1; };
