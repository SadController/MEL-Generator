'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {EventEmitter} = require('node:events');
const {DiagnosticLogger,DAY_MS} = require('../../production/desktop/diagnostic-log.cjs');
const {UpdateChecker,parseVersion,compareVersions} = require('../../production/desktop/update-checker.cjs');
const {UpdateManager} = require('../../production/desktop/update-manager.cjs');

test('diagnostic logging is opt-in, redacts secrets, rotates and removes only expired app logs',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mel-logs-'));
  const now=new Date('2026-09-20T12:00:00.000Z');
  try {
    const old=path.join(dir,'mel-generator-2026-09-01.jsonl');
    const unrelated=path.join(dir,'keep.txt');
    fs.writeFileSync(old,'old\n');fs.writeFileSync(unrelated,'keep\n');
    fs.utimesSync(old,new Date(now.getTime()-9*DAY_MS),new Date(now.getTime()-9*DAY_MS));
    const logger=new DiagnosticLogger({directory:dir,enabled:false,now:()=>now,maxBytes:80});
    assert.equal(logger.event('disabled'),false);
    logger.cleanup();
    assert.equal(fs.existsSync(old),false);
    assert.equal(fs.existsSync(unrelated),true);
    logger.setEnabled(true);
    assert.equal(logger.event('test.event',{aircraft:'A321',token:'hidden',nested:{password:'hidden'}}),true);
    assert.equal(logger.event('test.second',{message:'x'.repeat(100)}),true);
    const logs=fs.readdirSync(dir).filter(name=>name.endsWith('.jsonl')).sort();
    assert.deepEqual(logs,['mel-generator-2026-09-20-1.jsonl','mel-generator-2026-09-20.jsonl']);
    const content=logs.map(name=>fs.readFileSync(path.join(dir,name),'utf8')).join('');
    assert.match(content,/test\.event/);assert.doesNotMatch(content,/hidden/);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('update checker accepts stable GitHub releases and compares prerelease versions',async()=>{
  assert.deepEqual(parseVersion('v1.2.3-alpha.1'),{major:1,minor:2,patch:3,pre:'alpha.1'});
  assert.equal(compareVersions('1.1.0','1.1.0-alpha.1'),1);
  assert.equal(compareVersions('1.2.0','1.1.9'),1);
  const checker=new UpdateChecker({currentVersion:'1.1.0-alpha.1',request:async()=>({
    tag_name:'v1.1.0',name:'MEL Generator 1.1.0',draft:false,prerelease:false,
    html_url:'https://github.com/SadController/MEL-Generator/releases/tag/v1.1.0'
  })});
  assert.deepEqual(await checker.check(),{status:'available',currentVersion:'1.1.0-alpha.1',
    latestVersion:'1.1.0',releaseName:'MEL Generator 1.1.0',
    releaseUrl:'https://github.com/SadController/MEL-Generator/releases/tag/v1.1.0'});
});

test('update checker rejects prereleases and unexpected release URLs',async()=>{
  const checker=new UpdateChecker({currentVersion:'1.1.0',request:async()=>({
    tag_name:'v1.2.0',draft:false,prerelease:true,html_url:'https://example.com/release'
  })});
  await assert.rejects(checker.check(),/invalid stable release/);
});

test('update checker accepts the legacy Stable tag using the release name version',async()=>{
  const checker=new UpdateChecker({currentVersion:'1.1.0-alpha.1',request:async()=>({
    tag_name:'Stable',name:'v1.0.0',draft:false,prerelease:false,
    html_url:'https://github.com/SadController/MEL-Generator/releases/tag/Stable'
  })});
  assert.deepEqual(await checker.check(),{status:'current',currentVersion:'1.1.0-alpha.1',
    latestVersion:'1.0.0',releaseName:'v1.0.0',releaseUrl:null});
});

test('update manager downloads once, reports progress and installs only after completion',async()=>{
  class FakeUpdater extends EventEmitter {
    async checkForUpdates() { return {updateInfo:{version:'1.1.0'}}; }
    async downloadUpdate() {
      this.emit('download-progress',{percent:42,transferred:42,total:100});
      this.emit('update-downloaded',{version:'1.1.0'});
    }
    quitAndInstall(silent,runAfter) { this.installArgs=[silent,runAfter]; }
  }
  const updater=new FakeUpdater();
  const states=[];
  const manager=new UpdateManager({updater,isPackaged:true,signaturePolicyReady:true,
    onState:state=>states.push(state)});
  assert.equal(updater.autoDownload,false);
  assert.equal(updater.autoInstallOnAppQuit,false);
  await manager.download();
  assert.equal(states.some(state=>state.status === 'downloading' && state.percent === 42),true);
  assert.equal(manager.publicState().status,'downloaded');
  assert.deepEqual(manager.install(),{installing:true});
  assert.deepEqual(updater.installArgs,[false,true]);
});

test('update manager keeps the installed version after network and verification failures',async()=>{
  class FakeUpdater extends EventEmitter {
    async checkForUpdates() { throw new Error('ENOTFOUND github.com'); }
    async downloadUpdate() { throw new Error('must not run'); }
  }
  const network=new UpdateManager({updater:new FakeUpdater(),isPackaged:true,signaturePolicyReady:true});
  assert.match((await network.download()).message,/internet connection/);
  assert.throws(()=>network.install(),/No verified update/);
  assert.match(network.errorMessage(new Error('publisher signature mismatch')),/could not be verified/);
});

test('update manager blocks automatic installation until a signed publisher policy exists',async()=>{
  class FakeUpdater extends EventEmitter {
    async checkForUpdates() { throw new Error('must not contact the release channel'); }
  }
  const manager=new UpdateManager({updater:new FakeUpdater(),isPackaged:true});
  const result=await manager.download();
  assert.equal(result.status,'error');
  assert.match(result.message,/release signing/);
  assert.throws(()=>manager.install(),/No verified update/);
});
