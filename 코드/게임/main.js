'use strict';
// =====================================================================
// 시작, 돌리기, 입력. 전투는 setInterval(창이 가려져도 돈다), 그리기는 requestAnimationFrame.
// 오래 멈췄다 돌아오면(30초 넘게) 그 시간은 방치 보상으로 정산한다.
// =====================================================================
const view = { cv: document.getElementById('cv') };
view.c = view.cv.getContext('2d');
function fit() { const w = Math.max(1, Math.round(view.cv.clientWidth * (devicePixelRatio || 1))); view.cv.width = w; view.cv.height = Math.round((w * H) / W); }
new ResizeObserver(fit).observe(view.cv);

function fmtTime(sec) { const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60); return hh ? `${hh}시간 ${mm}분` : `${mm}분`; }
function grantOffline() { const off = offlineReward(); if (off) toast(`자리를 비운 ${fmtTime(off.sec)} 동안 ${fmt(off.gold)} 골드와 경험치 ${fmt(off.exp)}을 모았어요.${off.ups ? ` 레벨이 ${off.ups} 올랐어요!` : ''}`); }

// 처음 무기: 1지역 일반 무기 (캐릭터를 만들 때 고른 종류, 옛 저장에 무기가 없으면 검)
function giveStarter(wt = 'sword') { if (S.eq.weapon) return; const it = makeItem('weapon', 0, 1, { wt, r: 1 }); it.isNew = false; S.inv.push(it); S.eq.weapon = it.id; markDirty(); }
// 장비 그림을 다 불러오면 아이콘·주인공을 다시 그린다
function markGearDirty() { clearTimeout(markGearDirty.t); markGearDirty.t = setTimeout(() => { if (typeof gearCut !== 'undefined') gearCut.clear(); if (menuOpen) refresh(); }, 80); }
// 경험치 막대 (바뀔 때만 고친다)
const expEl = { bar: document.querySelector('#expbar i'), txt: document.querySelector('#expbar span'), last: '' };
function drawExp() {
  const pct = Math.min(99.99, (100 * S.exp) / BAL.expNeed(S.lv)), t = `EXP ${pct.toFixed(2)}%`;
  if (t === expEl.last) return; expEl.last = t; expEl.txt.textContent = t; expEl.bar.style.width = pct + '%';
}
function init() {
  document.fonts && document.fonts.load('12px Galmuri11');
  preloadGear(); preloadTerrain(); load(); markDirty();
  if (S.name) giveStarter();
  applyLook();
  G.hero.hp = stats().hp;
  const notes = S.notes; S.notes = [];
  notes.forEach((n, i) => setTimeout(() => toast(n), 3800 * (i + 1)));
  save();
  openTitle(false); // 켜면 타이틀부터 (방치 보상은 [이어하기]를 누를 때)
  let last = performance.now();
  setInterval(() => {
    const now = performance.now(), gap = (now - last) / 1000; last = now;
    if (G.paused) { S.lastSeen = Date.now(); return; } // 타이틀 화면에서는 멈춤
    if (gap > 30) { grantOffline(); return; }
    let left = gap * (G.speed || 1); while (left > 0) { const d = Math.min(1 / 30, left); update(d); left -= d; }
  }, 1000 / 30);
  setInterval(() => { save(); if (menuOpen && tab !== 'set') softRefresh(); }, 5000);
  addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  const frame = () => { try { render(view); drawExp(); } catch (e) { console.error(e); } requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}
// 메뉴의 골드 숫자 등은 5초마다 살짝 새로 그린다(입력 중인 칸은 건드리지 않게)
function softRefresh() { if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return; refresh(); }

// ---------- 입력 ----------
const inRect = (p, r) => p.x >= r[0] && p.x < r[0] + r[2] && p.y >= r[1] && p.y < r[1] + r[3];
view.cv.addEventListener('pointerdown', e => {
  const r = view.cv.getBoundingClientRect(), p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  if (G.paused) return;
  if (inRect(p, HUD.menu)) { menuOpen ? closeMenu() : openMenu(); return; }
  if (inRect(p, HUD.mode) || inRect(p, HUD.stage)) { setMode(S.mode === 'auto' ? 'farm' : 'auto'); toast(S.mode === 'auto' ? '자동 도전: 10마리를 잡으면 우두머리에 도전해요.' : '반복 사냥: 이 스테이지에 머물며 힘을 길러요.'); return; }
  if (inRect(p, HUD.gold)) { openMenu('equip'); return; }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen && mview === 'admin') { mview = 'menu'; renderMenu(); } else if (e.key === 'Escape' && menuOpen) closeMenu(); });
init();
