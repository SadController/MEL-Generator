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
    await until(`document.getElementById('generate-label')?.textContent==='To failures'`);
    const startup = await js(`({aircraft:document.getElementById('setup-form').elements.aircraft.value,count:Number(document.getElementById('setup-form').elements.count.value),disabled:document.getElementById('failures-tab').disabled})`);
    assert.equal(startup.disabled,true);
    checks.push({name:'Startup and restored preferences',result:startup});
    assert.equal(await js(`typeof require`),'undefined');
    assert.equal(await js(`typeof process`),'undefined');
    assert.deepEqual(await js(`Object.keys(window.mel).sort()`),['generate','initialize','onIntegrationState','openSource','saveAppSettings','saveSelection']);
    checks.push({name:'Renderer isolation and narrow preload',passed:true});
    assert.equal(await js(`document.querySelectorAll('.status-light').length`),2);
    assert.equal(await js(`Array.from(document.querySelectorAll('.status-light')).every(item=>!item.textContent.trim())`),true);
    await js(`document.getElementById('settings-button').click()`);
    assert.equal(await js(`document.getElementById('settings-dialog').open`),true);
    assert.equal(await js(`document.getElementById('auto-activate-setting').checked`),false);
    await capture('settings');
    await js(`document.getElementById('settings-close').click()`);
    checks.push({name:'Two label-free integration indicators and automatic-activation setting',passed:true});
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
