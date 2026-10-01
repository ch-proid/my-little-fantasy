// 자연 진행 시험: 새 캐릭터로 PARAM.minutes 분(진행시킨 시간 기준) 동안 전투를 돌린다. 무적 없음, 자연 드롭·자연 경험치.
// PARAM: { wt: 'sword'|'gun'|'wand', minutes, actEvery(초, 0=완전 방치), build: 'str'|'vit'|'dex'|'bal', spend: 'enh'|'ab'|'mix', retryAfter(초), startStage }
// 결과: 분마다 표본(단계·레벨·골드·처치·사망), 사건(보스 성공/실패, 지역 진입), 경제·파밍 합계
const P = Object.assign({ wt: 'sword', minutes: 15, actEvery: 60, build: 'str', spend: 'mix', retryAfter: 90, startStage: 1 }, PARAM);
resetGame(); S.name = '시험'; giveStarter(P.wt); applyLook(); G.hero.hp = stats().hp;
if (P.startStage > 1) { S.maxStage = P.startStage; goStage(P.startStage); }
G.paused = true; menuOpen = false; G.speed = 1; G.god = false; G.tip = G.tip || [HX + 20, GROUND - 14];
const R0 = { fed: 0, deaths: 0, bossTry: 0, bossWin: 0, bossFailTime: 0, bossFailDead: 0, goldIn: 0, goldOut: 0, drops: [0, 0, 0, 0, 0], dismantled: 0, bagFull: 0, kills: 0, equipChanges: 0, enhBuys: 0, abBuys: 0, abRolls: 0, firstBossWin: null, regionAt: {}, samples: [], events: [], fantasia: 0 };
// 사건 걸기
const _stageClear = stageClear, _bossFail = bossFail, _gainItem = gainItem, _addGold = addGold, _spawnWave = spawnWave;
stageClear = function () { R0.bossWin++; R0.lastProgress = R0.fed; if (R0.firstBossWin === null) R0.firstBossWin = R0.fed; const from = regionOf(S.stage); _stageClear(); const to = regionOf(S.stage); if (to !== from && !R0.regionAt[to] && !S.rebirth) { R0.regionAt[to] = Math.round(R0.fed); R0.events.push([Math.round(R0.fed), `${to}지역 진입`]); } };
bossFail = function (msg) { if (/시간/.test(msg)) R0.bossFailTime++; else R0.bossFailDead++; R0.lastFail = R0.fed; R0.events.push([Math.round(R0.fed), `보스 실패(${stageLabel(S.stage)}) ${/시간/.test(msg) ? '시간' : '사망'}`]); _bossFail(msg); };
gainItem = function (it) { R0.drops[it.g]++; if (isFantasiaWeapon(it)) R0.fantasia++; const r = _gainItem(it); if (r.dismantled) { R0.dismantled++; if (!S.set.autoDis[it.g]) R0.bagFull++; } return r; };
addGold = function (n) { if (n > 0 && isFinite(n)) R0.goldIn += n; _addGold(n); };
spawnWave = function () { const before = G.bossWave; _spawnWave(); if (G.bossWave && !before) R0.bossTry++; };
const spend = fn => { const g = S.gold; const ok = fn(); if (ok) R0.goldOut += g - S.gold; return ok; };
// 개입 규칙: 스탯 배분 → 더 좋은 장비 장착 → 안 쓰는 장비 분해 → 골드 소비(강화/어빌리티) → 보스 재도전
let balK = 0;
function act() {
  if (S.pts > 0) { if (P.build === 'bal') { while (S.pts > 0) spendPoint(['str', 'vit', 'dex'][balK++ % 3]); } else spendPoint(P.build, S.pts); }
  for (const sl of SLOTS) {
    const cands = S.inv.filter(it => it.t === sl.type && !isEquipped(it)); if (!cands.length) continue;
    let best = null, bp = power(stats());
    for (const it of cands) { const p = power(statsWith(it)); if (p > bp + 0.5) { bp = p; best = it; } }
    if (best) { equip(best, sl.type === 'ring' ? undefined : sl.id); R0.equipChanges++; }
  }
  for (const it of S.inv.slice()) if (!isEquipped(it) && !it.lock && !isFantasiaWeapon(it) && power(statsWith(it)) <= power(stats()) + 0.5) dismantle(it);
  if (S.ab.pending) abChoose(!S.ab.slots[S.ab.pending.i]);
  for (let n = 0; n < 40; n++) { // 가장 싼 것부터 산다
    const slots = SLOTS.filter(sl => S.eq[sl.id] && (S.enh[sl.id] || 0) < BAL.enhMax).sort((a, b) => (S.enh[a.id] || 0) - (S.enh[b.id] || 0));
    const opts = [];
    if (P.spend !== 'ab' && slots.length) opts.push({ c: BAL.enhCost(S.enh[slots[0].id] || 0), f: () => enhance(slots[0].id), k: 'enh' });
    if (P.spend !== 'enh') {
      const empty = S.ab.slots.findIndex((s, i) => !s && i < abSlotCount());
      if (empty >= 0 && !S.ab.pending) opts.push({ c: BAL.abRoll(S.ab.lv), f: () => abRoll(empty), k: 'roll' });
      if (S.ab.lv < BAL.abMax) opts.push({ c: BAL.abCost(S.ab.lv), f: () => abLevelUp(), k: 'ab' });
    }
    opts.sort((a, b) => a.c - b.c); if (!opts.length || S.gold < opts[0].c) break;
    if (spend(opts[0].f)) { if (opts[0].k === 'enh') R0.enhBuys++; else if (opts[0].k === 'ab') R0.abBuys++; else { R0.abRolls++; if (S.ab.pending) abChoose(true); } } else break;
  }
  if (S.mode === 'farm' && R0.fed - (R0.lastFail || 0) >= P.retryAfter) setMode('auto');
  if (P.rebirth !== false && canRebirth() && S.mode === 'farm' && S.maxStage >= (P.rebirthMin || 10) && R0.fed - (R0.lastProgress || 0) >= (P.stuckMin || 10) * 60) { R0.rbStage = R0.rbStage || []; R0.rbStage.push(S.maxStage); doRebirth(); R0.lastProgress = R0.fed; R0.rebirths = (R0.rebirths || 0) + 1; R0.rebirthAt = R0.rebirthAt || []; R0.rebirthAt.push(Math.round(R0.fed)); R0.events.push([Math.round(R0.fed), `환생 ${S.rebirth}`]); }
}
// 돌리기: 1/30초씩 먹인 시간(fed)을 축으로 한다 (타격 멈춤 동안은 G.t가 안 늘지만 체감 시간은 흐른다)
const dt = 1 / 30, total = P.minutes * 60; let nextSample = 60, nextAct = P.actEvery || Infinity, wasDead = false, t0 = performance.now();
while (R0.fed < total) {
  update(dt); R0.fed += dt;
  const dead = G.hero.state === 'dead'; if (dead && !wasDead) R0.deaths++; wasDead = dead;
  if (R0.fed >= nextAct) { act(); nextAct += P.actEvery; }
  if (R0.fed >= nextSample) { R0.samples.push({ m: Math.round(nextSample / 60), st: stageLabel(S.stage), lv: S.lv, gold: Math.round(S.gold), kills: S.kills, deaths: R0.deaths, mode: S.mode, pts: S.pts, dps: Math.round(stats().dps), hp: stats().hp, enh: Object.values(S.enh).reduce((a, b) => a + b, 0), ab: S.ab.lv, bag: bagUsed(), rb: S.rebirth }); nextSample += 60; }
  if (G.fx.length > 500 || G.foes.length > 40) throw new Error('누적: fx ' + G.fx.length + ' foes ' + G.foes.length);
}
const s = stats();
return { param: P, seed: SEED, wall: Math.round(performance.now() - t0), gameT: Math.round(G.t), fed: Math.round(R0.fed), hitStopLost: Math.round(R0.fed - G.t),
  end: { stage: stageLabel(S.stage), stageN: S.stage, maxStage: S.maxStage, lv: S.lv, gold: Math.round(S.gold), pts: S.pts, kills: S.kills, mode: S.mode, dps: Math.round(s.dps), hp: s.hp, def: Math.round(s.def * 10) / 10, atk: Math.round(s.atk), acc: Math.round(s.acc), bag: S.inv.length, enh: { ...S.enh }, abLv: S.ab.lv, eqGrades: SLOTS.map(sl => { const it = itemById(S.eq[sl.id]); return it ? it.g : '-'; }).join('') },
  deaths: R0.deaths, boss: { tries: R0.bossTry, wins: R0.bossWin, failTime: R0.bossFailTime, failDead: R0.bossFailDead, firstWinAt: R0.firstBossWin },
  rebirths: R0.rebirths || 0, rebirthAt: R0.rebirthAt || [], rbStage: R0.rbStage || [], rbPts: S.rbPts, regionAt: R0.regionAt, gold: { earned: Math.round(R0.goldIn), spent: Math.round(R0.goldOut) }, drops: R0.drops, fantasia: R0.fantasia, dismantled: R0.dismantled, bagFull: R0.bagFull,
  buys: { equip: R0.equipChanges, enh: R0.enhBuys, ab: R0.abBuys, roll: R0.abRolls }, samples: R0.samples, events: R0.events.slice(0, 60) };
