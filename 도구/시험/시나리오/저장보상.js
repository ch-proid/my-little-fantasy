// 저장·방치 보상·가방 시험. 실제 저장 경로(localStorage → load → 이어하기)로 확인한다.
// PARAM: { hours: 비운 시간(시), expBonus: 경험치 옵션 %, bag: 가방 시험 여부 }
const P = Object.assign({ hours: 1, expBonus: 15, bag: true }, PARAM);
const out = {};
// 1) 과거 접속 시각이 든 저장을 만들고 다시 읽은 뒤 [이어하기]로 정산한다 (처음 켤 때의 init 순서와 같게: load → save → 타이틀 → startGame)
resetGame(); S.name = '시험'; giveStarter('sword'); applyLook(); S.stage = 12; S.maxStage = 12; S.lv = 10;
if (P.expBonus) S.ab.slots[0] = { k: 'exp', q: 1 }; // 경험치 +15% (q=1 → 최댓값)
markDirty(); save();
const past = Date.now() - P.hours * 3600 * 1000;
{ const o = unpack(store.get(GAME.SAVE_KEY)); o.lastSeen = past; store.set(GAME.SAVE_KEY, pack(o)); }
load(); markDirty(); const seenAfterLoad = S.lastSeen; save(); openTitle(false); // init() 과 같은 순서
await new Promise(r => setTimeout(r, 1500)); // 타이틀에서 잠깐 기다린다 (타이머가 lastSeen을 건드리는지)
const expBefore = S.exp, lvBefore = S.lv, goldBefore = S.gold, expMul = stats().expMul;
const direct = idleRates(S.stage); // 계산상 기대값
let toastMsg = ''; const _toast = toast; toast = m => { toastMsg = m; };
startGame(); toast = _toast;
const gained = (() => { let e = S.exp - expBefore; for (let l = lvBefore; l < S.lv; l++) e += BAL.expNeed(l); return e; })();
const expect = Math.min(BAL.offlineCapSec, P.hours * 3600) * BAL.offlineRate;
out.offline = { hours: P.hours, lastSeenAgeAtLoad: Math.round((Date.now() - seenAfterLoad) / 1000), gold: Math.round(S.gold - goldBefore), expGained: Math.round(gained), expShown: +(toastMsg.match(/경험치 ([\d.만억]+)/) || [])[1] || 0, expMul,
  expectGold: Math.round(expect * direct.gold), expectExp: Math.round(expect * direct.exp), toast: toastMsg.slice(0, 80) };
// 같은 보상을 두 번 받는지: 바로 다시 이어하기
{ const g = S.gold; openTitle(false); startGame(); out.offline.doubleGrant = Math.round(S.gold - g); }
// 2) 가방: 장착 9개 + 가방 60개일 때 새 장비와 판타지아 무기를 얻으면
if (P.bag) {
  S.inv = []; S.eq = {}; S.nextId = 1;
  for (const sl of SLOTS) { const it = makeItem(sl.type, 1, 5, { r: 1, wt: 'sword' }); S.inv.push(it); S.eq[sl.id] = it.id; }
  while (S.inv.length - Object.keys(S.eq).length < BAL.bagMax) S.inv.push(makeItem('head', 0, 5, { r: 1 }));
  const shown = S.inv.length - Object.keys(S.eq).length, g0 = S.gold;
  const r1 = gainItem(makeItem('body', 2, 5, { r: 1 }));
  const r2 = gainItem(makeItem('weapon', 4, 5, { r: 1, wt: 'gun' }));
  out.bag = { shownUsed: shown, max: BAL.bagMax, normalKept: !!r1.kept, fantasiaKept: !!r2.kept, fantasiaInBag: S.inv.some(isFantasiaWeapon), goldFromOverflow: Math.round(S.gold - g0) };
}
// 3) 망가진 중첩 값이 든 저장을 읽어도 멈추지 않는지
out.sane = {};
for (const [name, patch] of [['stat null', o => { o.stat = null; }], ['없는 어빌리티', o => { o.ab.slots[0] = { k: 'nope', q: 0.5 }; }], ['없는 장비 옵션', o => { o.inv[0] && o.inv[0].lines.push({ k: 'zzz', v: 3 }); }], ['강화 음수', o => { o.enh = { weapon: -5, zzz: 99 }; }], ['set 깨짐', o => { o.set = null; }]]) {
  try { const o = unpack(store.get(GAME.SAVE_KEY)); patch(o); const s2 = sane(o); markDirty(); const keep = S; S = s2; stats(); S = keep; markDirty(); out.sane[name] = 'ok'; } catch (e) { out.sane[name] = '오류: ' + String(e.message).slice(0, 60); }
}
return out;
