'use strict';
// =====================================================================
// 상태·저장·성장·장비·어빌리티·외형·방치 보상
// =====================================================================
const R = Math.random;
const pick = a => a[Math.floor(R() * a.length)];
const round1 = v => Math.round(v * 10) / 10;
function weighted(ws) { const s = ws.reduce((a, b) => a + b, 0); let x = R() * s; for (let i = 0; i < ws.length; i++) { if ((x -= ws[i]) < 0) return i; } return ws.length - 1; }

function freshState() {
  return {
    v: 2, name: '', created: Date.now(), gold: 0, lv: 1, exp: 0, pts: 0, stat: { str: 0, vit: 0, dex: 0 },
    stage: 1, maxStage: 1, mode: 'auto', inv: [], eq: {}, enh: {},
    ab: { lv: 1, slots: [null, null, null], pending: null },
    look: { owned: ['h0', 't0'], hair: 'h0', tunic: 't0', headStyle: heroPart('hair', '뾰족 머리'), top: heroPart('top', '기본'), bottom: heroPart('bottom', '기본'), costume: '없음' }, // 헤어·상의·하의·코스튬 (처음 만들 때 고른다)
    set: { autoDisMax: -1, flash: 1 }, // autoDisMax: 이 등급 이하는 자동 분해 (-1 없음)
    rebirth: 0, rbPts: 0, tree: {}, pet: null, // 환생 횟수·환생 점수(영구 보너스), 스킬트리 찍은 노드(자리만), 펫(자리만)
    lastSeen: Date.now(), nextId: 1, kills: 0, notes: [],
  };
}
let S = freshState();

