'use strict';
// =====================================================================
// 타이틀, 캐릭터 만들기, 메뉴, 관리자(테스트), 알림
// 메뉴 모양: 레퍼런스/UI (왼쪽 세로 탭 · 가운데 판 · 오른쪽 자세히 보기, 밝은 양피지 판 + 금색 주 버튼)
// Electron에서는 메뉴를 열 때 창이 위·옆으로 늘어난다(preload의 window.bar). 전투 띠는 아래 가운데 그대로.
// =====================================================================
let newItems = false, menuOpen = false, tab = 'equip', eqSel = 'weapon', invSel = null, invFilter = 'all', invSort = 'grade', enhSel = 'weapon', lookKind = 'hair', regSel = 0;
const MENU_H = 400, MENU_W = 760;
const $ = sel => document.querySelector(sel);
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) { if (k === 'on') for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]); else if (k === 'style') Object.assign(e.style, attrs.style); else if (k in e && k !== 'list') e[k] = attrs[k]; else e.setAttribute(k, attrs[k]); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
function pixImg(canvas, size, cls = '') { // size = 긴 쪽 길이 (가로세로 비율은 그대로). 0이면 크기를 나중에 정한다
  // 그림으로 내보내지(toDataURL) 않고 캔버스를 복사해 넣는다 — 브라우저로 열면 PNG를 그린 캔버스는 내보내기가 막힌다
  const i = document.createElement('canvas'); i.className = 'pix ' + cls; i.width = canvas.width; i.height = canvas.height;
  const g = i.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(canvas, 0, 0);
  if (size) { const k = size / Math.max(canvas.width, canvas.height); i.style.width = canvas.width * k + 'px'; i.style.height = canvas.height * k + 'px'; }
  return i;
}
const gradeName = g => h('span', { className: 'gname g' + g }, GRADES[g].n);
function gradeSpan(g, text) { return h('span', { className: 'gt' + g }, text); }

// ---------- 아이콘 (에셋/아이콘/*.png → 코드/그림/icons.js) ----------
const ICON_OF = { char: '캐릭터', equip: '장비', ability: '어빌리티', region: '지역', look: '외형', set: '설정', quit: '게임 종료', bag: '장비', enh: '장비' };
function tabIcon(id) { return iconCanvas(ICON_OF[id]); }
function iconImg(c, k = 2) { return pixImg(c, Math.max(c.width, c.height) * k); } // 칸 크기 그대로 k배 (흐려지지 않게)
const coinImg = () => pixImg(iconCanvas('골드'), 11);
const TABS = [['equip', '장비'], ['char', '스탯'], ['bag', '가방'], ['enh', '강화'], ['ability', '어빌리티'], ['look', '외형'], ['region', '사냥터']];

// ---------- 그림: 지역 풍경 · 주인공 ----------
function cv(w, h2) { const c = document.createElement('canvas'); c.width = w; c.height = h2; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
// 지역 풍경 (칸 = 2px): 하늘 → 먼 언덕 → 소품 → 땅. 캐릭터 카드·장비 판·사냥터 목록이 함께 쓴다
function sceneCanvas(r, w, h2, props = true) {
  const reg = REGIONS[r - 1], [c, g] = cv(w, h2), GY = h2 - 14, sky = g.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, mix(reg.tint, '#ffffff', 0.45)); sky.addColorStop(1, mix(reg.tint, '#ffffff', 0.82)); g.fillStyle = sky; g.fillRect(0, 0, w, GY);
  g.fillStyle = mix(reg.tint, '#ffffff', 0.3); // 먼 언덕 (계단진 둥근 덩이)
  for (let i = 0; i < w / 40 + 1; i++) { const cx = i * 44 + (i % 2) * 14, rr = 18 + (i % 3) * 6; for (let dy = -rr; dy <= 0; dy += 2) { const hw = Math.round(Math.sqrt(rr * rr - dy * dy) / 2) * 2; g.fillRect(cx - hw, GY + dy - 2, hw * 2, 2); } }
  const T = typeof TERRAIN !== 'undefined' && TERRAIN[r];
  if (props && T) { // 지형지물 PNG: 먼 배경 하나(옅게, 칸 1개 = 1px로 멀리) + 가까운 소품 둘(주인공과 같은 크기)
    if (T.far[0]) drawTerr(r, T.far[0], Math.round(w * 0.5), GY + 1, 0.55, g, 1);
    T.near.slice(0, 2).forEach((it, i) => drawTerr(r, it, Math.round(w * [0.0, 0.74][i]), GY + 2, 0.9, g, PX)); // 가까운 소품은 주인공과 같은 밀도
  } else if (props) reg.props.slice(0, 3).forEach((id, i) => { const a = forgeArt(PROP[id]); if (a) { const sc = 1; g.globalAlpha = i === 1 ? 0.55 : 0.8; g.drawImage(a.c, Math.round(w * [0.12, 0.62, 0.84][i] - a.w / 2), GY - a.h * sc, a.w * sc, a.h * sc); g.globalAlpha = 1; } });
  const tile = T && T.tile && terrImg(r, T.tile);
  if (tile) { const it = T.tile; for (let x = 0; x < w; x += it.w * PX) g.drawImage(tile, it.x, it.y, it.w, it.h, x, GY - PX, it.w * PX, it.h * PX); if (it.h * PX < h2 - GY) { g.fillStyle = reg.ground[1]; g.fillRect(0, GY - PX + it.h * PX, w, h2); } }
  else {
    g.fillStyle = reg.ground[0]; g.fillRect(0, GY, w, 4); g.fillStyle = reg.ground[1]; g.fillRect(0, GY + 4, w, h2 - GY - 4);
    g.fillStyle = reg.ground[2]; for (let x = 0; x < w; x += 12) g.fillRect(x + ((x / 12) % 2) * 6, GY + 8, 6, 2);
    g.fillStyle = reg.deco; for (let x = 6; x < w; x += 22) if (rnd(x + r * 7) > 0.5) g.fillRect(x, GY - 2, 2, 2);
  }
  return c;
}
// 지금 모습 (입은 장비 그대로, 칸 = 2px). pose: 엽총은 두 손 자세
function heroCanvas(w = 120, h2 = 72, cx = 42) {
  const [c, g] = cv(w, h2), prev = L; L = g;
  const wt = HERO_WEAPON ? HERO_WEAPON.wt : 'sword';
  try { drawGearHero(cx, h2 - 2, 'A', wt === 'gun' ? gearAttackPose(0.9, 'gun') : null, HERO_WEAPON, 0); } finally { L = prev; }
  return c;
}
function heroOnScene(r, w, h2, cx) { const bg = sceneCanvas(r, w, h2), g = bg.getContext('2d'), hc = heroCanvas(w, h2 - 10, cx); g.drawImage(hc, 0, 0); return bg; }

