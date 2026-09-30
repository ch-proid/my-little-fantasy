'use strict';
// =====================================================================
// 판타지아 검 6종. 흐름: 준비(무대·마법진) → 터짐(번쩍·섬광) → 연타(세 겹 칼자국) → 흩어짐(연기·가루)
// =====================================================================
const NEAR = PACK.near, CXN = 206;

function holySword(cx, tipY, s = 1.3) {
  const q = v => v * s, top = tipY - q(86);
  poly([[cx - q(7), top], [cx + q(7), top], [cx + q(7), tipY - q(14)], [cx, tipY], [cx - q(7), tipY - q(14)]], '#fffaf0');
  poly([[cx + q(1), top], [cx + q(7), top], [cx + q(7), tipY - q(14)], [cx, tipY]], '#ffe9a8');
  rect(cx - q(1.2), top + q(4), q(2.4), q(66), '#ffc83d');
  const wing = [[cx - q(6), top - q(2)], [cx - q(26), top - q(14)], [cx - q(20), top - q(6)], [cx - q(27), top - q(4)], [cx - q(18), top + q(2)], [cx - q(6), top + q(3)]];
  poly(wing, '#fff7e0'); poly(wing.map(([x, y]) => [2 * cx - x, y]), '#fff7e0');
  rect(cx - q(9), top - q(4), q(18), q(6), '#ffc83d'); rect(cx - q(3.5), top - q(22), q(7), q(18), '#8a5a2b');
  disc(cx, top - q(26), q(6), '#ffc83d'); disc(cx, top - q(26), q(2.6), '#ff5e6c');
}

