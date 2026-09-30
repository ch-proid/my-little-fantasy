'use strict';
// =====================================================================
// 전투: 무리 생성, 대상 고르기, 무기별 공격, 몬스터 역할, 상태 이상, 보상, 스테이지, 판타지아 스킬, 손맛 연출
// 시간은 G.t(게임 시각). 히트스톱 동안에는 전투 시간이 멈춘다.
// =====================================================================
const WALK = 60;                // 용사가 걸을 때 세상이 흘러가는 속도(px/초)
const SKILL_FROM = 0.85;        // 미리보기 스킬 타임라인에서 스킬이 시작되는 시각
const G = {
  t: 0, cam: 0, foes: [], shots: [], fx: [], pops: [], coins: [], loot: [],
  hero: { hp: 1, state: 'walk', atkT: 0, deadT: 0, walkT: 0, flash: 0, squash: 0, swingAt: -9, shootAt: -9, castAt: -9, lastHurt: -9, lvFx: -9 },
  count: 0, bossT: 0, bossWave: false, skill: null, skillCd: 6, paused: false, speed: 1, god: false, hitStop: 0, shake: 0, stageFx: -9, regionFx: -9, goldPulse: 0, nextId: 1,
};
const HERO_FRONT = HX + 14;
// 크기 등급: 손도트 줄 수로 정한다. s 작음(용사보다 작다) / m 보통 / l 큼(용사보다 조금 크다) / b 보스
const sizeOf = d => { const h = forgeArt(d).h; return h <= 15 ? 's' : h <= 19 ? 'm' : h <= 23 ? 'l' : 'b'; };
const SIZE = {
  s: { kb: 1.4, step: 0, shake: 0 },
  m: { kb: 1, step: 0, shake: 0 },
  l: { kb: 0.5, step: 0.55, shake: 0.5 },   // 무거운 발걸음
  b: { kb: 0.2, step: 0.7, shake: 1.2 },
};
const halfW = f => forgeArt(f.d).w; // 화면에서 너비의 절반(도트 1칸 = 2px)

// ---------- 몬스터 만들기 ----------
function makeFoe(id, x, boss = false) {
  const d = MON[id], role = ROLES[boss ? 'boss' : d.role], st = S.stage;
  const hp = BAL.monHp(st) * role.hp;
  return {
    uid: G.nextId++, id, d, role: boss ? 'boss' : d.role, boss, x, dy: 0, hp, maxHp: hp,
    dmg: BAL.monDmg(st) * role.dmg, def: BAL.monDef(st) + (role.def || 0) * st * 0.3, eva: BAL.monEva(st),
    spd: role.spd * (0.9 + R() * 0.2), range: role.range, atkIv: role.atkIv, atkT: R() * role.atkIv,
    gold: BAL.monGold(st) * (boss ? 8 : 1), exp: BAL.monExp(st) * (boss ? 6 : 1) * role.hp ** 0.5,
    flash: 0, squash: 0, kbV: 0, stun: 0, dots: [], born: G.t, dieT: -1, lunge: -9, seed: R() * 10,
    sz: boss ? 'b' : sizeOf(d), stepT: 0, landed: !boss,
  };
}
function spawnWave() {
  const reg = REGIONS[regionOf(S.stage) - 1], n = BAL.pack(S.stage);
  const boss = S.mode === 'auto' && G.count >= BAL.killsPerStage;
  let x = W + 20;
  if (boss) {
    G.bossWave = true; G.bossT = BAL.bossTime;
    for (let i = 0; i < Math.min(3, n - 1); i++) { G.foes.push(makeFoe(pick(reg.mons), x)); x += 24; }
    G.foes.push(makeFoe(reg.boss, W - 70, true)); // 보스는 화면 안으로 하늘에서 떨어진다
  } else {
    G.bossWave = false;
    for (let i = 0; i < n; i++) { G.foes.push(makeFoe(pick(reg.mons), x)); x += 22 + R() * 14; }
  }
}
const alive = () => G.foes.filter(f => f.dieT < 0);