// ---------- 열고 닫기 ----------
// view: title 타이틀 / make 캐릭터 만들기 / menu 메뉴 / admin 관리자(테스트)
let mview = 'menu', confirmNew = false, confirmReset = 0;
const setBodyMode = () => { document.body.classList.toggle('menu-open', menuOpen); document.body.classList.toggle('making', menuOpen && mview === 'make'); document.body.classList.toggle('titling', menuOpen && mview === 'title'); };
// user=false(처음 켤 때 타이틀 등)면 창을 늘리기만 하고 앞으로 끌어오지 않는다 — 다른 프로그램을 쓰는 중에 가로채지 않게
function openMenu(which, user = true) {
  if (which) tab = which;
  mview = 'menu'; menuOpen = true; setBodyMode();
  window.bar && window.bar.menu(true, MENU_H, user, MENU_W);
  renderMenu();
}
function openTitle(user = false) {
  mview = 'title'; confirmNew = false; G.paused = true; menuOpen = true; setBodyMode();
  window.bar && window.bar.menu(true, MENU_H, user, MENU_W);
  renderMenu();
}
function closeMenu() { if (!S.name || mview === 'title' || mview === 'make') return; menuOpen = false; setBodyMode(); window.bar && window.bar.menu(false); newItems = false; for (const it of S.inv) it.isNew = false; save(); }
function quitGame() { save(); if (window.bar) window.bar.quit(); else { menuOpen = false; setBodyMode(); toast('저장했어요. 브라우저 탭을 닫으면 끝나요.'); } }

function renderMenu() {
  const root = $('#menu'); root.replaceChildren(); setBodyMode();
  if (mview === 'title') { root.append(titleView()); return; }
  if (mview === 'make' || !S.name) { mview = 'make'; setBodyMode(); root.append(makeView()); return; }
  if (mview === 'admin') { root.append(frame(adminView(), null)); return; }
  const views = { equip: equipView, char: charView, bag: bagView, enh: enhView, ability: abilityView, look: lookView, region: regionView, set: setView };
  const [main, side] = views[tab]();
  root.append(frame(main, side));
}
// 틀: 머리줄(이름·골드·설정·닫기) + 왼쪽 세로 탭 + 가운데 판 + 오른쪽 판
function frame(main, side) {
  const head = h('div', { className: 'mhead' },
    h('div', { className: 'brand' }, iconImg(tabIcon('equip'), 1.5), 'MY LITTLE FANTASY'), h('span', { className: 'grow' }), goldLine(),
    h('button', { className: 'hbtn' + (tab === 'set' ? ' on' : ''), title: '설정', on: { click: () => { tab = 'set'; mview = 'menu'; renderMenu(); } } }, iconImg(tabIcon('set'), 1.5)),
    h('button', { className: 'hbtn', title: '닫기', on: { click: closeMenu } }, '✕'));
  const nav = h('nav', { className: 'side-tabs' }, TABS.map(([id, n]) => h('button', { className: 'stab' + (tab === id && mview === 'menu' ? ' on' : ''), on: { click: () => { tab = id; mview = 'menu'; renderMenu(); } } }, iconImg(tabIcon(id), 1.5), h('span', {}, n), tabDot(id))));
  return h('div', { className: 'frame' }, head, h('div', { className: 'mbody' }, nav, h('section', { className: 'panel main' }, main), side ? h('section', { className: 'panel side' }, side) : null));
}
function tabDot(id) { const on = (id === 'char' && S.pts > 0) || (id === 'bag' && newItems) || (id === 'ability' && S.ab.pending); return on ? h('i', { className: 'dot' }) : null; }
function refresh() { if (menuOpen) { const sc = [...document.querySelectorAll('#menu .scroll')].map(e => e.scrollTop); renderMenu(); document.querySelectorAll('#menu .scroll').forEach((e, i) => { e.scrollTop = sc[i] || 0; }); } }
function goldLine() { return h('div', { className: 'gold' }, coinImg(), ' ', fmt(S.gold)); }
function power(s = stats()) { return Math.round(s.dps * 6 + s.hp * 0.4 + s.def * 6); }
const ptitle = (t, ...rest) => h('div', { className: 'ptitle' }, h('h2', {}, t), ...rest);
const sect = (t, ...kids) => h('div', { className: 'sect' }, h('div', { className: 'shead' }, t), ...kids);
const kvRow = (n, v, cls = '') => h('div', { className: 'kv ' + cls }, h('span', {}, n), h('b', {}, v));