// ---------- 저장 ----------
function sign(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); }
function pack(o) { const d = JSON.stringify(o); return JSON.stringify({ d, sig: sign(d + GAME.SALT) }); }
function unpack(raw) { const { d, sig } = JSON.parse(raw); if (sign(d + GAME.SALT) !== sig) throw new Error('서명 불일치'); return JSON.parse(d); }
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
let saveFailed = false, lastBackup = 0, seenBefore = 0; // seenBefore: 저장을 읽었을 때의 접속 시각 (방치 보상을 정산할 때까지 간직한다)
function save() {
  S.lastSeen = Date.now();
  const ok = store.set(GAME.SAVE_KEY, pack(S));
  saveFailed = !ok;
  if (ok && Date.now() - lastBackup > 60000) { store.set(GAME.BACKUP_KEY, pack(S)); lastBackup = Date.now(); }
  return ok;
}
function sane(o) {
  const s = Object.assign(freshState(), o);
  const num = (v, d, min = 0) => (typeof v === 'number' && isFinite(v) && v >= min ? v : d);
  s.gold = num(s.gold, 0); s.lv = Math.floor(num(s.lv, 1, 1)); s.exp = num(s.exp, 0); s.pts = Math.floor(num(s.pts, 0));
  s.stage = Math.floor(num(s.stage, 1, 1)); s.maxStage = Math.max(s.stage, Math.floor(num(s.maxStage, 1, 1)));
  if (!s.stat || typeof s.stat !== 'object') s.stat = {};
  for (const k of ['str', 'vit', 'dex']) s.stat[k] = Math.floor(num(s.stat[k], 0));
  if (!s.set || typeof s.set !== 'object') s.set = {}; s.set = Object.assign(freshState().set, s.set);
  if (Array.isArray(s.set.autoDis)) { s.set.autoDisMax = s.set.autoDis.lastIndexOf(true); delete s.set.autoDis; } // 예전 저장: 등급별 체크 → 토글 하나
  s.set.autoDisMax = Math.min(3, Math.floor(num(s.set.autoDisMax, -1, -1)));
  s.rebirth = Math.floor(num(s.rebirth, 0)); s.rbPts = num(s.rbPts, 0); if (!s.tree || typeof s.tree !== 'object') s.tree = {}; if (typeof s.pet !== 'string') s.pet = null;
  if (!s.enh || typeof s.enh !== 'object') s.enh = {}; for (const k in s.enh) { if (!SLOTS.some(sl => sl.id === k)) delete s.enh[k]; else s.enh[k] = Math.min(BAL.enhMax, Math.floor(num(s.enh[k], 0))); }
  // 포인트 총량 보존: 레벨로 얻은 만큼보다 많으면 되돌린다
  const total = (s.lv - 1) * BAL.ptsPerLv, used = s.stat.str + s.stat.vit + s.stat.dex;
  if (used + s.pts !== total) { if (used > total) { s.stat = { str: 0, vit: 0, dex: 0 }; s.pts = total; } else s.pts = total - used; }
  if (!Array.isArray(s.inv)) s.inv = [];
  s.inv = s.inv.filter(it => it && typeof it.id === 'number' && it.t && GRADES[it.g] && SLOTS.some(sl => sl.type === it.t));
  for (const it of s.inv) { if (!it.base || typeof it.base !== 'object') it.base = {}; it.lines = Array.isArray(it.lines) ? it.lines.filter(l => l && LINES[l.k] && typeof l.v === 'number') : []; it.lv = Math.max(1, Math.floor(num(it.lv, 1))); }
  for (const it of s.inv) { // 예전 장비(무기 디자인 d, 지역 없음) → 지역 한 벌의 장비. 판타지아 무기는 그 무기가 나오던 지역으로
    if (!it.r) { const fr = it.d ? REGIONS.findIndex(r => (r.fanta || []).includes(it.d)) : -1; it.r = fr >= 0 ? fr + 1 : regionOf(Math.max(1, it.lv || 1)); }
    delete it.d; if (it.t === 'weapon' && !WEAPONS[it.wt]) it.wt = 'sword';
  }
  s.nextId = Math.max(num(s.nextId, 1), ...s.inv.map(it => it.id + 1), 1);
  for (const k in s.eq) if (!s.inv.some(it => it.id === s.eq[k]) || !slotOpenAt(k, s.rebirth)) delete s.eq[k];
  if (!s.ab || !Array.isArray(s.ab.slots)) s.ab = freshState().ab;
  s.ab.lv = Math.min(BAL.abMax, Math.max(1, Math.floor(num(s.ab.lv, 1, 1)))); s.ab.slots = [0, 1, 2].map(i => { const sl = s.ab.slots[i]; return sl && LINES[sl.k] && typeof sl.q === 'number' ? sl : null; });
  if (s.ab.pending && !(LINES[s.ab.pending.k] && typeof s.ab.pending.q === 'number' && s.ab.pending.i >= 0 && s.ab.pending.i < 3)) s.ab.pending = null;
  s.mode = s.mode === 'farm' ? 'farm' : 'auto';
  s.look = Object.assign(freshState().look, s.look);
  if (s.look.body === 'f' && !(o.look && o.look.headStyle)) s.look.headStyle = '긴 머리'; delete s.look.body; // 예전 저장: 여자 → 긴 머리
  delete s.look.outfit; // 예전 '기본 옷' → 상의·하의
  s.look.headStyle = heroPart('hair', HERO_PARTS.hair[s.look.headStyle] ? s.look.headStyle : '뾰족 머리'); s.look.top = heroPart('top', s.look.top); s.look.bottom = heroPart('bottom', s.look.bottom); s.look.costume = heroCostume(s.look.costume);
  return s;
}
// 1판 저장(골드로 능력치를 사던 때) → 2판. 강화에 쓴 골드는 모두 돌려준다. 1판 저장은 지우지 않는다.
function migrateV1(o) {
  const up = { atk: [8, 1.12], spd: [15, 1.35], crit: [20, 1.3], hp: [8, 1.15], gold: [25, 1.22] };
  let refund = 0;
  for (const k in up) { const lv = Math.floor((o.lv && o.lv[k]) || 0); for (let i = 0; i < lv; i++) refund += Math.ceil(up[k][0] * Math.pow(up[k][1], i)); }
  const s = freshState();
  s.gold = (o.gold || 0) + refund; s.stage = Math.max(1, Math.floor(o.stage || 1)); s.maxStage = Math.max(s.stage, Math.floor(o.maxStage || 1));
  s.mode = o.farm ? 'farm' : 'auto'; s.lastSeen = o.lastSeen || Date.now();
  if (refund > 0) s.notes.push(`예전 강화에 쓴 ${fmt(refund)} 골드를 돌려받았어요.`);
  return s;
}
function load() {
  const raw = store.get(GAME.SAVE_KEY);
  if (raw) {
    try { S = sane(unpack(raw)); seenBefore = S.lastSeen; return 'ok'; }
    catch (e) {
      store.set(GAME.SAVE_KEY + '.corrupt.' + Date.now(), raw); // 망가진 원본은 보관
      const bak = store.get(GAME.BACKUP_KEY);
      if (bak) { try { S = sane(unpack(bak)); seenBefore = S.lastSeen; S.notes.push('저장이 망가져서 백업으로 되살렸어요.'); return 'backup'; } catch (e2) { /* 백업도 실패 */ } }
      S = freshState(); S.notes.push('저장을 읽지 못해 새로 시작해요. 망가진 저장은 따로 보관했어요.'); return 'fresh';
    }
  }
  const old = store.get(GAME.OLD_KEY);
  if (old) { try { S = migrateV1(unpack(old)); seenBefore = S.lastSeen; return 'migrated'; } catch (e) { /* 1판도 못 읽음 */ } }
  S = freshState(); return 'new';
}
function exportSave() { return btoa(unescape(encodeURIComponent(pack(S)))); }
function importSave(text) { const o = unpack(decodeURIComponent(escape(atob(text.trim())))); store.set(GAME.BACKUP_KEY, pack(S)); S = sane(o); markDirty(); save(); }

