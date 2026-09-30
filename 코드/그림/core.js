'use strict';
// =====================================================================
// 장면: 배경, 몬스터, 상태 이상, 피해 숫자, 용사, 기본 공격. 모든 그림은 시간 t의 순수 함수.
// =====================================================================
const PACK = { near: [150, 186, 222, 262], far: [216, 252, 288, 328] };
const FOES = [['slime', 'slimeG'], ['mush', 'mushR'], ['slime', 'slimeP'], ['snail', 'snailO']];
const FOE_H = FOES.map(([t]) => MAPS[t].length * 2);

const cache = new Map();
function sprite(name, palName, frame = 0, tint = null) {
  const key = `${name}|${palName}|${frame}|${tint}`;
  let c = cache.get(key); if (c) return c;
  const map = frame ? squash(MAPS[name]) : MAPS[name], p = PALS[palName] || {};
  const colorOf = ch => { const tok = p[ch] || PAL_BASE[ch]; return tok ? COLORS[tok] || tok : null; };
  if (palName === 'hero') { // 주인공은 선·명암을 손으로 다 그렸다: 자동 도트 규칙 없이 칸 색 그대로
    c = document.createElement('canvas'); c.width = Math.max(...map.map(r => r.length)); c.height = map.length; const g0 = c.getContext('2d');
    map.forEach((row, y) => [...row].forEach((ch, x) => { const col = colorOf(ch); if (col) { g0.fillStyle = col; g0.fillRect(x, y, 1, 1); } }));
  } else c = dotRefine(map, colorOf);
  const g = c.getContext('2d');
  if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height); }
  cache.set(key, c); return c;
}
function drawSpr(c, cx, fy, sc) { L.drawImage(c, Math.round(cx - (c.width * sc) / 2), Math.round(fy - c.height * sc), c.width * sc, c.height * sc); }

// ---------- 배경: 바탕화면 위 띠 모드처럼 ----------
const [backdrop, bdctx] = makeBuf();
(() => {
  resetCtx(bdctx); L = bdctx;
  const g = L.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a1540'); g.addColorStop(0.6, '#1a3a9a'); g.addColorStop(1, '#0c1a52');
  L.fillStyle = g; L.fillRect(0, 0, W, H);
  withA(0.6, () => { for (let i = 0; i < 7; i++) { const x = 30 + i * 72 + snap(rnd(i * 7) * 24), r = rnd(i * 7); prect(x - 3, GROUND - 28, 6, 28, 'trunk'); blob(x, GROUND - 36, 16 + (r > 0.5 ? 2 : 0), 'treeD'); blob(x - 2, GROUND - 38, 14, 'tree'); blob(x - 6, GROUND - 44, 4, 'treeL'); } });
  prect(0, GROUND, W, H - GROUND, 'groundM'); prect(0, GROUND, W, 4, 'groundMT');
  for (let i = 0; i <= W / 16; i++) { const x = i * 16, r = rnd(i * 3 + 1); prect(x + (i % 2) * 8, GROUND + 4, 8, 2, 'groundMT'); if (r > 0.45) prect(x + 4, GROUND - 2, 2, 2, 'groundMT'); if (r > 0.82) { prect(x + 10, GROUND - 4, 2, 4, 'groundMT'); prect(x + 9, GROUND - 6, 4, 2, 'flower'); } }
  L = bctx;
})();

