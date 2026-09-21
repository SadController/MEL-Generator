const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {readSettings,readSettingsState,writeSettings,defaults,sanitize} = require('../../production/desktop/settings.cjs');
test('preferences round-trip through a Cyrillic path, without persisting scenarios',()=>{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'MEL проверка '));
  const file = path.join(dir,'settings.json');
  try {
    assert.deepEqual(readSettings(file),defaults);
    writeSettings(file,{aircraft:'A319',count:3,width:990,height:700,maximized:true,scenario:['M001'],
      checkForUpdatesOnStartup:false,enableDiagnosticLog:true});
    assert.deepEqual(readSettings(file),{...defaults,aircraft:'A319',count:3,width:990,height:700,
      maximized:true,checkForUpdatesOnStartup:false,enableDiagnosticLog:true});
    fs.writeFileSync(file,'{broken');
    assert.deepEqual(readSettings(file),defaults);
    assert.deepEqual(readSettingsState(file),{settings:defaults,recovered:true,reason:'INVALID_JSON'});
    assert.deepEqual(sanitize({aircraft:'A330',count:0,width:-1,height:90000,
      activateFailuresOnBriefing:true}),{...defaults,width:640,height:2160,
      activateFailuresOnBriefing:true});
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
