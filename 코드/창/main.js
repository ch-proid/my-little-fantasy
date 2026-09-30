// 작업 표시줄 바로 위 가운데에 붙는 작은 투명 창. 늘 떠 있되 다른 창들보다 아래에 깔린다.
// 메뉴를 열면 창이 위로 늘어나고 앞으로 나온다(입력을 받기 위해). 닫으면 다시 띠로 돌아간다.
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
// 데이터/장비.json → 데이터/장비.js (브라우저로 열 때 쓰는 복사본. 도구/에셋변환/장비넣기.py 와 같은 일)
try {
  const dir = path.join(__dirname, '../../데이터'), data = JSON.parse(fs.readFileSync(path.join(dir, '장비.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, '장비.js'), '// 데이터/장비.json 의 브라우저용 복사본 (자동 생성 — 고치지 말고 장비.json 을 고친다)\nconst ITEMS_DATA = ' + JSON.stringify(data, null, 1) + ';\n');
} catch (e) { /* json이 깨졌으면 복사본을 건드리지 않는다 */ }
const koffi = require('koffi');

const ZOOM = 1; // 크기 배율. 캐릭터가 작으면 2로.
const STRIP_H = 121; // 띠 110 + 경험치 막대 11

const user32 = koffi.load('user32.dll');
const SetWindowPos = user32.func('bool __stdcall SetWindowPos(intptr_t hwnd, intptr_t after, int x, int y, int cx, int cy, uint32_t flags)');
const GetForegroundWindow = user32.func('intptr_t __stdcall GetForegroundWindow()');
const GetClassNameW = user32.func('int __stdcall GetClassNameW(intptr_t hwnd, _Out_ uint8_t* buf, int n)');
const HWND_TOP = 0, HWND_BOTTOM = 1, SWP_NOSIZE = 0x1, SWP_NOMOVE = 0x2, SWP_NOACTIVATE = 0x10;
// Win+D 직후에는 앞 창이 아예 없다고 나온다(0). 그것도 바탕화면으로 친다.
function frontIsDesktop() {
  const h = GetForegroundWindow();
  if (!h) return true;
  const buf = Buffer.alloc(512);
  const cls = buf.toString('utf16le', 0, GetClassNameW(h, buf, 256) * 2);
  return cls === 'Progman' || cls === 'WorkerW';
}

app.whenReady().then(() => {
  const a = screen.getPrimaryDisplay().workArea, w = 480 * ZOOM, h = STRIP_H * ZOOM, x = Math.round(a.x + (a.width - w) / 2);
  const win = new BrowserWindow({
    x, y: a.y + a.height - h, width: w, height: h,
    frame: false, transparent: true, resizable: false, hasShadow: false, skipTaskbar: true,
    title: '마리판',
    webPreferences: { backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.loadFile(path.join(__dirname, '../../마리판.html'), { query: { bar: '1' } });

  const hwnd = win.getNativeWindowHandle().readBigInt64LE();
  let menuOpen = false;
  const toBottom = () => { if (!menuOpen) SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE); };
  // 눌러서 앞으로 나와도 곧바로 맨 아래로 돌려보낸다 (메뉴가 열려 있을 때는 그대로 둔다)
  win.on('focus', toBottom);
  // 바탕화면 보기(Win+D)로 함께 내려가면 바로 다시 띄운다
  win.on('minimize', () => setTimeout(() => { win.restore(); toBottom(); }, 100));
  // 바탕화면이 앞으로 오면(Win+D, 바탕화면 클릭) 그 위로 올린다. 활성 창은 되지 않으니 다른 창을 누르면 다시 가려진다.
  let onDesktop = false;
  setInterval(() => {
    const now = frontIsDesktop();
    if (now && !onDesktop) SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE);
    onDesktop = now;
  }, 300);
  win.once('ready-to-show', toBottom);
  toBottom();

  // 메뉴: 창을 위로 늘리고 앞으로 / 닫으면 띠로
  ipcMain.on('menu', (_, open, menuH, focus, menuW) => {
    menuOpen = !!open;
    const hh = Math.round((STRIP_H + (open ? menuH : 0)) * ZOOM), ww = open && menuW ? Math.round(Math.max(480, menuW) * ZOOM) : w; // 메뉴는 띠보다 넓게 열 수 있다 (띠는 가운데 그대로)
    win.setResizable(true); win.setBounds({ x: Math.round(a.x + (a.width - ww) / 2), y: a.y + a.height - hh, width: ww, height: hh }); win.setResizable(false);
    if (open && focus) { SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE); win.focus(); } else if (!open) toBottom();
  });
  ipcMain.on('quit', () => app.quit());
});
app.on('window-all-closed', () => app.quit());
