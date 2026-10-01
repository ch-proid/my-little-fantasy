'use strict';
// =====================================================================
// 그리기: 지역(땅·소품) → 스킬 뒤 → 몬스터 → 용사 → 이펙트 → 스킬 앞 → 메인 화면 아이콘
// 글자(숫자·이름)는 크게 늘린 화면에 따로 써서 선명하게 한다.
// =====================================================================
G.tip = [HX + 20, GROUND - 14];
const HUD = { gold: [4, 2, 16, 16], stage: [W / 2 - 16, 1, 32, 16], mode: [W / 2 + 18, 2, 15, 15], menu: [W - 20, 2, 17, 17] };
const baseFlash = flash;
flash = function (a, c) { baseFlash(a * (S.set.flash ?? 1), c); }; // 설정의 번쩍임 세기

// ---------- 지역 ----------
// ---------- 지형지물: 에셋/지형/N지역/*.png (목록: 코드/그림/terrain_list.js, 도구/에셋변환/지형넣기.py) ----------
// 칸 1개 = 2px. PNG를 그대로 그린다(칸 색을 읽지 않아 브라우저로 열어도 된다). 먼 배경은 천천히 옅게, 가까운 소품은 중간 빠르기로, 작은 장식과 바닥은 땅과 같이 움직인다.
const TERR_TOP = 12; // 화면 위쪽 이만큼(px)은 골드·단계 표시 자리라 비워 둔다
const terrImg = (r, it) => gearImg(`에셋/지형/${r}지역/${it.n}.png`);
function preloadTerrain() { if (typeof TERRAIN === 'undefined') return; for (const r in TERRAIN) { const T = TERRAIN[r]; for (const it of [...T.far, ...T.near, ...T.small, T.tile].filter(Boolean)) terrImg(r, it); } }
function drawTerr(r, it, x, footY, a = 1, g = L, sc = PX) {
  const im = terrImg(r, it); if (!im) return;
  const o = g.globalAlpha; g.globalAlpha = o * a;
  g.drawImage(im, it.x, it.y, it.w, it.h, Math.round(x), Math.round(footY - it.h * sc), it.w * sc, it.h * sc);
  g.globalAlpha = o;
}
// 한 겹: 일정한 간격마다 소품 하나 (자리·종류는 씨앗으로 정해 늘 같다). skip = 그 자리를 비울 비율
function terrLayer(r, list, speed, gap, jitter, a, seedK, skip = 0) {
  if (!list || !list.length) return;
  const pc = G.cam * speed;
  for (let i = Math.floor(pc / gap) - 3; i <= Math.floor((pc + W) / gap) + 1; i++) {
    const q = rnd(i * 13 + Number(r) * 71 + seedK); if (q < skip) continue;
    const it = list[Math.floor(rnd(i * 7 + Number(r) * 31 + seedK) * list.length)];
    const sink = Math.max(0, it.h * PX - (GROUND - TERR_TOP)); // 너무 크면 밑동을 땅 아래로 묻는다 (도트는 늘이거나 줄이지 않는다)
    drawTerr(r, it, i * gap - pc + q * jitter, GROUND + 2 + sink, a);
  }
}
function drawTile(r, T) { // 바닥 타일을 이어 깐다 (윗면이 땅 줄보다 1칸 위)
  const it = T.tile, im = it && terrImg(r, it); if (!im) return false;
  const tw = it.w * PX, x0 = -(((G.cam % tw) + tw) % tw);
  for (let x = x0; x < W; x += tw) L.drawImage(im, it.x, it.y, it.w, it.h, Math.round(x), GROUND - PX, tw, it.h * PX);
  return true;
}
function drawWorld() {
  const r = regionOf(S.stage), reg = REGIONS[r - 1], cam = G.cam, [top, mid, dark] = reg.ground;
  const T = typeof TERRAIN !== 'undefined' && TERRAIN[r];
  if (T && T.tile && terrImg(r, T.tile)) {
    terrLayer(r, T.far, 0.3, 190, 70, 0.6, 1);
    terrLayer(r, T.near, 0.65, 150, 50, 0.8, 2, 0.45); // 전투하는 캐릭터가 또렷하게: 드문드문, 조금 옅게
    drawTile(r, T);
    terrLayer(r, T.small, 1, 72, 30, 1, 3, 0.5);
    if (r === 8) lighter(() => { for (let i = 0; i < 6; i++) { const x = ((i * 97 - cam) % (W + 60) + W + 60) % (W + 60) - 30; glow(x, GROUND + 4, 10, '#ff7a2a', 0.35 + 0.15 * Math.sin(G.t * 3 + i)); } });
    return;
  }
  // (그림을 아직 못 불러왔을 때) 예전처럼 코드로 그린 소품과 땅
  // 이야기 소품: 반쯤 비치게, 조금 느리게 흘러간다
  const pc = cam * 0.6, gap = 118;
  withA(0.62, () => {
    for (let i = Math.floor(pc / gap) - 1; i <= Math.floor((pc + W) / gap) + 1; i++) {
      const rr = rnd(i * 7 + r * 31), id = reg.props[Math.floor(rr * reg.props.length)], a = forgeArt(PROP[id]);
      const x = Math.round(i * gap - pc + rr * 50);
      L.drawImage(a.c, x - a.w, GROUND - a.h * 2 + 2, a.w * 2, a.h * 2);
    }
  });
  // 땅
  if (r === 4) { // 잠긴 호수: 땅 대신 물
    rect(0, GROUND, W, H - GROUND, '#3a8ab0'); rect(0, GROUND, W, 2, '#8fe0f0');
    for (let i = 0; i < 18; i++) { const x = ((i * 53 + rnd(i) * 40 - cam * 0.8 - G.t * 8) % (W + 40) + W + 40) % (W + 40) - 20; rect(x, GROUND + 3 + (i % 3) * 2, 8, 1, '#c9f1ff'); }
    return;
  }
  prect(0, GROUND, W, H - GROUND, mid); prect(0, GROUND, W, 3, top);
  for (let i = Math.floor(cam / 16); i <= Math.floor((cam + W) / 16); i++) {
    const x = Math.round(i * 16 - cam), q = rnd(i * 3 + r);
    prect(x + (i % 2) * 8, GROUND + 3, 8, 2, top);
    if (q < 0.5) prect(x + snap(q * 20), GROUND + 7 + snap(q * 3), 4, 2, dark);
    if (q > 0.8) { prect(x + 10, GROUND - 3, 2, 3, top); prect(x + 9, GROUND - 5, 4, 2, reg.deco); }
  }
  if (r === 8) lighter(() => { for (let i = 0; i < 6; i++) { const x = ((i * 97 - cam) % (W + 60) + W + 60) % (W + 60) - 30; glow(x, GROUND + 4, 10, '#ff7a2a', 0.35 + 0.15 * Math.sin(G.t * 3 + i)); } });
}