// ---------- 피해 ----------
function hitChance(f) { return clamp(0.82 + (stats().acc - f.eva) / 160, 0.5, 1); }
function rollDamage(mult = 1, f = null) {
  const s = stats(), crit = R() < s.crit;
  let d = s.atk * s.dmgMul * WEAPONS[s.wt].mul * lerp(s.minD, s.maxD, R()) * (crit ? s.critDmg : 1) * mult;
  if (f) d *= 100 / (100 + f.def * 4);
  return { d: Math.max(1, d), crit };
}
function pop(x, y, s, c, size, crit = false) { G.pops.push({ x, y, s: String(s), c, size, t0: G.t, crit }); if (G.pops.length > 60) G.pops.shift(); }
function damageFoe(f, mult = 1, o = {}) {
  if (f.dieT >= 0) return;
  if (!o.sure && R() > hitChance(f)) { pop(f.x, footTop(f) - 4, '빗나감', '#c9d0e8', 7); return; }
  const { d, crit } = rollDamage(mult, f);
  f.hp -= d; f.flash = JUICE.flashTime; f.squash = 1;
  if (o.kb) f.kbV = Math.max(f.kbV, o.kb * SIZE[f.sz].kb);
  if (o.stun) f.stun = Math.max(f.stun, o.stun * (f.boss ? 0.3 : 1));
  if (o.dot) f.dots.push({ k: o.dot, dps: d * (o.dotMul || 0.25), until: G.t + (o.dotTime || 3), next: G.t + 0.5 });
  pop(f.x + (R() - 0.5) * 10, footTop(f) - 6, fmt(d) + (crit ? '!' : ''), crit ? 'gold' : 'text', crit ? 12 : o.small ? 7 : 9, crit);
  if (!o.small && !(crit && foeFx('치명타', f))) foeFx('타격', f);
  if (crit) { G.hitStop = Math.max(G.hitStop, JUICE.critHitStop); G.shake = Math.max(G.shake, JUICE.critShake); }
  else if (!o.small) G.hitStop = Math.max(G.hitStop, JUICE.hitStop);
  if (f.hp <= 0) killFoe(f);
}
// 이펙트 에디터에서 만든 도트 이펙트를 자리(slot)에 맞춰 튼다. 그 자리에 정한 이펙트가 없으면 아무것도 안 한다
function playPixfx(slot, x, yMid, yFoot) {
  const p = typeof pixfxFor === 'function' && pixfxFor(slot); if (!p) return false;
  const t0 = G.t, dur = p.frames / p.fps, y = p.anchor === 'bottom' ? yFoot : yMid;
  G.fx.push({ t0, dur, draw: t => pixfxDraw(L, p, x, y, (t - t0) / dur, PX) }); return true;
}
function foeFx(slot, f) { const a = forgeArt(f.d), foot = GROUND - (f.d.fly || 0); return playPixfx(slot, f.x, foot - a.h, foot); }
function footTop(f) { const a = forgeArt(f.d); return GROUND - a.h * 2 - (f.d.fly || 0); }
function killFoe(f) {
  f.hp = 0; f.dieT = G.t; f.squash = 1; foeFx('처치', f);
  if (f.sz === 'l' || f.sz === 'b') { dust(f.x, f.sz === 'b' ? 22 : 12, f.sz === 'b' ? 14 : 8); G.shake = Math.max(G.shake, SIZE[f.sz].shake * 2); }
  const s = stats(), gold = f.gold * s.goldMul;
  addGold(gold); G.goldPulse = 0.2;
  const nc = Math.min(6, 1 + Math.floor(Math.log10(1 + gold)));
  for (let i = 0; i < nc; i++) G.coins.push({ x: f.x, y: GROUND - 10, vx: (R() - 0.5) * 90, vy: -80 - R() * 70, t0: G.t, fly: -1 });
  const ups = addExp(f.exp);
  if (ups) { G.hero.lvFx = G.t; G.hero.hp = stats().hp; if (playPixfx('레벨업', HX, GROUND - 28, GROUND)) G.hero.lvPixAt = G.t; }
  G.hero.hp = Math.min(stats().hp, G.hero.hp + stats().hp * BAL.healOnKill);
  S.kills++;
  // 전리품
  const reg = REGIONS[regionOf(S.stage) - 1], rolls = f.boss ? BAL.bossDrops : R() < BAL.drop ? 1 : 0;
  for (let i = 0; i < rolls; i++) {
    let g = weighted(f.boss ? BAL.bossGradeW : BAL.gradeW);
    const type = pick(['weapon', 'weapon', 'head', 'body', 'arms', 'legs', 'feet', 'ring', 'neck']);
    if (g === 4 && type !== 'weapon' && R() < 0.5) g = 3;
    const it = makeItem(type, g, S.stage, { r: regionOf(S.stage) });
    const res = gainItem(it);
    G.loot.push({ x: f.x + (i - 0.5) * 12, it, t0: G.t, res });
  }
  if (f.boss) { G.shake = JUICE.bossShake; G.hitStop = JUICE.bossHitStop; stageClear(); }
  else if (!G.bossWave) { G.count++; if (S.mode === 'farm' && G.count >= BAL.killsPerStage) G.count = 0; }
}
function stageClear() {
  const from = regionOf(S.stage);
  S.stage++; S.maxStage = Math.max(S.maxStage, S.stage); G.count = 0; G.bossWave = false; G.stageFx = G.t;
  if (regionOf(S.stage) !== from) G.regionFx = G.t;
  G.hero.hp = stats().hp;
  for (const f of G.foes) if (f.dieT < 0) f.dieT = G.t; // 남은 부하는 흩어진다(보상 없음)
  save();
}
function bossFail(msg) {
  for (const f of G.foes) if (f.dieT < 0) f.dieT = G.t;
  G.bossWave = false; G.count = 0; S.mode = 'farm'; // 같은 스테이지에서 반복 사냥
  toast(msg); save();
}
function setMode(m) {
  S.mode = m;
  if (m === 'farm' && G.bossWave) { for (const f of G.foes) if (f.dieT < 0) f.dieT = G.t; G.bossWave = false; }
  if (m === 'auto') G.count = Math.max(G.count, 0);
  save();
}
function goStage(st) {
  S.stage = clamp(Math.floor(st), 1, S.maxStage); G.count = 0; G.bossWave = false;
  for (const f of G.foes) f.dieT = G.t; G.foes = []; G.shots = []; G.skill = null; G.stageFx = G.t; save();
}

