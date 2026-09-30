'use strict';
// =====================================================================
// 장비 외형: 무기 PNG를 손에 쥐고 휘두르고, 방어구는 주인공 그림에 겹친다(art.js heroMaps).
// 규칙은 장비 미리보기(도구/장비 미리보기.html)·공격 그림(도구/에셋변환/공격모션.py)과 같다:
//  - 무기는 90도 단위로만 돌려 도트가 깨지지 않는다. 돌리는 중심 = 쥐는 곳(손).
//  - 무기 쥔 손(몸 앞쪽 6×4칸)을 몸에서 떼어 옮기고, 무기 위에 다시 그려 손잡이를 감싸 쥔다. 드러난 곳은 테두리로 메운다.
//  - 엽총은 늘 두 손으로 든다(뒷손이 개머리판을 받친다 — art.js heroGunHold).
// =====================================================================
const HOLD = { sword: { grip: [0.25, 0.75], tip: [0.95, 0.05] }, wand: { grip: [0.25, 0.75], tip: [0.9, 0.08] }, gun: { grip: [0.28, 0.5], tip: [0.98, 0.2] } };
const HOLD_DEG = { sword: 45, gun: 0, wand: 45 }; // 무기 PNG의 기울기 (스킬 자세의 각도와 견준다)
const GH = { HX: 24 - 9, HY: 28 - 5 - 4, HW: 6, HH: 4 }; // 무기 쥔 손 (게임 방향 그림, 딛기면 한 줄 아래)

// ---------- 그림 불러오기 ----------
const gearImgs = {};
function gearImg(src) {
  if (!src) return null;
  let im = gearImgs[src];
  if (!im) { im = new Image(); im.onload = () => { if (typeof markGearDirty === 'function') markGearDirty(); }; im.src = src; gearImgs[src] = im; }
  return im.complete && im.naturalWidth ? im : null;
}
function preloadGear() { if (typeof ITEMS === 'undefined' || !ITEMS) return; for (const set of ITEMS.regions) for (const f of Object.values(GEAR_FILE)) gearImg(`에셋/장비/${set.folder}/${f}.png`); }

// ---------- 공격 자세 (장비 미리보기 attackPose 와 같다. u = 공격 시작부터 초) ----------
// k: 몸 그림(A 서기, D 숙임) · bdx: 몸 앞뒤 · rot: 무기 90도 단위 · hdx·hdy: 무기 쥔 손 · wdx·wdy: 손에서 무기를 더 옮김
const GUN_HOLD = { hdx: 0, hdy: -1 };
function gearAttackPose(u, wt) {
  const p = { k: 'A', bdx: 0, rot: 0, hdx: 0, hdy: 0, wdx: 0, wdy: 0 };
  if (wt === 'sword') {
    if (u < 0.28) Object.assign(p, { rot: -1, bdx: -1, hdy: -2 });                      // 치켜들기
    else if (u < 0.36) Object.assign(p, { k: 'D', bdx: 1, hdx: 1, hdy: -1 });            // 내리베기
    else if (u < 0.5) Object.assign(p, { k: 'D', bdx: 1, rot: 1, hdx: 1, hdy: -2, wdy: -1 }); // 끝까지
    else if (u < 0.62) Object.assign(p, { k: 'D', rot: 1, hdy: -2, wdy: -1 });           // 여운
  } else if (wt === 'gun') { // 늘 두 손으로 든다. 몸 그림은 걷기·숨쉬기 그대로(k 없음), 쏠 때만 서서 반동
    Object.assign(p, GUN_HOLD, { k: null });
    if (u >= 0.25 && u < 0.33) Object.assign(p, { k: 'A', hdx: -1, recoil: true });   // 쏘기: 반동으로 손과 총이 한 칸 뒤로
  } else {
    if (u < 0.3) Object.assign(p, { k: 'D', hdy: -2 });                                   // 들어 올리기
    else if (u < 0.6) Object.assign(p, { k: 'D', hdx: 1, hdy: -2 });                      // 휘두르기
  }
  return p;
}
// 스킬 자세(각도·들어 올림, core.js poseAt) → 90도 단위 자세
function gearFromDeg(pose, wt) {
  return { k: wt === 'gun' ? null : 'A', bdx: 0, rot: Math.max(-1, Math.min(1, Math.round(((pose.deg ?? HOLD_DEG[wt]) - HOLD_DEG[wt]) / 90))), hdx: 0, hdy: -Math.round((pose.lift || 0) / PX), wdx: 0, wdy: 0, ...(wt === 'gun' ? GUN_HOLD : {}) };
}

