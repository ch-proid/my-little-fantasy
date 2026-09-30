'use strict';
// =====================================================================
// 판타지아 완드 6종
// =====================================================================
function dragonBody(hx, hy, sc, cB, cD, cL, cE, t, open) {
  const s = v => v * sc, bx = hx - s(46), by = hy + s(34), flap = Math.sin(t * 4) * s(5);
  const wing = (dx, k, c) => { const tip = [bx + s(dx - 18), by - s(50) + flap * k], mid = [bx + s(dx + 4), by - s(56) + flap * k], back = [bx + s(dx + 22), by - s(44) + flap * k]; poly([[bx + s(dx), by - s(6)], tip, [bx + s(dx - 6), by - s(38) + flap], mid, [bx + s(dx + 8), by - s(34) + flap], back, [bx + s(dx + 20), by - s(8)]], c); [tip, mid, back].forEach(p => line(bx + s(dx + 2), by - s(6), p[0], p[1], 1.2, cD)); };
  wing(-6, 0.8, cD);
  for (let i = 7; i >= 0; i--) disc(bx - s(16 + i * 7), by + s(8) - Math.sin(i * 0.7 + t * 3) * s(3) + s(i * 1.2), s(9 - i * 1), i % 2 ? cB : cD);
  poly([[bx - s(70), by + s(14)], [bx - s(78), by + s(8)], [bx - s(74), by + s(18)]], cD);
  disc(bx, by, s(18), cB); disc(bx + s(4), by + s(7), s(11), cL);
  wing(4, 1.2, cB);
  for (let i = 0; i <= 7; i++) {
    const k = i / 7, nx = lerp(bx + s(10), hx - s(4), k), ny = lerp(by - s(10), hy + s(6), k) - Math.sin(k * Math.PI) * s(9);
    disc(nx, ny, s(8.5 - k * 2.2), cB); disc(nx + s(2), ny + s(2.5), s(4.2 - k), cL);
    if (i % 2 === 0) poly([[nx - s(3), ny - s(7)], [nx - s(6), ny - s(12)], [nx + s(1), ny - s(8)]], cD);
  }
  poly([[hx - s(3), hy - s(5)], [hx - s(18), hy - s(16)], [hx - s(1), hy - s(8)]], cD);
  poly([[hx + s(1), hy - s(7)], [hx - s(9), hy - s(20)], [hx + s(4), hy - s(8)]], cL);
  disc(hx, hy, s(8.5), cB);
  poly([[hx + s(2), hy - s(6.5)], [hx + s(19), hy - s(3)], [hx + s(19), hy + s(1)], [hx + s(3), hy + s(2)]], cB);
  poly([[hx + s(2), hy + s(2)], [hx + s(16), hy + s(2) + open * s(7)], [hx + s(14), hy + s(5) + open * s(7)], [hx, hy + s(7.5)]], cD);
  if (open > 0.3) { poly([[hx + s(5), hy + s(2)], [hx + s(6), hy + s(4)], [hx + s(7), hy + s(2)]], '#ffffff'); poly([[hx + s(10), hy + s(2.5)], [hx + s(11), hy + s(4.5)], [hx + s(12), hy + s(3)]], '#ffffff'); }
  rect(hx + s(2), hy - s(4.5), s(3.5), s(2), cE);
}
// 불꽃 혀: 아래가 넓고 위가 뾰족, 흔들린다
function flameTongue(x, y, h, w, t, seed, c1 = '#ff5e1a', c2 = '#ffe27a') {
  const sway = Math.sin(t * 14 + seed) * w * 0.5;
  poly([[x - w, y], [x - w * 0.3 + sway * 0.5, y - h * 0.55], [x + sway, y - h], [x + w * 0.4 + sway * 0.5, y - h * 0.5], [x + w, y]], c1);
  poly([[x - w * 0.5, y], [x + sway * 0.6, y - h * 0.65], [x + w * 0.5, y]], c2);
}