// ---------- 용사 공격 ----------
function heroAttack(targets) {
  const s = stats(), W2 = WEAPONS[s.wt], h = G.hero;
  if (s.wt === 'sword') {
    const reach = HERO_FRONT + W2.range; // 검기 끝
    const tg = targets.filter(f => f.x - halfW(f) * 0.6 <= reach);
    if (!tg.length) return false;
    h.swingAt = G.t;
    const hot = weaponHot(), fx = weaponFx(), t0 = G.t;
    G.fx.push({ t0, dur: 0.3, draw: t => slash({ cx: 130, cy: 82, rx: 64, ry: 18, rot: 0, a0: -1.35, a1: 1.3, w: 9 * fx, t0, dur: 0.28, mid: mix(hot, '#ffffff', 0.35), hot, core: '#ffffff' }, t) });
    for (const f of tg) { damageFoe(f, 1, { stun: W2.stun, kb: 20 }); const x = f.x, y = GROUND - forgeArt(f.d).h; G.fx.push({ t0, dur: 0.15, draw: t => flare(x, y, 6 * fx, hot, pulse(t, t0, t0 + 0.12)) }); }
    return true;
  }
  if (s.wt === 'gun') {
    const tg = targets.filter(f => f.x <= HX + W2.range);
    if (!tg.length) return false;
    h.shootAt = G.t;
    const a = tg[0], b = tg.find(f => f !== a && f.x >= a.x && f.x - a.x < 60), t0 = G.t, hot = weaponHot(), fx = weaponFx();
    const ax = a.x, bx = b ? b.x : null, my = GROUND - 15;
    G.fx.push({ t0, dur: 0.6, draw: t => {
      const [mx] = G.tip;
      if (inW(t, t0, t0 + 0.07)) { flare(mx + 3, my, 7, hot, 1); lighter(() => { line(mx, my, ax, my, 2.4, hot); line(mx, my, ax, my, 1, '#ffffff'); if (bx) withA(0.6, () => line(ax, my, bx, my, 1.2, hot)); }); }
      sparks(t, t0 + 0.03, ax + 4, GROUND - 12, Math.round(8 * fx), 3, 90 * fx, '#ff7d8f', 0.3, 0, 1.6);
      smoke(t, t0, mx + 4, my, 5, 3, 7, '#b8b0c8', 0.6, [10, -18], 0.4);
    } });
    damageFoe(a, 1, { kb: W2.kb * 8, dot: 'bleed', dotMul: W2.bleed, dotTime: W2.bleedTime });
    if (b) damageFoe(b, W2.pierce, { kb: W2.kb * 4 });
    return true;
  }
  // 완드: 파이어볼이 날아가 터진다
  const tg = targets.filter(f => f.x <= HX + W2.range);
  if (!tg.length) return false;
  h.castAt = G.t;
  const a = tg[0], hot = weaponHot();
  G.shots.push({ kind: 'fireball', x0: G.tip[0], y0: G.tip[1], x1: a.x, y1: GROUND - 12, t0: G.t, dur: W2.travel, hot, radius: W2.radius });
  return true;
}
function explode(sh) {
  const t0 = G.t, x = sh.x1, y = sh.y1, hot = sh.hot;
  for (const f of alive()) if (Math.abs(f.x - x) <= sh.radius + halfW(f) * 0.5) damageFoe(f, 1, { kb: f.x >= x ? 25 : -10 });
  G.fx.push({ t0, dur: 0.9, draw: t => {
    const age = t - t0, k = age / 0.6;
    if (age < 0.6) { lighter(() => { glow(x, y, 50 * eo(Math.min(1, k * 3)), hot, 0.85 * (1 - k)); withA(1 - k, () => ring(x, y, 42 * eo(k), 3 * (1 - k) + 0.6, '#ffe27a', 0.8)); }); flare(x, y, 12, hot, pulse(t, t0, t0 + 0.15)); rays(x, y, 8, 40 * eo(k), 12, 5, 2.2, hot, 1 - k); }
    sparks(t, t0, x, y, 14, 9, 130, '#ffe27a', 0.5);
    smoke(t, t0 + 0.1, x, y - 4, 16, 6, 11, '#5a4a5a', 0.8, [0, -16], 0.55);
  } });
}

