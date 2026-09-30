'use strict';
// =====================================================================
// 판타지아 엽총 6종
// =====================================================================
const FAR = PACK.far, CXF = 272;

function crowAt(x0, y0, t, i, k = 2.3, eye = '#ff4d5e') {
  const f = Math.floor(t * 16 + i) % 2;
  L.save(); L.translate(x0, y0); L.scale(k, k);
  poly(f ? [[-1, -1], [-8, -8], [-4, -2], [2, -2]] : [[-1, 1], [-8, 6], [-4, 2], [2, 1]], '#1e1e26');
  poly([[-3, 0], [-8, -2], [-8, 2]], '#1e1e26'); disc(0, 0, 3, '#2b2b33'); disc(3, -1, 2, '#2b2b33');
  poly([[4.5, -1.5], [7.5, -0.8], [4.5, 0]], '#ffc83d'); rect(3, -2, 1, 1, eye);
  L.restore();
}
function starShape(x, y, r, c, rot = 0) { const pts = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - 1.571 + rot, rr = i % 2 ? r * 0.42 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } poly(pts, c); }
function starfield(a, seed = 1) { if (a <= 0) return; for (let i = 0; i < 40; i++) withA(a * (0.4 + 0.6 * rnd(seed * 50 + i)), () => rect(rnd(seed + i) * W, rnd(seed * 3 + i) * 80, 1, 1, '#ffffff')); }

