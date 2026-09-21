'use strict';
const {app, BrowserWindow, ipcMain, Menu, protocol, session, dialog, screen} = require('electron');
const {autoUpdater} = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const {readSettings, writeSettings} = require('./settings.cjs');
const {IntegrationServiceClient,findSimConnectDll} = require('./integration.cjs');
const {DiagnosticLogger} = require('./diagnostic-log.cjs');
const {UpdateChecker} = require('./update-checker.cjs');
const {UpdateManager} = require('./update-manager.cjs');
const catalog = require('../data/catalog.json');

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
let settings;
let settingsFile;
let lastScenario;
let integration;
let logger;
let updateChecker;
let updateManager;
let updateCheckPromise;
let latestUpdate;
const qaArg = process.argv.find(a => a.startsWith('--qa-output='));

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
    logger?.event('renderer.stopped');
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

function publicUpdateState(value) {
  if(!value) return null;
  return {status:value.status,currentVersion:value.currentVersion,
    latestVersion:value.latestVersion || null,releaseName:value.releaseName || null,
    message:value.message || null,manual:value.manual === true,
    percent:Number.isFinite(value.percent) ? value.percent : null};
}

async function activateCurrentScenario({manual=true}={}) {
  if(!lastScenario?.cards?.length) throw new Error('No generated scenario is available.');
  const activation=await integration.activate(lastScenario.cards.map(card=>card.id));
  logger.event('activation.completed',{overall:activation.overall,
    rolledBack:activation.rolledBack === true,manual,results:(activation.results || []).map(item=>({
      catalogId:item.catalogId,fenixId:item.fenixId || null,status:item.status}))});
  lastScenario={...lastScenario,activation};
  return activation;
}

function publishUpdateState(value) {
  if(mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mel:update-status',publicUpdateState(value));
  }
}