// ---------- 용사 ----------
// 무기 각도(도). 검은 실제로 휘두르며 각도가 바뀐다.
// 스킬을 다른 무기로 쓸 때: 휘두르기 ↔ 쏘기 ↔ 주문
const ACT_AS = { sword: { shoot: 'swing', shootUp: 'swing', cast: 'swing' }, gun: { swing: 'shoot', cast: 'shoot' }, wand: { swing: 'cast', shoot: 'cast', shootUp: 'cast' } };
function poseAt(p, t) {
  const type = p.d.type;
  let pose = { deg: type === 'sword' ? 45 : type === 'gun' ? 0 : 25, lift: 0, dx: 0, lean: 0, cast: false };
  for (const [ta, kind0, dur] of p.acts) {
    const kind = (ACT_AS[type] || {})[kind0] || kind0;
    if (kind === 'swing' && inW(t, ta - 0.12, ta + 0.28)) {
      const deg = t < ta ? lerp(45, -30, eo(prog(t, ta - 0.12, ta))) : t < ta + 0.07 ? lerp(-30, 125, eo(prog(t, ta, ta + 0.07))) : lerp(125, 45, eio(prog(t, ta + 0.1, ta + 0.28)));
      pose = { ...pose, deg, lean: t >= ta && t < ta + 0.15 ? 2 : 0 };
    } else if (kind === 'raise' && inW(t, ta, ta + dur)) pose = { ...pose, deg: type === 'sword' ? -15 : type === 'gun' ? -35 : -5, lift: type === 'gun' ? 0 : 5 };
    else if (kind === 'shoot' && inW(t, ta, ta + 0.14)) { const k = prog(t, ta, ta + 0.14); pose = { ...pose, deg: -12 * (1 - k), dx: -2 * (1 - k) }; }
    else if (kind === 'shootUp' && inW(t, ta - 0.15, ta + 0.2)) pose = { ...pose, deg: -45 };
    else if (kind === 'cast' && inW(t, ta - 0.2, ta + 0.25)) pose = { ...pose, deg: -5, lift: 6, cast: true };
  }
  return pose;
}
// 용사 한 명(분신·잔상 포함)을 그린다. 무기 끝점을 돌려준다.
function drawHeroAt(x, fy, pose, d, t, tint = null, a = 1) {
  let tip = [0, 0];
  if (typeof HERO_WEAPON !== 'undefined' && HERO_WEAPON) { withA(a, () => { tip = drawGearHero(x + (pose.dx || 0), fy, 'A', gearFromDeg(pose, HERO_WEAPON.wt), HERO_WEAPON, t, tint, 0, pose.lean || 0); }); return tip; } // 게임: 입은 장비 그대로
  withA(a, () => {
    x += pose.dx || 0;
    if (!tint) prect(x - 12, fy - 2, 24, 3, 'shadow');
    drawSpr(sprite('heroA', 'hero', 0, tint), x + (pose.lean || 0), fy, 2);
    const hx = x + HAND_DX + (pose.lean || 0), hy = fy - 16 - (pose.lift || 0);
    const [tx, ty, f] = drawWeapon(d, pose.deg, hx, hy, tint);
    tip = [tx, ty];
    if (!tint && d.aura) weaponAura(d, f, hx, hy, tx, ty, t);
  });
  return tip;
}
// 레전더리·판타지아 무기는 손에 쥐고 있어도 빛난다
function weaponAura(d, f, hx, hy, tx, ty, t) {
  const fan = d.grade === '판타지아', pulse = 0.75 + 0.25 * Math.sin(t * 5);
  lighter(() => {
    glow(lerp(hx, tx, 0.6), lerp(hy, ty, 0.6), fan ? 16 : 11, d.aura, (fan ? 0.45 : 0.3) * pulse);
    for (const [ax, ay] of f.accents) if ((ax + ay) % 3 === 0) glow(hx + ax * WSCALE, hy + ay * WSCALE, 3, d.pal.accent || d.aura, 0.5 * pulse);
    const n = fan ? 3 : 2;
    for (let i = 0; i < n; i++) { const k = (t * 0.9 + i / n) % 1, sx = lerp(hx, tx, k), sy = lerp(hy, ty, k); withA(Math.sin(k * Math.PI), () => star4(sx + (rnd(i * 5) - 0.5) * 4, sy, fan ? 2.6 : 1.8, '#ffffff')); }
    if (fan) for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i / 4) % 1; withA((1 - k) * 0.8, () => disc(lerp(hx, tx, rnd(i * 9 + Math.floor(t * 0.6 + i / 4)) ) + (rnd(i) - 0.5) * 6, lerp(hy, ty, 0.5) - k * 14, 0.9, d.aura)); }
  });
}

// ---------- 피해 숫자 ----------
const nums = [];
function num(x, y, s, c, size, a = 1) { nums.push({ x, y, s, c, size, a }); }

