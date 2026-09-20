'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawn} = require('node:child_process');
const readline = require('node:readline');
const {IntegrationServiceClient,isSupportedFenix,PROTOCOL_VERSION} = require('../../production/desktop/integration.cjs');

const root=path.resolve(__dirname,'../..');
const service=path.join(root,'production','integration','service','MelGenerator.IntegrationService.exe');
const data=path.join(root,'production','integration','service','data');

test('integration client accepts only protocol v2 state and strict Fenix titles',()=>{
  const states=[];
  const client=new IntegrationServiceClient({onState:state=>states.push(state)});
  client.handleLine(JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'state',simConnected:true,
    aircraftLoaded:true,aircraftTitle:'FenixA321 IAE WF SC',supportedAircraft:true,adapterReady:true}));
  assert.equal(client.publicState().adapterReady,true);
  assert.equal(states.length,1);
  client.handleLine(JSON.stringify({protocolVersion:1,type:'state',simConnected:true}));
  assert.equal(client.publicState().bridgeError,'Integration service protocol is incompatible.');
  assert.equal(isSupportedFenix('FenixA319 CFM'),true);
  assert.equal(isSupportedFenix('A220-300'),false);
});

test('published integration service generates through the versioned boundary without MSFS',async()=>{
  const child=spawn(service,['--data',data],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const lines=readline.createInterface({input:child.stdout});
  const response=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Integration service smoke test timed out.')),15000);
    lines.on('line',line=>{
      const message=JSON.parse(line);
      if(message.type==='response' && message.requestId==='node-smoke') {
        clearTimeout(timer);resolve(message);
      }
    });
    child.once('error',reject);
    child.once('exit',code=>{ if(code && code!==0) reject(new Error(`Service exited with ${code}.`)); });
  });
  child.stdin.write(JSON.stringify({protocolVersion:2,type:'request',requestId:'node-smoke',
    method:'generate',payload:{aircraft:'A320',count:3}})+'\n');
  const message=await response;
  child.stdin.end();
  assert.equal(message.ok,true);
  assert.equal(message.result.aircraft,'A320');
  assert.equal(message.result.cards.length,3);
  assert.equal(message.result.explanation.profileId,'fenix-faa-r32');
  assert.equal(message.result.explanation.compatibleScenarioCount,19311);
  assert.equal(message.result.explanation.validated,true);
});
