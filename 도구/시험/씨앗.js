'use strict';
// 게임 스크립트보다 먼저 돌아 Math.random 을 씨앗 난수(mulberry32)로 바꾼다. state.js 의 `const R = Math.random` 이 이것을 잡는다.
// 같은 씨앗 → 같은 드롭·같은 피해. 시험 전후를 같은 조건으로 비교하려고 쓴다.
(() => {
  let s = (Number(process.env.SEED) || 1) >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})();