const F_WAND = [
  {
    w: 'f_dragon', skill: '드래곤 브레스', desc: '주인공 뒤에 거대한 마법진이 열리고 반투명한 드래곤이 솟아오른다. 불길을 길게 뿜어 적을 태우고, 마지막엔 불바다가 한꺼번에 폭발한다.',
    p: (() => {
      const tb0 = 1.6, tb1 = 2.65, sc = 1.35, fin = 2.75, hits = [];
      for (let tk = tb0 + 0.06; tk < tb1; tk += 0.16) hits.push(...hitsAt(tk, 6, { small: true, stagger: 0.02 }));
      const head = t => { const rear = prog(t, 1.3, 1.55) * (pulse(t, 1.55, 1.66)), push = inW(t, tb0, tb1) ? 1 : 0; return { hx: 100 + (-8 * rear + 3 * push + (push ? Math.sin(t * 50) * 0.8 : 0)) * sc, hy: 34 - 5 * rear * sc + 8 * (1 - eo(prog(t, 0.95, 1.35))), open: push ? 1 : rear * 0.6 }; };
      return build({
        w: 'f_dragon', dur: 4.0, base: 0.3,
        acts: [[1.0, 'raise', 0.4], [1.55, 'cast']],
        hits: [...hits, ...hitsAt(fin + 0.02, 48, { crit: true, lift: 10 })],
        st: stAll('burn', tb0 + 0.1, 3.6),
        shake: t => (inW(t, tb0, tb1) ? 1 : inW(t, fin, fin + 0.2) ? 3 : 0),
        back(t) {
          stage(t, 0.9, 3.2, '#0f0400', 0.5, '#ff5e1a');
          circle(58, 52, 38, t, '#ff7a2a', fade(t, 0.95, 3.0, 0.2), 1, 0.7); circle(58, 52, 26, -t, '#b48cff', fade(t, 0.95, 3.0, 0.2) * 0.8, 1, 1.2);
          const a = 0.72 * Math.min(prog(t, 0.95, 1.35), 1 - prog(t, tb1 + 0.3, tb1 + 0.7)), D = head(t);
          layer(a, () => dragonBody(D.hx, D.hy, sc, '#8f5bd6', '#4f2d8a', '#e2d2ff', '#fff09a', t, D.open));
          if (a > 0) lighter(() => glow(D.hx + 4 * sc, D.hy - 3.5 * sc, 7, '#fff09a', a));
        },
        front(t) {
          const D = head(t), mx = D.hx + 19 * sc, my = D.hy + 2 * sc, N = 140;
          if (inW(t, tb0, tb1)) lighter(() => { glow(mx, my, 16, '#ffb347', 0.9); flare(mx + 4, my + 2, 9, '#ff9a3c', 0.8, 0.25); });
          lighter(() => glow(CXF, GROUND, 90, '#ff5e1a', 0.35 * fade(t, tb0, fin + 0.4, 0.2)));
          for (let i = 0; i < 10; i++) if (fade(t, tb0 + 0.2 + i * 0.03, 3.5, 0.2) > 0) lighter(() => withA(fade(t, tb0 + 0.2 + i * 0.03, 3.5, 0.2), () => flameTongue(190 + i * 18, GROUND + 1, 10 + rnd(i) * 10, 5, t, i)));
          for (let i = 0; i < N; i++) {
            const ts = tb0 + (i * (tb1 - tb0)) / N, age = t - ts, life = 0.55; if (age < 0 || age >= life) continue;
            const k = age / life, ang = 0.26 + (rnd(i * 7) - 0.5) * 0.9 * k, x = mx + Math.cos(ang) * 390 * age, y = my + Math.sin(ang) * 390 * age + 50 * k * k;
            const c = k < 0.22 ? '#ffffff' : k < 0.45 ? '#ffe27a' : k < 0.7 ? '#ff7a2a' : '#6a2020', draw = () => withA((1 - k) * 0.9, () => disc(x, y, 3 + k * 13, c));
            k < 0.65 ? lighter(draw) : draw();
          }
          if (inW(t, fin, fin + 0.1)) flash(0.35, '#ffd8a0');
          for (let e = 0; e < 4; e++) { flare(FAR[e], GROUND - 10, 12, '#ff9a3c', pulse(t, fin + e * 0.03, fin + e * 0.03 + 0.18)); sparks(t, fin + e * 0.03, FAR[e], GROUND - 8, 10, e * 7, 150, '#ffe27a', 0.5, -Math.PI / 2, 1.8); smoke(t, fin + 0.1, FAR[e], GROUND - 14, 16, 5, e * 11, '#3a2020', 1.0, [0, -18], 0.55); }
          rays(CXF, GROUND - 14, 10, 130 * eo(prog(t, fin, fin + 0.3)), 22, 3, 3, '#ffb347', pulse(t, fin, fin + 0.35));
        },
      });
    })(),
  },
  {
    w: 'f_phoenix', skill: '불사조 강림', desc: '발밑에 불의 마법진이 타오르고, 불꽃 날개를 펼친 불사조가 적 머리 위를 가르며 날아간다. 뒤따라 불깃털 비가 쏟아진다.',
    p: (() => {
      const pos = t => (t < 1.3 ? [lerp(100, 120, eo(prog(t, 1.08, 1.3))), lerp(GROUND, 56, eo(prog(t, 1.08, 1.3)))] : [120 + (t - 1.3) * 340, 56 - Math.sin((t - 1.3) * 4) * 7]);
      const th = e => 1.3 + (FAR[e] - 120) / 340, rain = 2.2;
      const drops = Array.from({ length: 14 }, (_, i) => ({ t0: rain + i * 0.05, x: 200 + rnd(i) * 160 }));
      const bird = (x, y, t) => {
        const f = Math.sin(t * 14);
        for (const [dir, c1, c2] of [[-1, '#e0521f', '#ff9a3c'], [1, '#ff9a3c', '#ffe27a']]) {
          const wing = { cx: x - 8, cy: y - 2, rx: 26, ry: 12 + f * 8 * dir * 0.5, rot: -0.35 * dir - 0.2, a0: dir < 0 ? -2.6 : -2.2, a1: dir < 0 ? -0.6 : -0.3, w: 11 };
          lighter(() => { withA(0.8, () => poly(arcBand(wing, 0, 1, 1), c1)); withA(0.9, () => poly(arcBand(wing, 0.2, 1, 0.5), c2)); });
        }
        lighter(() => { glow(x, y, 30, '#ff9a3c', 0.7); disc(x, y, 7, '#ff7a2a'); disc(x + 1, y - 1, 4, '#ffe27a'); disc(x + 9, y - 6, 4.5, '#ffb347'); poly([[x + 12, y - 7.5], [x + 18, y - 6], [x + 12, y - 4.5]], '#fff09a'); poly([[x + 8, y - 10], [x + 3, y - 18], [x + 11, y - 11]], '#ff4d2a'); });
        rect(x + 10, y - 8, 1.5, 1.5, '#7a1f10');
        for (let j = 0; j < 3; j++) { const tail = { cx: x - 30, cy: y + 4 + j * 3, rx: 30, ry: 6 + j * 2, rot: 0.1, a0: 0.2 + Math.sin(t * 8 + j) * 0.2, a1: 2.6, w: 6 - j }; lighter(() => withA(0.8, () => poly(arcBand(tail, 0, 1, 1), j ? '#ff7a2a' : '#ffe27a'))); }
      };
      return build({
        w: 'f_phoenix', dur: 3.9, base: 0.3,
        acts: [[1.05, 'cast']],
        hits: [...ALL.map(e => [th(e), e, 38, { crit: true }]), ...drops.map((d, i) => [d.t0 + 0.2, ALL.reduce((b, e) => (Math.abs(FAR[e] - d.x) < Math.abs(FAR[b] - d.x) ? e : b), 0), 12, { small: true }])],
        st: ALL.map(e => [e, 'burn', th(e), 3.5]),
        back: t => { stage(t, 0.95, 3.2, '#120400', 0.45, '#ff7a2a'); charge(t, 0.95, 1.3, '#ff9a3c'); },
        front(t) {
          const ga = fade(t, 1.0, 1.5, 0.1);
          if (ga > 0) { circle(HX, GROUND, 30, t, '#ff7a2a', ga, 0.25, 2); for (let i = 0; i < 8; i++) lighter(() => withA(ga, () => flameTongue(HX - 28 + i * 8, GROUND, 12 + rnd(i) * 10, 4, t, i))); }
          for (let ts = 1.3; ts < 2.4; ts += 0.018) { const age = t - ts; if (age < 0 || age >= 0.6) continue; const [px, py] = pos(ts), k = age / 0.6; lighter(() => disc(px - 20 - age * 20 + (rnd(Math.round(ts * 100)) - 0.5) * 10, py + 6 + age * 40 + age * age * 70, 3.5 * (1 - k) + 0.5, k < 0.3 ? '#ffe27a' : k < 0.7 ? '#ff9a3c' : '#e0521f')); }
          if (inW(t, 1.08, 2.5)) { const [x, y] = pos(t); bird(x, y, t); }
          for (let e = 0; e < 4; e++) { flare(FAR[e], GROUND - 12, 10, '#ff9a3c', pulse(t, th(e), th(e) + 0.15)); sparks(t, th(e), FAR[e], GROUND - 12, 8, e * 3, 100, '#ffe27a', 0.4); }
          for (const [i, d] of drops.entries()) {
            if (inW(t, d.t0, d.t0 + 0.2)) { const k = ei(prog(t, d.t0, d.t0 + 0.2)), x = lerp(d.x + 40, d.x, k), y = lerp(-10, GROUND - 6, k); lighter(() => { line(x, y, x + 12, y - 22, 3, '#ff7a2a'); line(x, y, x + 6, y - 11, 1.4, '#fff09a'); glow(x, y, 8, '#ffb347', 0.9); }); }
            flare(d.x, GROUND - 6, 7, '#ff9a3c', pulse(t, d.t0 + 0.2, d.t0 + 0.32)); sparks(t, d.t0 + 0.2, d.x, GROUND - 4, 5, i * 13, 80, '#ffe27a', 0.35, -Math.PI / 2, 2);
          }
        },
      });
    })(),
  },
  {
    w: 'f_frost', skill: '고드름 폭포', desc: '하늘에 얼음 마법진이 열리고 눈보라가 몰아친다. 거대한 고드름이 쏟아져 적을 얼리고, 마지막엔 땅에서 얼음 가시가 솟았다가 산산이 깨진다.',
    p: (() => {
      const ord = [0, 2, 1, 3, 1, 3, 0, 2], td = i => 1.25 + i * 0.08, land = i => td(i) + 0.15, ix = i => FAR[ord[i]] + (i < 4 ? -6 : 6);
      const first = e => Math.min(...ord.map((o, i) => (o === e ? land(i) : 99))), spike = 2.45, brk = 2.9;
      return build({
        w: 'f_frost', dur: 3.9, base: 0.3,
        acts: [[1.05, 'cast'], [spike - 0.1, 'cast']],
        hits: [...ord.map((e, i) => [land(i), e, i < 4 ? 18 : 22, {}]), ...hitsAt(spike + 0.05, 30, { lift: 8 }), ...hitsAt(brk, 40, { crit: true })],
        st: ALL.map(e => [e, 'freeze', first(e), brk]),
        shake: t => (inW(t, spike, spike + 0.15) ? 2.5 : inW(t, brk, brk + 0.15) ? 2 : 0),
        back(t) { stage(t, 0.95, 3.3, '#020a14', 0.48, '#8fd8ff'); charge(t, 0.95, 1.2, '#bfeaff'); circle(CXF, 16, 60, t, '#bfeaff', fade(t, 1.0, 2.5, 0.15), 0.28, 1); },
        front(t, S) {
          const sa = fade(t, 1.0, 3.4, 0.3);
          if (sa > 0) lighter(() => { glow(W / 2, GROUND + 10, 220, '#8fd8ff', 0.22 * sa); for (let i = 0; i < 60; i++) { const y = ((rnd(i * 7) * 140 + (t - 1) * (40 + rnd(i * 3) * 30)) % 130) - 10, x = (rnd(i) * 560 - (t - 1) * 60 * (0.5 + rnd(i * 5))) % 560; withA(sa * 0.8, () => line(x < 0 ? x + 560 : x, y, (x < 0 ? x + 560 : x) - 4, y - 1.5, i % 4 ? 0.7 : 1.3, '#ffffff')); } });
          ord.forEach((e, i) => {
            if (inW(t, td(i), land(i))) { const tipY = lerp(-40, S.y[e] + 2, ei(prog(t, td(i), land(i)))), x = ix(i); lighter(() => glow(x, tipY - 18, 14, '#bfeaff', 0.6)); poly([[x - 6, tipY - 38], [x + 6, tipY - 38], [x, tipY]], '#bfeaff'); poly([[x - 6, tipY - 38], [x - 1.5, tipY - 38], [x, tipY]], '#ffffff'); poly([[x + 2, tipY - 38], [x + 6, tipY - 38], [x + 0.5, tipY - 6]], '#6ab8e8'); }
            flare(ix(i), S.y[e], 9, '#bfeaff', pulse(t, land(i), land(i) + 0.14));
            shards(t, land(i), ix(i), S.y[e], 8, i * 7, 110, '#dff5ff', 0.5, 2.5);
            lighter(() => withA(pulse(t, land(i), land(i) + 0.35), () => ring(ix(i), GROUND, 4 + prog(t, land(i), land(i) + 0.35) * 20, 1.2, '#ffffff', 0.25)));
          });
          const sk = eo(prog(t, spike, spike + 0.1)), sb = 1 - prog(t, brk, brk + 0.05);
          if (t >= spike && sb > 0) for (let j = 0; j < 9; j++) { const x = 200 + j * 18, h = (30 + rnd(j) * 30) * sk, lean = (rnd(j * 3) - 0.5) * 10; withA(sb, () => { poly([[x - 7, GROUND], [x + lean, GROUND - h], [x + 7, GROUND]], '#bfeaff'); poly([[x - 7, GROUND], [x + lean, GROUND - h], [x - 1, GROUND]], '#ffffff'); }); lighter(() => withA(sb * 0.5, () => glow(x, GROUND - h * 0.5, 12, '#8fd8ff', 0.6))); }
          if (inW(t, brk, brk + 0.08)) flash(0.35, '#e8f8ff');
          for (let j = 0; j < 9; j++) shards(t, brk, 200 + j * 18, GROUND - 20, 6, j * 11, 140, j % 2 ? '#ffffff' : '#bfeaff', 0.7, 3, -Math.PI / 2, 2.6);
          rays(CXF, GROUND - 20, 8, 120 * eo(prog(t, brk, brk + 0.3)), 22, 5, 3, '#bfeaff', pulse(t, brk, brk + 0.35));
        },
      });
    })(),
  },
  {
    w: 'f_storm_eye', skill: '회오리 폭발', desc: '폭풍의 눈이 열려 거대한 회오리가 적을 한가운데로 빨아들인다. 한계까지 조인 뒤 터지면서 바람 칼날이 사방으로 날아간다.',
    p: (() => {
      const C = 272, t0 = 1.05, boom = 2.05, hits = [];
      for (let tk = 1.25; tk < 1.95; tk += 0.15) hits.push(...hitsAt(tk, 7, { small: true }));
      const blades = [0, 1, 2, 3, 4, 5].map(i => ({ cx: C, cy: 68, rx: 40 + i * 6, ry: 16 + i * 3, rot: i * 1.05, a0: 0, a1: 1.6, w: 8, t0: boom + i * 0.03, dur: 0.4, ink: '#02100c', mid: '#4fd1b8', hot: '#b8fff0', smokeHex: null }));
      return build({
        w: 'f_storm_eye', dur: 3.8, base: 0.3,
        acts: [[t0, 'cast'], [boom - 0.05, 'cast']],
        hits: [...hits, ...hitsAt(boom + 0.03, 64, { crit: true })],
        st: stAll('held', 1.15, 2.45),
        shake: t => (inW(t, 1.3, 2.0) ? 0.8 : inW(t, boom, boom + 0.2) ? 3.5 : 0),
        move(e, t) {
          const pull = (C - FAR[e]) * 0.72;
          if (t < boom) { const k = eio(prog(t, 1.15, 1.95)); return { dx: pull * k + Math.sin(t * 14 + e) * 2 * k, dy: -16 * k * (0.6 + 0.4 * Math.sin(t * 9 + e * 1.7)) }; }
          const k2 = prog(t, boom, boom + 0.4); return { dx: pull * (1 - eo(k2)) + Math.sign(FAR[e] - C) * 22 * Math.sin(k2 * Math.PI), dy: -16 * (1 - eo(k2)) - 20 * Math.sin(k2 * Math.PI) };
        },
        back: t => { stage(t, 0.95, 3.0, '#02100c', 0.5, '#4fd1b8'); charge(t, 0.95, 1.1, '#7ff0d8'); circle(C, GROUND, 50, t, '#7ff0d8', fade(t, t0, boom + 0.1, 0.15), 0.2, 3); },
        mid(t) {
          if (!inW(t, t0, boom + 0.08)) return;
          const g = eo(prog(t, t0, t0 + 0.4)) * (1 - ei(prog(t, boom - 0.1, boom + 0.08)));
          for (let j = 0; j < 12; j++) {
            const band = { cx: C + Math.sin(t * 6 + j * 0.7) * j * 0.5, cy: GROUND - 4 - j * 8, rx: (5 + j * 3.2) * g, ry: (1.5 + j * 0.9) * g, rot: 0, a0: t * 14 + j * 0.9, a1: t * 14 + j * 0.9 + 3.8, w: 2.4 + j * 0.15 };
            if (band.rx < 1) continue;
            withA(0.75, () => poly(arcBand(band, 0, 1, 1.6), '#1a6a5a')); poly(arcBand(band, 0, 1, 1), j % 2 ? '#7ff0d8' : '#4fd1b8'); lighter(() => poly(arcBand(band, 0.3, 1, 0.4), '#ffffff'));
          }
          for (let i = 0; i < 22; i++) { const h = rnd(i) * 92, a = t * 10 + rnd(i * 3) * 6.28, r = (5 + (h / 8) * 3.2) * g; L.save(); L.translate(C + Math.cos(a) * r, GROUND - h + Math.sin(a) * r * 0.28); L.rotate(t * 8 + i); poly([[0, -2], [1, 0], [0, 2], [-1, 0]], i % 3 ? '#8fdc84' : '#c9d6ee'); L.restore(); }
          lighter(() => { for (let i = 0; i < 8; i++) { const y = 30 + rnd(i) * 60, x = ((t * 500 * (i % 2 ? 1 : -1) + rnd(i * 3) * W) % W + W) % W; withA(0.35 * g, () => line(x, y, x + 24, y, 0.7, '#e0fff8')); } });
        },
        front(t) {
          for (const b of blades) slash(b, t);
          if (inW(t, boom, boom + 0.08)) flash(0.35, '#e8fff8');
          flare(C, 68, 28, '#7ff0d8', pulse(t, boom, boom + 0.25));
          rays(C, 68, 12, 140 * eo(prog(t, boom, boom + 0.3)), 24, 21, 3, '#b8fff0', pulse(t, boom, boom + 0.35));
          lighter(() => withA(pulse(t, boom, boom + 0.5), () => { ring(C, 68, 10 + prog(t, boom, boom + 0.5) * 150, 3, '#ffffff', 0.6); ring(C, 68, 6 + prog(t, boom, boom + 0.5) * 110, 2, '#4fd1b8', 0.6); }));
          shards(t, boom, C, 70, 18, 23, 170, '#8fdc84', 0.9, 2.6);
          smoke(t, boom + 0.05, C, GROUND - 10, 40, 10, 27, '#6a8a80', 1.2, [0, -10], 0.45);
        },
      });
    })(),
  },
  {
    w: 'f_stella', skill: '별자리 낙인', desc: '밤하늘에 거대한 별자리판이 돌고, 적 머리 위 별들이 빛의 선으로 이어진다. 별이 하나씩 떨어져 터진 뒤, 한가운데 커다란 별이 내려와 모두를 휩쓴다.',
    p: (() => {
      const SP = FAR.map((x, e) => [x, 20 + (e % 2 ? 12 : 0)]), ts = e => 1.15 + e * 0.12, tf = e => 1.9 + e * 0.1, fin = 2.45, finL = fin + 0.28;
      const starAt = (x, y, s, rot = 0) => lighter(() => { glow(x, y, 12 * s, '#ffe27a', 0.8); starShape(x, y, 6 * s, '#fff5b8', rot); starShape(x, y, 2.6 * s, '#ffffff', rot); });
      return build({
        w: 'f_stella', dur: 4.0, base: 0.3,
        acts: [[1.0, 'raise', 0.7], [fin, 'cast']],
        hits: [...ALL.map(e => [tf(e) + 0.1, e, 46, { crit: true }]), ...hitsAt(finL, 70, { crit: true, lift: 10 })],
        shake: t => (inW(t, finL, finL + 0.2) ? 3.5 : 0),
        back(t) {
          const a = fade(t, 0.95, 3.3, 0.3); stage(t, 0.95, 3.3, '#02041a', 0.62, '#3a3a9a'); starfield(a, 11);
          circle(CXF, 30, 70, t * 0.4, '#b8c8ff', a * 0.7, 0.45, 0.6); charge(t, 0.95, 1.3, '#fff5b8');
        },
        front(t, S) {
          const la = 1 - prog(t, 2.35, 2.7), bright = inW(t, 1.7, 1.9);
          for (let e = 0; e < 3; e++) { const k = prog(t, ts(e + 1), ts(e + 1) + 0.14); if (k <= 0 || la <= 0) continue; const [x0, y0] = SP[e], [x1, y1] = SP[e + 1]; lighter(() => withA(la, () => { line(x0, y0, lerp(x0, x1, k), lerp(y0, y1, k), bright ? 3 : 1.8, '#ffe9a8'); line(x0, y0, lerp(x0, x1, k), lerp(y0, y1, k), 0.7, '#ffffff'); })); }
          for (let e = 0; e < 4; e++) {
            const k = prog(t, ts(e), ts(e) + 0.2), [x, y] = SP[e];
            if (t >= ts(e) && t < tf(e)) starAt(x, y, (k < 0.6 ? 1.3 * eo(k / 0.6) : 1.3 - 0.3 * ((k - 0.6) / 0.4)) * (bright ? 1.35 : 1), t);
            if (inW(t, tf(e), tf(e) + 0.1)) { const k2 = prog(t, tf(e), tf(e) + 0.1); lighter(() => withA(0.8, () => line(x, y, lerp(x, S.x[e], k2), lerp(y, S.y[e], k2), 3, '#ffe27a'))); starAt(lerp(x, S.x[e], k2), lerp(y, S.y[e], k2), 1, t); }
            flare(S.x[e], S.y[e], 12, '#ffe27a', pulse(t, tf(e) + 0.1, tf(e) + 0.25));
            rays(S.x[e], S.y[e], 4, 34 * eo(prog(t, tf(e) + 0.1, tf(e) + 0.35)), 12, e * 9, 1.6, '#fff5b8', pulse(t, tf(e) + 0.1, tf(e) + 0.4));
            sparks(t, tf(e) + 0.1, S.x[e], S.y[e], 8, e * 5, 90, '#fff5b8', 0.4);
          }
          if (inW(t, fin, finL)) { const k = ei(prog(t, fin, finL)); lighter(() => withA(0.6, () => rect(CXF - 3, -10, 6, lerp(-10, 80, k) + 10, '#fff5b8'))); starAt(CXF, lerp(-20, 80, k), 2.6, t * 6); }
          if (inW(t, finL, finL + 0.1)) flash(0.45, '#fffbe8');
          flare(CXF, 82, 30, '#ffe27a', pulse(t, finL, finL + 0.3));
          rays(CXF, 82, 12, 150 * eo(prog(t, finL, finL + 0.35)), 28, 33, 3.5, '#fff5b8', pulse(t, finL, finL + 0.4));
          lighter(() => withA(pulse(t, finL, finL + 0.6), () => ring(CXF, GROUND, 10 + prog(t, finL, finL + 0.6) * 170, 3, '#ffe27a', 0.14)));
          for (let i = 0; i < 20; i++) { const a2 = t - finL; if (a2 < 0 || a2 > 1) continue; const ang = rnd(i) * 6.28, v = 60 + rnd(i * 3) * 80; lighter(() => withA(1 - a2, () => star4(CXF + Math.cos(ang) * v * eo(a2), 82 + Math.sin(ang) * v * 0.5 * eo(a2) - a2 * 10, 2, '#fff5b8'))); }
        },
      });
    })(),
  },
  {
    w: 'f_forest', skill: '옛 뿌리', desc: '숲의 마법진이 깨어나고 땅속에서 굵은 뿌리가 솟아 적을 휘감는다. 가시가 조여 오고, 마지막엔 거대한 꽃이 피어나며 꽃잎 폭풍이 몰아친다.',
    p: (() => {
      const tg = e => 1.25 + e * 0.07, bloom = 2.35, hits = [];
      for (let e = 0; e < 4; e++) { hits.push([tg(e) + 0.3, e, 20, {}]); for (let tk = 1.75; tk < 2.3; tk += 0.2) hits.push([tk + e * 0.03, e, 8, { small: true }]); }
      const root = (x0, hgt, j, g, t) => {
        const pts = []; for (let s = 0; s <= g + 1e-6; s += 0.08) pts.push([x0 + Math.sin(s * Math.PI * 1.3 + j) * (7 - j * 2) * s - (j - 1) * 8 * s, GROUND + 1 - s * hgt]);
        for (let i = 1; i < pts.length; i++) { const w = 5 * (1 - i / (pts.length + 2)) + 1; line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w + 1.5, '#3a2210'); line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, '#7a5230'); if (i % 3 === 0) poly([[pts[i][0], pts[i][1]], [pts[i][0] + (j - 1 || 1) * 4, pts[i][1] - 3], [pts[i][0], pts[i][1] - 2]], '#c9a070'); }
        for (let i = 2; i < pts.length; i += 3) line(pts[i - 1][0] - 1, pts[i - 1][1], pts[i][0] - 1, pts[i][1], 1, '#5cc85a');
        return pts[pts.length - 1];
      };
      const flower = (x, y, s, t) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + t * 0.4; L.save(); L.translate(x, y); L.rotate(a); poly([[0, 0], [s * 0.35, -s * 0.5], [0, -s], [-s * 0.35, -s * 0.5]], i % 2 ? '#ffb3d1' : '#ffd6e8'); L.restore(); } disc(x, y, s * 0.28, '#ffe27a'); disc(x, y, s * 0.12, '#ff9a3c'); };
      return build({
        w: 'f_forest', dur: 4.0, base: 0.3,
        acts: [[1.0, 'cast'], [bloom - 0.1, 'cast']],
        hits: [...hits, ...hitsAt(bloom + 0.25, 55, { crit: true, lift: 8 })],
        st: ALL.map(e => [e, 'bind', tg(e) + 0.3, 2.7]),
        shake: t => (inW(t, bloom + 0.25, bloom + 0.4) ? 2.5 : 0),
        back(t) {
          stage(t, 0.95, 3.3, '#020a02', 0.42, '#5cc85a'); charge(t, 0.95, 1.2, '#8fdc84');
          circle(CXF, GROUND, 70, t, '#8fdc84', fade(t, 1.05, 2.9, 0.2), 0.18, 0.8);
          const ba = fade(t, bloom, 3.2, 0.25); if (ba > 0) { lighter(() => glow(CXF, 50, 70, '#ffb3d1', 0.45 * ba)); layer(ba * 0.85, () => flower(CXF, 50, 44 * eo(prog(t, bloom, bloom + 0.3)), t)); }
        },
        front(t, S) {
          for (let e = 0; e < 4; e++) {
            const g = eo(prog(t, tg(e), tg(e) + 0.3)) * (1 - ei(prog(t, 2.6, 2.95))); if (g <= 0) continue;
            for (let j = 0; j < 3; j++) { const [tx, ty] = root(FAR[e] + (j - 1) * 10, FOE_H[e] + 10, j, g, t); const bl = prog(t, 2.0, 2.2) * g; if (bl > 0) flower(tx, ty, 5 * bl, t); }
            smoke(t, tg(e), FAR[e], GROUND - 2, 12, 5, e * 9, '#5a4020', 0.6, [0, -6], 0.6);
          }
          for (let i = 0; i < 16; i++) { const a = fade(t, 1.2, 3.4, 0.3), y = ((t - 1.2) * 26 + rnd(i) * 110) % 110; withA(a, () => { L.save(); L.translate(rnd(i * 5) * W + Math.sin(t * 3 + i) * 6, y); L.rotate(t * 3 + i); poly([[0, -2.2], [1.2, 0], [0, 2.2], [-1.2, 0]], i % 2 ? '#8fdc84' : '#5cc85a'); L.restore(); }); }
          if (inW(t, bloom + 0.25, bloom + 0.33)) flash(0.28, '#f8fff0');
          rays(CXF, 50, 12, 130 * eo(prog(t, bloom + 0.25, bloom + 0.55)), 24, 7, 3, '#ffd6e8', pulse(t, bloom + 0.25, bloom + 0.6));
          for (let i = 0; i < 50; i++) { const a2 = t - bloom - 0.25; if (a2 < 0 || a2 > 1.2) continue; const ang = rnd(i) * 6.28, v = 70 + rnd(i * 3) * 110; withA(1 - a2 / 1.2, () => { L.save(); L.translate(CXF + Math.cos(ang) * v * eo(Math.min(1, a2 * 1.6)), 50 + Math.sin(ang) * v * 0.45 * eo(Math.min(1, a2 * 1.6)) + a2 * a2 * 40); L.rotate(a2 * 6 + i); poly([[0, -2.5], [1.4, 0], [0, 2.5], [-1.4, 0]], i % 3 ? '#ffb3d1' : '#ffffff'); L.restore(); }); }
        },
      });
    })(),
  },
];