// ---------- 숫자 표기 ----------
const UNITS = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
function fmt(n) { if (!isFinite(n)) return '∞'; n = Math.floor(n); if (n < 10000) return String(n); for (const [u, s] of UNITS) if (n >= u) { const v = n / u; return (v >= 100 ? Math.floor(v) : Math.floor(v * 10) / 10) + s; } return String(n); }

// ---------- 장비 ----------
const itemById = id => S.inv.find(it => it.id === id);
const equipped = () => SLOTS.map(sl => itemById(S.eq[sl.id])).filter(Boolean);
// 장비 = 지역(r) 한 벌의 한 부위. 등급은 능력치와 이펙트만 바꾸고 그림은 같다 (데이터/장비.json)
const itemKey = it => (it.t === 'weapon' ? it.wt : it.t);
function itemName(it) { const set = regionSet(it.r || 1); return `${GRADES[it.g].prefix} ${set ? set.items[itemKey(it)] : (it.t === 'weapon' ? WEAPONS[it.wt].n : SLOTS.find(s => s.type === it.t).n)}`; }
const itemPng = it => (GEAR_FILE[itemKey(it)] && regionSet(it.r || 1) ? `에셋/장비/${regionSet(it.r || 1).folder}/${GEAR_FILE[itemKey(it)]}.png` : null); // 반지·목걸이는 그림 없음
const ST = k => (ITEMS && ITEMS.stats[k]) || { weaponAtk: [4, 0.1], armorHp: [6, 0.15], armorDef: [1, 0.5], accessory: { atk: [2, 0.06], hp: [1.5, 0.04], def: [0.6, 0.3], acc: [3, 0.9], pick: 2 }, lineGrow: 0.2, grow: 1.08 }[k];
const lin = ([a, b], lv) => a + lv * b;                       // 직선 성장 (방어·명중)
const linG = (ab, lv) => lin(ab, lv) * Math.pow(ST('grow'), lv); // 지수 성장 (공격·체력): 몬스터 체력이 단계마다 지수로 느는 것을 따라간다
function makeItem(type, g, ilvl, o = {}) {
  const GT = GRADES[g].stat, it = { id: S.nextId++, t: type, r: o.r || regionOf(ilvl), g, lv: ilvl, base: {}, lines: [], lock: false, isNew: true }; // 등급 수치표 (데이터/장비.json grades[].stat)
  if (type === 'weapon') {
    it.wt = o.wt || pick(['sword', 'gun', 'wand']);
    it.base.atk = Math.round(linG(ST('weaponAtk'), ilvl) * GT.atk);
  } else if (ARMOR[type]) {
    it.base.hp = Math.round(linG(ST('armorHp'), ilvl) * GT.hp * ARMOR[type]); it.base.def = round1(lin(ST('armorDef'), ilvl) * GT.def * ARMOR[type]);
  } else {
    const A = ST('accessory'), V = { atk: linG(A.atk, ilvl) * GT.atk, hp: linG(A.hp, ilvl) * GT.hp, def: lin(A.def, ilvl) * GT.def, acc: lin(A.acc, ilvl) * GT.def };
    const ks = ['atk', 'hp', 'def', 'acc'].sort(() => R() - 0.5).slice(0, A.pick);
    for (const k of ks) it.base[k] = k === 'def' ? round1(V[k]) : Math.round(V[k]);
  }
  const pool = EQUIP_LINES.slice();
  for (let i = 0; i < GRADES[g].lines; i++) { const k = pool.splice(Math.floor(R() * pool.length), 1)[0], L2 = LINES[k]; it.lines.push({ k, v: round1((L2.lo + (L2.hi - L2.lo) * R()) * GRADES[g].lineMul) }); }
  return it;
}
const bagUsed = () => S.inv.length - equipped().length; // 가방 칸 = 끼지 않은 장비 수 (화면의 "n / 60"과 같은 셈)
function gainItem(it) {
  if (it.g <= S.set.autoDisMax && !isFantasiaWeapon(it)) { const gold = BAL.dismantle(it.g) * (1 + it.lv * 0.1); addGold(gold); return { dismantled: gold }; }
  if (bagUsed() >= BAL.bagMax && isFantasiaWeapon(it)) { S.inv.push(it); newItems = true; toast(`가방이 가득 찼지만 ${itemName(it)}은(는) 보관했어요.`); return { kept: true, over: true }; } // 판타지아는 잃지 않게 한 칸 넘겨 둔다
  if (bagUsed() >= BAL.bagMax) { // 가방이 차면 몰래 버리지 않고 골드로 바꾸고 알린다
    const gold = BAL.dismantle(it.g) * (1 + it.lv * 0.1); addGold(gold); toast(`가방이 가득 차서 ${itemName(it)}을(를) ${fmt(gold)} 골드로 바꿨어요.`); return { dismantled: gold };
  }
  S.inv.push(it); newItems = true; return { kept: true };
}
const isFantasiaWeapon = it => it.t === 'weapon' && it.g === 4;
// ---------- 환생 ----------
// 칸·등급 잠금 (지금은 모두 열려 있다. data.js BAL.rebirth.slotAt / gradeAt 에 환생 횟수를 적으면 잠긴다)
const slotOpenAt = (slotId, rb) => rb >= (BAL.rebirth.slotAt[slotId] || 0);
const slotOpen = slotId => slotOpenAt(slotId, S.rebirth);
const gradeOpen = g => S.rebirth >= (BAL.rebirth.gradeAt[g] || 0);
const openSlots = () => SLOTS.filter(sl => slotOpen(sl.id));
// 환생 보너스: 점수마다 영구 공격·체력 +2%, 골드·경험치 +1%
const rbPower = () => 1 + S.rbPts * BAL.rebirth.powerPer, rbIncome = () => 1 + S.rbPts * BAL.rebirth.incomePer;
const rebirthGain = () => Math.floor(S.maxStage * BAL.rebirth.ptsPer); // 지금 환생하면 받는 점수 = 이번 바퀴 최고 단계
const canRebirth = () => S.maxStage >= BAL.rebirth.minStage;
// 스킬트리·펫 (자리): 찍은 노드와 펫의 옵션 줄을 능력치에 더한다
const treeLines = () => Object.keys(S.tree).flatMap(id => { for (const w in SKILL_TREE) { const nd = SKILL_TREE[w].nodes.find(n => n.id === id); if (nd) return nd.lines || []; } return []; });
const petLines = () => { const p = S.pet && PETS.find(x => x.id === S.pet); return p ? p.lines || [] : []; };
function doRebirth() {
  if (!canRebirth()) return false;
  const wt = stats().wt;
  S.rbPts += rebirthGain(); S.rebirth++; S.stage = 1; S.maxStage = 1; S.lv = 1; S.exp = 0; S.pts = 0; S.stat = { str: 0, vit: 0, dex: 0 }; S.mode = 'auto';
  S.inv = S.inv.filter(it => it.lock); S.eq = {}; // 잠근 장비만 남는다
  giveStarter(wt); markDirty(); applyLook();
  Object.assign(G, { foes: [], shots: [], fx: [], pops: [], coins: [], loot: [], count: 0, bossWave: false, skill: null, skillCd: 6, cam: 0, deathStreak: 0 });
  G.hero.hp = stats().hp; G.hero.state = 'walk'; save(); return true;
}
function equip(it, slotId) {
  const sl = slotId || (it.t === 'ring' ? (!S.eq.ring1 && slotOpen('ring1') ? 'ring1' : !S.eq.ring2 && slotOpen('ring2') ? 'ring2' : 'ring1') : it.t);
  if (SLOTS.find(s => s.id === sl).type !== it.t || !slotOpen(sl)) return;
  for (const s of ['ring1', 'ring2']) if (S.eq[s] === it.id) delete S.eq[s]; // 같은 반지를 두 칸에 끼지 않게
  S.eq[sl] = it.id; it.isNew = false; markDirty(); applyLook(); save();
}
function unequip(slotId) { delete S.eq[slotId]; markDirty(); applyLook(); save(); }
function isEquipped(it) { return Object.values(S.eq).includes(it.id); }
function dismantle(it) { if (it.lock || isEquipped(it)) return 0; const gold = BAL.dismantle(it.g) * (1 + it.lv * 0.1); S.inv = S.inv.filter(x => x !== it); addGold(gold); save(); return gold; }
function enhance(slotId) {
  const lv = S.enh[slotId] || 0, cost = BAL.enhCost(lv);
  if (lv >= BAL.enhMax || S.gold < cost) return false;
  S.gold -= cost; S.enh[slotId] = lv + 1; markDirty(); save(); return true;
}

