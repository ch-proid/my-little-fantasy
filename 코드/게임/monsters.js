'use strict';
// =====================================================================
// 생물·소품 벼리기 (2판)
// 1) 도형 하나(또는 F.part로 묶은 도형들)가 "부위" 하나다.
// 2) 부위마다 4배로 촘촘히 찍어 칸을 정하고, 부위 안쪽까지의 거리로 볼록한 입체를 어림해 왼쪽 위 빛으로 4단 음영을 준다.
// 3) 그림자는 보라 쪽, 밝은 곳은 노랑 쪽으로 색을 튼다(색상 이동). 테두리는 옆 색을 아주 어둡게 한 색.
// 4) 뒤 부위 위에 겹친 부위는 경계에 어두운 선을 긋고, 아래·오른쪽으로 그림자를 떨어뜨린다.
// 좌표: (0,0)이 발밑 가운데(w는 짝수). 위가 -y. 몬스터는 왼쪽(용사 쪽)을 본다.
// 재료: B 몸 L 밝은 배 D 어두운 곳 C 옷·둘째 색 M 쇠 R 볼·빨강 (여기까지 음영) / K 검정 W 흰색 A 빛 E 눈동자 (단색)
// =====================================================================
const ART_KEYS = ['B', 'L', 'D', 'C', 'M', 'K', 'W', 'R', 'A', 'E'];
const SHADE_MATS = { B: 1, L: 1, D: 1, C: 1, M: 1, R: 1 };
function artF(parts) {
  let cur = null;
  const push = (m, fn) => { if (cur) cur.ops.push({ m, fn }); else parts.push({ ops: [{ m, fn }] }); };
  const F = {
    e(x, y, rx, ry, m, rot = 0) { push(m, g => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, 7); g.fill(); }); },
    c(x, y, r, m) { push(m, g => { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, 7); g.fill(); }); },
    p(pts, m) { push(m, g => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }); },
    r(x, y, w, h, m) { push(m, g => g.fillRect(x, y, w, h)); },
    l(pts, w, m) { push(m, g => { g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }); },
    q(p0, cp, p1, w, m) { push(m, g => { g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(...p0); g.quadraticCurveTo(...cp, ...p1); g.stroke(); }); },
    // 정확히 한 칸 (눈 반짝임, 콧구멍 같은 점)
    px(x, y, m) { parts.push({ px: [Math.floor(x), Math.floor(y)], m }); },
    // 여러 도형을 한 덩어리 입체로
    part(fn) { const pt = { ops: [] }; cur = pt; fn(F); cur = null; parts.push(pt); },
    cut(fn) { const pt = { ops: [], erase: true }; cur = pt; fn(F); cur = null; parts.push(pt); },
    // 왼쪽을 보는 눈 한 쌍: 흰자 + 눈동자 + 반짝임 한 점
    eyes(x, y, gap, s = 1.6, look = -0.5, m = 'W', iris = 'K') {
      for (const dx of [0, gap]) {
        F.e(x + dx, y, s * 0.85, s, m); F.e(x + dx + look, y + s * 0.15, s * 0.55, s * 0.72, iris);
        if (s >= 1.2) F.px(x + dx + look - s * 0.35, y - s * 0.4, 'W');
      }
    },
    mirrorX(pts) { return pts.map(([x, y]) => [-x, y]); },
  };
  return F;
}
// ---------- 색 ----------
function forgeArt(def) {
  if (def._f) return def._f;
  if (def.map) return mapArt(def); // 몬스터: 손도트
  const SS = 4, w = def.w, h = def.h, parts = [];
  def.draw(artF(parts));
  const tmp = document.createElement('canvas'); tmp.width = w * SS; tmp.height = h * SS;
  const tg = tmp.getContext('2d', { willReadFrequently: true });
  const mat = new Array(w * h).fill(null), tone = new Array(w * h).fill(1), part = new Array(w * h).fill(-1), dark = new Array(w * h).fill(0);
  const idx = (x, y) => y * w + x, inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const L3 = [-0.55, -0.75, 0.55], LN = Math.hypot(...L3);
  parts.forEach((pt, pi) => {
    if (pt.px) { const x = pt.px[0] + w / 2, y = pt.px[1] + h - 1; if (inside(x, y)) { const i = idx(x, y); mat[i] = pt.m; tone[i] = 1; part[i] = pi; dark[i] = 0; } return; }
    // 이 부위만 찍기 (재료는 빨강 값으로 구분)
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height); tg.setTransform(SS, 0, 0, SS, (w / 2) * SS, (h - 1) * SS);
    pt.ops.forEach(op => { const k = ART_KEYS.indexOf(op.m); tg.fillStyle = tg.strokeStyle = `rgb(${(k + 1) * 20},0,0)`; op.fn(tg); });
    const d = tg.getImageData(0, 0, tmp.width, tmp.height).data, cov = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cnt = {}; let tot = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) { const i = ((y * SS + sy) * w * SS + x * SS + sx) * 4; if (d[i + 3] < 140) continue; const k = ART_KEYS[Math.round(d[i] / 20) - 1]; if (k) { cnt[k] = (cnt[k] || 0) + 1; tot++; } }
      let bk = null, bn = 0; for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; bk = k; }
      if (bk && tot >= 6) cov[idx(x, y)] = bk;
    }
    if (pt.erase) { cov.forEach((m, i) => { if (m) { mat[i] = null; part[i] = -1; } }); return; }
    // 부위 안쪽까지 거리 (가장자리 1)
    const dist = new Array(w * h).fill(0);
    for (let i = 0; i < w * h; i++) if (cov[i]) dist[i] = 99;
    for (let pass = 0; pass < 2; pass++) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const x = pass ? w - 1 - xx : xx, y = pass ? h - 1 - yy : yy, i = idx(x, y); if (!cov[i]) continue;
      const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => (inside(a, b) ? dist[idx(a, b)] : 0));
      dist[i] = Math.min(dist[i], 1 + Math.min(...nb));
    }
    const D = (x, y) => (inside(x, y) ? dist[idx(x, y)] : 0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y), m = cov[i]; if (!m) continue;
      const under = mat[i] != null && part[i] !== pi;
      let t = 1;
      if (SHADE_MATS[m]) {
        const gx = D(x + 1, y) - D(x - 1, y), gy = D(x, y + 1) - D(x, y - 1), dd = Math.min(D(x, y), 4);
        const n = [-gx, -gy, 0.45 + dd * 0.35], nl = Math.hypot(...n) || 1;
        const b = (n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2]) / (nl * LN);
        t = b > 0.74 ? 0 : b > 0.36 ? 1 : b > -0.05 ? 2 : 3;
      }
      // 앞 부위가 뒤 부위 위에 겹친 경계: 어두운 선
      const edge = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => inside(a, b) && !cov[idx(a, b)] && mat[idx(a, b)] != null);
      mat[i] = m; tone[i] = SHADE_MATS[m] && edge && under ? 3 : t; part[i] = pi; dark[i] = 0;
    }
    // 아래·오른쪽 뒤 부위에 그림자 한 칸
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!cov[idx(x, y)]) continue;
      for (const [a, b] of [[x, y + 1], [x + 1, y + 1]]) { if (!inside(a, b)) continue; const j = idx(a, b); if (!cov[j] && mat[j] && SHADE_MATS[mat[j]]) dark[j] = 1; }
    }
  });
  const P = def.pal, B0 = P.B || P.C || P.M || '#8a8aa0', col = {
    B: B0, L: P.L || mix(B0, '#ffffff', 0.5), C: P.C || B0, M: P.M || '#a9b8d6', D: P.D || mix(B0, '#000000', 0.45),
    K: P.K || '#2a1a30', W: P.W || '#ffffff', R: P.R || '#ff9eb5', A: P.A || '#fff09a', E: P.E || '#fff09a',
  };
  const out = new OffscreenCanvasLike(w, h), img = out.g.createImageData(w, h);
  const put = (i, hex) => { const n = parseInt(hex.slice(1), 16); img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], i * 4); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(x, y), m = mat[i];
    if (m) { put(i, SHADE_MATS[m] ? ramp(col[m])[Math.min(3, tone[i] + dark[i])] : col[m]); continue; }
    if (def.noLine) continue; // 무테(배경 소품)
    // 테두리: 옆 칸 색을 아주 어둡게
    for (const [a, b] of [[x, y + 1], [x + 1, y], [x - 1, y], [x, y - 1]]) {
      if (!inside(a, b)) continue; const n = mat[idx(a, b)]; if (!n) continue;
      put(i, P.o || ramp(n === 'K' ? '#3a2a4a' : n === 'W' ? '#b8c0dc' : col[n])[4]); break;
    }
  }
  out.g.putImageData(img, 0, 0);
  def._f = { c: out.c, w, h }; return def._f;
}
function OffscreenCanvasLike(w, h) { this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.g = this.c.getContext('2d'); }
const artTint = new Map();
function artTinted(f, tint) {
  let m = artTint.get(f.c); if (!m) artTint.set(f.c, (m = new Map()));
  let c = m.get(tint); if (c) return c;
  c = document.createElement('canvas'); c.width = f.c.width; c.height = f.c.height; const g = c.getContext('2d');
  g.drawImage(f.c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);
  m.set(tint, c); return c;
}