// ---------- 몬스터와 상태 이상 ----------
const HELD = ['stun', 'freeze', 'bind', 'held', 'shock'];
function drawFoe(e, t, S, s) {
  const [type, palName] = FOES[e];
  const frame = HELD.some(k => s.on.has(k)) ? 0 : Math.floor(t * 2.5 + e * 0.7) % 2;
  let tint = null;
  if (s.flash) tint = '#ffffff';
  else if (s.on.has('freeze')) tint = 'rgba(175,228,255,0.62)';
  else if (s.on.has('shock') && Math.floor(t * 20) % 2) tint = 'rgba(255,244,140,0.6)';
  else if (s.on.has('bind')) tint = 'rgba(120,210,110,0.35)';
  else if (s.on.has('burn') && Math.floor(t * 12) % 2) tint = 'rgba(255,150,60,0.35)';
  else if (s.on.has('curse')) tint = 'rgba(120,60,200,0.35)';
  const c = sprite(type, palName, frame, tint);
  withA(0.9, () => prect(S.x[e] - c.width * 0.7, GROUND - 2, c.width * 1.4, 3, 'shadow'));
  drawSpr(c, S.x[e], GROUND + S.dy[e], 2);
}
function statusFx(e, t, S, s) {
  const x = S.x[e], top = S.top[e], y = S.y[e];
  if (s.on.has('stun')) for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.1; star4(x + Math.cos(a) * 9, top - 4 + Math.sin(a) * 2, 2, '#ffe27a'); }
  if (s.on.has('bleed')) for (let i = 0; i < 3; i++) { const ph = (t * 3 + i / 3) % 1; withA(1 - ph, () => rect(x - 6 + i * 6, y - 2 + ph * 14, 1.5, 3, '#ff4d5e')); }
  if (s.on.has('burn')) lighter(() => { for (let i = 0; i < 3; i++) { const fh = 5 + Math.sin(t * 20 + i * 2 + e) * 2, fx = x - 7 + i * 7; poly([[fx - 3, top + 6], [fx, top + 3 - fh], [fx + 3, top + 6]], '#ff7a2a'); poly([[fx - 1.5, top + 6], [fx, top + 6 - fh], [fx + 1.5, top + 6]], '#ffe27a'); } });
  if (s.on.has('freeze')) for (let i = 0; i < 4; i++) if (Math.floor(t * 6 + i) % 3 === 0) rect(x - 10 + rnd(e * 5 + i) * 20, top + 2 + rnd(e * 7 + i) * 18, 1, 1, '#ffffff');
  if (s.on.has('shock') && Math.floor(t * 14 + e) % 2) lighter(() => bolt(x - 10, top + 4, x + 10, top + 14, Math.floor(t * 14) + e, 0.8, '#fff27a', 6));
  if (s.on.has('curse')) lighter(() => { for (let i = 0; i < 2; i++) { const k = (t * 1.5 + i / 2) % 1; withA(1 - k, () => disc(x + (i ? 5 : -5), top + 4 - k * 12, 1.4, '#b48cff')); } });
  for (const d of s.list) {
    if (d.k !== 'bleed' && d.k !== 'burn') continue;
    for (let tk = d.a + 0.4; tk < d.b; tk += 0.4) { const k = t - tk; if (k >= 0 && k < 0.5) num(x + 9, top - 2 - k * 14, d.k === 'bleed' ? '2' : '3', d.k === 'bleed' ? '#ff7d8f' : '#ffa24d', 7, 1 - k / 0.5); }
  }
}