// ---------- 타이틀 ----------
function titleArt() {
  const r = regionOf(S.maxStage || 1), bg = sceneCanvas(r, 240, 72), g = bg.getContext('2d'), reg = REGIONS[r - 1];
  g.drawImage(heroCanvas(120, 62, 44), 10, 0);
  [reg.mons[0], reg.mons[2], reg.boss].forEach((id, i) => { const a = forgeArt(MON[id]); if (a) g.drawImage(a.c, 140 + i * 30, 58 - a.h, a.w, a.h); });
  return bg;
}
function hasSave() { return !!S.name; }
function startGame() {
  if (!S.name) { makeInit(); mview = 'make'; renderMenu(); return; } // 새 모험 → 캐릭터 만들기 (전투는 멈춘 채)
  G.paused = false; grantOffline(); menuOpen = true; mview = 'menu'; closeMenu();
}
function titleView() {
  const btns = h('div', { className: 'tbtns' });
  if (hasSave()) btns.append(h('button', { className: 'primary big', on: { click: startGame } }, '이어하기', h('small', {}, ` ${S.name} · Lv.${S.lv} · ${stageLabel(S.stage)}`)));
  if (confirmNew) btns.append(h('div', { className: 'confirm' }, '지금 저장을 지우고 새로 시작할까요?',
    h('div', { className: 'btns' }, h('button', { className: 'danger', on: { click: () => { resetGame(); confirmNew = false; startGame(); } } }, '지우고 시작'), h('button', { on: { click: () => { confirmNew = false; renderMenu(); } } }, '아니요'))));
  else btns.append(h('button', { className: hasSave() ? 'big' : 'primary big', on: { click: () => { if (hasSave()) { confirmNew = true; renderMenu(); } else startGame(); } } }, '게임 시작'));
  btns.append(h('button', { className: 'big', on: { click: quitGame } }, '게임 종료'));
  return h('div', { className: 'titlescreen' },
    h('div', { className: 'logo' }, h('small', {}, 'MY LITTLE FANTASY'), '꼬마 용사 방치 모험'),
    (() => { const i = pixImg(titleArt(), 0); i.style.width = '480px'; i.style.height = '144px'; i.className += ' titleart'; return i; })(),
    btns);
}
function resetGame() {
  try { localStorage.removeItem(GAME.SAVE_KEY); localStorage.removeItem(GAME.BACKUP_KEY); } catch (e) { /* 저장소 없음 */ }
  S = freshState(); markDirty(); applyLook();
  Object.assign(G, { foes: [], shots: [], fx: [], pops: [], coins: [], loot: [], count: 0, bossWave: false, skill: null, skillCd: 6, cam: 0 });
  G.hero.hp = stats().hp; G.hero.state = 'walk';
  save();
}