// ---------- 능력치 계산 (UI와 전투가 같은 길을 쓴다) ----------
let statCache = null;
function markDirty() { statCache = null; }
function stats() {
  if (statCache) return statCache;
  const base = { atk: 0, hp: 0, def: 0, acc: 0 }, ln = {};
  for (const sl of SLOTS) {
    const it = slotOpen(sl.id) && itemById(S.eq[sl.id]); if (!it) continue;
    const em = 1 + (S.enh[sl.id] || 0) * BAL.enhPer;
    for (const k in it.base) base[k] += it.base[k] * em;
    for (const l of it.lines) ln[l.k] = (ln[l.k] || 0) + l.v;
  }
  S.ab.slots.forEach((sl, i) => { if (sl && i < abSlotCount()) ln[sl.k] = (ln[sl.k] || 0) + abValue(sl.k, sl.q, S.ab.lv); });
  for (const l of [...treeLines(), ...petLines()]) ln[l.k] = (ln[l.k] || 0) + l.v; // 스킬트리·펫 (자리)
  const g = k => ln[k] || 0;
  const str = S.stat.str * (1 + g('strP') / 100), vit = S.stat.vit * (1 + g('vitP') / 100), dex = S.stat.dex * (1 + g('dexP') / 100);
  const w = itemById(S.eq.weapon), wt = w ? w.wt : 'sword', W2 = WEAPONS[wt];
  const s = {
    wt, weapon: w, wr: w ? w.r || 1 : 1, wg: w ? w.g : 0, // 무기 지역·등급 (그림·이펙트·판타지아 스킬)
    atk: (6 + base.atk) * (1 + str * BAL.statPct.str) * rbPower(), hp: Math.round((100 + base.hp) * (1 + vit * BAL.statPct.vit) * rbPower()), def: base.def + vit * 0.6, acc: 90 + base.acc + dex * 2,
    crit: Math.min(BAL.critCap, 0.05 + g('crit') / 100), critDmg: 1.5 + g('critDmg') / 100, dmgMul: 1 + g('dmg') / 100,
    minD: 0.8 * (1 + g('minD') / 100), maxD: 1.2 * (1 + g('maxD') / 100 + dex * 0.004),
    aspd: Math.min(W2.aspd * BAL.aspdCap, W2.aspd * (1 + g('aspd') / 100)), goldMul: (1 + g('gold') / 100) * rbIncome(), expMul: (1 + g('exp') / 100) * rbIncome(),
    str, vit, dex, lines: ln,
  };
  if (s.minD > s.maxD) s.minD = s.maxD;
  s.hit = s.atk * s.dmgMul * W2.mul * (s.minD + s.maxD) / 2;
  s.dps = s.hit * (1 + s.crit * (s.critDmg - 1)) * s.aspd;
  statCache = s; return s;
}