// ---------- 기본 공격 (모든 등급) ----------
const BASE = {
  sword(ta, p) {
    const hot = p.d.aura || '#ffe27a';
    return {
      acts: [[ta, 'swing']],
      hits: [0, 1, 2].map(e => [ta + 0.03, e, 6 + e, { kb: 3 }]),
      st: [0, 1, 2].map(e => [e, 'stun', ta + 0.03, ta + 0.65]),
      fx: (t, S) => {
        slash({ cx: 130, cy: 82, rx: 64, ry: 18, rot: 0, a0: -1.35, a1: 1.3, w: 9, t0: ta - 0.01, dur: 0.28, mid: mix(hot, '#ffffff', 0.35), hot, core: '#ffffff' }, t);
        for (let e = 0; e < 3; e++) flare(S.x[e], S.y[e], 5, hot, pulse(t, ta + 0.03, ta + 0.13));
      },
    };
  },
  gun(ta, p) {
    const hot = p.d.aura || '#ffd23d';
    return {
      acts: [[ta, 'shoot']],
      hits: [[ta + 0.04, 0, 12, { kb: 7 }], [ta + 0.07, 1, 7, { kb: 4 }]],
      st: [[0, 'bleed', ta + 0.04, ta + 0.95]],
      fx: (t, S) => {
        const [mx, my] = S.tip;
        if (inW(t, ta, ta + 0.07)) { flare(mx + 3, my, 7, hot, 1, 0); lighter(() => { line(mx, my, S.x[0], my, 2.4, hot); line(mx, my, S.x[0], my, 1, '#ffffff'); withA(0.6, () => line(S.x[0], my, S.x[1], my, 1.2, hot)); }); }
        flare(S.x[0], S.y[0], 5, '#ff5e6c', pulse(t, ta + 0.04, ta + 0.14));
        sparks(t, ta + 0.04, S.x[0] + 4, S.y[0], 8, 3, 90, '#ff7d8f', 0.3, 0, 1.6);
        smoke(t, ta, mx + 4, my, 5, 3, 7, '#b8b0c8', 0.6, [10, -18], 0.4);
      },
    };
  },
  wand(ta, p) {
    const hot = p.d.pal.gem, te = ta + 0.45;
    return {
      acts: [[ta, 'cast']],
      hits: [[te, 0, 9, { kb: -3 }], [te, 1, 9, { lift: 5 }], [te, 2, 9, { kb: 4 }]],
      st: [],
      fx: (t, S) => {
        const tx = p.bx[1], ty = GROUND - 12;
        if (inW(t, ta, te)) {
          const at = u => { const k = prog(u, ta, te); return [lerp(S.tip[0], tx, k), lerp(S.tip[1], ty, k) - Math.sin(k * Math.PI) * 26]; };
          lighter(() => { for (let j = 8; j >= 1; j--) { const [x, y] = at(t - j * 0.022); withA(0.6 - j * 0.06, () => disc(x, y, 4.5 - j * 0.45, hot)); } const [x, y] = at(t); glow(x, y, 14, hot, 0.9); disc(x, y, 4, hot); disc(x - 1, y - 1, 2.2, '#ffffff'); });
        }
        const age = t - te;
        if (age >= 0 && age < 0.6) {
          const k = age / 0.6;
          if (age < 0.05) flash(0.15, '#fff2d0');
          lighter(() => { glow(tx, ty, 50 * eo(Math.min(1, k * 3)), hot, 0.85 * (1 - k)); withA(1 - k, () => ring(tx, ty, 42 * eo(k), 3 * (1 - k) + 0.6, '#ffe27a', 0.8)); });
          flare(tx, ty, 12, hot, pulse(t, te, te + 0.15));
          rays(tx, ty, 8, 40 * eo(k), 12, 5, 2.2, hot, 1 - k);
        }
        sparks(t, te, tx, ty, 14, 9, 130, '#ffe27a', 0.5);
        smoke(t, te + 0.1, tx, ty - 4, 16, 6, 11, '#5a4a5a', 0.8, [0, -16], 0.55);
      },
    };
  },
};

// ---------- 미리보기 한 편 만들기 ----------
function build(o) {
  const d0 = DESIGNS[o.w], d = o.type && o.type !== d0.type ? { ...d0, type: o.type } : d0; // o.type: 같은 스킬을 다른 무기로 (지역 판타지아 스킬)
  const p = { dur: 3, acts: [], hits: [], st: [], ...o, d };
  p.o = o; p.acts = [...(o.acts || [])]; p.hits = [...(o.hits || [])]; p.st = [...(o.st || [])]; p.fx = [];
  p.bx = PACK[o.pack || (d.type === 'sword' ? 'near' : 'far')];
  for (const ta of [].concat(o.base ?? [])) { const k = BASE[d.type](ta, p); p.acts.push(...k.acts); p.hits.push(...k.hits); p.st.push(...k.st); p.fx.push(k.fx); }
  p.acts.sort((a, b) => a[0] - b[0]);
  p.byE = [0, 1, 2, 3].map(e => p.hits.filter(h => h[1] === e).map(([t, , dd, x = {}]) => ({ t, d: dd, ...x })));
  p.stE = [0, 1, 2, 3].map(e => p.st.filter(s => s[0] === e).map(([, k, a, b]) => ({ k, a, b })));
  return p;
}

