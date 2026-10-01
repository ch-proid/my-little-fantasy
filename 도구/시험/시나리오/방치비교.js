// 방치 보상 어림(idleRates) vs 실제 반복 사냥 수입. 단계에 맞는 시험 캐릭터로 PARAM.minutes 분 반복 사냥(farm)하며 골드·경험치·처치·사망을 센다.
// PARAM: { stages: [10, 40, 70], minutes: 10, grade: 2, enh: 10, lvMul: 0.9 }
const P = Object.assign({ stages: [10, 40, 70], minutes: 10, grade: 2, enh: 10, lvMul: 0.9 }, PARAM);
G.paused = true; menuOpen = false; G.god = false; G.tip = G.tip || [HX + 20, GROUND - 14];
const rows = [];
for (const st of P.stages) for (const wt of ['sword', 'gun', 'wand']) {
  resetGame(); S.name = '시험'; S.maxStage = st; S.stage = st; S.mode = 'farm';
  S.lv = Math.max(1, Math.round(st * P.lvMul)); S.pts = (S.lv - 1) * BAL.ptsPerLv; const a = Math.round(S.pts * 2 / 3); S.stat = { str: a, vit: S.pts - a, dex: 0 }; S.pts = 0;
  for (const sl of SLOTS) { const it = makeItem(sl.type, P.grade, st, { r: regionOf(st), wt }); S.inv.push(it); S.eq[sl.id] = it.id; S.enh[sl.id] = P.enh; }
  markDirty(); applyLook(); G.hero.hp = stats().hp; G.foes = []; G.shots = []; G.skill = null; G.count = 0;
  let goldIn = 0, expIn = 0; const _g = addGold, _e = addExp; addGold = n => { if (n > 0 && isFinite(n)) goldIn += n; _g(n); }; addExp = (n, m) => { expIn += n * (m === undefined ? stats().expMul : m); return _e(n, m); };
  const k0 = S.kills; let deaths = 0, was = false, t = 0; const total = P.minutes * 60;
  while (t < total) { update(1 / 30); t += 1 / 30; const dead = G.hero.state === 'dead'; if (dead && !was) deaths++; was = dead; }
  addGold = _g; addExp = _e;
  const r = idleRates(st);
  rows.push({ st, wt, kills: S.kills - k0, deaths, goldPerSec: Math.round(goldIn / total * 100) / 100, expPerSec: Math.round(expIn / total * 100) / 100, idleGold: Math.round(r.gold * 100) / 100, idleExp: Math.round(r.exp * 100) / 100, ratioGold: Math.round(r.gold / (goldIn / total) * 100) / 100, ratioExp: Math.round(r.exp / (expIn / total) * 100) / 100 });
}
return { param: P, rows };
