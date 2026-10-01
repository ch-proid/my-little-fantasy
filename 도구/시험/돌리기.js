'use strict';
// 여러 시험을 차례로 돌린다:  node 도구/시험/돌리기.js <결과 폴더> <시나리오.js> '<PARAM 목록 JSON 배열>' <씨앗 수>
// 결과는 <결과 폴더>/<이름>_s<씨앗>.json 으로 남고, 요약은 요약.py 로 본다.
const { spawnSync } = require('child_process'); const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..');
const [outDir, scenario, listJson, seeds = '3'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const list = JSON.parse(listJson), electron = require(path.join(ROOT, 'node_modules', 'electron')); // 실행 파일 경로
for (const p of list) for (let s = 1; s <= +seeds; s++) {
  const name = (p.name || Object.values(p).join('_')) + '_s' + s, out = path.join(outDir, name + '.json');
  const t = Date.now(), r = spawnSync(electron, [path.join(ROOT, '도구', '시험', '배속시험.js'), scenario, out, JSON.stringify(p), String(s)], { timeout: 600000, stdio: 'ignore' });
  let brief = '';
  try { const d = JSON.parse(fs.readFileSync(out, 'utf-8')); brief = d.error ? '오류: ' + d.error : d.end ? `${d.end.stage} Lv${d.end.lv} 사망${d.deaths} 보스 ${d.boss.wins}/${d.boss.tries}` : JSON.stringify(d).slice(0, 120); } catch (e) { brief = '결과 없음 ' + (r.error || r.status); }
  console.log(`${name}: ${brief} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
}
