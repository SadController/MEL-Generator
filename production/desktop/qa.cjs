// Opt-in application integration tests. Never runs during ordinary startup.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pause = ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run({app,BrowserWindow,mainWindow,session,output,settingsFile}) {
  fs.mkdirSync(output,{recursive:true});
  const checks = [];
  const errors = [];
  const wc = mainWindow.webContents;
  wc.on('console-message',(_event,details)=>{if(details.level==='error') errors.push(details.message);});
  const js = source=>wc.executeJavaScript(source);
  const until = async (source,timeout=15000)=>{
    const deadline=Date.now()+timeout;
    while(Date.now()<deadline) {
      try {if(await js(source))return;} catch {}
      await pause(100);
    }
    throw new Error(`Timed out: ${source}`);
  };
  const captureWindow = async (win,name)=>{
    // DOM readiness can precede the first compositor frame on Windows.
    let lastError;
    for(let i=0;i<8;i++) {
      await pause(250);
      try {
        const bitmap=await win.capturePage(undefined,{stayHidden:true,stayAwake:true});
        if(bitmap.isEmpty())throw new Error('Empty compositor frame');
        fs.writeFileSync(path.join(output,name+'.png'),bitmap.toPNG());
        return;
      } catch(error) {lastError=error;}
    }
    throw lastError;
  };
  const capture = name=>captureWindow(mainWindow,name);
  const cards = ()=>js(`Array.from(document.querySelectorAll('.failure-card')).map(c=>({id:c.dataset.failureId,branch:c.dataset.branchId,text:c.innerText}))`);
  const goBack = ()=>js(`document.getElementById('back-button').click()`);
  const choose = async (aircraft,count)=>{
    await js(`document.querySelector('input[name="aircraft"][value="${aircraft}"]').click();document.querySelector('input[name="count"][value="${count}"]').click()`);
  };
  const generate = async ()=>{
    await js(`document.querySelector('.primary-button').click()`);
    await until(`!document.getElementById('failures-panel').hidden && !document.querySelector('.primary-button').disabled`);
  };
  let success=false;
  try {
    await until(`document.getElementById('generate-label')?.textContent==='Prepare briefing'`);
    const startup = await js(`({aircraft:document.getElementById('setup-form').elements.aircraft.value,count:Number(document.getElementById('setup-form').elements.count.value),disabled:document.getElementById('failures-tab').disabled})`);
    assert.equal(startup.disabled,true);
    checks.push({name:'Startup and restored preferences',result:startup});
    assert.equal(await js(`document.querySelector('.brand-copy small').textContent`),'Built for a different kind of flight.');
    assert.equal(await js(`document.getElementById('version-badge')`),null);
    assert.equal(await js(`document.body.innerText.includes('For flight simulation')`),false);
    assert.equal(await js(`document.body.innerText.includes('Fenix integration')`),false);
    assert.equal(await js(`document.body.innerText.includes('Review the briefing before you fly.')`),false);
    assert.equal(await js(`document.body.innerText.includes('Random scenario')`),false);
    checks.push({name:'Header slogan and simplified main-screen chrome',passed:true});
    assert.equal(await js(`typeof require`),'undefined');
    assert.equal(await js(`typeof process`),'undefined');
    assert.deepEqual(await js(`Object.keys(window.mel).sort()`),['activateCurrent','checkForUpdates','generate','initialize',
      'onIntegrationState','onUpdateStatus','openSource','runUpdate','saveAppSettings','saveSelection']);
    checks.push({name:'Renderer isolation and narrow preload',passed:true});
    assert.equal(await js(`document.querySelectorAll('.status-light').length`),2);
    assert.equal(await js(`Array.from(document.querySelectorAll('.status-light')).every(item=>!item.textContent.trim())`),true);
    await js(`document.getElementById('settings-button').click()`);
    assert.equal(await js(`document.getElementById('settings-dialog').open`),true);
    assert.equal(await js(`document.getElementById('startup-update-setting').checked`),true);
    assert.equal(await js(`document.getElementById('auto-activate-setting').checked`),false);
    assert.equal(await js(`document.getElementById('diagnostic-log-setting').checked`),false);
    assert.equal(await js(`document.getElementById('update-available').hidden`),true);
    assert.equal(await js(`document.getElementById('check-updates').textContent.trim()`),'Check for updates');
    assert.equal(await js(`document.getElementById('download-update').hidden`),true);
    await js(`renderUpdateState({status:'current',manual:true,currentVersion:'1.1.0'})`);
    assert.equal(await js(`document.getElementById('settings-update-status').textContent`),'No updates available');
    await js(`renderUpdateState({status:'available',latestVersion:'9.9.9',currentVersion:'1.1.0'})`);
    assert.equal(await js(`document.getElementById('update-available').hidden`),false);
    assert.equal(await js(`document.getElementById('download-update').hidden`),false);
    assert.equal(await js(`document.getElementById('download-update').textContent`),'Download update');
    await capture('settings-update-available');
    await js(`renderUpdateState({status:'downloading',latestVersion:'9.9.9',percent:42})`);
    assert.equal(await js(`document.getElementById('update-available').textContent`),'Downloading 42%');
    assert.equal(await js(`document.getElementById('download-update').textContent`),'Downloading 42%');
    assert.equal(await js(`document.getElementById('download-update').disabled`),true);
    await js(`renderUpdateState({status:'downloaded',latestVersion:'9.9.9'})`);
    assert.equal(await js(`document.getElementById('update-available').textContent`),'Restart to update');
    assert.equal(await js(`document.getElementById('download-update').textContent`),'Restart to update');
    await js(`renderUpdateState({status:'error',latestVersion:'9.9.9',issue:{code:'UPDATE_DOWNLOAD_FAILED',title:'The update was not downloaded',message:'The installed version was not changed.',action:'Try again later.',severity:'warning'}})`);
    assert.equal(await js(`document.getElementById('download-update').textContent`),'Retry download');
    await js(`renderUpdateState({status:'error',manual:true,issue:{code:'UPDATE_NETWORK_UNAVAILABLE',title:'Could not connect to GitHub',message:'MEL Generator could not check for updates.',action:'Check your internet connection and try again later.',severity:'warning'}})`);
    assert.match(await js(`document.getElementById('settings-update-status').textContent`),/UPDATE_NETWORK_UNAVAILABLE/);
    assert.equal(await js(`document.getElementById('settings-update-status').textContent.includes('No updates available')`),false);
    await js(`renderUpdateState(null)`);
    await js(`renderSettingsSaveIssue({code:'SETTINGS_SAVE_FAILED',title:'Settings were not saved',message:'The requested change could not be stored for the next launch.',action:'Check your Windows user profile and try again.'})`);
    assert.equal(await js(`document.getElementById('settings-save-status').hidden`),false);
    assert.match(await js(`document.getElementById('settings-save-status').innerText`),/SETTINGS_SAVE_FAILED/);
    await js(`renderSettingsSaveIssue(null)`);
    assert.equal(await js(`document.getElementById('settings-save-status').hidden`),true);
    await js(`document.getElementById('diagnostic-log-setting').click()`);
    await until(`document.getElementById('diagnostic-log-setting').checked && !document.getElementById('diagnostic-log-setting').disabled`);
    assert.equal(JSON.parse(fs.readFileSync(settingsFile,'utf8')).enableDiagnosticLog,true);
    await js(`document.getElementById('diagnostic-log-setting').click()`);
    await until(`!document.getElementById('diagnostic-log-setting').checked && !document.getElementById('diagnostic-log-setting').disabled`);
    await capture('settings');
    await js(`document.getElementById('settings-close').click()`);
    await js(`message({code:'SIMCONNECT_RUNTIME_MISSING',title:'SimConnect is unavailable',message:'The Microsoft SimConnect client library could not be loaded.',action:'Reinstall MEL Generator from the official release.',severity:'error'})`);
    assert.equal(await js(`document.getElementById('app-message').dataset.code`),'SIMCONNECT_RUNTIME_MISSING');
    assert.match(await js(`document.getElementById('app-message').innerText`),/Reinstall MEL Generator/);
    assert.equal(await js(`document.getElementById('app-message').innerText.includes('HRESULT')`),false);
    await capture('error-banner');
    await js(`message()`);
    checks.push({name:'Settings, update errors, actionable error banner and two label-free integration indicators',passed:true});
    await session.enableNetworkEmulation({offline:true});
    checks.push({name:'All following application checks run with Electron networking offline',passed:true});
    await capture('setup');
    for(const [aircraft,count] of [['A319',1],['A320',2],['A321',3]]) {
      await choose(aircraft,count);
      await generate();
      const result=await cards();
      assert.equal(result.length,count);
      assert.equal(new Set(result.map(c=>c.id)).size,count);
      assert.equal(await js(`document.getElementById('results-title').textContent`),aircraft+' failures');
      assert.equal(await js(`document.getElementById('activate-failures').textContent`),'Activate failures');
      assert.equal(await js(`document.body.innerText.includes('Activate these failures manually in Fenix.')`),false);
      assert.equal(await js(`document.getElementById('activation-footer').hidden`),true);
      assert.equal(await js(`/[\u0400-\u04ff]/.test(document.body.innerText)`),false);
      assert.equal(await js(`document.documentElement.scrollWidth<=innerWidth`),true);
      await pause(300);
      await capture('failures-'+count);
      await js(`document.getElementById('setup-tab').click();document.getElementById('failures-tab').click()`);
      assert.deepEqual(await cards(),result);
      checks.push({name:`${aircraft}, ${count} cards, English UI, no horizontal overflow, tab return preserves scenario`,ids:result.map(c=>c.id)});
      await goBack();
    }
    await choose('A319',1);
    const seen = new Set();
    let previous;
    for(let i=0;i<54;i++) {
      await generate();
      const result=await cards();
      const id=result[0].id;
      // One single was drawn above: the first cycle has 52 draws remaining.
      if(i<52){assert.equal(seen.has(id),false);seen.add(id);}
      assert.notEqual(id,previous);
      previous=id;
      await goBack();
    }
    checks.push({name:'54 repeated UI generations including cycle rollover',passed:true});
    await generate();
    const beforeSource=await cards();
    await js(`document.querySelector('.source-link').click()`);
    let viewer;
    for(let i=0;i<150;i++) {
      viewer=BrowserWindow.getAllWindows().find(w=>w!==mainWindow);
      if(viewer&&!viewer.webContents.isLoading())break;
      await pause(100);
    }
    assert.ok(viewer,'PDF window must open');
    assert.match(viewer.webContents.getURL(),/^mel:\/\/app\/MMEL\.pdf#page=\d+/);
    await pause(1500);
    await captureWindow(viewer,'source-pdf');
    checks.push({name:'Bundled PDF viewer loads offline',url:viewer.webContents.getURL()});
    viewer.close();
    assert.deepEqual(await cards(),beforeSource);
    await goBack();
    mainWindow.setSize(680,700);
    await pause(250);
    assert.equal(await js(`document.documentElement.scrollWidth<=innerWidth`),true);
    await capture('setup-narrow');
    await choose('A321',3);
    await generate();
    assert.equal(await js(`document.documentElement.scrollWidth<=innerWidth`),true);
    await capture('failures-narrow');
    checks.push({name:'Narrow desktop window, setup and three results',passed:true});
    await goBack();
    await choose('A319',1);
    mainWindow.setSize(1180,860);
    const prefs=JSON.parse(fs.readFileSync(settingsFile,'utf8'));
    assert.equal(prefs.aircraft,'A319');assert.equal(prefs.count,1);
    assert.equal(prefs.checkForUpdatesOnStartup,true);
    assert.equal(prefs.activateFailuresOnBriefing,false);
    assert.equal(prefs.enableDiagnosticLog,false);
    assert.equal('scenario' in prefs,false);
    const message=await js(`document.getElementById('app-message').textContent`);
    assert.equal(message,'');
    assert.equal(errors.length,0,errors.join('\n'));
    checks.push({name:'Preferences written without scenario history; no interface errors',passed:true});
    success=true;
  } catch(error) {
    errors.push(error.stack);
    try {await capture('failure');}catch{}
  } finally {
    fs.writeFileSync(path.join(output,'integration.json'),JSON.stringify({success,version:app.getVersion(),electron:process.versions.electron,platform:process.platform,arch:process.arch,checks,errors},null,2));
    mainWindow.close();
    app.exit(success?0:1);
  }
}
module.exports={run};
