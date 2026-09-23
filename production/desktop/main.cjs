'use strict';
const {app, BrowserWindow, ipcMain, Menu, protocol, session, dialog, screen} = require('electron');
const {autoUpdater} = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const {readSettingsState, writeSettings} = require('./settings.cjs');
const {IntegrationServiceClient,findSimConnectDll} = require('./integration.cjs');
const {DiagnosticLogger} = require('./diagnostic-log.cjs');
const {UpdateChecker} = require('./update-checker.cjs');
const {UpdateManager} = require('./update-manager.cjs');
const {issue,classifyError,activationIssue,resultEnvelope} = require('./user-errors.cjs');
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
let initialIssue;
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
  const next={...settings,...checkSelection(value)};
  try { writeSettings(settingsFile,next); settings=next; return {saved:true}; }
  catch(error) {
    logger?.event('settings.save.failed',{operation:'selection',error:error.message});
    return {saved:false,issue:issue('SETTINGS_SAVE_FAILED')};
  }
}

function publicIntegrationState(value={}) {
  let publicIssue=null;
  if(value.bridgeError) {
    publicIssue=/SimConnect\.dll.*not found|Unable to load SimConnect/i.test(value.bridgeError)
      ? issue('SIMCONNECT_RUNTIME_MISSING')
      : /Integration service.*missing/i.test(value.bridgeError)
        ? issue('INTEGRATION_SERVICE_MISSING')
        : /Integration service stopped/i.test(value.bridgeError)
          ? issue('INTEGRATION_SERVICE_STOPPED') : issue('SIMULATOR_NOT_READY');
  } else if(value.adapterError) publicIssue=classifyError('activation',value.adapterError);
  return {simConnected:value.simConnected===true,aircraftLoaded:value.aircraftLoaded===true,
    aircraftTitle:value.aircraftTitle || null,supportedAircraft:value.supportedAircraft===true,
    adapterReady:value.adapterReady===true,issue:publicIssue};
}

