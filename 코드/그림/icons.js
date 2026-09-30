'use strict';
// 자동 생성: 도구/에셋변환/아이콘넣기.py — 에셋/아이콘/*.png 를 그대로 옮긴 것. 고칠 때는 PNG를 고치고 다시 만든다.
const ICONS = {
 "게임 종료": {
  "pal": {
   "a": "#2b1e19",
   "b": "#9d643c",
   "c": "#76a56e"
  },
  "map": [
   ".aaaaaa.......",
   "abbbbbba......",
   "abbbbbba..a...",
   "abbbbbba.aca..",
   "abbbbabaaacca.",
   "abbbbabcccccca",
   "abbbbabcccccca",
   "abbbbbbaaacca.",
   "abbbbbba.aca..",
   "abbbbbba..a...",
   ".aaaaaa......."
  ]
 },
 "골드": {
  "pal": {
   "a": "#2d201a",
   "b": "#fcc852",
   "c": "#dc9029"
  },
  "map": [
   "...aaaaa...",
   "..abbbbba..",
   ".abbcccbba.",
   "abbccbccbba",
   "abbcbbbcbba",
   "abbcbbbcbba",
   "abbcbbbcbba",
   "abbccbccbba",
   ".abbcccbba.",
   "..abbbbba..",
   "...aaaaa..."
  ]
 },
 "설정": {
  "pal": {
   "a": "#34231d",
   "b": "#ae9f92"
  },
  "map": [
   "....aaa....",
   "..aabbbaa..",
   ".abbbbbbba.",
   ".abbbbbbba.",
   "abbbaaabbba",
   "abbbaaabbba",
   "abbbaaabbba",
   ".abbbbbbba.",
   ".abbbbbbba.",
   "..aabbbaa..",
   "....aaa...."
  ]
 },
 "어빌리티": {
  "pal": {
   "a": "#33221c",
   "b": "#9cb757",
   "c": "#8b5838"
  },
  "map": [
   "......a......",
   ".....aba.....",
   "....abbba....",
   "....abbba....",
   ".aaa.aba.aaa.",
   "abbbaabaabbba",
   "abbbbababbbba",
   ".abbbbabbbba.",
   "..aaaabaaaa..",
   ".....aba.....",
   "....accca....",
   "...aaaaaaa..."
  ]
 },
 "외형": {
  "pal": {
   "a": "#32241e",
   "b": "#6693bb",
   "c": "#f3ca6c"
  },
  "map": [
   "..aa.....aa..",
   ".abbaa.aabba.",
   "abbbbaaabbbba",
   "abbbbbbbbbbba",
   "abbbbbcbbbbba",
   "abbbbcccbbbba",
   ".aabbbcbbbaa.",
   "..abbbcbbba..",
   "..abbbbbbba..",
   "..abbbbbbba..",
   "...aaaaaaa..."
  ]
 },
 "장비": {
  "pal": {
   "a": "#2b1d18",
   "b": "#e2d8c9",
   "c": "#b0a397",
   "d": "#d69d4c",
   "e": "#976234"
  },
  "map": [
   "aa.........aa",
   "aba.......aba",
   "acba.....abca",
   ".acba...abca.",
   "..acba.abca..",
   "...acbabca...",
   "....aabca....",
   "....abcaa....",
   "...adaaada...",
   "..adea.aeda..",
   ".adea...aeda.",
   ".aea.....aea.",
   "..a.......a.."
  ]
 },
 "지역": {
  "pal": {
   "a": "#2e201b",
   "b": "#f8e4c0",
   "c": "#e6c9a3",
   "d": "#b07a4c",
   "e": "#cca073"
  },
  "map": [
   ".aa.....aa.",
   "abbaaaaacca",
   "abbbbbbccca",
   "abbdbbedcca",
   "abcddbecaa.",
   "abbcddbcca.",
   "abbdddbccca",
   "abbdddbdcca",
   "abdebbbccca",
   "abbbbaaacca",
   ".aaaa...aa."
  ]
 },
 "캐릭터": {
  "pal": {
   "a": "#30211c",
   "b": "#bdb47c",
   "c": "#f5d2a4"
  },
  "map": [
   "....a..a....",
   "...abaaba...",
   "..abbbbbba..",
   ".abbbbbbbba.",
   ".abbbbbbbba.",
   "abbbbbbbbbba",
   ".abcccccbba.",
   ".acacccacca.",
   ".acacccaca..",
   "..accccca...",
   "...aaaaa...."
  ]
 }
};
// 아이콘 그림 (칸 1개 = 1픽셀, 한 번 그리면 담아 둔다)
const iconCache = new Map();
function iconCanvas(name) {
  let c = iconCache.get(name); if (c) return c;
  const d = ICONS[name]; c = document.createElement('canvas'); c.width = d.map[0].length; c.height = d.map.length; const g = c.getContext('2d');
  d.map.forEach((row, y) => [...row].forEach((ch, x) => { const col = d.pal[ch]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }));
  iconCache.set(name, c); return c;
}