// ---------- 성장 ----------
function addGold(n) { if (!(n > 0) || !isFinite(n)) return; S.gold += n; }
function addExp(n, mul = stats().expMul) {
  S.exp += n * mul; let ups = 0;
  while (S.exp >= BAL.expNeed(S.lv)) { S.exp -= BAL.expNeed(S.lv); S.lv++; S.pts += BAL.ptsPerLv; ups++; }
  return ups;
}
function spendPoint(k, n = 1) { n = Math.min(n, S.pts); if (n <= 0) return; S.stat[k] += n; S.pts -= n; markDirty(); save(); }
function autoSpend() {
  const add = { str: 0, vit: 0, dex: 0 }; let pts = S.pts; if (pts <= 0) return;
  const s = stats(), eva = foeEva(S.stage, 'swarm'); let acc = s.acc, str = S.stat.str, vit = S.stat.vit;
  while (pts-- > 0) { const hit = BAL.hitRate(acc, eva); const k = hit < 0.95 ? 'dex' : str <= vit * 2 ? 'str' : 'vit'; add[k]++; if (k === 'dex') acc += 2; else if (k === 'str') str++; else vit++; }
  for (const k in add) if (add[k]) { S.stat[k] += add[k]; S.pts -= add[k]; }
  markDirty(); save();
}
function resetStats() { S.pts += S.stat.str + S.stat.vit + S.stat.dex; S.stat = { str: 0, vit: 0, dex: 0 }; markDirty(); save(); }

