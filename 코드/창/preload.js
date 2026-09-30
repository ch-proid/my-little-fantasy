// 게임 화면이 창을 다룰 수 있게 해 주는 다리: 메뉴 열기(창 늘리기)와 게임 종료
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bar', {
  menu: (open, h = 0, focus = true, w = 0) => ipcRenderer.send('menu', open, h, focus, w), // w: 메뉴 너비(띠보다 넓게 열 때)
  quit: () => ipcRenderer.send('quit'),
});