// ---------- 몬스터 ----------
function drawFoe(f) {
  const a = forgeArt(f.d), age = G.t - f.born, dying = f.dieT >= 0 ? (G.t - f.dieT) / 0.4 : 0;
  const moving = f.stun <= 0 && !dying && f.landed, sq = f.squash * JUICE.squash * 4;
  // 움직임: 그림을 늘이지 않고(도트가 찌그러지니까) 부위를 1칸씩 움직인 프레임을 넘긴다. 작은 놈은 통통 뛰고, 큰 놈은 공격 전에 몸을 젖힌다
  const A = monFrames(f.d), k = f.d.hd ? 1 : 2, n = A.frames.length;
  const fi = f.d.fly || (moving && f.walk) ? Math.floor(G.t * A.fps + f.seed * n) % n : 0;
  const hop = A.bob[fi] * k;
  let sx = 1, sy = 1, lean = 0;
  if ((f.sz === 'l' || f.sz === 'b') && f.atkIv && f.atkT > f.atkIv * 0.65 && !dying) lean = Math.round(prog(f.atkT, f.atkIv * 0.65, f.atkIv) * 4);
  const spawn = f.boss ? 1 : age < 0.25 ? eoBack(age / 0.25) : 1;
  sx *= spawn * (1 + sq * 0.25 + dying * 0.4); sy *= spawn * (1 - sq * 0.2 - dying * 0.5);
  const lunge = G.t - f.lunge < 0.15 ? -(f.sz === 'l' || f.sz === 'b' ? 8 : 5) * Math.sin((G.t - f.lunge) / 0.15 * Math.PI) : 0;
  const drop = f.boss && !f.landed ? -120 * (1 - ei(Math.min(1, age / 0.55))) : 0; // 보스는 하늘에서 떨어진다
  // 발바닥을 땅에 맞춘다: 발바닥 아래 외톨이 점 줄(foot)만큼 내리고, 1px 땅에 묻는다
  const fy = GROUND + hop + drop + (f.d.foot || 0) * k + (f.d.fly ? -(f.d.fly + Math.round(Math.sin(G.t * 3 + f.seed))) : 1);
  const img = A.frames[fi], x = f.x + lunge + lean, w = img.width * k * sx, hh = img.height * k * sy;
  const shw = a.w * (f.boss && !f.landed ? 0.4 + 0.6 * Math.min(1, age / 0.55) : 1);
  withA(0.85 * (1 - dying), () => prect(f.x - shw * 0.8, GROUND - 2, shw * 1.6, 3, 'shadow'));
  let tint = null;
  if (f.flash > 0 || dying) tint = '#ffffff';
  else if (f.stun > 0) tint = 'rgba(255,240,160,0.3)';
  else if (f.dots.some(d => d.k === 'burn') && Math.floor(G.t * 10) % 2) tint = 'rgba(255,150,60,0.35)';
  withA(1 - dying, () => L.drawImage(tint ? artTinted({ c: img }, tint) : img, Math.round(x - w / 2), Math.round(fy - hh), Math.round(w), Math.round(hh)));
  if (dying) return;
  const top = fy - hh;
  if (f.stun > 0) for (let i = 0; i < 3; i++) { const an = G.t * 7 + i * 2.1; star4(f.x + Math.cos(an) * 8, top - 3 + Math.sin(an) * 2, 2, '#ffe27a'); }
  if (f.dots.some(d => d.k === 'bleed')) for (let i = 0; i < 2; i++) { const ph = (G.t * 3 + i / 2) % 1; withA(1 - ph, () => rect(f.x - 4 + i * 8, top + hh * 0.5 + ph * 12, 1.5, 3, '#ff4d5e')); }
  if (f.hp < f.maxHp) { const bw = Math.max(16, a.w * 1.4); rect(f.x - bw / 2 - 1, top - 5, bw + 2, 4, '#2a1a30'); rect(f.x - bw / 2, top - 4, bw * (f.hp / f.maxHp), 2, f.boss ? '#ff4d5e' : '#ff7d8f'); }
}
const eoBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