const F_SWORD = [
  {
    w: 'f_musang', skill: '검기 난무', desc: '칼이 금빛으로 달아오르며 검기 여섯 줄이 X자로 엇갈려 쏟아진다. 마지막에 화면을 가로지르는 거대한 검기가 한 번 더 벤다.',
    p: (() => {
      const n = 6, ts = Array.from({ length: n }, (_, i) => 1.2 + i * 0.09), fin = 1.85;
      const arcs = ts.map((t0, i) => ({ cx: CXN + (rnd(i * 3) - 0.5) * 30, cy: 78 + (rnd(i * 5) - 0.5) * 8, rx: 64, ry: 14, rot: (i % 2 ? 0.42 : -0.42) + (rnd(i) - 0.5) * 0.2, a0: i % 2 ? 1.4 : -1.4, a1: i % 2 ? -1.4 : 1.4, w: 9, t0, dur: 0.32, ink: '#3a2205', mid: '#ffc83d', hot: '#ffb347' }));
      const big = { cx: 210, cy: 80, rx: 150, ry: 26, rot: -0.08, a0: -1.45, a1: 1.45, w: 18, t0: fin, dur: 0.5, ink: '#3a2205', mid: '#ffd24d', hot: '#ff9a3c' };
      return build({
        w: 'f_musang', dur: 3.6, base: 0.3,
        acts: [[0.95, 'raise', 0.22], ...ts.map(t => [t, 'swing']), [fin, 'swing']],
        hits: [...ts.flatMap(t => hitsAt(t + 0.03, 11, { small: true, kb: 1 })), ...hitsAt(fin + 0.03, 38, { crit: true, kb: 6 })],
        shake: t => (inW(t, fin, fin + 0.15) ? 3 : inW(t, 1.2, 1.7) ? 1 : 0),
        back: t => { stage(t, 0.95, 2.5, '#0a0600', 0.42, '#5a3a00'); charge(t, 0.95, 1.3, '#ffc83d'); },
        front(t) {
          const sa = fade(t, 1.15, 1.8, 0.1);
          if (sa > 0) lighter(() => { for (let i = 0; i < 10; i++) { const y = 40 + rnd(i) * 60, x = ((t * 900 + rnd(i * 3) * W) % (W + 80)) - 40; withA(sa * 0.5, () => line(x, y, x + 30, y, 0.8, '#ffe27a')); } });
          for (const a of arcs) slash(a, t);
          slash(big, t);
          if (inW(t, fin, fin + 0.1)) flash(0.35 * (pulse(t, fin, fin + 0.1)), '#fff4d0');
          rays(CXN, 82, 10, 110 * eo(prog(t, fin, fin + 0.3)), 22, 3, 3, '#ffe27a', pulse(t, fin, fin + 0.35));
          shards(t, fin + 0.02, CXN, 82, 14, 5, 120, '#ffe27a', 0.7, 3);
          for (let e = 0; e < 4; e++) flare(NEAR[e], GROUND - 12, 9, '#ffc83d', pulse(t, fin + 0.03, fin + 0.15));
        },
      });
    })(),
  },
  {
    w: 'f_dawn', skill: '천공낙검', desc: '하늘이 열리고 빛의 거대한 검이 마법진 한가운데 내리꽂힌다. 충격파와 빛기둥이 모든 적을 기절시키고, 검은 깃털처럼 흩어진다.',
    p: build({
      w: 'f_dawn', dur: 3.8, base: 0.3,
      acts: [[0.95, 'raise', 0.5], [1.48, 'swing']],
      hits: [...hitsAt(1.49, 88, { crit: true, lift: 8 }), ...hitsAt([1.72, 1.92, 2.12], 16, { small: true })],
      st: stAll('stun', 1.49, 2.7),
      shake: t => (inW(t, 1.48, 1.68) ? 3.5 : 0),
      back(t) {
        stage(t, 0.9, 2.8, '#0a0820', 0.5, '#ffd24d'); charge(t, 0.9, 1.45, '#ffe27a');
        circle(CXN, GROUND, 46, t, '#ffe27a', fade(t, 0.98, 2.5, 0.15), 0.2, 0.8);
        const ca = fade(t, 1.0, 1.5, 0.1);
        if (ca > 0) lighter(() => { withA(ca * (0.6 + 0.3 * Math.sin(t * 40)), () => { rect(CXN - 5, -10, 10, GROUND + 10, rgba('#ffe27a', 0.35)); rect(CXN - 1.5, -10, 3, GROUND + 10, '#ffffff'); }); glow(CXN, 0, 60, '#fff7c2', ca * 0.6); });
      },
      front(t) {
        for (let i = 0; i < 14; i++) { const a = fade(t, 1.0 + i * 0.05, 3.2, 0.2), y = ((t - 1) * 18 + rnd(i) * 110) % 115 - 5, x = 60 + rnd(i * 5) * 340 + Math.sin(t * 2 + i) * 6; withA(a * 0.9, () => { L.save(); L.translate(x, y); L.rotate(Math.sin(t * 3 + i) * 0.8); poly([[0, -3], [1.2, 0], [0, 3], [-1.2, 0]], '#fffaf0'); L.restore(); }); }
        if (inW(t, 1.3, 2.9)) {
          const tipY = lerp(-100, 98, ei(prog(t, 1.3, 1.48))), a = 1 - prog(t, 2.4, 2.9);
          if (t < 1.48) lighter(() => withA(0.5, () => rect(CXN - 9, tipY - 200, 18, 120, rgba('#fff7c2', 0.4))));
          lighter(() => glow(CXN, tipY - 50, 60, '#ffe27a', 0.55 * a * (0.8 + 0.2 * Math.sin(t * 8))));
          withA(a, () => holySword(CXN, tipY));
          for (let i = 0; i < 24; i++) { const k = prog(t, 2.4 + (i % 8) * 0.03, 2.95); if (k > 0 && k < 1) lighter(() => withA(1 - k, () => star4(CXN - 10 + rnd(i) * 20, tipY - rnd(i * 3) * 100 - k * 40, 1.6, '#fff7c2'))); }
        }
        const ia = t - 1.48;
        if (ia >= 0 && ia < 0.7) {
          const k = ia / 0.7;
          if (ia < 0.12) flash(0.55 * (1 - ia / 0.12), '#fffbe8');
          flare(CXN, 96, 26, '#ffe27a', pulse(t, 1.48, 1.7));
          rays(CXN, 95, 12, 130 * eo(k), 26, 7, 3, '#fff2a8', 1 - k);
          lighter(() => withA(1 - k, () => { ring(CXN, GROUND, 20 + k * 200, 4 * (1 - k) + 0.8, '#ffe27a', 0.14); ring(CXN, GROUND, 10 + k * 140, 2, '#ffffff', 0.14); }));
        }
        shards(t, 1.49, CXN, 94, 18, 21, 150, '#fff7c2', 0.8, 3.5, -Math.PI / 2, 2.4);
        sparks(t, 1.49, CXN, 94, 20, 23, 200, '#ffe27a', 0.6, -Math.PI / 2, 2.6);
        smoke(t, 1.5, CXN, GROUND - 2, 34, 10, 25, '#c8b88a', 0.9, [0, -6], 0.45);
      },
    }),
  },
  {
    w: 'f_sakura', skill: '꽃보라 베기', desc: '벚꽃잎 회오리가 적 무리를 휩쓸며 안에서 칼날이 쉴 새 없이 번뜩인다. 끝에 분홍 검기가 X자로 크게 엇갈린다.',
    p: (() => {
      const t0 = 1.2, t1 = 2.45, vx = t => lerp(150, 330, prog(t, t0, t1)), fin = 2.55, hits = [];
      for (let e = 0; e < 4; e++) for (let th = t0; th < t1; th += 0.09) if (Math.abs(vx(th) - NEAR[e]) < 26) hits.push([th, e, 7, { small: true, lift: 2 }]);
      const minis = Array.from({ length: 18 }, (_, i) => { const tt = t0 + i * 0.07; return { cx: vx(tt) + (rnd(i) - 0.5) * 24, cy: 62 + rnd(i * 3) * 30, rx: 18, ry: 5, rot: rnd(i * 7) * 3.14, a0: -1.4, a1: 1.4, w: 4, t0: tt, dur: 0.2, ink: '#5a0a2a', mid: '#ff8fb8', hot: '#ff5e9a' }; });
      const X = [0.36, -0.36].map((r, i) => ({ cx: 226, cy: 78, rx: 84, ry: 18, rot: r, a0: i ? 1.45 : -1.45, a1: i ? -1.45 : 1.45, w: 12, t0: fin + i * 0.06, dur: 0.45, ink: '#4a0620', mid: '#ff8fb8', hot: '#ff5e9a' }));
      const petal = (x, y, i, a = 1) => withA(a, () => { L.save(); L.translate(x, y); L.rotate(i + x * 0.05); poly([[0, -2], [1.4, 0], [0, 2], [-1.4, 0]], ['#ffb3d1', '#ffd6e8', '#ff8fb8'][i % 3]); L.restore(); });
      return build({
        w: 'f_sakura', dur: 3.7, base: 0.3,
        acts: [[0.95, 'raise', 0.22], [1.2, 'swing'], [fin, 'swing'], [fin + 0.06, 'swing']],
        hits: [...hits, ...hitsAt(fin + 0.05, 30, { crit: true, kb: 4 })],
        shake: t => (inW(t, fin, fin + 0.15) ? 2 : 0),
        back: t => { stage(t, 0.9, 3.0, '#1a0512', 0.4, '#ff5e9a'); charge(t, 0.9, 1.25, '#ff8fb8'); },
        front(t) {
          if (inW(t, 0.95, t0)) { const k = prog(t, 0.95, t0); for (let i = 0; i < 30; i++) { const a = t * 8 + i * 0.21, r = 40 * (1 - k) + 8; petal(HX + Math.cos(a) * r, 80 + Math.sin(a) * r * 0.5, i); } }
          if (inW(t, t0, t1 + 0.1)) {
            const cx = vx(t), a = fade(t, t0, t1 + 0.1, 0.1);
            lighter(() => glow(cx, 70, 40, '#ff5e9a', 0.35 * a));
            for (let j = 0; j < 7; j++) { const band = { cx, cy: 96 - j * 11, rx: 8 + j * 3.4, ry: 2.5 + j * 0.6, rot: 0, a0: t * 12 + j, a1: t * 12 + j + 3.6, w: 2.2 }; withA(a * 0.55, () => poly(arcBand(band, 0, 1, 1), j % 2 ? '#ffd6e8' : '#ff8fb8')); }
            for (let i = 0; i < 70; i++) { const h = rnd(i * 3) * 72, ang = t * 10 + rnd(i * 5) * 6.28, r = 8 + h * 0.4; petal(cx + Math.cos(ang) * r, GROUND - 2 - h + Math.sin(ang) * r * 0.15, i, a * (0.55 + 0.45 * Math.sin(ang))); }
          }
          for (const m of minis) slash(m, t);
          for (const x of X) slash(x, t);
          if (inW(t, fin, fin + 0.1)) flash(0.25, '#ffe0ee');
          rays(226, 78, 8, 90 * eo(prog(t, fin, fin + 0.3)), 18, 11, 2.5, '#ff8fb8', pulse(t, fin, fin + 0.35));
          for (let i = 0; i < 40; i++) { const age = t - fin - 0.05; if (age < 0 || age > 1.1) continue; const ang = rnd(i) * 6.28, v = 60 + rnd(i * 3) * 90; petal(226 + Math.cos(ang) * v * eo(Math.min(1, age * 2)) * 0.8, 78 + Math.sin(ang) * v * 0.5 * eo(Math.min(1, age * 2)) + age * age * 30, i, 1 - age / 1.1); }
        },
      });
    })(),
  },
  {
    w: 'f_thunder', skill: '뇌광 돌진', desc: '번개가 되어 적 무리를 꿰뚫고, 지나간 자리에 벼락이 차례로 떨어진다. 마지막엔 번개 검기가 X자로 터진다.',
    p: (() => {
      const dxAt = u => (u < 1.15 ? 0 : u < 1.28 ? 250 * ei(prog(u, 1.15, 1.28)) : u < 2.2 ? 250 : u < 2.35 ? 250 * (1 - eo(prog(u, 2.2, 2.35))) : 0);
      const dash = { cx: 250, cy: 84, rx: 132, ry: 7, rot: 0, a0: -1.5, a1: 1.5, w: 9, t0: 1.16, dur: 0.45, ink: '#0a0a2a', mid: '#fff27a', hot: '#6fd3ff', grow: 0.1 };
      const fin = 1.9, X = [0.6, -0.6].map((r, i) => ({ cx: CXN, cy: 76, rx: 72, ry: 15, rot: r, a0: i ? 1.4 : -1.4, a1: i ? -1.4 : 1.4, w: 11, t0: fin + i * 0.05, dur: 0.4, ink: '#0a0a2a', mid: '#fff7b0', hot: '#6fd3ff' }));
      return build({
        w: 'f_thunder', dur: 3.7, base: 0.3,
        acts: [[0.95, 'raise', 0.2], [1.28, 'swing'], [fin, 'swing']],
        hits: [...ALL.map(e => [1.2 + e * 0.02, e, 15, { kb: 3 }]), ...ALL.map(e => [1.42 + e * 0.07, e, 32, { crit: true }]), ...hitsAt(fin + 0.04, 45, { crit: true, kb: 5 })],
        st: stAll('shock', 1.2, 2.7),
        shake: t => (inW(t, 1.42, 1.7) ? 2 : inW(t, fin, fin + 0.15) ? 3 : 0),
        hero(t) {
          const dx = dxAt(t), trail = [];
          if (inW(t, 1.15, 1.4) || inW(t, 2.2, 2.45)) for (let j = 1; j <= 6; j++) { const d2 = dxAt(t - j * 0.022); if (Math.abs(d2 - dx) > 4) trail.push({ dx: d2, a: 0.6 - j * 0.08, tint: 'rgba(160,230,255,0.85)' }); }
          return { dx, dy: inW(t, 0.95, 1.15) ? 2 : 0, trail };
        },
        back: t => { stage(t, 0.9, 2.7, '#02040f', 0.5, '#3a6aff'); charge(t, 0.9, 1.18, '#6fd3ff'); },
        front(t) {
          if (inW(t, 0.95, 1.15)) for (let i = 0; i < 3; i++) zap(HX - 10 + i * 10, 62, HX - 6 + i * 10, 98, Math.floor(t * 30) + i, 0.8, '#fff27a', 8);
          slash(dash, t);
          const la = fade(t, 1.15, 1.6, 0.05); if (la > 0) withA(la, () => zap(HX, 84, HX + 250, 84, Math.floor(t * 20), 1.2, '#6fd3ff', 12));
          for (let e = 0; e < 4; e++) {
            const tb = 1.4 + e * 0.07;
            if (inW(t, tb, tb + 0.16)) zap(NEAR[e] + (rnd(e) - 0.5) * 24, -8, NEAR[e], GROUND - 10, Math.floor(t * 30) + e, 2.2, '#fff27a', 16);
            flare(NEAR[e], GROUND - 10, 11, '#fff27a', pulse(t, tb, tb + 0.18));
            lighter(() => withA(pulse(t, tb, tb + 0.4), () => ring(NEAR[e], GROUND, 6 + prog(t, tb, tb + 0.4) * 22, 1.5, '#6fd3ff', 0.25)));
            sparks(t, tb, NEAR[e], GROUND - 6, 10, e * 7 + 3, 110, '#fff7b0', 0.4, -Math.PI / 2, 2.4);
          }
          if (inW(t, 1.4, 1.46)) flash(0.18, '#e8f4ff');
          for (const x of X) slash(x, t);
          if (inW(t, fin, fin + 0.08)) flash(0.3, '#e8f4ff');
          rays(CXN, 76, 8, 100 * eo(prog(t, fin, fin + 0.3)), 20, 13, 2.5, '#6fd3ff', pulse(t, fin, fin + 0.35));
        },
      });
    })(),
  },
  {
    w: 'f_moon', skill: '그림자 분신', desc: '달이 뜨고 화면이 어둠에 잠긴다. 분신 셋이 적 머리 위에 나타나 먹빛 칼자국을 X자로 네 번 긋고, 마지막에 모두가 함께 크게 벤다.',
    p: (() => {
      const waves = [1.3, 1.45, 1.6, 1.75], fin = 2.02;
      const W4 = waves.flatMap((t0, i) => [0.38, -0.38].map((r, j) => ({ cx: CXN + (rnd(i * 2 + j) - 0.5) * 20, cy: 76, rx: 86, ry: 20, rot: r + (rnd(i * 7 + j) - 0.5) * 0.2, a0: j ? 1.45 : -1.45, a1: j ? -1.45 : 1.45, w: 10, t0: t0 + j * 0.04, dur: 0.36, ink: '#07020f', mid: '#c040ff', hot: '#ff5ee0', smokeHex: '#1a0a2a' })));
      const big = { cx: 214, cy: 80, rx: 160, ry: 30, rot: 0.05, a0: -1.45, a1: 1.45, w: 17, t0: fin, dur: 0.55, ink: '#07020f', mid: '#b040ff', hot: '#ff5ee0', smokeHex: '#1a0a2a' };
      const puff = (t, t0, x, y) => { smoke(t, t0, x, y, 14, 8, Math.round(x), '#1a0a2a', 0.5, [0, -8], 0.9); smoke(t, t0, x, y, 10, 5, Math.round(x) + 3, '#8a3ad0', 0.4, [0, -10], 0.6); };
      return build({
        w: 'f_moon', dur: 3.9, base: 0.3,
        acts: [...waves.map(t => [t, 'swing']), [fin, 'swing']],
        hits: [...waves.flatMap(t => hitsAt(t + 0.04, 18, { small: true, kb: 1 })), ...hitsAt(fin + 0.04, 60, { crit: true, kb: 5 })],
        st: stAll('curse', 1.34, 2.9),
        shake: t => (inW(t, fin, fin + 0.15) ? 3 : 0),
        back(t) {
          stage(t, 0.9, 2.9, '#07020f', 0.62, '#4a1a7a');
          const ma = fade(t, 0.95, 2.9, 0.3);
          if (ma > 0) { lighter(() => glow(400, 32, 50, '#b48cff', 0.4 * ma)); layer(ma * 0.9, () => { disc(400, 32 - 6 * eo(prog(t, 0.95, 1.5)), 20, '#e2d2ff'); L.globalCompositeOperation = 'destination-out'; disc(409, 26 - 6 * eo(prog(t, 0.95, 1.5)), 18, '#000000'); }); }
          charge(t, 0.95, 1.25, '#b048ff');
        },
        front(t, S) {
          const ca = fade(t, 1.1, 2.25, 0.06);
          for (const c of [1, 2, 3]) {
            let deg = 45; for (const w of [...waves, fin]) if (inW(t, w - 0.08, w + 0.16)) deg = t < w ? -30 : 125;
            if (ca > 0) layer(ca * 0.8, () => drawHeroAt(NEAR[c] - 14, 60 + Math.sin(t * 6 + c) * 1.5, { deg }, DESIGNS.f_moon, t, 'rgba(140,90,230,0.6)'));
            puff(t, 1.1, NEAR[c] - 14, 44); puff(t, 2.25, NEAR[c] - 14, 44);
          }
          puff(t, 1.0, HX, 80);
          for (const a of W4) slash(a, t);
          for (const tw of waves) for (let e = 0; e < 4; e++) smoke(t, tw + 0.04, S.x[e], S.y[e], 8, 4, e * 13 + Math.round(tw * 10), '#07020f', 0.35, [0, -4], 0.8);
          slash(big, t);
          if (inW(t, fin, fin + 0.1)) flash(0.3, '#f0d8ff');
          rays(214, 80, 10, 120 * eo(prog(t, fin, fin + 0.3)), 24, 17, 3, '#ff5ee0', pulse(t, fin, fin + 0.35));
        },
      });
    })(),
  },
  {
    w: 'f_volcano', skill: '분화', desc: '높이 뛰어올라 땅을 내려친다. 갈라진 땅에서 불기둥이 차례로 솟구치고, 마지막에 넷이 한꺼번에 폭발한다.',
    p: (() => {
      const th = e => 1.45 + e * 0.1, fin = 2.1;
      const slam = { cx: 146, cy: 66, rx: 20, ry: 36, rot: 0.25, a0: -1.5, a1: 1.3, w: 12, t0: 1.24, dur: 0.35, ink: '#1a0500', mid: '#ff7a2a', hot: '#ffb347' };
      const geyser = (t, t0, x, hgt, seed) => {
        const a = fade(t, t0, t0 + 0.55, 0.06); if (a <= 0) return;
        const hh = hgt * eo(prog(t, t0, t0 + 0.12));
        lighter(() => { glow(x, GROUND - hh * 0.5, hh * 0.6, '#ff5e1a', 0.6 * a); withA(a, () => { poly([[x - 6, GROUND], [x - 2, GROUND - hh], [x + 2, GROUND - hh], [x + 6, GROUND]], '#ff9a3c'); poly([[x - 2.5, GROUND], [x, GROUND - hh * 0.9], [x + 2.5, GROUND]], '#fff09a'); }); });
        for (let i = 0; i < 16; i++) { const k = ((t - t0) * 2.4 + i / 16) % 1, fx = x + (rnd(seed + i) - 0.5) * 14 * (1 - k * 0.5), fy = GROUND - k * hh, s = (1 - k) * 5 + 1; withA(a * (1 - k), () => lighter(() => poly([[fx - s, fy], [fx, fy - s * 2.2], [fx + s, fy]], k < 0.4 ? '#ffe27a' : '#ff5e1a'))); }
        shards(t, t0, x, GROUND - 4, 8, seed, 120, '#3a2a2a', 0.8, 2.5, -Math.PI / 2, 1.4);
        sparks(t, t0, x, GROUND - 10, 10, seed + 5, 170, '#ffb347', 0.6, -Math.PI / 2, 1.2);
        smoke(t, t0 + 0.15, x, GROUND - hh * 0.7, 14, 6, seed + 9, '#2a1a1a', 0.9, [0, -20], 0.6);
      };
      return build({
        w: 'f_volcano', dur: 3.9, base: 0.3,
        acts: [[1.0, 'raise', 0.24], [1.26, 'swing']],
        hits: [...hitsAt(1.3, 14, { kb: 3, small: true }), ...ALL.map(e => [th(e), e, 45, { crit: true, lift: 16 }]), ...hitsAt(fin + 0.02, 30, { lift: 10 })],
        st: ALL.map(e => [e, 'burn', th(e), 3.3]),
        shake: t => (inW(t, 1.28, 1.45) ? 3.5 : inW(t, 1.45, 1.8) ? 1.2 : inW(t, fin, fin + 0.2) ? 3 : 0),
        hero: t => ({ dy: inW(t, 1.0, 1.28) ? -30 * Math.sin(prog(t, 1.0, 1.28) * Math.PI) : 0 }),
        back: t => { stage(t, 0.9, 3.0, '#140400', 0.42, '#ff3a0a'); lighter(() => glow(W / 2, GROUND, 260, '#ff3a0a', 0.25 * fade(t, 1.3, 3.0, 0.3))); },
        front(t) {
          slash(slam, t);
          if (inW(t, 1.28, 1.36)) flash(0.28, '#ffd0a0');
          flare(150, 97, 16, '#ff7a2a', pulse(t, 1.28, 1.45));
          shards(t, 1.29, 150, 96, 16, 31, 140, '#3a2a2a', 0.9, 3, -Math.PI / 2, 2.2);
          smoke(t, 1.3, 150, GROUND - 4, 22, 8, 33, '#2a1a1a', 1.0, [0, -10], 0.6);
          const ca = 1 - prog(t, 2.8, 3.2);
          if (t >= 1.29 && ca > 0) { const len = 220 * eo(prog(t, 1.29, 1.45)); lighter(() => withA(ca, () => { rect(140, GROUND - 1, len, 3, '#ff5e1a'); rect(140, GROUND, len, 1, '#fff09a'); for (let i = 0; i < 7; i++) if (i * 32 < len) bolt(150 + i * 32, GROUND, 160 + i * 32, GROUND + 8, i, 1, '#ff9a3c', 6); glow(140 + len, GROUND, 10, '#ffb347', 0.8); })); }
          for (let e = 0; e < 4; e++) { geyser(t, th(e), NEAR[e], 58, e * 40); flare(NEAR[e], GROUND - 10, 10, '#ffb347', pulse(t, th(e), th(e) + 0.15)); }
          for (let e = 0; e < 4; e++) geyser(t, fin + e * 0.02, NEAR[e], 90, e * 40 + 200);
          if (inW(t, fin, fin + 0.1)) flash(0.35, '#ffd8a0');
          rays(CXN, GROUND - 20, 10, 120 * eo(prog(t, fin, fin + 0.3)), 20, 41, 3, '#ff9a3c', pulse(t, fin, fin + 0.35));
        },
      });
    })(),
  },
];