// ---------- 어빌리티 ----------
const abSlotCount = () => BAL.abSlotAt.filter(l => S.ab.lv >= l).length;
const abValue = (k, q, lv) => round1((LINES[k].lo + (LINES[k].hi - LINES[k].lo) * q) * (1 + (lv - 1) * BAL.abGrow)); // 어빌리티 레벨마다 옵션 값이 자란다
function abLevelUp() { const c = BAL.abCost(S.ab.lv); if (S.ab.lv >= BAL.abMax || S.gold < c) return false; S.gold -= c; S.ab.lv++; markDirty(); save(); return true; }
function abRoll(i) {
  if (S.ab.pending || i >= abSlotCount()) return false;
  const c = BAL.abRoll(S.ab.lv); if (S.gold < c) return false;
  const taken = S.ab.slots.filter((s, j) => s && j !== i && j < abSlotCount()).map(s => s.k);
  const k = pick(AB_LINES.filter(x => !taken.includes(x)));
  S.gold -= c; S.ab.pending = { i, k, q: R() }; save(); // 결과를 먼저 저장해 다시 켜서 공짜로 바꾸지 못하게
  return true;
}
function abChoose(takeNew) { const p = S.ab.pending; if (!p) return; if (takeNew || !S.ab.slots[p.i]) S.ab.slots[p.i] = { k: p.k, q: p.q }; S.ab.pending = null; markDirty(); save(); }