// ---------- 몸에서 손을 떼어 옮긴 그림 (다시 쓴다) ----------
const gearCut = new Map();
function sealCanvas(c) { // 테두리가 아닌 칸(RGB 합 200 이상) 옆 빈칸에 테두리색 (art.js sealLine 과 같은 규칙)
  const g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), d = img.data, w = c.width, h = c.height, add = [];
  const fill = i => d[i * 4 + 3] >= 128 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] >= 200;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (d[i * 4 + 3] >= 128) continue;
    if ((x > 0 && fill(i - 1)) || (x < w - 1 && fill(i + 1)) || (y > 0 && fill(i - w)) || (y < h - 1 && fill(i + w))) add.push(i);
  }
  for (const i of add) { d[i * 4] = 0x34; d[i * 4 + 1] = 0x18; d[i * 4 + 2] = 0x16; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}
function heroCut(name, tint, dy, hdx, hdy) {
  const key = `${name}|${tint}|${dy}|${hdx}|${hdy}`; let v = gearCut.get(key); if (v) return v;
  const spr = sprite(name, 'hero', 0, tint), M = 4, c = document.createElement('canvas'), g = c.getContext('2d');
  c.width = spr.width + M * 2; c.height = spr.height + M * 2; g.imageSmoothingEnabled = false;
  const hy = GH.HY + dy;
  g.drawImage(spr, M, M); g.clearRect(M + GH.HX, M + hy, GH.HW, GH.HH);
  g.drawImage(spr, GH.HX, hy, GH.HW, GH.HH, M + GH.HX + hdx, M + hy + hdy, GH.HW, GH.HH);
  if (!tint) sealCanvas(c); // 번쩍일 때(하얗게)는 메우지 않는다
  const hand = document.createElement('canvas'); hand.width = GH.HW; hand.height = GH.HH; hand.getContext('2d').drawImage(spr, GH.HX, hy, GH.HW, GH.HH, 0, 0, GH.HW, GH.HH);
  v = { c, hand, M }; gearCut.set(key, v); if (gearCut.size > 200) gearCut.delete(gearCut.keys().next().value);
  return v;
}
const tintCache = new Map();
function gearTinted(img, tint) { const key = img.src + tint; let c = tintCache.get(key); if (c) return c; c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height); tintCache.set(key, c); return c; }