// ---------- 용사 ----------
// 기본 공격 자세 (장비 미리보기·공격 그림과 같은 칸 단위 자세). 공격한 순간부터 휘두르기가 이어지고, 다음 공격 직전에는 무기를 치켜든다
const ATK_FROM = { sword: 0.28, gun: 0.25, wand: 0.3 }, ATK_END = 0.9;
function livePose(s) {
  const h = G.hero, at = s.wt === 'sword' ? h.swingAt : s.wt === 'gun' ? h.shootAt : h.castAt, since = G.t - at;
  if (since >= 0 && ATK_FROM[s.wt] + since < ATK_END) return gearAttackPose(ATK_FROM[s.wt] + since, s.wt);
  const pre = 1 / s.aspd - h.atkT;
  if (h.state === 'fight' && pre > 0 && pre < 0.14) return gearAttackPose(0.1, s.wt);
  return s.wt === 'gun' ? gearAttackPose(0.9, 'gun') : null; // 엽총은 늘 두 손으로 든다
}
function drawHero() {
  const s = stats(), h = G.hero, hw = HERO_WEAPON;
  let P = livePose(s), off = {}, trail = [], lean = 0;
  if (G.skill) { const t = G.t - G.skill.t0, p = G.skill.p, pose = poseAt(p, t); P = gearFromDeg(pose, s.wt); lean = (pose.lean || 0) + (pose.dx || 0); if (p.hero) { off = p.hero(t) || {}; trail = off.trail || []; } }
  const x = HX + (off.dx || 0), fy = GROUND + (off.dy || 0);
  for (const g of trail) withA(g.a ?? 1, () => drawGearHero(HX + g.dx, GROUND + (g.dy || 0), 'A', gearFromDeg({ deg: g.deg ?? HOLD_DEG[s.wt] }, s.wt), hw, G.t, g.tint));
  if (h.state === 'dead') { withA(0.35 + 0.2 * Math.sin(G.t * 20), () => drawSpr(sprite('heroA', 'hero', 0, '#ffffff'), HX, GROUND, 2)); return; }
  // 걷기: 딛기(D) → 한 발 들기(B) → 딛기 → 다른 발(C). 싸울 때는 천천히 숨쉬기(서기 ↔ D)
  const walkK = h.state === 'walk' && !G.skill ? ['D', 'B', 'D', 'C'][Math.floor(h.walkT * 7) % 4] : !G.skill && Math.floor(G.t * 1.4) % 2 ? 'D' : 'A';
  const sq = h.squash * 0.15, tint = h.flash > 0 ? '#ffffff' : null;
  prect(x - 12, fy - 2, 24, 3, 'shadow');
  G.tip = drawGearHero(x, fy, walkK, P, hw, G.t, tint, sq, lean); // 자세에 몸 그림(k)이 없으면 걷기·숨쉬기 그림 (엽총 들고 걷기)
  // 레벨업: 금빛 기둥과 고리
  const lv = G.t - h.lvFx;
  // 에디터 레벨업 이펙트가 나온 레벨업이면 옛 기둥은 끈다 (칸 강화 빛은 그대로)
  if (lv < 1 && h.lvPixAt !== h.lvFx) lighter(() => { withA(1 - lv, () => { rect(x - 6, 0, 12, GROUND, rgba('#ffe27a', 0.35)); ring(x, GROUND, 8 + lv * 40, 2, '#ffe27a', 0.3); }); glow(x, GROUND - 20, 30, '#ffe27a', 0.6 * (1 - lv)); });
}