// ---------- 캐릭터 만들기 (레퍼런스/UI/캐릭터 생성창.png: 왼쪽 캐릭터 카드, 오른쪽은 화살표로 고르기) ----------
// 전투 띠는 가리고 전투도 멈춘다. 헤어 2 · 상의 2 · 하의 3 · 첫 무기(1지역 무기 3종 중 하나)
const MAKE = {
  hair: [['뾰족 머리', '뾰족 머리'], ['단발', '단발']],
  top: [['기본', '반팔'], ['긴팔티', '긴팔']],
  bottom: [['기본', '긴바지'], ['반바지', '반바지'], ['치마', '치마']],
  wt: [['sword', '검'], ['gun', '엽총'], ['wand', '완드']],
};
let makeSel = { hair: 0, top: 0, bottom: 0, wt: 0, name: '' };
function makeInit() { makeSel = { hair: 0, top: 0, bottom: 0, wt: 0, name: '' }; G.paused = true; makeApply(); }
function makeApply() { // 고른 모습을 미리 입혀 본다 (무기는 1지역 일반 무기)
  S.look.headStyle = heroPart('hair', MAKE.hair[makeSel.hair][0]); S.look.top = heroPart('top', MAKE.top[makeSel.top][0]); S.look.bottom = heroPart('bottom', MAKE.bottom[makeSel.bottom][0]); S.look.costume = '없음';
  applyLook(); HERO_WEAPON = heroWeaponOf({ t: 'weapon', wt: MAKE.wt[makeSel.wt][0], r: 1, g: 0 });
}
function makeView() {
  const inp = h('input', { className: 'name', maxLength: 8, placeholder: '1~8글자', value: makeSel.name, on: { input: e => { makeSel.name = e.target.value; plate.textContent = e.target.value.trim() || '모험가'; } } });
  const err = h('div', { className: 'err' });
  const plate = h('div', { className: 'plate' }, makeSel.name.trim() || '모험가');
  const ok = () => {
    const v = inp.value.trim(); if (!v || v.length > 8) { err.textContent = '이름을 1~8글자로 지어 주세요.'; inp.focus(); return; } if (/[<>&"'\\]/.test(v)) { err.textContent = '특수 기호는 쓸 수 없어요.'; return; }
    S.name = v; giveStarter(MAKE.wt[makeSel.wt][0]); applyLook(); G.hero.hp = stats().hp; save();
    G.paused = false; mview = 'menu'; menuOpen = true; tab = 'equip'; closeMenu(); toast(`${v}의 모험이 시작돼요!`);
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  setTimeout(() => { if (!makeSel.name) inp.focus(); }, 50);
  const wname = i => `${GRADES[0].prefix} ${regionSet(1) ? regionSet(1).items[MAKE.wt[i][0]] : MAKE.wt[i][1]}`;
  const row = (key, label, list, text = i => list[i][1]) => h('div', { className: 'mrow' }, h('b', {}, label),
    h('div', { className: 'picker' }, h('button', { className: 'arrow', title: '앞', on: { click: () => { makeSel[key] = (makeSel[key] + list.length - 1) % list.length; makeApply(); renderMenu(); } } }, '◀'),
      h('span', { className: 'val' }, text(makeSel[key])),
      h('button', { className: 'arrow', title: '뒤', on: { click: () => { makeSel[key] = (makeSel[key] + 1) % list.length; makeApply(); renderMenu(); } } }, '▶')));
  const card = h('div', { className: 'panel makecard' }, h('div', { className: 'ptitle center' }, h('h2', {}, '캐릭터 생성')),
    h('div', { className: 'scene' }, plate, (() => { const i = pixImg(heroOnScene(1, 150, 104, 60), 0); i.style.width = '300px'; i.style.height = '208px'; return i; })()),
    h('div', { className: 'chips' }, h('span', { className: 'chip' }, WEAPONS[MAKE.wt[makeSel.wt][0]].n), h('span', { className: 'chip' }, wname(makeSel.wt))));
  const form = h('div', { className: 'panel makeform' },
    h('div', { className: 'mrow' }, h('b', {}, '닉네임'), inp), err,
    row('hair', '헤어스타일', MAKE.hair), row('top', '상의', MAKE.top), row('bottom', '하의', MAKE.bottom),
    row('wt', '무기', MAKE.wt, i => `${MAKE.wt[i][1]} · ${wname(i)}`),
    h('div', { className: 'sub' }, '첫 무기는 1지역 일반 무기예요. 무기 종류에 따라 싸우는 방식이 달라요.'));
  return h('div', { className: 'frame make' },
    h('div', { className: 'mhead' }, h('div', { className: 'brand' }, iconImg(tabIcon('equip'), 1.5), 'MY LITTLE FANTASY'), h('span', { className: 'grow' })),
    h('div', { className: 'mbody makebody' }, card, form),
    h('div', { className: 'mfoot' }, h('button', { className: 'big', on: { click: () => { S.look = freshState().look; applyLook(); openTitle(true); } } }, '← 뒤로'), h('span', { className: 'grow' }),
      h('button', { className: 'primary big', on: { click: ok } }, '모험 시작')));
}

// ---------- 관리자 (테스트) ----------
function adminView() {
  const row = (name, ...kids) => h('div', { className: 'arow' }, h('b', {}, name), ...kids);
  const btn = (label, fn, cls = '') => h('button', { className: cls, on: { click: () => { fn(); markDirty(); save(); refresh(); } } }, label);
  const stInp = h('input', { type: 'number', min: 1, value: S.stage, style: { width: '70px' } });
  const fr = h('select', {}, REGIONS.map((reg, i) => h('option', { value: i + 1 }, `${i + 1}지역 ${regionSet(i + 1) ? regionSet(i + 1).fantasia.name : ''}`)));
  const fw = h('select', {}, Object.entries(WEAPONS).map(([k, w]) => h('option', { value: k }, w.n)));
  return h('div', { className: 'admin scroll' },
    ptitle('관리자 · 테스트', h('button', { on: { click: () => { mview = 'menu'; renderMenu(); } } }, '← 돌아가기')),
    h('div', { className: 'sub' }, '시험용 메뉴입니다. 여기서 바꾼 것도 저장됩니다.'),
    row('배속', ...[1, 2, 5, 10].map(v => h('button', { className: G.speed === v ? 'on' : '', on: { click: () => { G.speed = v; refresh(); } } }, `×${v}`))),
    row('골드', btn('+1만', () => addGold(1e4)), btn('+100만', () => addGold(1e6)), btn('+1억', () => addGold(1e8))),
    row('레벨', btn('+1', () => addExp(BAL.expNeed(S.lv) - S.exp + 1)), btn('+10', () => { for (let i = 0; i < 10; i++) addExp(BAL.expNeed(S.lv) - S.exp + 1); })),
    row('스테이지', stInp, btn('이동', () => { const v = Math.max(1, Math.floor(+stInp.value || 1)); S.maxStage = Math.max(S.maxStage, v); goStage(v); }), btn('보스 바로', () => { G.count = BAL.killsPerStage; S.mode = 'auto'; })),
    row('전투', btn(G.god ? '무적 끄기' : '무적 켜기', () => { G.god = !G.god; }), btn('스킬 바로 쓰기', () => { G.skillCd = 0; }), btn('체력 채우기', () => { G.hero.hp = stats().hp; })),
    row('판타지아', fr, fw, btn('받기', () => { const it = makeItem('weapon', 4, S.stage, { r: +fr.value, wt: fw.value }); S.inv.push(it); newItems = true; })),
    row('장비', btn('무작위 10개', () => { for (let i = 0; i < 10; i++) gainItem(makeItem(pick(['weapon', 'head', 'body', 'arms', 'legs', 'feet', 'ring', 'neck']), weighted([20, 30, 25, 18, 7]), S.stage, { r: 1 + Math.floor(R() * 8) })); })),
    row('방치 보상', btn('1시간 비운 척', () => { S.lastSeen -= 3600 * 1000; grantOffline(); }), btn('8시간', () => { S.lastSeen -= 8 * 3600 * 1000; grantOffline(); })),
    row('기타', btn('타이틀 보기', () => { save(); openTitle(true); })),
    h('div', { className: 'danger-zone' },
      confirmReset === 0 ? h('button', { className: 'danger', on: { click: () => { confirmReset = 1; refresh(); } } }, '게임 데이터 초기화')
        : h('div', {}, '정말 모든 저장을 지울까요? 되돌릴 수 없어요. ',
          h('button', { className: 'danger', on: { click: () => { confirmReset = 0; resetGame(); openTitle(true); } } }, '네, 지워요'),
          h('button', { on: { click: () => { confirmReset = 0; refresh(); } } }, '아니요'))));
}

// ---------- 장비 칸 · 아이템 공용 ----------
function statsWith(it) { // 이 장비를 끼면 어떻게 되는지 (실제 계산 경로 그대로)
  const saved = { ...S.eq }; equipTemp(it); markDirty(); const s = stats(); S.eq = saved; markDirty(); return s;
}
function equipTemp(it) { const sl = it.t === 'ring' ? (!S.eq.ring1 ? 'ring1' : !S.eq.ring2 ? 'ring2' : 'ring1') : it.t; for (const k of ['ring1', 'ring2']) if (S.eq[k] === it.id) delete S.eq[k]; S.eq[sl] = it.id; }
const statVal = (k, v) => (k === 'def' ? v.toFixed(1) : fmt(v));
const typeName = it => (it.t === 'weapon' ? WEAPONS[it.wt].n : SLOTS.find(s => s.type === it.t).n);
const skillName = it => (it.t === 'weapon' && it.g === 4 && regionSet(it.r) ? regionSet(it.r).fantasia.name : null);
function itemIconEl(it, size) { const c = itemIcon(it); return c.dataset.wait ? h('span', { className: 'ph' }) : pixImg(c, size); } // 그림을 아직 못 불러왔으면 빈 칸 (불러오면 다시 그린다)
function slotBtn(sl, sel, onClick, showEnh = true) {
  const it = itemById(S.eq[sl.id]);
  return h('button', { className: 'slot' + (sel === sl.id ? ' on' : '') + (it ? ' g' + it.g : ''), title: sl.n, on: { click: onClick } },
    it ? itemIconEl(it, 30) : h('span', { className: 'empty' }, '+'), h('small', { className: 'sn' }, sl.n), showEnh && S.enh[sl.id] ? h('em', {}, '+' + S.enh[sl.id]) : null);
}
// 오른쪽 판: 아이템 한 개 자세히 (기본 옵션 · 추가 옵션 · 비교)
function itemDetail(it, enh = 0, cmp = null) {
  const em = 1 + enh * BAL.enhPer, nowS = cmp && stats(), nextS = cmp && statsWith(it);
  const cmpOf = { atk: 'atk', hp: 'hp', def: 'def', acc: 'acc' };
  return h('div', { className: 'idetail' },
    h('div', { className: 'ihead' }, h('div', { className: 'ibox g' + it.g }, itemIconEl(it, 44)),
      h('div', {}, h('div', { className: 'iname' }, gradeSpan(it.g, itemName(it))), h('div', { className: 'chips' }, h('span', { className: 'chip' }, typeName(it)), gradeName(it.g), h('span', { className: 'chip' }, `Lv.${it.lv}`)), enh ? h('div', { className: 'enh' }, '+' + enh) : null)),
    sect('기본 옵션', ...Object.entries(it.base).map(([k, v]) => {
      const d = cmp ? nextS[cmpOf[k]] - nowS[cmpOf[k]] : 0;
      return h('div', { className: 'kv' }, h('span', {}, STAT_NAMES[k]), h('b', { className: 'plus' }, '+' + statVal(k, v * em)), cmp && Math.abs(d) >= 0.05 ? h('small', { className: d > 0 ? 'up' : 'down' }, `${d > 0 ? '▲' : '▼'} ${statVal(k, Math.abs(d))}`) : null);
    })),
    it.lines.length ? sect('추가 옵션', ...it.lines.map(l => kvRow(LINES[l.k].n, `+${l.v}${LINES[l.k].unit}`, 'line'))) : null,
    skillName(it) ? sect('판타지아 스킬', h('div', { className: 'skill' }, `${skillName(it)} — ${regionSet(it.r).set} 지역의 힘`)) : null,
    cmp ? h('div', { className: 'kv total' }, h('span', {}, '초당 피해'), h('b', {}, fmt(nextS.dps)), (() => { const d = nextS.dps - nowS.dps; return Math.abs(d) >= 0.5 ? h('small', { className: d > 0 ? 'up' : 'down' }, `${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}`) : null; })()) : null);
}

// ---------- 장비 ----------
function equipView() {
  const s = stats(), cur = itemById(S.eq[eqSel]), lv = S.enh[eqSel] || 0, slotDef = SLOTS.find(x => x.id === eqSel);
  const pick2 = id => () => { eqSel = id; refresh(); };
  const L1 = ['weapon', 'body', 'legs', 'ring1'], R1 = ['head', 'arms', 'feet', 'neck', 'ring2'], sl = id => slotBtn(SLOTS.find(x => x.id === id), eqSel, pick2(id));
  const stage = pixImg(heroOnScene(regionOf(S.stage), 150, 100, 62), 0); stage.style.width = '300px'; stage.style.height = '200px';
  const main = h('div', { className: 'eq' },
    ptitle('장비', h('small', {}, `Lv.${S.lv} · ${WEAPONS[s.wt].n}`)),
    h('div', { className: 'eqgrid' }, h('div', { className: 'scol' }, L1.map(sl)), h('div', { className: 'eqstage' }, stage), h('div', { className: 'scol' }, R1.map(sl))),
    h('div', { className: 'bigstats' }, kvRow('공격력', fmt(s.atk)), kvRow('체력', fmt(s.hp)), kvRow('방어력', s.def.toFixed(1)), kvRow('전투력', fmt(power(s)))));
  const side = cur
    ? h('div', { className: 'sidein' }, itemDetail(cur, lv), h('div', { className: 'btns bottom' },
      h('button', { on: { click: () => { cur.lock = !cur.lock; save(); refresh(); } } }, cur.lock ? '잠금 풀기' : '잠금'),
      h('button', { on: { click: () => { unequip(eqSel); refresh(); } } }, '빼기'),
      h('button', { className: 'primary', on: { click: () => { enhSel = eqSel; tab = 'enh'; refresh(); } } }, '강화하기')))
    : h('div', { className: 'sidein empty' }, h('div', { className: 'sub' }, `${slotDef.n} 칸이 비어 있어요.`), h('button', { className: 'primary', on: { click: () => { invFilter = 'slot:' + slotDef.type; tab = 'bag'; refresh(); } } }, '가방에서 고르기'));
  return [main, side];
}

// ---------- 가방 ----------
function bagView() {
  let list = S.inv.filter(it => !isEquipped(it));
  if (invFilter === 'weapon') list = list.filter(it => it.t === 'weapon');
  else if (invFilter === 'armor') list = list.filter(it => ARMOR[it.t]);
  else if (invFilter === 'acc') list = list.filter(it => it.t === 'ring' || it.t === 'neck');
  else if (invFilter.startsWith('slot:')) list = list.filter(it => it.t === invFilter.slice(5));
  list.sort(invSort === 'grade' ? (a, b) => b.g - a.g || b.lv - a.lv : invSort === 'level' ? (a, b) => b.lv - a.lv || b.g - a.g : (a, b) => b.id - a.id);
  const used = S.inv.length - Object.keys(S.eq).length;
  const cells = list.map(it => h('button', { className: 'item g' + it.g + (invSel === it.id ? ' on' : ''), title: itemName(it), on: { click: () => { invSel = it.id; refresh(); } } },
    itemIconEl(it, 28), it.isNew ? h('i', { className: 'dot' }) : null, it.lock ? h('em', { className: 'lock' }, '🔒') : null));
  for (let i = cells.length; i < Math.max(15, Math.ceil(cells.length / 5) * 5); i++) cells.push(h('div', { className: 'item empty' }));
  const main = h('div', { className: 'bag' },
    ptitle('가방', h('small', {}, `${used} / ${BAL.bagMax}`)),
    h('div', { className: 'bagbar' },
      h('div', { className: 'seg' }, [['all', '전체'], ['weapon', '무기'], ['armor', '방어구'], ['acc', '장신구']].map(([v, n]) => h('button', { className: invFilter === v ? 'on' : '', on: { click: () => { invFilter = v; refresh(); } } }, n))),
      h('span', { className: 'grow' }),
      h('select', { on: { change: e => { invSort = e.target.value; refresh(); } } }, [['grade', '등급순'], ['level', '레벨순'], ['new', '최근순']].map(([v, n]) => h('option', { value: v, selected: invSort === v }, n)))),
    invFilter.startsWith('slot:') ? h('div', { className: 'sub' }, `${SLOTS.find(s => s.type === invFilter.slice(5)).n} 장비만 보는 중 `, h('button', { className: 'mini', on: { click: () => { invFilter = 'all'; refresh(); } } }, '모두 보기')) : null,
    h('div', { className: 'items scroll' }, cells),
    h('div', { className: 'autodis' }, h('b', {}, '자동 분해'), GRADES.slice(0, 4).map((g, i) => h('label', {}, h('input', { type: 'checkbox', checked: S.set.autoDis[i], on: { change: e => { S.set.autoDis[i] = e.target.checked; save(); } } }), gradeName(i))), h('small', {}, '판타지아는 분해하지 않아요')));
  const sel = invSel && itemById(invSel);
  const side = sel && !isEquipped(sel)
    ? h('div', { className: 'sidein' }, h('div', { className: 'scroll grow' }, itemDetail(sel, 0, true)), h('div', { className: 'btns bottom' },
      h('button', { on: { click: () => { sel.lock = !sel.lock; save(); refresh(); } } }, sel.lock ? '잠금 풀기' : '잠금'),
      h('button', { disabled: sel.lock, on: { click: () => { const g = dismantle(sel); if (g) toast(`${fmt(g)} 골드를 얻었어요.`); invSel = null; refresh(); } } }, '분해 ', coinImg(), fmt(BAL.dismantle(sel.g) * (1 + sel.lv * 0.1))),
      h('button', { className: 'primary', on: { click: () => { equip(sel); eqSel = sel.t === 'ring' ? (S.eq.ring1 === sel.id ? 'ring1' : 'ring2') : sel.t; invSel = null; refresh(); } } }, '장착')))
    : h('div', { className: 'sidein empty' }, h('div', { className: 'sub' }, '아이템을 누르면 자세히 볼 수 있어요.'));
  return [main, side];
}

// ---------- 강화 (칸 강화: 장비를 바꿔도 강화는 칸에 남는다) ----------
function enhView() {
  const main = h('div', {}, ptitle('장비 강화'), h('div', { className: 'sub' }, '장비를 바꿔도 강화는 그 칸에 남아요.'),
    h('div', { className: 'enhgrid' }, SLOTS.map(sl => { const b = slotBtn(sl, enhSel, () => { enhSel = sl.id; refresh(); }, false); b.append(h('b', { className: 'lvtag' }, '+' + (S.enh[sl.id] || 0))); return b; })));
  const sl = SLOTS.find(x => x.id === enhSel), it = itemById(S.eq[enhSel]), lv = S.enh[enhSel] || 0, cost = BAL.enhCost(lv), max = lv >= BAL.enhMax;
  const a = 1 + lv * BAL.enhPer, b = 1 + (lv + 1) * BAL.enhPer;
  const side = h('div', { className: 'sidein' },
    h('div', { className: 'ihead' }, h('div', { className: 'ibox' + (it ? ' g' + it.g : '') }, it ? itemIconEl(it, 44) : h('span', { className: 'empty' }, sl.n)),
      h('div', {}, h('div', { className: 'iname' }, it ? gradeSpan(it.g, itemName(it)) : `${sl.n} 칸`), h('div', { className: 'enhbig' }, `+${lv}`, max ? null : h('span', {}, ' → '), max ? null : h('b', {}, `+${lv + 1}`)))),
    sect('능력치 변화', it ? Object.entries(it.base).map(([k, v]) => h('div', { className: 'kv' }, h('span', {}, STAT_NAMES[k]), h('span', {}, statVal(k, v * a)), h('span', { className: 'arr' }, '→'), h('b', { className: 'plus' }, max ? '최대' : statVal(k, v * b))))
      : h('div', { className: 'sub' }, '칸에 장비가 없어도 강화할 수 있어요. 끼는 장비에 적용돼요.')),
    h('div', { className: 'grow' }),
    h('div', { className: 'kv cost' }, h('span', {}, '강화 비용'), h('b', {}, coinImg(), ' ', max ? '-' : fmt(cost))),
    h('button', { className: 'primary big wide', disabled: max || S.gold < cost, on: { click: () => { if (enhance(enhSel)) { G.hero.lvFx = G.t - 0.6; refresh(); } } } }, max ? '최대 강화' : '강화하기'));
  return [main, side];
}

// ---------- 스탯 ----------
function charView() {
  const s = stats(), need = BAL.expNeed(S.lv), pct = Math.min(99.99, 100 * S.exp / need);
  const pv = pixImg(heroOnScene(regionOf(S.stage), 100, 76, 38), 0); pv.style.width = '150px'; pv.style.height = '114px';
  const row = (k, n, desc, gain) => h('div', { className: 'statrow' }, h('div', {}, h('b', {}, n), h('small', {}, desc)), h('span', { className: 'v' }, S.stat[k]),
    h('button', { className: 'pm', disabled: S.pts < 1, on: { click: () => { spendPoint(k); refresh(); } } }, '+1'), h('button', { className: 'pm', disabled: S.pts < 10, on: { click: () => { spendPoint(k, 10); refresh(); } } }, '+10'), h('small', { className: 'gain' }, gain));
  const main = h('div', {},
    ptitle('스탯', h('small', {}, `${S.name} · Lv.${S.lv}`)),
    h('div', { className: 'stattop' }, pv, h('div', { className: 'grow' },
      h('div', { className: 'expbar' }, h('i', { style: { width: pct + '%' } }), h('span', {}, `EXP ${pct.toFixed(2)}%`)),
      h('div', { className: 'ptsbox' }, h('span', {}, '남은 포인트'), h('b', {}, S.pts)),
      h('button', { on: { click: () => { resetStats(); refresh(); } } }, '초기화 (무료)'))),
    row('str', '힘', '공격력 증가', '1당 공격력 +1.5'), row('vit', '근력', '체력 · 방어력 증가', '1당 체력 +12'), row('dex', '민첩', '명중 · 최대 데미지 증가', '1당 명중 +2'));
  const side = h('div', { className: 'sidein scroll' }, ptitle('최종 능력치'),
    kvRow('공격력', fmt(s.atk)), kvRow('체력', fmt(s.hp)), kvRow('방어력', s.def.toFixed(1)), kvRow('명중', fmt(s.acc)),
    kvRow('치명타 확률', (s.crit * 100).toFixed(1) + '%'), kvRow('치명타 피해', Math.round(s.critDmg * 100) + '%'),
    kvRow('공격 속도', s.aspd.toFixed(2) + '회/초'), kvRow('데미지', '+' + Math.round((s.dmgMul - 1) * 100) + '%'),
    kvRow('데미지 범위', `${Math.round(s.minD * 100)}~${Math.round(s.maxD * 100)}%`), kvRow('초당 피해(예상)', fmt(s.dps)),
    kvRow('골드 획득', '+' + Math.round((s.goldMul - 1) * 100) + '%'), kvRow('경험치 획득', '+' + Math.round((s.expMul - 1) * 100) + '%'));
  return [main, side];
}

// ---------- 어빌리티 ----------
function abilityView() {
  const n = abSlotCount(), lvCost = BAL.abCost(S.ab.lv), roll = BAL.abRoll(S.ab.lv), p = S.ab.pending;
  const txt = sl => sl ? `${LINES[sl.k].n} +${abValue(sl.k, sl.q, S.ab.lv)}${LINES[sl.k].unit}` : '비어 있음';
  const main = h('div', {},
    ptitle('어빌리티', h('small', {}, `Lv.${S.ab.lv}`)),
    h('div', { className: 'abtop' }, iconImg(tabIcon('ability'), 2.5), h('div', { className: 'grow' }, h('b', {}, S.ab.lv >= BAL.abMax ? '최대 레벨' : `다음 레벨 ${S.ab.lv + 1}`), h('div', { className: 'sub' }, '레벨을 올리면 모든 칸 수치가 오르고, 10·20레벨에 칸이 열려요.')),
      h('button', { className: 'primary', disabled: S.ab.lv >= BAL.abMax || S.gold < lvCost, on: { click: () => { abLevelUp(); refresh(); } } }, '레벨 업 ', coinImg(), fmt(lvCost))),
    [0, 1, 2].map(i => h('div', { className: 'abslot' + (i >= n ? ' locked' : '') + (p && p.i === i ? ' on' : '') },
      h('b', { className: 'num' }, i + 1),
      h('div', { className: 'grow' }, i >= n ? h('span', {}, `Lv.${BAL.abSlotAt[i]}에 열려요`) : h('span', { className: 'abv' }, txt(S.ab.slots[i]))),
      i < n ? h('button', { disabled: !!p || S.gold < roll, on: { click: () => { abRoll(i); refresh(); } } }, S.ab.slots[i] ? '변경' : '뽑기') : null)),
    h('div', { className: 'kv foot' }, h('span', {}, `칸 ${n} / 3`), h('span', {}, '변경 비용 ', coinImg(), ' ', fmt(roll))));
  const side = p
    ? h('div', { className: 'sidein' }, ptitle('옵션 선택', h('small', {}, `${p.i + 1}번 칸`)),
      h('div', { className: 'opt' }, h('small', {}, '기존 옵션'), h('b', {}, txt(S.ab.slots[p.i]))), h('div', { className: 'arrowdown' }, '▼'),
      h('div', { className: 'opt new' }, h('small', {}, '새 옵션'), h('b', { className: 'plus' }, txt(p))),
      h('div', { className: 'grow' }),
      h('div', { className: 'btns bottom' }, S.ab.slots[p.i] ? h('button', { on: { click: () => { abChoose(false); refresh(); } } }, '기존 유지') : null, h('button', { className: 'primary', on: { click: () => { abChoose(true); refresh(); } } }, '새 옵션 선택')))
    : h('div', { className: 'sidein empty' }, h('div', { className: 'sub' }, '칸의 [변경]을 누르면 새 옵션이 나와요. 새 것과 지금 것 중 하나를 고를 수 있어요. 같은 옵션은 두 칸에 나오지 않아요.'));
  return [main, side];
}

// ---------- 외형 ----------
function lookView() {
  const list = LOOKS[lookKind];
  const main = h('div', {},
    ptitle('외형'), h('div', { className: 'seg wide' }, [['hair', '머리 색'], ['tunic', '옷 색']].map(([k, n]) => h('button', { className: lookKind === k ? 'on' : '', on: { click: () => { lookKind = k; refresh(); } } }, n))),
    h('div', { className: 'looks scroll' }, list.map(x => {
      const own = S.look.owned.includes(x.id), on = S.look[lookKind] === x.id;
      return h('button', { className: 'lookcard' + (on ? ' on' : ''), on: { click: () => { own ? wearLook(lookKind, x.id) : buyLook(lookKind, x.id); refresh(); } }, disabled: !own && S.gold < x.cost },
        h('i', { style: { background: `linear-gradient(135deg, ${x.c[0]} 50%, ${x.c[1]} 50%)` } }), h('b', {}, x.n), own ? h('small', {}, on ? '입는 중' : '보유') : h('small', { className: 'price' }, coinImg(), fmt(x.cost)));
    })));
  const pv = pixImg(heroOnScene(regionOf(S.stage), 110, 84, 44), 0); pv.style.width = '220px'; pv.style.height = '168px';
  const side = h('div', { className: 'sidein' }, ptitle('미리보기'), h('div', { className: 'pvbox' }, pv), h('div', { className: 'sub' }, '외형은 능력치를 바꾸지 않아요. 한 번 사면 계속 쓸 수 있어요.'));
  return [main, side];
}

// ---------- 사냥터 ----------
function regionView() {
  const maxR = regionOf(S.maxStage), here = regionOf(S.stage); if (!regSel) regSel = here;
  const main = h('div', {}, ptitle('사냥터'),
    h('div', { className: 'reglist scroll' }, REGIONS.map((reg, i) => {
      const r = i + 1, open = r <= maxR;
      const pic = pixImg(sceneCanvas(r, 90, 34), 0); pic.style.width = '90px'; pic.style.height = '34px';
      return h('button', { className: 'regrow' + (open ? '' : ' locked') + (regSel === r ? ' on' : ''), on: { click: () => { regSel = r; refresh(); } } }, pic,
        h('div', { className: 'grow' }, h('b', {}, open ? reg.n : '???'), h('small', {}, open ? reg.hint : '아직 가 보지 못한 땅')),
        here === r ? h('span', { className: 'chip gold' }, '현재 ', stageLabel(S.stage)) : open ? h('span', { className: 'chip green' }, '선택 가능') : h('span', { className: 'chip' }, '🔒'));
    })));
  const r = regSel, reg = REGIONS[r - 1], open = r <= maxR, set = regionSet(r);
  const first = (r - 1) * BAL.stagesPerRegion + 1, stages = Array.from({ length: 10 }, (_, j) => first + j).filter(st => st <= S.maxStage);
  const pic = pixImg(sceneCanvas(r, 110, 40), 0); pic.style.width = '100%'; pic.style.height = 'auto';
  const mons = [...reg.mons.slice(0, 4), reg.boss].map(id => { const a = forgeArt(MON[id]); return a ? h('div', { className: 'mon' }, pixImg(a.c, 26)) : null; });
  const drops = set ? ['sword', 'gun', 'wand', 'head', 'body'].map(k => { const it = { t: WEAPONS[k] ? 'weapon' : k, wt: k, r, g: 0 }; return h('div', { className: 'drop', title: `${set.items[k]}` }, itemIconEl(it, 24)); }) : [];
  const side = open ? h('div', { className: 'sidein' },
    ptitle(reg.n, stages.length ? h('select', { on: { change: e => { goStage(+e.target.value); refresh(); } } }, stages.map(st => h('option', { value: st, selected: st === S.stage }, stageLabel(st)))) : null),
    h('div', { className: 'scroll grow' }, h('div', { className: 'sub' }, reg.hint), pic,
    sect('등장 몬스터', h('div', { className: 'icons' }, mons)),
    set ? sect('주요 드롭', h('div', { className: 'icons' }, drops), h('small', {}, `${set.set} 세트 · 판타지아: ${set.fantasia.name}`)) : null,
    sect('사냥 방식', h('div', { className: 'seg' }, h('button', { className: S.mode === 'auto' ? 'on' : '', on: { click: () => { setMode('auto'); refresh(); } } }, '자동 진행'), h('button', { className: S.mode === 'farm' ? 'on' : '', on: { click: () => { setMode('farm'); refresh(); } } }, '반복 사냥')),
      h('div', { className: 'kv' }, h('span', {}, '일반 몬스터'), h('b', {}, `${Math.min(G.count, BAL.killsPerStage)} / ${BAL.killsPerStage}`)))),
    h('div', { className: 'btns bottom' }, h('button', { className: 'primary', disabled: here === r, on: { click: () => { goStage(stages[stages.length - 1] || first); refresh(); } } }, here === r ? '이곳에서 사냥 중' : '이곳에서 사냥'),
      h('button', { disabled: here !== r, on: { click: () => { G.count = BAL.killsPerStage; S.mode = 'auto'; toast('우두머리에게 도전해요!'); refresh(); } } }, '우두머리 도전')))
    : h('div', { className: 'sidein empty' }, h('div', { className: 'sub' }, '앞 지역의 우두머리를 쓰러뜨리면 열려요.'));
  return [main, side];
}

// ---------- 설정 ----------
function setView() {
  const name = h('input', { maxLength: 8, value: S.name }), io = h('textarea', { rows: 4, placeholder: '여기에 저장 문자열을 붙여 넣고 [가져오기]' });
  const main = h('div', { className: 'settings' },
    ptitle('설정'),
    h('div', { className: 'arow' }, h('b', {}, '닉네임'), name, h('button', { on: { click: () => { const v = name.value.trim(); if (v && v.length <= 8 && !/[<>&"'\\]/.test(v)) { S.name = v; save(); toast('이름을 바꿨어요.'); } } } }, '바꾸기')),
    h('div', { className: 'arow' }, h('b', {}, '번쩍임 세기'), h('input', { type: 'range', min: 0, max: 100, value: Math.round((S.set.flash ?? 1) * 100), on: { input: e => { S.set.flash = e.target.value / 100; save(); } } })),
    h('div', { className: 'sub' }, saveFailed ? '⚠ 저장에 실패하고 있어요. 저장 공간을 확인해 주세요.' : '5초마다 자동으로 저장해요. 1분마다 백업도 남겨요.'),
    h('div', { className: 'arow' }, h('button', { on: { click: () => { mview = 'admin'; confirmReset = 0; renderMenu(); } } }, '🛠 관리자 (테스트 메뉴)'), h('button', { on: { click: () => { save(); openTitle(true); } } }, '타이틀로')),
    h('button', { className: 'danger wide', on: { click: quitGame } }, iconImg(tabIcon('quit')), ' 게임 종료'));
  const side = h('div', { className: 'sidein' }, ptitle('저장 옮기기'),
    h('div', { className: 'btns' }, h('button', { on: { click: () => { io.value = exportSave(); io.select(); try { navigator.clipboard.writeText(io.value); toast('저장 문자열을 복사했어요.'); } catch (e) { /* 복사 권한 없음 */ } } } }, '내보내기'),
      h('button', { on: { click: () => { try { importSave(io.value); applyLook(); toast('불러왔어요. 전에 쓰던 저장은 백업해 두었어요.'); refresh(); } catch (e) { toast('저장 문자열이 올바르지 않아요.'); } } } }, '가져오기')), io);
  return [main, side];
}

// ---------- 알림 ----------
let toastTimer = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3500); }
