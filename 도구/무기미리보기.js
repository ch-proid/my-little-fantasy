'use strict';
// =====================================================================
// 화면 조립: 보이는 카드만 그린다. ?t=1.5 → 그 시각에 멈춘 채 모두 그린다(확인용).
// =====================================================================
const GRADE = { 일반: '#ffffff', 레어: '#4aa8ff', 유니크: '#ffc83d', 레전더리: '#ff4d5e', 판타지아: '#b48cff' };
const LINES = { 일반: 0, 레어: 1, 유니크: 2, 레전더리: 3, 판타지아: 4 };
const WNAME = { sword: '검', gun: '엽총', wand: '완드' };
const FIXED = new URLSearchParams(location.search).has('t') ? Number(new URLSearchParams(location.search).get('t')) : null;
const views = [];
let speed = 1;
const io = new IntersectionObserver(es => es.forEach(en => { if (FIXED == null) en.target._view.vis = en.isIntersecting; }));
const ro = new ResizeObserver(es => es.forEach(en => { const c = en.target, w = Math.max(1, Math.round(c.clientWidth * (devicePixelRatio || 1))); c.width = w; c.height = Math.round((w * H) / W); }));
function addView(cv, p) { const v = { cv, c: cv.getContext('2d'), p, vis: FIXED != null }; cv._view = v; views.push(v); io.observe(cv); ro.observe(cv); return v; }