// ---------- 날아가는 것·전리품·동전 ----------
function drawShots() {
  for (const sh of G.shots) {
    const k = prog(G.t, sh.t0, sh.t0 + sh.dur), at = u => { const q = prog(u, sh.t0, sh.t0 + sh.dur); return [lerp(sh.x0, sh.x1, q), lerp(sh.y0, sh.y1, q) - Math.sin(q * Math.PI) * (sh.kind === 'fireball' ? 26 : 10)]; };
    lighter(() => {
      for (let j = 6; j >= 1; j--) { const [x, y] = at(G.t - j * 0.022); withA(0.55 - j * 0.07, () => disc(x, y, 4 - j * 0.45, sh.hot)); }
      const [x, y] = at(G.t); glow(x, y, sh.kind === 'fireball' ? 14 : 9, sh.hot, 0.9); disc(x, y, sh.kind === 'fireball' ? 4 : 2.6, sh.hot); disc(x - 0.5, y - 0.5, 1.6, '#ffffff');
    });
    void k;
  }
}
function drawLoot() {
  for (const l of G.loot) {
    const age = G.t - l.t0, g = GRADES[l.it.g];
    if (age > 1.6) continue;
    const a = age < 1.1 ? 1 : 1 - (age - 1.1) / 0.5;
    if (l.it.g >= 1) lighter(() => withA(a * (l.it.g >= 3 ? 0.8 : 0.5), () => { const gr = L.createLinearGradient(0, GROUND, 0, GROUND - 90); gr.addColorStop(0, rgba(g.c, 0.9)); gr.addColorStop(1, rgba(g.c, 0)); L.fillStyle = gr; L.fillRect(l.x - 3, GROUND - 90, 6, 90); }));
    if (l.it.g >= 4 && age < 0.4) { flare(l.x, GROUND - 20, 16, g.c, 1 - age / 0.4); rays(l.x, GROUND - 20, 6, 60 * eo(age / 0.4), 14, l.it.id, 2, g.c, 1 - age / 0.4); }
    const ic = itemIcon(l.it), y = GROUND - 10 - eo(Math.min(1, age / 0.4)) * 22 + Math.sin(age * 6) * 1.5;
    let x = l.x, yy = y;
    if (age > 1.1) { const q = ei((age - 1.1) / 0.5); x = lerp(l.x, HUD.menu[0] + 8, q); yy = lerp(y, HUD.menu[1] + 8, q); }
    withA(a, () => L.drawImage(ic, Math.round(x - 8), Math.round(yy - 8), 16, 16));
  }
  G.loot = G.loot.filter(l => G.t - l.t0 < 1.6);
}
function drawCoins() {
  const coin = iconCanvas('골드'), gx = HUD.gold[0] + 7, gy = HUD.gold[1] + 7;
  for (const c of G.coins) {
    const age = G.t - c.t0; let x, y;
    if (age < 0.5) { x = c.x + c.vx * age; y = Math.min(GROUND - 4, c.y + c.vy * age + 300 * age * age); }
    else { const k = ei(prog(age, 0.5, 0.5 + JUICE.coinFly)), x0 = c.x + c.vx * 0.5, y0 = Math.min(GROUND - 4, c.y + c.vy * 0.5 + 75); x = lerp(x0, gx, k); y = lerp(y0, gy, k); if (k >= 1) c.done = true; }
    L.drawImage(coin, Math.round(x - 5.5), Math.round(y - 5.5), 11, 11);
  }
  G.coins = G.coins.filter(c => !c.done);
}