const F_GUN = [
  {
    w: 'f_storm', skill: '산탄 폭풍', desc: '쾅쾅쾅! 나팔 총구에서 불꽃 산탄이 부채꼴로 다섯 번 쏟아진다. 마지막 한 발은 불기둥째 뿜어 적을 멀리 날린다.',
    p: (() => {
      const bl = Array.from({ length: 5 }, (_, i) => 1.1 + i * 0.16), fin = 2.05;
      const cone = (t, tb, big) => {
        const age = t - tb; if (age < 0 || age > 0.16) return; const k = age / 0.16, [mx, my] = [MUZ.x, MUZ.y], len = big ? 260 : 170, h = big ? 55 : 32;
        lighter(() => withA(1 - k, () => {
          withA(0.35, () => poly([[mx, my], [mx + len, my - h], [mx + len * 1.05, my], [mx + len, my + h]], '#ff7a2a'));
          withA(0.6, () => poly([[mx, my], [mx + len * 0.7, my - h * 0.45], [mx + len * 0.75, my], [mx + len * 0.7, my + h * 0.45]], '#ffe27a'));
          poly([[mx, my], [mx + len * 0.4, my - 3], [mx + len * 0.45, my], [mx + len * 0.4, my + 3]], '#ffffff');
          for (let j = 0; j < (big ? 18 : 11); j++) { const ang = (rnd(tb * 100 + j) - 0.5) * (big ? 0.5 : 0.38), l2 = len * (0.7 + rnd(j * 7 + tb * 10) * 0.5); line(mx + Math.cos(ang) * l2 * k, my + Math.sin(ang) * l2 * k, mx + Math.cos(ang) * l2 * Math.min(1, k + 0.35), my + Math.sin(ang) * l2 * Math.min(1, k + 0.35), 1.2, '#fff2a8'); }
        }));
      };
      const MUZ = { x: 160, y: 85 };
      return build({
        w: 'f_storm', dur: 3.6, base: 0.35,
        acts: [...bl.map(t => [t, 'shoot']), [fin, 'shoot']],
        hits: [...bl.flatMap(t => hitsAt(t + 0.03, 8, { kb: 3, small: true, stagger: 0.01 })), ...hitsAt(fin + 0.04, 42, { crit: true, kb: 10 })],
        st: stAll('bleed', 1.13, 2.9),
        shake: t => { if (inW(t, fin, fin + 0.18)) return 3.5; for (const b of bl) if (inW(t, b, b + 0.07)) return 1.8; return 0; },
        back: t => { stage(t, 0.95, 2.7, '#0f0600', 0.4, '#ff6a1a'); charge(t, 0.95, 1.12, '#ffb347'); },
        front(t, S) {
          MUZ.x = S.tip[0]; MUZ.y = S.tip[1];
          for (const b of bl) { cone(t, b, false); flare(MUZ.x + 4, MUZ.y, 11, '#ffb347', pulse(t, b, b + 0.08)); smoke(t, b + 0.02, MUZ.x + 12, MUZ.y, 14, 5, Math.round(b * 100), '#6a5a5a', 0.8, [20, -14], 0.45); for (let e = 0; e < 4; e++) flare(S.x[e], S.y[e], 4, '#ff7a2a', pulse(t, b + 0.03, b + 0.1)); }
          cone(t, fin, true);
          if (inW(t, fin, fin + 0.08)) flash(0.3, '#ffe0b0');
          flare(MUZ.x + 6, MUZ.y, 22, '#ff9a3c', pulse(t, fin, fin + 0.15));
          lighter(() => withA(pulse(t, fin, fin + 0.35), () => ring(MUZ.x + 6, MUZ.y, 8 + prog(t, fin, fin + 0.35) * 40, 2, '#ffe27a', 1.4)));
          sparks(t, fin, MUZ.x + 10, MUZ.y, 24, 7, 260, '#ffe27a', 0.5, 0, 0.9, 40);
          smoke(t, fin + 0.03, MUZ.x + 30, MUZ.y, 30, 9, 77, '#5a4a4a', 1.1, [30, -18], 0.5);
          for (let e = 0; e < 4; e++) sparks(t, fin + 0.04, S.x[e], S.y[e], 6, e * 9, 90, '#ff5e6c', 0.35, 0, 1.4);
        },
      });
    })(),
  },
  {
    w: 'f_star', skill: '유성우', desc: '밤하늘을 향해 한 발 쏘면 하늘에 별이 터지고, 별똥별이 적 무리 위로 쏟아진다. 마지막엔 커다란 유성이 떨어져 폭발한다.',
    p: (() => {
      const n = 16, ord = [0, 2, 1, 3], ts = i => 1.35 + i * 0.06, land = i => ts(i) + 0.26, tx = i => FAR[ord[i % 4]] + (rnd(i) - 0.5) * 14, fin = 2.45, finL = fin + 0.3;
      const meteor = (x, y, dx, dy, r, a = 1) => lighter(() => withA(a, () => { const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l; poly([[x - uy * r, y + ux * r], [x - ux * r * 14, y - uy * r * 14], [x + uy * r, y - ux * r]], '#ffb347'); poly([[x - uy * r * 0.5, y + ux * r * 0.5], [x - ux * r * 9, y - uy * r * 9], [x + uy * r * 0.5, y - ux * r * 0.5]], '#fff7c2'); glow(x, y, r * 4, '#ffe27a', 0.9); disc(x, y, r, '#ffffff'); }));
      return build({
        w: 'f_star', dur: 3.9, base: 0.35,
        acts: [[1.05, 'shootUp']],
        hits: [...Array.from({ length: n }, (_, i) => [land(i), ord[i % 4], 9, { small: true }]), ...hitsAt(finL, 55, { crit: true, lift: 10, kb: 4 })],
        shake: t => (inW(t, finL, finL + 0.2) ? 3.5 : 0),
        back(t) { const a = fade(t, 0.95, 3.1, 0.3); stage(t, 0.95, 3.1, '#02041a', 0.6, '#3a4aaa'); starfield(a, 3); charge(t, 0.95, 1.1, '#fff09a'); },
        front(t, S) {
          if (inW(t, 1.05, 1.14)) { const k = prog(t, 1.05, 1.11); lighter(() => { line(S.tip[0], S.tip[1], lerp(S.tip[0], 250, k), lerp(S.tip[1], -10, k), 2.5, '#fff2a8'); line(S.tip[0], S.tip[1], lerp(S.tip[0], 250, k), lerp(S.tip[1], -10, k), 1, '#ffffff'); }); }
          flare(236, 10, 18, '#ffe27a', fade(t, 1.12, 1.45, 0.05)); rays(236, 10, 6, 60 * eo(prog(t, 1.12, 1.4)), 16, 5, 2, '#fff09a', pulse(t, 1.12, 1.45));
          for (let i = 0; i < n; i++) {
            const e = ord[i % 4], x1 = tx(i), y1 = S.y[e], x0 = x1 + 80, y0 = -14;
            if (inW(t, ts(i), land(i))) { const k = ei(prog(t, ts(i), land(i))); meteor(lerp(x0, x1, k), lerp(y0, y1, k), -80, y1 + 14, 1.6); }
            flare(x1, y1, 7, '#ffe27a', pulse(t, land(i), land(i) + 0.14));
            rays(x1, y1, 3, 22 * eo(prog(t, land(i), land(i) + 0.2)), 8, i * 5, 1.2, '#fff09a', pulse(t, land(i), land(i) + 0.22));
            sparks(t, land(i), x1, y1, 5, i * 9, 70, '#fff7c2', 0.3);
          }
          if (inW(t, fin, finL)) { const k = ei(prog(t, fin, finL)); meteor(lerp(CXF + 160, CXF, k), lerp(-40, 84, k), -160, 124, 5); }
          if (inW(t, finL, finL + 0.1)) flash(0.4, '#fff4d0');
          flare(CXF, 86, 26, '#ffb347', pulse(t, finL, finL + 0.25));
          rays(CXF, 86, 10, 130 * eo(prog(t, finL, finL + 0.3)), 24, 31, 3.5, '#ffe27a', pulse(t, finL, finL + 0.35));
          lighter(() => withA(pulse(t, finL, finL + 0.5), () => ring(CXF, GROUND, 10 + prog(t, finL, finL + 0.5) * 120, 3, '#ffe27a', 0.15)));
          shards(t, finL, CXF, 90, 16, 33, 150, '#fff09a', 0.8, 3, -Math.PI / 2, 2.4);
          smoke(t, finL + 0.05, CXF, 86, 30, 9, 35, '#3a3450', 1.2, [0, -18], 0.55);
        },
      });
    })(),
  },
  {
    w: 'f_crow', skill: '까마귀 떼', desc: '총성과 함께 까마귀 떼가 날아올라 적을 할퀴고 지나간다. 마지막엔 거대한 까마귀 그림자가 날개를 펼쳐 화면을 가르고 지나간다.',
    p: (() => {
      const MZ = [168, 85], ord = [0, 1, 2, 3, 1, 2, 0, 3, 2, 1, 3, 0];
      const C = ord.map((e, i) => { const tr = 1.05 + i * 0.05, A = [FAR[e] - 22 + (rnd(i) - 0.5) * 12, 36 + (i % 3) * 10], t1 = tr + Math.hypot(A[0] - MZ[0], A[1] - MZ[1]) / 280, t2 = t1 + 0.12; return { e, i, tr, A, t1, t2, t3: t2 + 0.5 }; });
      const pos = (c, t) => { if (t < c.t1) { const k = prog(t, c.tr, c.t1); return [lerp(MZ[0], c.A[0], k), lerp(MZ[1], c.A[1], k) + Math.sin(k * 9 + c.i) * 5]; } if (t < c.t2) { const k = ei(prog(t, c.t1, c.t2)); return [lerp(c.A[0], FAR[c.e], k), lerp(c.A[1], GROUND - 12, k)]; } const k = eo(prog(t, c.t2, c.t3)); return [lerp(FAR[c.e], FAR[c.e] + 80, k), lerp(GROUND - 12, -14, k)]; };
      const fin = 2.25, gx = t => lerp(-80, W + 80, prog(t, fin, fin + 0.55));
      const claw = (t, t0, x, y, seed) => { for (let j = 0; j < 3; j++) slash({ cx: x + (j - 1) * 4, cy: y, rx: 12, ry: 3, rot: -0.9, a0: -1.4, a1: 1.4, w: 2.4, t0: t0 + j * 0.015, dur: 0.25, ink: '#1a0205', mid: '#ff4d5e', hot: '#ff1a3a', smokeHex: null }, t); };
      return build({
        w: 'f_crow', dur: 3.8, base: 0.35,
        acts: [[1.0, 'shoot']],
        hits: [...C.map(c => [c.t2, c.e, 11, { small: true, kb: 2 }]), ...ALL.map(e => [lerp(fin, fin + 0.55, (FAR[e] + 80) / (W + 160)), e, 48, { crit: true, kb: 5 }])],
        st: ALL.map(e => [e, 'bleed', Math.min(...C.filter(c => c.e === e).map(c => c.t2)), 3.2]),
        back(t) {
          stage(t, 0.9, 3.0, '#0f0205', 0.55, '#8a0a1a'); charge(t, 0.9, 1.05, '#ff4d5e');
          if (inW(t, fin, fin + 0.6)) { const x = gx(t), f = Math.sin(t * 14) * 10; layer(0.75, () => { poly([[x - 10, 60], [x - 90, 10 + f], [x - 60, 40], [x - 110, 50 + f * 0.5], [x - 40, 64], [x + 10, 68]], '#07020a'); poly([[x - 10, 66], [x - 70, 100 - f], [x - 30, 78]], '#07020a'); disc(x + 6, 62, 12, '#07020a'); disc(x + 18, 56, 8, '#07020a'); poly([[x + 24, 54], [x + 40, 58], [x + 24, 62]], '#1a0a0a'); }); lighter(() => { glow(x + 20, 54, 12, '#ff1a3a', 0.9); disc(x + 20, 54, 2, '#ffffff'); }); }
        },
        front(t, S) {
          for (const c of C) {
            if (inW(t, c.tr, c.t3)) { const [x, y] = pos(c, t); lighter(() => { glow(x, y, 16, '#ff1a3a', 0.45); glow(x + 7, y - 3, 6, '#ff1a3a', 0.9); }); crowAt(x, y, t, c.i); }
            claw(t, c.t2, FAR[c.e], GROUND - 14, c.i);
            const age = t - c.t2; if (age >= 0 && age < 0.8) for (let j = 0; j < 3; j++) withA(1 - age / 0.8, () => { L.save(); L.translate(FAR[c.e] + (rnd(c.i * 5 + j) - 0.5) * 24 + Math.sin(age * 8 + j) * 4, GROUND - 26 + age * 30 + j * 3); L.rotate(age * 5 + j); poly([[0, -2.5], [0.8, 0], [0, 2.5], [-0.8, 0]], '#1e1e26'); L.restore(); });
          }
          if (inW(t, fin, fin + 0.6)) slash({ cx: 240, cy: 74, rx: 190, ry: 20, rot: -0.05, a0: -1.45, a1: 1.45, w: 13, t0: fin + 0.05, dur: 0.55, ink: '#07020a', mid: '#d0102a', hot: '#ff4d5e', grow: 0.4 }, t);
          for (let e = 0; e < 4; e++) { const th = lerp(fin, fin + 0.55, (FAR[e] + 80) / (W + 160)); flare(S.x[e], S.y[e], 9, '#ff1a3a', pulse(t, th, th + 0.14)); sparks(t, th, S.x[e], S.y[e], 8, e * 5, 90, '#ff4d5e', 0.4); }
        },
      });
    })(),
  },
  {
    w: 'f_raijin', skill: '연쇄 번개탄', desc: '번개탄이 첫 적을 맞히면 번개가 적에서 적으로 튀며 발밑에 마법진을 새긴다. 마지막엔 마법진마다 벼락 기둥이 솟는다.',
    p: (() => {
      const hit0 = 1.14, ch = e => hit0 + e * 0.09, fin = 1.85;
      return build({
        w: 'f_raijin', dur: 3.6, base: 0.35,
        acts: [[1.0, 'shoot']],
        hits: [...ALL.map(e => [ch(e), e, e ? 20 : 24, {}]), ...hitsAt(fin + 0.03, 52, { crit: true, lift: 8 })],
        st: ALL.map(e => [e, 'shock', ch(e), 2.8]),
        shake: t => (inW(t, fin, fin + 0.22) ? 3 : 0),
        back: t => { stage(t, 0.9, 2.8, '#02040f', 0.52, '#1a5aff'); charge(t, 0.9, 1.02, '#7fe0ff'); for (let e = 0; e < 4; e++) circle(FAR[e], GROUND, 16, t, '#7fe0ff', fade(t, ch(e), fin + 0.35, 0.08), 0.25, 2); },
        front(t, S) {
          if (inW(t, 1.0, hit0)) { const k = prog(t, 1.0, hit0), x = lerp(S.tip[0], S.x[0], k), y = S.tip[1]; lighter(() => { glow(x, y, 14, '#7fe0ff', 0.9); disc(x, y, 3.5, '#ffffff'); withA(0.7, () => ring(x, y, 6, 1, '#7fe0ff', 1.4, t * 20)); }); zap(S.tip[0], y, x, y, Math.floor(t * 30), 0.8, '#7fe0ff', 6); }
          for (let c = 0; c < 4; c++) { flare(S.x[c], S.y[c], 9, '#7fe0ff', pulse(t, ch(c), ch(c) + 0.14)); if (c < 3 && inW(t, ch(c), 1.75)) zap(S.x[c], S.y[c], S.x[c + 1], S.y[c + 1], Math.floor(t * 18) + c * 7, 1.6, '#7fe0ff', 14); sparks(t, ch(c), S.x[c], S.y[c], 8, c * 3, 100, '#bfeaff', 0.35); }
          if (inW(t, fin - 0.12, fin)) for (let e = 0; e < 4; e++) lighter(() => withA(prog(t, fin - 0.12, fin), () => rect(S.x[e] - 1, -10, 2, GROUND + 10, '#bfeaff')));
          if (inW(t, fin, fin + 0.35)) {
            const k = prog(t, fin, fin + 0.35), a = 1 - k;
            for (let e = 0; e < 4; e++) { lighter(() => withA(a, () => { const g = L.createLinearGradient(S.x[e] - 10, 0, S.x[e] + 10, 0); g.addColorStop(0, rgba('#1a5aff', 0)); g.addColorStop(0.5, rgba('#bfeaff', 0.9)); g.addColorStop(1, rgba('#1a5aff', 0)); L.fillStyle = g; L.fillRect(S.x[e] - 10, -10, 20, GROUND + 10); })); zap(S.x[e] + (rnd(e) - 0.5) * 10, -10, S.x[e], GROUND - 4, Math.floor(t * 30) + e, 2.6, '#7fe0ff', 18); }
            if (k < 0.25) flash(0.3 * (1 - k * 4), '#e8f4ff');
          }
          for (let e = 0; e < 4; e++) { rays(FAR[e], GROUND - 6, 4, 50 * eo(prog(t, fin, fin + 0.3)), 10, e * 11, 1.8, '#7fe0ff', pulse(t, fin, fin + 0.35)); sparks(t, fin, FAR[e], GROUND - 4, 10, e * 13, 150, '#bfeaff', 0.5, -Math.PI / 2, 1.6); }
        },
      });
    })(),
  },
  {
    w: 'f_bubble', skill: '거품 감옥', desc: '무지갯빛 비눗방울이 적을 하나씩 가둬 둥실 띄운다. 방울이 반짝이며 터지면 적이 떨어지고, 하늘에서 커다란 방울이 한 번 더 터진다.',
    p: (() => {
      const tl = e => 1.0 + e * 0.07, ta = e => tl(e) + 0.35, tp = e => 2.2 + e * 0.07, tland = e => tp(e) + 0.16, fin = 2.7;
      const floatDy = (e, t) => -20 * eo(prog(t, ta(e), ta(e) + 0.6)) + Math.sin(t * 4 + e) * 2 * prog(t, ta(e), ta(e) + 0.3);
      const bub = (x, y, r, t) => { withA(0.2, () => disc(x, y, r, '#c8f0ff')); const hues = ['#ff9ed6', '#ffe27a', '#8fe07a', '#6fd3ff', '#b48cff']; hues.forEach((h, i) => { L.strokeStyle = rgba(h, 0.85); L.lineWidth = 1; L.beginPath(); L.arc(x, y, Math.max(0.2, r), t * 1.5 + i * 1.256, t * 1.5 + i * 1.256 + 1.1); L.stroke(); }); withA(0.9, () => ring(x, y, r - 0.6, 0.6, '#ffffff')); L.strokeStyle = 'rgba(255,255,255,0.95)'; L.lineWidth = 1.4; L.beginPath(); L.arc(x, y, Math.max(0.2, r - 3), 3.7, 4.5); L.stroke(); disc(x - r * 0.45, y - r * 0.5, 1.2, '#ffffff'); };
      return build({
        w: 'f_bubble', dur: 3.9, base: 0.35,
        acts: [[1.0, 'shoot']],
        hits: [...ALL.flatMap(e => [[tp(e), e, 25, {}], [tland(e), e, 10, { small: true }]]), ...hitsAt(fin + 0.02, 30, { crit: true })],
        st: ALL.map(e => [e, 'held', ta(e), tland(e)]),
        move(e, t) { if (inW(t, ta(e), tp(e))) return { dy: floatDy(e, t), dx: Math.sin(t * 3 + e) * 1.5 }; if (inW(t, tp(e), tland(e))) return { dy: floatDy(e, tp(e)) * (1 - ei(prog(t, tp(e), tland(e)))) }; return {}; },
        back: t => { stage(t, 0.9, 3.2, '#0a1030', 0.3, '#ff9ed6'); charge(t, 0.9, 1.02, '#bfeaff'); },
        front(t, S) {
          for (let e = 0; e < 4; e++) {
            if (inW(t, tl(e), ta(e))) { const k = prog(t, tl(e), ta(e)); bub(lerp(S.tip[0], S.x[e], k), lerp(S.tip[1], S.y[e], k) + Math.sin(k * 12) * 3, 6, t); }
            else if (inW(t, ta(e), tp(e))) { bub(S.x[e], S.y[e], 6 + 12 * eo(prog(t, ta(e), ta(e) + 0.12)), t); lighter(() => star4(S.x[e] + Math.cos(t * 3 + e) * 14, S.y[e] + Math.sin(t * 3 + e) * 12, 1.6 + Math.sin(t * 10 + e), '#ffffff')); }
            const age = t - tp(e);
            if (age >= 0 && age < 0.25) lighter(() => withA(1 - age / 0.25, () => { ring(S.x[e], S.y[e], 18 + age * 70, 1.2, '#ffffff'); ring(S.x[e], S.y[e], 14 + age * 50, 1, '#ff9ed6'); }));
            flare(S.x[e], S.y[e], 8, '#bfeaff', pulse(t, tp(e), tp(e) + 0.12));
            for (let j = 0; j < 7; j++) { const a2 = t - tp(e); if (a2 < 0 || a2 > 0.9) continue; const ang = rnd(e * 17 + j) * 6.28, v = 30 + rnd(j * 3 + e) * 40; bub(S.x[e] + Math.cos(ang) * v * eo(Math.min(1, a2 * 2)), S.y[e] + Math.sin(ang) * v * 0.6 * eo(Math.min(1, a2 * 2)) - a2 * 16, 2.5 * (1 - a2 / 0.9) + 0.5, t); }
          }
          if (inW(t, 2.35, fin)) { const k = prog(t, 2.35, fin); bub(CXF, lerp(40, 30, k), 12 + 16 * eo(k), t); }
          if (inW(t, fin, fin + 0.08)) flash(0.25, '#f0f8ff');
          lighter(() => { const k = prog(t, fin, fin + 0.45); withA(pulse(t, fin, fin + 0.45), () => ['#ff9ed6', '#ffe27a', '#8fe07a', '#6fd3ff', '#b48cff'].forEach((h, i) => ring(CXF, 30, 28 + k * 90 + i * 4, 2, h, 0.6))); });
          for (let i = 0; i < 30; i++) { const a2 = t - fin; if (a2 < 0 || a2 > 1.2) continue; const x = CXF + (rnd(i) - 0.5) * 220, y = 30 + a2 * (60 + rnd(i * 3) * 40); lighter(() => withA(1 - a2 / 1.2, () => star4(x, y, 1.8, ['#ff9ed6', '#ffe27a', '#6fd3ff', '#ffffff'][i % 4]))); }
        },
      });
    })(),
  },
  {
    w: 'f_galaxy', skill: '은하 레일', desc: '화면이 우주로 바뀌고 총구 앞 마법진에 별빛이 모인다. 은하를 품은 거대한 광선이 화면 끝까지 꿰뚫고, 끝에서 초신성처럼 터진다.',
    p: (() => {
      const c0 = 1.0, fire = 1.55, end = 2.3, hits = [];
      for (let tk = fire + 0.03; tk < end - 0.1; tk += 0.1) hits.push(...hitsAt(tk, 14, { small: true, kb: 2 }));
      return build({
        w: 'f_galaxy', dur: 3.8, base: 0.35,
        acts: [[c0, 'raise', fire - c0 - 0.05], [fire, 'shoot']],
        hits: [...hits, ...hitsAt(end, 40, { crit: true, kb: 6 })],
        shake: t => (inW(t, fire, fire + 0.25) ? 2.5 : inW(t, end, end + 0.2) ? 3 : 0),
        hero: t => ({ dx: t >= fire ? -6 * (1 - eo(prog(t, fire, fire + 0.4))) : inW(t, c0, fire) ? rnd(Math.floor(t * 40)) - 0.5 : 0 }),
        back(t) {
          const a = fade(t, 0.95, 2.9, 0.25); stage(t, 0.95, 2.9, '#03010f', 0.68, '#4a1a9a'); starfield(a, 7);
          lighter(() => { glow(360, 40, 90, '#8a3ad0', 0.35 * a); glow(300, 60, 60, '#3a6aff', 0.25 * a); });
        },
        front(t, S) {
          const [mx, my] = [S.tip[0] + 2, S.tip[1]];
          if (inW(t, c0, fire)) {
            const k = prog(t, c0, fire);
            circle(mx + 6, my, 6 + k * 8, t * 2, '#b48cff', fade(t, c0, fire + 0.1, 0.1), 1.6, 2);
            lighter(() => glow(mx, my, 3 + 12 * k, '#d0c4ff', 0.9));
            for (let i = 0; i < 28; i++) { const q = prog(t, c0 + i * 0.015, c0 + 0.3 + i * 0.015); if (q <= 0 || q >= 1) continue; const a2 = rnd(i) * 6.28, r = 44 * (1 - ei(q)); lighter(() => { line(mx + Math.cos(a2) * r, my + Math.sin(a2) * r, mx + Math.cos(a2) * (r + 6), my + Math.sin(a2) * (r + 6), 1, i % 2 ? '#7fe0ff' : '#b48cff'); }); }
          }
          if (inW(t, fire, end)) {
            const th = t < fire + 0.06 ? 30 : 20 * (1 - ei(prog(t, end - 0.3, end))), y = my + Math.sin(t * 40) * 0.8;
            lighter(() => {
              const g = L.createLinearGradient(0, y - th, 0, y + th); g.addColorStop(0, rgba('#6a2ad0', 0)); g.addColorStop(0.3, rgba('#8a4af0', 0.6)); g.addColorStop(0.5, rgba('#ffffff', 1)); g.addColorStop(0.7, rgba('#7fe0ff', 0.6)); g.addColorStop(1, rgba('#3a6aff', 0));
              L.fillStyle = g; L.fillRect(mx, y - th, W, th * 2);
              rect(mx, y - th * 0.14, W, th * 0.28, '#ffffff');
              for (let j = 0; j < 2; j++) { L.strokeStyle = j ? '#7fe0ff' : '#ff9ef0'; L.lineWidth = 1.2; L.beginPath(); for (let x = mx; x < W; x += 3) { const yy = y + Math.sin(x * 0.08 - t * 40 + j * 3.14) * th * 0.55; x === mx ? L.moveTo(x, yy) : L.lineTo(x, yy); } L.stroke(); }
              for (let i = 0; i < 6; i++) { const rx = mx + ((t - fire) * 700 + i * 70) % (W - mx); withA(0.7, () => ring(rx, y, 3, 1, '#d0c4ff', th * 0.3)); }
              for (let i = 0; i < 20; i++) star4(mx + ((t * 800 + rnd(i) * W) % (W - mx)), y + (rnd(i * 3) - 0.5) * th * 1.2, 1.8, '#ffffff');
            });
            flare(mx + 4, y, 20, '#b48cff', 0.9);
          }
          if (inW(t, fire, fire + 0.08)) flash(0.35, '#f0e8ff');
          if (inW(t, end, end + 0.1)) flash(0.3, '#f0e8ff');
          flare(420, my, 34, '#b48cff', pulse(t, end, end + 0.3));
          rays(420, my, 10, 150 * eo(prog(t, end, end + 0.35)), 28, 9, 3.5, '#d0c4ff', pulse(t, end, end + 0.4));
          lighter(() => withA(pulse(t, end, end + 0.6), () => { ring(420, my, 10 + prog(t, end, end + 0.6) * 140, 3, '#7fe0ff', 0.5); ring(420, my, 6 + prog(t, end, end + 0.6) * 100, 2, '#ff9ef0', 0.5); }));
          sparks(t, end, 420, my, 26, 19, 220, '#d0c4ff', 0.6);
        },
      });
    })(),
  },
];
