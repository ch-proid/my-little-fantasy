'use strict';
// =====================================================================
// 배속 시험: 화면 밖 Electron 창(x=-3000)에 마리판.html을 열고, 시나리오 파일을 그 안에서 돌려 결과(JSON)를 받는다.
// 저장소(userData)는 매번 새로 만들어 사용자의 진짜 저장을 건드리지 않는다. 난수는 씨앗.js 가 고정한다.
//   node_modules/.bin/electron 도구/시험/배속시험.js <시나리오.js> <결과.json> '<PARAM JSON>' [씨앗]
// 시나리오 안에서는 PARAM(넘긴 값)과 SEED를 쓸 수 있고, 마지막에 값을 return 한다.
// =====================================================================
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const [scenario, out, paramJson = '{}', seed = '1'] = process.argv.slice(2);
process.env.SEED = seed;
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'mlf-test-')));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: true, x: -3000, y: 0, width: 760, height: 521, useContentSize: true,
    webPreferences: { backgroundThrottling: false, contextIsolation: false, sandbox: false, preload: path.join(__dirname, '씨앗.js') } });
  const errs = [];
  win.webContents.on('console-message', (e, lv, msg) => { if (lv >= 2) errs.push(msg.slice(0, 200)); });
  await win.loadFile(path.join(ROOT, '마리판.html'));
  await new Promise(r => setTimeout(r, 1200));
  const code = fs.readFileSync(path.resolve(scenario), 'utf-8');
  let result;
  try {
    result = await win.webContents.executeJavaScript(`(async () => { const PARAM = ${paramJson}; const SEED = ${+seed}; ${code} })()`);
  } catch (e) { result = { error: String(e.message || e).slice(0, 500) }; }
  if (errs.length) result = Object.assign({}, result, { consoleErrors: errs.slice(0, 10) });
  fs.writeFileSync(path.resolve(out), JSON.stringify(result, null, 1));
  app.quit();
});