// ---------- 메인 화면 아이콘 (그림만) ----------
function drawHudArt() {
  const pulse2 = G.goldPulse > 0 ? 1.25 : 1, coin = iconCanvas('골드'), [gx, gy] = HUD.gold; // 동전 아이콘은 칸 1개 = 1px (윗줄 UI)
  L.drawImage(coin, Math.round(gx + 2.5 - (pulse2 - 1) * 5.5), Math.round(gy + 2.5 - (pulse2 - 1) * 5.5), 11 * pulse2, 11 * pulse2);
  // 모드 아이콘: 자동 도전(겹화살표) / 반복 사냥(돌아가는 화살표)
  const [mx, my, mw] = HUD.mode, cx = mx + mw / 2, cy = my + mw / 2;
  disc(cx, cy, 7.5, '#2a1a30'); disc(cx, cy, 6.5, S.mode === 'auto' ? '#ffc83d' : '#5cc85a');
  if (S.mode === 'auto') { poly([[cx - 4, cy - 3.5], [cx, cy], [cx - 4, cy + 3.5]], '#2a1a30'); poly([[cx, cy - 3.5], [cx + 4, cy], [cx, cy + 3.5]], '#2a1a30'); }
  else { const a0 = G.t * 2; L.strokeStyle = '#2a1a30'; L.lineWidth = 1.4; L.beginPath(); L.arc(cx, cy, 3.6, a0, a0 + 4.7); L.stroke(); const ax = cx + Math.cos(a0 + 4.7) * 3.6, ay = cy + Math.sin(a0 + 4.7) * 3.6; disc(ax, ay, 1.6, '#2a1a30'); }
  // 메뉴 아이콘: 세 줄 (크림·금·주황 세 빛깔)
  const [bx, by] = HUD.menu, need = S.pts > 0 || newItems || S.ab.pending || menuHasNews();
  rect(bx + 1, by + 2, 15, 13, 'rgba(58,32,20,0.55)');
  [['#fff1d6', 5], ['#ffd24d', 8.5], ['#ff9a4a', 12]].forEach(([c, y]) => { rect(bx + 3, by + y - 1, 11, 3, '#3a2014'); rect(bx + 3.5, by + y - 0.5, 10, 2, c); });
  if (need) { disc(bx + 15, by + 3, 3, '#ffffff'); disc(bx + 15, by + 3, 2.2, '#ff4d5e'); }
  // 보스·진행 막대
  const st = HUD.stage;
  if (G.bossWave) { const boss = G.foes.find(f => f.boss && f.dieT < 0); rect(st[0] - 14, 19, 60, 3, '#2a1a30'); rect(st[0] - 13, 19.5, 58 * (boss ? boss.hp / boss.maxHp : 0), 2, '#ff4d5e'); rect(st[0] - 13, 23, 58 * clamp(G.bossT / BAL.bossTime), 1, '#ffc83d'); }
  else if (S.mode === 'auto') { rect(st[0] - 4, 19, 40, 2, 'rgba(42,26,48,0.8)'); rect(st[0] - 4, 19, 40 * Math.min(1, G.count / BAL.killsPerStage), 2, '#ffc83d'); }
  // 용사 체력
  const s = stats(), hpw = 24;
  if (G.hero.state !== 'dead') { rect(HX - hpw / 2 - 1, GROUND - 63, hpw + 2, 4, '#2a1a30'); rect(HX - hpw / 2, GROUND - 62, hpw * clamp(G.hero.hp / s.hp), 2, '#5ee07a'); }
}
function menuHasNews() { return abSlotCount() > S.ab.slots.filter(Boolean).length && S.gold >= BAL.abRoll(S.ab.lv); }