function handle(channel,scope,operation) {
  ipcMain.handle(channel,(event,...args)=>resultEnvelope(scope,async()=>{
    checkSender(event);
    return operation(...args);
  },error=>logger?.event('operation.failed',{channel,error:error.message})));
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
    const publicIssue=issue('APP_RENDERER_STOPPED');
    dialog.showErrorBox(publicIssue.title, `${publicIssue.message}\n\n${publicIssue.action}\n\n${publicIssue.code}`);
  });
  mainWindow.on('close', () => {
    const bounds = mainWindow.getNormalBounds();
    settings = {...settings, width:bounds.width, height:bounds.height, maximized:mainWindow.isMaximized()};
    try { writeSettings(settingsFile, settings); } catch { /* Preferences are optional. */ }
    if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.close();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  void mainWindow.loadURL(origin + '/index.html').catch(error=>{
    logger?.event('renderer.load.failed',{error:error.message});
    const publicIssue=classifyError('startup',error);
    dialog.showErrorBox(publicIssue.title, `${publicIssue.message}\n\n${publicIssue.action}\n\n${publicIssue.code}`);
  });
}

function publicUpdateState(value) {
  if(!value) return null;
  return {status:value.status,currentVersion:value.currentVersion,
    latestVersion:value.latestVersion || null,releaseName:value.releaseName || null,
    issue:value.issue || null,manual:value.manual === true,
    percent:Number.isFinite(value.percent) ? value.percent : null};
}

async function activateCurrentScenario({manual=true}={}) {
  if(!lastScenario?.cards?.length) throw new Error('No generated scenario is available.');
  const activation=await integration.activate(lastScenario.cards.map(card=>card.id));
  const activationState=integration.publicState();
  const publicIssue=activationIssue(activation,activationState);
  logger.event('activation.completed',{overall:activation.overall,
    rolledBack:activation.rolledBack === true,rollbackError:activation.rollbackError || null,
    error:activation.message || null,manual,results:(activation.results || []).map(item=>({
      catalogId:item.catalogId,fenixId:item.fenixId || null,status:item.status}))});
  const safeActivation={requested:activation.requested===true,overall:activation.overall,
    rolledBack:activation.rolledBack===true,issue:publicIssue,
    message:publicIssue?.message || null,results:(activation.results || []).map(item=>({
      catalogId:item.catalogId,fenixId:item.fenixId || null,status:item.status,
      message:publicIssue?.message || null}))};
  lastScenario={...lastScenario,activation:safeActivation};
  return safeActivation;
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
    const publicIssue=classifyError('update-check',error);
    const result={status:'error',currentVersion:app.getVersion(),manual,
      issue:publicIssue};
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
    const settingsState=readSettingsState(settingsFile);
    settings=settingsState.settings;
    initialIssue=settingsState.recovered ? issue('SETTINGS_RECOVERED') : null;
    logger = new DiagnosticLogger({directory:path.join(app.getPath('userData'),'logs'),
      enabled:settings.enableDiagnosticLog});
    try { logger.cleanup(); } catch { /* Log maintenance is best effort. */ }
    logger.event('application.started',{version:app.getVersion(),platform:process.platform,arch:process.arch});
    if(settingsState.recovered) logger.event('settings.recovered',{reason:settingsState.reason});
    updateChecker = new UpdateChecker({currentVersion:app.getVersion()});
    updateManager = new UpdateManager({updater:autoUpdater,isPackaged:app.isPackaged,logger,
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
    handle('mel:initialize','startup',()=>{
      return {settings:{aircraft:settings.aircraft,count:settings.count,
        checkForUpdatesOnStartup:settings.checkForUpdatesOnStartup,
        activateFailuresOnBriefing:settings.activateFailuresOnBriefing,
        enableDiagnosticLog:settings.enableDiagnosticLog},
        integration:publicIntegrationState(integration?.publicState()), version:app.getVersion(),
        integrationVersion:'2.0.0',catalogueCount:catalog.records.length,
        update:publicUpdateState(latestUpdate),issue:initialIssue};
    });
    handle('mel:selection','settings',value=>saveSelection(value));
    handle('mel:app-settings','settings',value=>{
      const allowed=['checkForUpdatesOnStartup','activateFailuresOnBriefing','enableDiagnosticLog'];
      const keys=value && typeof value === 'object' ? Object.keys(value) : [];
      if(!keys.length || keys.some(key=>!allowed.includes(key) || typeof value[key] !== 'boolean')) {
        throw new Error('Invalid application settings.');
      }
      const wasLogging=settings.enableDiagnosticLog;
      if(wasLogging && value.enableDiagnosticLog === false) logger.event('diagnostic-log.disabled');
      const next={...settings,...value};
      writeSettings(settingsFile,next);
      settings=next;
      logger.setEnabled(settings.enableDiagnosticLog);
      if(!wasLogging && settings.enableDiagnosticLog) logger.event('diagnostic-log.enabled');
      logger.event('settings.changed',{keys});
      return {checkForUpdatesOnStartup:settings.checkForUpdatesOnStartup,
        activateFailuresOnBriefing:settings.activateFailuresOnBriefing,
        enableDiagnosticLog:settings.enableDiagnosticLog};
    });
    handle('mel:check-updates','update-check',()=>runUpdateCheck({manual:true}));
    handle('mel:run-update','update-download',async()=>{
      if(updateManager.publicState().status === 'downloaded') {
        try { return updateManager.install(); }
        catch(error) {
          logger?.event('update.install.failed',{error:error.message});
          return {status:'error',issue:classifyError('update-install',error)};
        }
      }
      if(!latestUpdate || !['available','error','downloading'].includes(latestUpdate.status)) {
        throw new Error('No compatible update is available.');
      }
      return updateManager.download();
    });
    handle('mel:activate-current','activation',()=>activateCurrentScenario());
    handle('mel:generate','generation',async value=>{
      const selected = checkSelection(value);
      lastScenario = await integration.generate(selected);
      const selectionResult=saveSelection(selected);
      logger.event('scenario.generated',{aircraft:selected.aircraft,count:selected.count,
        ids:lastScenario.cards.map(card=>card.id),automaticActivation:settings.activateFailuresOnBriefing});
      const activation=settings.activateFailuresOnBriefing
        ? await activateCurrentScenario({manual:false})
        : {requested:false,overall:'disabled',results:[]};
      return {...lastScenario,activation,notice:selectionResult.issue || null};
    });
    handle('mel:source','source',async value=>{
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
        if(mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mel:integration-state',publicIntegrationState(state));
      }});
    integration.start();
    createWindow();
    mainWindow.webContents.once('did-finish-load',()=>{
      if(settings.checkForUpdatesOnStartup && !qaArg) runUpdateCheck({manual:false});
    });
    if (qaArg) require('./qa.cjs').run({app, BrowserWindow, mainWindow, session:session.defaultSession,
      output:path.resolve(qaArg.slice('--qa-output='.length)), settingsFile});
  }).catch(error => {
    const publicIssue=classifyError('startup',error);
    dialog.showErrorBox(publicIssue.title, `${publicIssue.message}\n\n${publicIssue.action}\n\n${publicIssue.code}`);
    app.quit();
  });
  app.on('before-quit',()=>{logger?.event('application.stopped');integration?.stop();});
  app.on('window-all-closed', () => app.quit());
}