// ---------- 주인공 한 명 그리기 ----------
// hw = { img, wt, hot, aura } 쥔 무기 (없으면 몸만). P = 자세. walkK = 걷기·숨쉬기 그림 글자(A~D). 돌려주는 값: 무기 끝 [x, y]
function drawGearHero(x, fy, walkK, P, hw, t, tint = null, sq = 0, lean = 0) {
  const gun = hw && hw.wt === 'gun', k = P && P.k ? P.k : walkK;
  const name = gun ? (P && P.recoil ? 'heroGR' : 'heroG' + k) : 'hero' + k, dy = k === 'D' ? 1 : 0;
  const bdx = (P && P.bdx || 0) * PX + lean, left = x + bdx - 24;
  if (!hw || !hw.img) { const spr = sprite(name, 'hero', 0, tint), bw = spr.width * PX * (1 + sq), bh = spr.height * PX * (1 - sq); L.drawImage(spr, Math.round(x + bdx - bw / 2), Math.round(fy - bh), bw, bh); return [x + bdx + HAND_DX, fy - 16]; }
  const hdx = P ? P.hdx : 0, hdy = P ? P.hdy : 0, C = heroCut(name, tint, dy, hdx, hdy); // 엽총 뒷손은 두 손 그림(heroG*)에 이미 들어 있다
  const bw = C.c.width * PX * (1 + sq), bh = C.c.height * PX * (1 - sq);
  L.drawImage(C.c, Math.round(left + 24 - bw / 2), Math.round(fy + C.M * PX * (1 - sq) - bh), bw, bh);
  // 무기: 손(몸 가운데에서 앞으로 5칸, 발바닥 위 8칸) + 자세만큼
  const img = tint ? gearTinted(hw.img, tint) : hw.img, H0 = HOLD[hw.wt], ww = hw.img.width - 20, wh = hw.img.height - 20;
  const gx = Math.round(10 + ww * H0.grip[0]), gy = Math.round(10 + wh * H0.grip[1]);
  const hx = left + (12 + 5 + hdx + (P ? P.wdx : 0)) * PX, hy = fy - 56 + (28 - 8 + dy + hdy + (P ? P.wdy : 0)) * PX, rot = P ? P.rot : 0;
  L.save(); L.translate(Math.round(hx), Math.round(hy)); L.rotate(rot * Math.PI / 2); L.drawImage(img, -gx * PX, -gy * PX, img.width * PX, img.height * PX); L.restore();
  L.drawImage(C.hand, Math.round(left + (GH.HX + hdx) * PX), Math.round(fy - 56 + (GH.HY + dy + hdy) * PX), GH.HW * PX, GH.HH * PX);
  // 무기 끝 (돌린 만큼)
  const tx0 = Math.round(10 + ww * H0.tip[0]) - gx, ty0 = Math.round(10 + wh * H0.tip[1]) - gy;
  const [rx, ry] = rot === 1 ? [-ty0, tx0] : rot === -1 ? [ty0, -tx0] : [tx0, ty0], tip = [hx + rx * PX, hy + ry * PX];
  if (!tint && hw.aura) gearAura(hw.aura, hw.hot, hx, hy, tip[0], tip[1], t);
  return tip;
}
// 유니크부터 무기가 빛난다: 1 반짝이 하나 · 2 빛번짐 + 반짝이 둘 · 3 (판타지아) 더 큰 빛 + 반짝이 셋 + 떠오르는 빛 알갱이
function gearAura(lv, hex, hx, hy, tx, ty, t) {
  const pulse = 0.75 + 0.25 * Math.sin(t * 5);
  if (lv >= 2) lighter(() => glow(lerp(hx, tx, 0.6), lerp(hy, ty, 0.6), lv >= 3 ? 16 : 11, hex, (lv >= 3 ? 0.45 : 0.3) * pulse));
  for (let i = 0; i < lv; i++) { const k = (t * 0.9 + i / lv) % 1; flare(lerp(hx, tx, k) + (rnd(i * 5) - 0.5) * 4, lerp(hy, ty, k), lv >= 3 ? 2.6 : 1.8, '#ffffff', Math.sin(k * Math.PI)); }
  if (lv >= 3) lighter(() => { for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i / 4) % 1, px = lerp(hx, tx, rnd(i * 9 + Math.floor(t * 0.6 + i / 4))) + (rnd(i) - 0.5) * 6, py = lerp(hy, ty, 0.5) - k * 14; withA(1 - k, () => prect(px - 1, py - 1, 2, 2, hex)); } });
}

// ---------- 지금 쥔 무기 (applyLook 이 채운다) ----------
let HERO_WEAPON = null;
function heroWeaponOf(it) {
  if (!it || it.t !== 'weapon') return null;
  const set = regionSet(it.r || 1), g = GRADES[it.g];
  return { src: itemPng(it), wt: it.wt, hot: (set && set.color) || '#ffe27a', aura: g.aura || 0, fx: g.fx || 1, get img() { return gearImg(this.src); } };
}