// ---------- 글자 (큰 화면에 직접) ----------
function text(c, s, x, y, size, color, align = 'center', a = 1) {
  c.globalAlpha = a; c.font = `bold ${size}px ${FONT}`; c.textAlign = align; c.lineJoin = 'round'; c.lineWidth = Math.max(2, size / 4);
  c.strokeStyle = '#2a1a30'; c.strokeText(s, x, y); c.fillStyle = col(color); c.fillText(s, x, y); c.globalAlpha = 1;
}
function drawText(c) {
  text(c, fmt(S.gold), HUD.gold[0] + 18, 14, G.goldPulse > 0 ? 12 : 11, 'gold', 'left');
  const sf = G.t - G.stageFx, sc = sf < 0.4 ? 1 + 0.5 * (1 - eoBack(sf / 0.4)) : 1;
  text(c, stageLabel(S.stage), W / 2, 14, 12 * Math.max(0.5, sc), G.bossWave ? '#ff7d8f' : '#ffffff');
  if (G.hero.state !== 'dead') text(c, `Lv.${S.lv}`, HX, GROUND - 65, 8, '#fff09a');
  else text(c, `${Math.max(0, G.hero.deadT).toFixed(1)}`, HX, GROUND - 60, 8, '#ffffff');
  if (S.name) { // 이름 뒤 반투명 검은 바탕 (도트 규칙 6)
    c.font = `bold 7px ${FONT}`; const tw = c.measureText(S.name).width;
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.roundRect(HX - tw / 2 - 3, 102.6, tw + 6, 7.4, 2.5); c.fill();
    text(c, S.name, HX, 108.4, 7, '#ffffff');
  }
  const rf = G.t - G.regionFx;
  if (rf >= 0 && rf < 3) text(c, REGIONS[regionOf(S.stage) - 1].n, W / 2, 48, 14, '#fff09a', 'center', rf < 0.3 ? rf / 0.3 : rf > 2.4 ? (3 - rf) / 0.6 : 1);
  for (const p of G.pops) {
    const k = (G.t - p.t0) / 0.75; if (k >= 1) continue;
    const sc2 = k < 0.1 ? lerp(0.4, JUICE.numPop, eo(k / 0.1)) : k < 0.2 ? lerp(JUICE.numPop, 1, (k - 0.1) / 0.1) : 1;
    text(c, p.s, p.x, p.y - eo(k) * 18, Math.round(p.size * sc2), p.c, 'center', k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
  }
  G.pops = G.pops.filter(p => G.t - p.t0 < 0.75);
}

// ---------- 한 장 ----------
// 아이템 아이콘. 칸 색을 읽지 않고 만든다 (브라우저로 열면 PNG를 그린 캔버스는 읽기가 막힌다)
//  방어구: 게임 코드에 들어간 장비 덧그림(art.js HERO_PARTS.gear)에서 그림 있는 칸만 잘라 칠한다
//  무기: PNG를 여백 10px 중 6px를 잘라 그린다 (여백을 조금 쓴 무기도 잘리지 않게)
function itemIcon(it) {
  if (it._ic) return it._ic;
  const c = document.createElement('canvas'), g = c.getContext('2d'), gm = HERO_PARTS.gear && HERO_PARTS.gear[it.r || 1] && HERO_PARTS.gear[it.r || 1][it.t];
  if (it.t === 'weapon') {
    const im = gearImg(itemPng(it)); if (!im) { c.width = c.height = 16; c.dataset.wait = '1'; return c; } // 아직 못 불러옴: 다음에 다시
    c.width = im.width - 12; c.height = im.height - 12; g.drawImage(im, 6, 6, c.width, c.height, 0, 0, c.width, c.height);
  } else if (gm) {
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    gm.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }));
    c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
    gm.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; const col = HERO_EXTRA[ch] || COLORS[PALS.hero[ch]] || PALS.hero[ch]; if (col) { g.fillStyle = col; g.fillRect(x - x0, y - y0, 1, 1); } }));
  } else { const a = forgeArt(GEAR[it.t + it.g]); c.width = a.w; c.height = a.h; g.drawImage(a.c, 0, 0); }
  Object.defineProperty(it, '_ic', { value: c, enumerable: false }); return c;
}
function render(view) {
  const cv = view.cv, c = view.c;
  L = bctx; bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, buf.width, buf.height); resetCtx(bctx);
  const sk = G.skill, st = sk ? G.t - sk.t0 : 0, Sx = sk ? skillScene(st) : null;
  const sh = Math.max(G.shake, sk && sk.p.shake ? sk.p.shake(st) : 0), f = Math.floor(G.t * 50);
  const ox = sh ? Math.round((rnd(f) - 0.5) * 2 * sh) : 0, oy = sh ? Math.round((rnd(f + 99) - 0.5) * 2 * sh) : 0;
  bctx.translate(ox, oy);
  drawWorld();
  if (sk && sk.p.back) sk.p.back(st, Sx);
  const fs = G.foes.slice().sort((a, b) => b.x - a.x);
  for (const fo of fs) drawFoe(fo);
  if (sk && sk.p.mid) sk.p.mid(st, Sx);
  drawHero(); // 펫 자리: S.pet 이 생기면 여기서 용사 뒤에 그린다 (data.js PETS)
  for (const e of G.fx) e.draw(G.t);
  drawShots();
  if (sk && sk.p.front) sk.p.front(st, Sx);
  drawCoins(); drawLoot();
  bctx.setTransform(RES, 0, 0, RES, 0, 0);
  drawHudArt();
  const cw = cv.width, ch = cv.height;
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, cw, ch);
  c.drawImage(buf, 0, 0, cw, ch);
  const s = cw / W; c.setTransform(s, 0, 0, s, 0, 0);
  drawText(c);
}