async function runUpdateCheck({manual=false}={}) {
  if(updateCheckPromise) return updateCheckPromise;
  const checking={status:'checking',currentVersion:app.getVersion(),manual};
  publishUpdateState(checking);
  logger?.event('update.check.started',{manual});
  updateCheckPromise=updateChecker.check().then(result=>{
    result={...result,manual};
    latestUpdate=result.status === 'available' ? result : null;
    logger?.event('update.check.completed',{manual,status:result.status,
      currentVersion:result.currentVersion,latestVersion:result.latestVersion});
    publishUpdateState(result);
    return publicUpdateState(result);
  }).catch(error=>{
    const result={status:'error',currentVersion:app.getVersion(),manual,
      message:'Unable to check for updates. Check your internet connection and try again.'};
    logger?.event('update.check.failed',{manual,error:error.message});
    publishUpdateState(result);
    return publicUpdateState(result);
  }).finally(()=>{updateCheckPromise=null;});
  return updateCheckPromise;
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
    logger = new DiagnosticLogger({directory:path.join(app.getPath('userData'),'logs'),
      enabled:settings.enableDiagnosticLog});
    try { logger.cleanup(); } catch { /* Log maintenance is best effort. */ }
    logger.event('application.started',{version:app.getVersion(),platform:process.platform,arch:process.arch});
    updateChecker = new UpdateChecker({currentVersion:app.getVersion()});
    const updateConfig=app.isPackaged ? path.join(process.resourcesPath,'app-update.yml') : null;
    const signaturePolicyReady=Boolean(updateConfig && fs.existsSync(updateConfig) &&
      /^publisherName\s*:/m.test(fs.readFileSync(updateConfig,'utf8')));
    updateManager = new UpdateManager({updater:autoUpdater,isPackaged:app.isPackaged,
      signaturePolicyReady,logger,
      onState:state=>{
        latestUpdate={...(latestUpdate || {}),...state};
        publishUpdateState(latestUpdate);
      }});
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
      return {settings:{aircraft:settings.aircraft,count:settings.count,
        checkForUpdatesOnStartup:settings.checkForUpdatesOnStartup,
        activateFailuresOnBriefing:settings.activateFailuresOnBriefing,
        enableDiagnosticLog:settings.enableDiagnosticLog},
        integration:integration?.publicState(), version:app.getVersion(),
        integrationVersion:'2.0.0',catalogueCount:catalog.records.length,
        update:publicUpdateState(latestUpdate)};
    });
    ipcMain.handle('mel:selection', (event,value) => { checkSender(event); return saveSelection(value); });
    ipcMain.handle('mel:app-settings', (event,value) => {
      checkSender(event);
      const allowed=['checkForUpdatesOnStartup','activateFailuresOnBriefing','enableDiagnosticLog'];
      const keys=value && typeof value === 'object' ? Object.keys(value) : [];
      if(!keys.length || keys.some(key=>!allowed.includes(key) || typeof value[key] !== 'boolean')) {
        throw new Error('Invalid application settings.');
      }
      const wasLogging=settings.enableDiagnosticLog;
      if(wasLogging && value.enableDiagnosticLog === false) logger.event('diagnostic-log.disabled');
      settings={...settings,...value};
      writeSettings(settingsFile,settings);
      logger.setEnabled(settings.enableDiagnosticLog);
      if(!wasLogging && settings.enableDiagnosticLog) logger.event('diagnostic-log.enabled');
      logger.event('settings.changed',{keys});
      return {checkForUpdatesOnStartup:settings.checkForUpdatesOnStartup,
        activateFailuresOnBriefing:settings.activateFailuresOnBriefing,
        enableDiagnosticLog:settings.enableDiagnosticLog};
    });
    ipcMain.handle('mel:check-updates', event => { checkSender(event); return runUpdateCheck({manual:true}); });
    ipcMain.handle('mel:run-update', async event => {
      checkSender(event);
      if(updateManager.publicState().status === 'downloaded') return updateManager.install();
      if(!latestUpdate || !['available','error','downloading'].includes(latestUpdate.status)) {
        throw new Error('No compatible update is available.');
      }
      return updateManager.download();
    });
    ipcMain.handle('mel:activate-current', async event => { checkSender(event); return activateCurrentScenario(); });
    ipcMain.handle('mel:generate', async (event,value) => {
      checkSender(event);
      const selected = checkSelection(value);
      lastScenario = await integration.generate(selected);
      saveSelection(selected);
      logger.event('scenario.generated',{aircraft:selected.aircraft,count:selected.count,
        ids:lastScenario.cards.map(card=>card.id),automaticActivation:settings.activateFailuresOnBriefing});
      const activation=settings.activateFailuresOnBriefing
        ? await activateCurrentScenario({manual:false})
        : {requested:false,overall:'disabled',results:[]};
      return {...lastScenario,activation};
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
    const serviceRoot=app.isPackaged
      ? path.join(process.resourcesPath,'app.asar.unpacked','integration','service')
      : path.resolve(__dirname,'../integration/service');
    const servicePath=path.join(serviceRoot,'MelGenerator.IntegrationService.exe');
    const simConnectDll=findSimConnectDll({resourcesPath:process.resourcesPath,userData:app.getPath('userData')});
    integration=new IntegrationServiceClient({servicePath,simConnectDll,
      dataDirectory:path.join(serviceRoot,'data'),
      onState:state=>{
        logger.event('integration.state',state);
        if(mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mel:integration-state',state);
      }});
    integration.start();
    createWindow();
    mainWindow.webContents.once('did-finish-load',()=>{
      if(settings.checkForUpdatesOnStartup && !qaArg) runUpdateCheck({manual:false});
    });
    if (qaArg) require('./qa.cjs').run({app, BrowserWindow, mainWindow, session:session.defaultSession,
      output:path.resolve(qaArg.slice('--qa-output='.length)), settingsFile});
  }).catch(error => {
    dialog.showErrorBox('MEL Generator', `Unable to start the application.\n${error.message}`);
    app.quit();
  });
  app.on('before-quit',()=>{logger?.event('application.stopped');integration?.stop();});
  app.on('window-all-closed', () => app.quit());
}
