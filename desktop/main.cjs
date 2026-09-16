'use strict';
const {app, BrowserWindow, ipcMain, Menu, protocol, session, dialog, screen} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {Generator} = require('../core/generator.cjs');
const {readSettings, writeSettings} = require('./settings.cjs');
const catalog = require('../data/catalog.json');
const rules = require('../data/rules.json');

app.setName('MEL Generator');
app.setPath('userData', path.join(app.getPath('appData'), 'MEL Generator'));
// An optional isolated profile is useful for release QA, without touching user settings.
const profileArg = process.argv.find(a => a.startsWith('--profile-dir='));
if (profileArg) app.setPath('userData', path.resolve(profileArg.slice('--profile-dir='.length)));
app.commandLine.appendSwitch('lang','en-US');
app.commandLine.appendSwitch('disable-background-networking');
protocol.registerSchemesAsPrivileged([{scheme:'mel', privileges:{standard:true, secure:true, supportFetchAPI:true}}]);
const origin = 'mel://app';
const uiRoot = path.resolve(__dirname, '../ui');
let mainWindow;
let pdfWindow;
let generator;
let settings;
let settingsFile;
let lastScenario;

function checkSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame ||
      !event.senderFrame.url.startsWith(origin + '/')) throw new Error('Untrusted request.');
}
function checkSelection(value) {
  if (!value || !['A319','A320','A321'].includes(value.aircraft) || ![1,2,3].includes(value.count)) {
    throw new Error('Invalid aircraft or failure count.');
  }
  return {aircraft:value.aircraft, count:value.count};
}
function saveSelection(value) {
  settings = {...settings, ...checkSelection(value)};
  try { writeSettings(settingsFile, settings); return {saved:true}; }
  catch { return {saved:false}; }
}
function restrictWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin + '/')) event.preventDefault();
  });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
}
function createWindow() {
  const area = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width:Math.min(settings.width, area.width), height:Math.min(settings.height,area.height),
    minWidth:640, minHeight:600, show:false, backgroundColor:'#080f1c',
    title:'MEL Generator', icon:path.join(__dirname,'../ui/icon.png'),
    autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'), contextIsolation:true,
      nodeIntegration:false, sandbox:true, webSecurity:true, spellcheck:false}
  });
  restrictWindow(mainWindow);
  mainWindow.once('ready-to-show', () => {
    if (settings.maximized) mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.webContents.on('render-process-gone', () => {
    dialog.showErrorBox('MEL Generator', 'The interface stopped unexpectedly. Please close and reopen the application.');
  });
  mainWindow.on('close', () => {
    const bounds = mainWindow.getNormalBounds();
    settings = {...settings, width:bounds.width, height:bounds.height, maximized:mainWindow.isMaximized()};
    try { writeSettings(settingsFile, settings); } catch { /* Preferences are optional. */ }
    if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.close();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadURL(origin + '/index.html');
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    settingsFile = path.join(app.getPath('userData'),'settings.json');
    settings = readSettings(settingsFile);
    generator = new Generator(catalog,rules);
    const pdf = path.join(app.isPackaged ? process.resourcesPath : path.resolve(__dirname,'../resources'),'MMEL.pdf');
    const allowed = new Map([
      ['/index.html',[path.join(uiRoot,'index.html'),'text/html; charset=utf-8']],
      ['/styles.css',[path.join(uiRoot,'styles.css'),'text/css; charset=utf-8']],
      ['/renderer.js',[path.join(uiRoot,'renderer.js'),'text/javascript; charset=utf-8']],
      ['/icon.png',[path.join(uiRoot,'icon.png'),'image/png']],
      ['/MMEL.pdf',[pdf,'application/pdf']]
    ]);
    protocol.handle('mel', request => {
      const url = new URL(request.url);
      const entry = url.host === 'app' && allowed.get(url.pathname);
      if (!entry || request.method !== 'GET') return new Response('Not found',{status:404});
      try {
        return new Response(fs.readFileSync(entry[0]), {headers:{
          'Content-Type':entry[1],
          'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'"
        }});
      } catch { return new Response('Local resource unavailable',{status:500}); }
    });
    session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
    ipcMain.handle('mel:initialize', event => {
      checkSender(event);
      return {settings:{aircraft:settings.aircraft,count:settings.count}, version:app.getVersion(), catalogueCount:catalog.records.length};
    });
    ipcMain.handle('mel:selection', (event,value) => { checkSender(event); return saveSelection(value); });
    ipcMain.handle('mel:generate', (event,value) => {
      checkSender(event);
      const selected = checkSelection(value);
      lastScenario = generator.draw(selected.aircraft, selected.count);
      saveSelection(selected);
      return lastScenario;
    });
    ipcMain.handle('mel:source', async (event, value) => {
      checkSender(event);
      const card = lastScenario?.cards.find(c => c.id === value?.id && c.branch_id === value?.branchId);
      if (!card) throw new Error('Source is only available for the current scenario.');
      if (!fs.existsSync(pdf)) throw new Error('The bundled MMEL document is missing.');
      if (!pdfWindow || pdfWindow.isDestroyed()) {
        pdfWindow = new BrowserWindow({width:1060,height:820,show:false,backgroundColor:'#202124',
          title:'FAA A320 MMEL — Rev. 32', autoHideMenuBar:true,
          webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,plugins:true}});
        restrictWindow(pdfWindow);
        pdfWindow.on('closed',()=>{pdfWindow=null;});
      }
      await pdfWindow.loadURL(`${origin}/MMEL.pdf#page=${card.pdf_pages[0]}&zoom=page-width`);
      pdfWindow.show();
      pdfWindow.focus();
      return {page:card.pdf_pages[0]};
    });
    createWindow();
    const qa = process.argv.find(a => a.startsWith('--qa-output='));
    if (qa) require('./qa.cjs').run({app, BrowserWindow, mainWindow, session:session.defaultSession,
      output:path.resolve(qa.slice('--qa-output='.length)), settingsFile});
  }).catch(error => {
    dialog.showErrorBox('MEL Generator', `Unable to start the application.\n${error.message}`);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
}