// ---------- 판타지아 스킬 ----------
// 무기 이펙트: 색은 무기 지역 색, 크기는 등급 (데이터/장비.json)
const weaponHot = () => (HERO_WEAPON && HERO_WEAPON.hot) || '#ffe27a', weaponFx = () => (HERO_WEAPON && HERO_WEAPON.fx) || 1;
// 판타지아 무기 = 그 지역 스킬 (데이터/장비.json regions[].fantasia.skill). 무기 종류가 다르면 같은 스킬을 그 무기 동작으로 쓴다
const skillVariants = {};
function skillEntry() {
  const s = stats(); if (!s.weapon || s.weapon.g !== 4) return null;
  const set = regionSet(s.wr), e = set && [...F_SWORD, ...F_GUN, ...F_WAND].find(x => x.w === set.fantasia.skill);
  if (!e) return null;
  if (e.p.d.type === s.wt) return e;
  return skillVariants[e.w + s.wt] || (skillVariants[e.w + s.wt] = { ...e, p: build({ ...e.p.o, type: s.wt }) });
}
function startSkill(targets) {
  const e = skillEntry(); if (!e) return false;
  const p = e.p, map = targets.slice(0, 4);
  G.skill = { e, p, t0: G.t - SKILL_FROM, map, hits: p.hits.filter(h => h[0] >= SKILL_FROM).sort((a, b) => a[0] - b[0]), st: p.st.filter(s => s[2] >= SKILL_FROM), hi: 0, si: 0 };
  G.skillCd = BAL.skillCd; return true;
}
function updateSkill() {
  const k = G.skill; if (!k) return;
  const t = G.t - k.t0;
  while (k.hi < k.hits.length && k.hits[k.hi][0] <= t) {
    const [, e, dd, o = {}] = k.hits[k.hi++];
    for (const f of slotFoes(k, e)) damageFoe(f, dd / 12, { sure: true, small: o.small, kb: (o.kb || 0) * 8 });
  }
  while (k.si < k.st.length && k.st[k.si][2] <= t) {
    const [e, kind, a, b] = k.st[k.si++];
    for (const f of slotFoes(k, e)) if (kind === 'bleed' || kind === 'burn' || kind === 'curse') f.dots.push({ k: kind, dps: stats().hit * 0.2, until: G.t + (b - a), next: G.t + 0.4 });
    else f.stun = Math.max(f.stun, (b - a) * (f.boss ? 0.3 : 1));
  }
  if (t >= k.p.dur) G.skill = null;
}
// 스킬 이펙트는 네 자리에 떨어진다. 살아 있는 적을 가장 가까운 자리에 나눠, 이펙트가 닿는 적은 모두 맞게 한다.
function slotFoes(k, e) {
  const xs = k.map.map((f, i) => (f ? f.x : k.p.bx[i]));
  return alive().filter(f => { let best = 0; for (let i = 1; i < 4; i++) if (Math.abs(xs[i] - f.x) < Math.abs(xs[best] - f.x)) best = i; return best === e; });
}
// 스킬 그림이 쓰는 적 위치: 스킬을 쓸 때 고른 적(없으면 미리보기 자리)
function skillScene(t) {
  const k = G.skill, p = k.p, Sx = { x: [], y: [], top: [], dy: [], bx: p.bx, tip: G.tip };
  for (let e = 0; e < 4; e++) {
    const f = k.map[e], m = p.move ? p.move(e, t) : {};
    const x = f ? f.x : p.bx[e], h = f ? forgeArt(f.d).h * 2 : 24, dy = (m.dy || 0) - (f && f.d.fly ? f.d.fly : 0);
    Sx.x[e] = x + (m.dx || 0); Sx.dy[e] = dy; Sx.top[e] = GROUND - h + dy; Sx.y[e] = GROUND - h / 2 + dy;
  }
  return Sx;
}