function scene(p, t) {
  const S = { x: [], y: [], top: [], dy: [], bx: p.bx, tip: [0, 0] }, st = [];
  for (let e = 0; e < 4; e++) {
    let dx = 0, dy = 0, fl = false;
    for (const h of p.byE[e]) {
      const k = t - h.t; if (k < 0) continue;
      if (k < 0.07) fl = true;
      if (h.kb) dx += h.kb * (k < 0.1 ? eo(k / 0.1) : k < 0.5 ? 1 - (k - 0.1) / 0.4 : 0);
      if (h.lift) dy -= h.lift * (k < 0.45 ? Math.sin((k / 0.45) * Math.PI) : 0);
      if (k < 0.7) num(p.bx[e] + dx + (rnd(Math.round(h.t * 1000) + e) - 0.5) * 12, GROUND - FOE_H[e] - 6 - k * 20,
        String(Math.round(h.d)) + (h.crit ? '!' : ''), h.crit ? 'gold' : 'text', h.crit ? 12 : h.small ? 7 : 9, k < 0.45 ? 1 : 1 - (k - 0.45) / 0.25);
    }
    if (p.move) { const m = p.move(e, t); dx += m.dx || 0; dy += m.dy || 0; }
    dx = clamp(dx, -60, 60);
    S.x[e] = p.bx[e] + dx; S.dy[e] = dy; S.top[e] = GROUND - FOE_H[e] + dy; S.y[e] = GROUND - FOE_H[e] / 2 + dy;
    st[e] = { flash: fl, on: new Set(p.stE[e].filter(s => inW(t, s.a, s.b)).map(s => s.k)), list: p.stE[e] };
  }
  const hs = p.hero ? p.hero(t) : {};
  // 소환수·배경 연출이 먼저 계산할 수 있게 무기 끝점을 미리 잡는다
  const pose = poseAt(p, t);
  const f0 = forge(p.d, pose.deg), _w = WSCALE, hx0 = HX + (hs.dx || 0) + (pose.dx || 0) + HAND_DX + (pose.lean || 0), hy0 = GROUND + (hs.dy || 0) - 16 - (pose.lift || 0);
  S.tip = [hx0 + f0.tip[0] * _w, hy0 + f0.tip[1] * _w];
  if (p.back) p.back(t, S);
  for (let e = 3; e >= 0; e--) drawFoe(e, t, S, st[e]);
  for (let e = 0; e < 4; e++) statusFx(e, t, S, st[e]);
  if (p.mid) p.mid(t, S);
  for (const g of hs.trail || []) drawHeroAt(HX + g.dx, GROUND + (g.dy || 0), { deg: g.deg ?? 45 }, p.d, t, g.tint, g.a);
  if (!hs.hide) drawHeroAt(HX + (hs.dx || 0), GROUND + (hs.dy || 0), pose, p.d, t);
  for (const f of p.fx) f(t, S);
  if (p.front) p.front(t, S);
}

// ---------- 스킬 공용 ----------
const ALL = [0, 1, 2, 3];
// 여러 시각에 여러 적을 친다. stagger: 적마다 조금씩 늦게
function hitsAt(ts, dmg, o = {}, es = ALL) { return [].concat(ts).flatMap((t, i) => es.map((e, j) => [t + (o.stagger || 0) * j, e, typeof dmg === 'function' ? dmg(i, e) : dmg, o])); }
const stAll = (kind, a, b, es = ALL) => es.map(e => [e, kind, a, b]);
// 스킬 무대: 화면을 눌러 어둡게 + 테두리 색
function stage(t, a, b, hex = '#05030f', amt = 0.45, edge = null) { const k = fade(t, a, b, 0.2); dim(k * Math.min(0.75, amt + 0.1), hex); if (edge) vignette(k * 0.28, edge); }
// 준비 동작: 용사 발밑 마법진 + 빛 알갱이가 모인다
function charge(t, a, b, hex, x = HX, y = GROUND) {
  const k = fade(t, a, b, 0.1); if (k <= 0) return;
  circle(x, y, 18 + 6 * eo(prog(t, a, a + 0.3)), t, hex, k, 0.28, 1.5);
  lighter(() => { glow(x, y - 16, 22, hex, 0.35 * k); for (let i = 0; i < 12; i++) { const q = (t * 1.6 + i / 12) % 1, ang = rnd(i) * 6.28, r = 28 * (1 - q); withA(k * q, () => disc(x + Math.cos(ang) * r, y - 16 + Math.sin(ang) * r * 0.7, 1, i % 2 ? '#ffffff' : hex)); } });
}