function drawNums(c) {
  c.textAlign = 'center'; c.lineJoin = 'round';
  for (const n of nums) {
    c.globalAlpha = Math.max(0, n.a); c.font = `bold ${n.size}px ${FONT}`; c.lineWidth = Math.max(2, n.size / 4);
    c.strokeStyle = COLORS.stroke; c.strokeText(n.s, n.x, n.y); c.fillStyle = col(n.c); c.fillText(n.s, n.x, n.y);
  }
  c.globalAlpha = 1;
}
function drawView(v, clock) {
  const p = v.p, t = clock % p.dur;
  L = bctx; bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.drawImage(backdrop, 0, 0); resetCtx(bctx);
  nums.length = 0;
  const sh = p.shake ? p.shake(t) : 0, f = Math.floor(t * 50);
  const ox = sh ? Math.round((rnd(f) - 0.5) * 2 * sh) : 0, oy = sh ? Math.round((rnd(f + 99) - 0.5) * 2 * sh) : 0;
  bctx.translate(ox, oy);
  scene(p, t);
  const c = v.c, cw = v.cv.width, ch = v.cv.height;
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, cw, ch);
  c.drawImage(buf, 0, 0, cw, ch);
  const s = cw / W; c.setTransform(s, 0, 0, s, ox * s, oy * s);
  drawNums(c);
}
let clock = 0, last = performance.now();
function loop(now) {
  clock += ((now - last) / 1000) * speed; last = now;
  for (const v of views) if (v.vis && v.p) { try { drawView(v, FIXED ?? clock); } catch (err) { console.error(`${v.p.d.name}: ${err.name} ${err.message}
${err.stack}`); v.vis = false; } }
  requestAnimationFrame(loop);
}

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function chip(grade) { const c = el('span', 'chip', grade); c.style.background = GRADE[grade]; return c; }
function icon(d, big = false) {
  const f = forge(d, d.type === 'gun' ? 0 : 45), c = el('canvas', big ? 'icon big' : 'icon');
  // 무기가 있는 곳만 잘라 크게 보이게
  const px = f.c.getContext('2d').getImageData(0, 0, f.S, f.S).data;
  let x0 = f.S, y0 = f.S, x1 = 0, y1 = 0;
  for (let i = 0; i < f.S * f.S; i++) if (px[i * 4 + 3]) { const x = i % f.S, y = Math.floor(i / f.S); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const side = Math.max(x1 - x0, y1 - y0) + 5;
  c.width = c.height = side; const g = c.getContext('2d');
  g.fillStyle = rgba(GRADE[d.grade], 0.14); g.fillRect(0, 0, side, side);
  g.drawImage(f.c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.floor((side - (x1 - x0 + 1)) / 2), Math.floor((side - (y1 - y0 + 1)) / 2), x1 - x0 + 1, y1 - y0 + 1);
  c.style.borderColor = GRADE[d.grade];
  if (d.grade === '레전더리' || d.grade === '판타지아') c.style.boxShadow = `0 0 14px ${rgba(d.aura || GRADE[d.grade], 0.7)}`;
  return c;
}
function card(root, o) {
  const d0 = el('div', 'card'), cv = el('canvas', 'view'); d0.appendChild(cv);
  const v = addView(cv, (o.modes ? o.modes[0] : o).p);
  cv.addEventListener('click', () => openModal(v.p));
  const info = el('div', 'info'), txt = el('div', 'txt'), name = el('div', 'name'), skill = el('div', 'skill'), desc = el('div', 'desc'), iconBox = el('div');
  const show = m => { const d = m.p.d; iconBox.replaceChildren(icon(d)); name.replaceChildren(chip(d.grade), document.createTextNode(`${d.name} · ${WNAME[d.type]}`)); skill.textContent = m.skill; desc.textContent = m.desc; };
  if (o.modes) {
    const seg = el('div', 'seg');
    o.modes.forEach((m, i) => { const b = el('button', i ? '' : 'on', m.label); b.onclick = () => { v.p = m.p; show(m); seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; seg.appendChild(b); });
    d0.appendChild(seg);
  }
  txt.append(name, skill, desc); info.append(iconBox, txt); d0.appendChild(info);
  show(o.modes ? o.modes[0] : o);
  root.appendChild(d0);
}

// 1. 등급과 외형: 종류마다 일반 → 판타지아
const FAN_EX = { sword: 'f_dawn', gun: 'f_galaxy', wand: 'f_dragon' };
for (const type of ['sword', 'gun', 'wand']) {
  const row = el('div', 'grades');
  for (const id of [...GRADE_OF[type], FAN_EX[type]]) {
    const d = DESIGNS[id], c = el('div', 'card gcard'), txt = el('div', 'txt'), name = el('div', 'name'), ul = el('ul', 'lines');
    name.append(chip(d.grade), document.createTextNode(d.name));
    ul.appendChild(el('li', '', LINES[d.grade] ? `추가 능력치 ${LINES[d.grade]}줄` : '추가 능력치 없음'));
    ul.appendChild(el('li', '', d.grade === '판타지아' ? '고유 스킬 있음' : '스킬 없음'));
    if (d.aura) ul.appendChild(el('li', '', '손에 쥐면 빛남'));
    txt.append(name, ul); c.append(icon(d, true), txt); row.appendChild(c);
  }
  document.getElementById('g-grade').append(el('h3', '', WNAME[type]), row);
}
// 2. 기본 공격 (등급별 무기로 바꿔 보기)
const BASE_DESC = {
  sword: ['세 명 베기', '앞의 적을 최대 3명까지 한 번에 벤다. 맞은 적은 잠깐 멈춘다(경직).', 2.0, [0.4, 1.2]],
  gun: ['관통 사격', '한 명을 쏘고, 뒤의 적 1명까지 뚫는다(피해 감소). 맞은 적은 밀리고 피를 흘린다(출혈).', 2.2, [0.45, 1.45]],
  wand: ['파이어볼', '멀리 있는 적에게 불덩이를 던진다. 떨어진 곳에서 터져 주변 적 여럿이 함께 맞는다.', 2.3, [0.35, 1.4]],
};
for (const type of ['sword', 'gun', 'wand']) {
  const [skill, desc, dur, base] = BASE_DESC[type];
  card(document.getElementById('g-base'), { modes: GRADE_OF[type].map(id => ({ label: DESIGNS[id].grade, skill, desc, p: build({ w: id, dur, base }) })) });
}
// 3. 판타지아
for (const [id, list] of [['g-f-sword', F_SWORD], ['g-f-gun', F_GUN], ['g-f-wand', F_WAND]]) for (const s of list) card(document.getElementById(id), s);

// 크게 보기
const modal = document.getElementById('modal'), mv = addView(modal.querySelector('canvas'), null);
io.unobserve(mv.cv); mv.vis = false;
function openModal(p) { mv.p = p; modal.hidden = false; mv.vis = true; }
function closeModal() { modal.hidden = true; mv.vis = false; }
modal.addEventListener('click', closeModal);
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('speed').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  speed = Number(b.dataset.v); e.currentTarget.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
});
requestAnimationFrame(loop);