// ---------- 한 걸음 ----------
function update(dt) {
  if (G.hitStop > 0) { G.hitStop -= dt; return; }
  G.t += dt;
  const s = stats(), h = G.hero, W2 = WEAPONS[s.wt];
  h.flash = Math.max(0, h.flash - dt); h.squash = Math.max(0, h.squash - dt * 5); G.goldPulse = Math.max(0, G.goldPulse - dt);
  G.shake = Math.max(0, G.shake - dt * 12);

  // 죽음과 부활
  if (h.state === 'dead') {
    h.deadT -= dt;
    if (h.deadT <= 0) { h.state = 'walk'; h.hp = s.hp; G.foes = []; }
  }
  // 무리 생성
  const live = alive();
  if (h.state !== 'dead' && !live.length && !G.foes.some(f => G.t - f.dieT < 0.4)) spawnWave();
  // 몬스터 이동: 앞에 선 동료를 넘지 않고, 역할에 맞는 거리에서 멈춘다
  live.sort((a, b) => a.x - b.x);
  const nearest = live[0], engage = s.wt === 'sword' ? HERO_FRONT + W2.range - 8 : HX + W2.range - 10;
  const walking = h.state !== 'dead' && !G.skill && (!nearest || nearest.x > engage);
  if (walking) { G.cam += WALK * dt; h.walkT += dt; h.state = 'walk'; } else if (h.state !== 'dead') h.state = 'fight';
  // 겹침 70%: 옆 몬스터와 몸 너비의 30%만 떨어져 선다. 근접끼리, 원거리끼리 따로 줄을 선다 (원거리가 앞에 멈춰도 근접은 지나쳐 용사에게 간다)
  const prevOf = { near: null, far: null };
  for (const f of live) {
    f.flash = Math.max(0, f.flash - dt); f.squash = Math.max(0, f.squash - dt * 6);
    if (f.kbV > 0) { f.x += f.kbV * dt; f.kbV = Math.max(0, f.kbV - 300 * dt); }
    const lane = f.range > 40 ? 'far' : 'near', prev = prevOf[lane], half = forgeArt(f.d).w;
    const stop = Math.max(prev ? prev.x + Math.max(5, (forgeArt(prev.d).w + half) * 0.3) : 0, HERO_FRONT + half * 0.45 + (f.range > 40 ? f.range : 0));
    if (!f.landed) { if (G.t - f.born < 0.55) continue; f.landed = true; G.shake = Math.max(G.shake, 4); G.hitStop = 0.06; dust(f.x, 18, 14); }
    // 용사가 걸으면 세상이 다가온다: 멈춰 선 원거리 몬스터도 함께 다가와야 칼이 닿는다 (전에는 멈춤 자리에 묶여 땅만 흘러가서 뒤로 도망치는 것처럼 보였다)
    if (walking) f.x -= WALK * dt;
    f.walk = f.stun <= 0 && f.x > stop;
    if (f.stun > 0) f.stun -= dt;
    else if (f.x > stop) {
      f.x = Math.max(stop, f.x - f.spd * dt); // 제 발걸음은 멈춤 자리까지만
      const sz = SIZE[f.sz];
      if (sz.step && (f.stepT += dt) >= sz.step) { f.stepT = 0; dust(f.x + halfW(f) * 0.5, 4, 3); if (f.x < W) G.shake = Math.max(G.shake, sz.shake); }
    }
    else if (h.state !== 'dead' && f.x - HERO_FRONT <= f.range + 12) {
      f.atkT += dt;
      if (f.atkT >= f.atkIv) {
        f.atkT = 0; f.lunge = G.t; if (SIZE[f.sz].shake) { G.shake = Math.max(G.shake, SIZE[f.sz].shake * 1.5); dust(HERO_FRONT, 6, 4); }
        if (f.range > 40) G.shots.push({ kind: 'foe', x0: f.x - 6, y0: footTop(f) + 8, x1: HX + 4, y1: GROUND - 16, t0: G.t, dur: 0.45, dmg: f.dmg, hot: REGIONS[regionOf(S.stage) - 1].tint });
        else hurtHero(f.dmg, f.boss);
      }
    }
    prevOf[lane] = f;
    // 지속 피해
    for (const d of f.dots) if (G.t >= d.next && G.t < d.until) { d.next += 0.5; f.hp -= d.dps * 0.5; pop(f.x + 8, footTop(f) - 2, fmt(d.dps * 0.5), d.k === 'bleed' ? '#ff7d8f' : d.k === 'burn' ? '#ffa24d' : '#c8a0ff', 7); if (f.hp <= 0) { killFoe(f); break; } }
    f.dots = f.dots.filter(d => G.t < d.until);
  }
  G.foes = G.foes.filter(f => f.dieT < 0 || G.t - f.dieT < 0.5);
  if (G.foes.length === 0 && G.bossWave) G.bossWave = false;
  // 보스 제한 시간
  if (G.bossWave && live.some(f => f.boss)) { G.bossT -= dt; if (G.bossT <= 0) bossFail('시간이 다 됐어요. 반복 사냥으로 힘을 길러요.'); }
  // 용사 공격 / 스킬
  if (h.state === 'fight' && live.length) {
    G.skillCd -= dt;
    if (!G.skill && G.skillCd <= 0 && skillEntry()) startSkill(live);
    if (!G.skill) { h.atkT += dt; const iv = 1 / s.aspd; if (h.atkT >= iv && heroAttack(live)) h.atkT = 0; }
  } else h.atkT = Math.min(h.atkT, 0.6 / s.aspd);
  updateSkill();
  // 날아가는 것들
  for (const sh of G.shots) if (G.t - sh.t0 >= sh.dur && !sh.done) { sh.done = true; if (sh.kind === 'fireball') explode(sh); else if (h.state !== 'dead') hurtHero(sh.dmg, false); }
  G.shots = G.shots.filter(sh => !sh.done);
  G.fx = G.fx.filter(e => G.t - e.t0 < e.dur);
  // 회복: 한동안 안 맞으면 빨리 찬다
  if (h.state !== 'dead') h.hp = Math.min(s.hp, h.hp + s.hp * (G.t - h.lastHurt > 1.5 && !live.some(f => f.x - HERO_FRONT < 40) ? BAL.regenOut : BAL.regenIn) * dt);
}
// 흙먼지: 무거운 발걸음·착지·쓰러짐
function dust(x, r, n) {
  const t0 = G.t, seed = Math.floor(R() * 1e4);
  G.fx.push({ t0, dur: 0.7, draw: t => smoke(t, t0, x, GROUND - 2, r, n, seed, '#c8b89a', 0.7, [0, -6], 0.6) });
}
function hurtHero(dmg, big) {
  const h = G.hero, s = stats(), d = G.god ? 0 : Math.max(1, dmg * 100 / (100 + s.def * 3));
  h.hp -= d; h.flash = 0.1; h.squash = 1; h.lastHurt = G.t;
  pop(HX - 4, GROUND - 46, '-' + fmt(d), '#ff6b6b', 8);
  if (big) G.shake = Math.max(G.shake, JUICE.bossShake * 0.6);
  if (h.hp <= 0) {
    h.hp = 0; h.state = 'dead'; h.deadT = BAL.respawn; G.skill = null;
    if (G.bossWave) bossFail('쓰러졌어요. 반복 사냥으로 힘을 길러요.'); else G.count = 0;
    for (const f of G.foes) if (f.dieT < 0) f.dieT = G.t;
  }
}
