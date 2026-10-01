// 무기 3종 × 역할 5종(무리·탱커·원거리·돌격·보스) 단독 전투. 단계에 맞는 시험 캐릭터(그 단계 일반 장비, 레벨 ≈ 단계×0.9, 힘:근력 = 2:1, 강화 0)로
// 몬스터 하나를 세워 처치 시간과 잃은 체력을 본다. PARAM: { stages: [1, 20, 40, 60, 80], grade: 0, enh: 0, lvMul: 0.9, timeout: 60 }
const P = Object.assign({ stages: [1, 10, 20, 40, 60, 80], grade: 0, enh: 0, lvMul: 0.9, timeout: 60 }, PARAM);
G.paused = true; menuOpen = false; G.god = false; G.tip = G.tip || [HX + 20, GROUND - 14];
const ROLE_MON = {}; for (const reg of REGIONS) for (const id of reg.mons) { const r = MON[id].role; if (!ROLE_MON[r]) ROLE_MON[r] = id; }
const rows = [];
for (const st of P.stages) for (const wt of ['sword', 'gun', 'wand']) {
  resetGame(); S.name = '시험'; S.stage = st; S.maxStage = st; S.mode = 'farm';
  S.lv = Math.max(1, Math.round(st * P.lvMul)); S.pts = (S.lv - 1) * BAL.ptsPerLv; const a = Math.round(S.pts * 2 / 3); S.stat = { str: a, vit: S.pts - a, dex: 0 }; S.pts = 0;
  for (const sl of SLOTS) { const it = makeItem(sl.type, P.grade, st, { r: regionOf(st), wt }); S.inv.push(it); S.eq[sl.id] = it.id; S.enh[sl.id] = P.enh; }
  markDirty(); applyLook(); const s = stats();
  for (const [role, id] of [...Object.entries(ROLE_MON), ['boss', REGIONS[regionOf(st) - 1].boss]]) {
    const boss = role === 'boss';
    G.foes = []; G.shots = []; G.fx = []; G.skill = null; G.skillCd = 6; G.count = 0; G.bossWave = false; G.hero.hp = s.hp; G.hero.state = 'walk'; G.hitStop = 0;
    const f = makeFoe(id, boss ? W - 70 : W + 20, boss); if (boss) { G.bossWave = true; G.bossT = 999; } G.foes.push(f);
    const _spawn = spawnWave; spawnWave = () => {}; // 다른 무리가 끼지 않게
    let t = 0, lost = 0, hpMin = s.hp, died = false;
    while (t < P.timeout && f.dieT < 0) { update(1 / 30); t += 1 / 30; hpMin = Math.min(hpMin, G.hero.hp); if (G.hero.state === 'dead') { died = true; break; } }
    spawnWave = _spawn; G.bossWave = false;
    rows.push({ st, wt, role, hp: Math.round(f.maxHp), def: Math.round(f.def), killT: f.dieT >= 0 ? Math.round(t * 10) / 10 : null, died, hpLost: Math.round((s.hp - hpMin) / s.hp * 100), dps: Math.round(s.dps), heroHp: s.hp, heroDef: Math.round(s.def) });
  }
}
return { param: P, rows };