// ---------- 외형 ----------
function buyLook(kind, id) { const L2 = LOOKS[kind].find(x => x.id === id); if (!L2 || S.look.owned.includes(id) || S.gold < L2.cost) return false; S.gold -= L2.cost; S.look.owned.push(id); S.look[kind] = id; save(); applyLook(); return true; }
function wearLook(kind, id) { if (!S.look.owned.includes(id)) return; S.look[kind] = id; save(); applyLook(); }
function applyLook() {
  const h = LOOKS.hair.find(x => x.id === S.look.hair) || LOOKS.hair[0], t = LOOKS.tunic.find(x => x.id === S.look.tunic) || LOOKS.tunic[0];
  PALS._heroBase = PALS._heroBase || { ...PALS.hero };
  Object.assign(PALS.hero, PALS._heroBase, { h: h.c[0], H: h.c[1], g: mix(h.c[0], '#5a3020', 0.3), G: mix(h.c[0], '#3a2018', 0.55), t: t.c[0], T: t.c[1] });
  // 입은 방어구의 지역 → 그 지역 장비 덧그림 (art.js heroMaps). 무기는 PNG를 손에 쥔다 (gear.js)
  const gear = {}; for (const k of ['head', 'body', 'arms', 'legs', 'feet']) { const it = itemById(S.eq[k]); if (it) gear[k] = it.r || 1; }
  const hk = heroMaps(S.look.headStyle, S.look.top, S.look.bottom, S.look.costume, gear); // 고른 헤어·상의·하의 + 장비
  for (const k of ['A', 'B', 'C', 'D', 'GA', 'GB', 'GC', 'GD', 'GR']) MAPS['hero' + k] = MAPS[hk + k];
  if (typeof heroWeaponOf === 'function') HERO_WEAPON = heroWeaponOf(itemById(S.eq.weapon));
  cache.clear(); if (typeof gearCut !== 'undefined') gearCut.clear(); // 용사 그림을 새 옷·색으로 다시 만든다
}

// ---------- 방치 보상 ----------
// 지금 스테이지를 안정적으로 잡는다고 보고, 1초당 골드·경험치를 어림한다.
function idleRates(stage) {
  const s = stats(), hp = BAL.monHp(stage), n = BAL.pack(stage), aoe = s.wt === 'sword' ? Math.min(1.5, n) : s.wt === 'wand' ? Math.min(1.8, n) : 1.25;
  const defMul = 100 / (100 + BAL.monDef(stage) * 2) * BAL.hitRate(s.acc, foeEva(stage, 'swarm')); // 몬스터 방어와 빗나감 (실제 반복 사냥과 맞춤: 도구/시험/시나리오/방치비교.js)
  const perKill = hp / Math.max(1e-6, s.dps * aoe * defMul) + 5 / n; // 잡는 시간 + 다음 무리까지 걷는 시간
  return { gold: BAL.monGold(stage) * s.goldMul / perKill, exp: BAL.monExp(stage) * s.expMul / perKill };
}
function offlineReward() {
  const from = seenBefore || S.lastSeen; seenBefore = 0; // 켠 뒤 처음 한 번은 저장에 적힌 접속 시각부터 (타이틀에서 기다린 시간은 세지 않는다)
  const sec = Math.min(BAL.offlineCapSec, Math.max(0, (Date.now() - from) / 1000));
  S.lastSeen = Date.now();
  if (sec < BAL.offlineMinSec) return null;
  const r = idleRates(S.stage), gold = Math.floor(sec * r.gold * BAL.offlineRate), exp = Math.floor(sec * r.exp * BAL.offlineRate);
  if (gold < 1 && exp < 1) return null;
  addGold(gold); const ups = addExp(exp, 1); save(); // idleRates가 이미 경험치 옵션을 곱했다 — 여기서 다시 곱하지 않는다
  return { sec, gold, exp, ups };
}
