'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {FenixAdapter,IntegrationController,findSimConnectDll,stableState,sameState} =
  require('../../../production/desktop/integration.cjs');
const mapping = require('../../../production/integration/fenix-mapping.json');

const output=path.join(__dirname,'alpha-live-integration-2026-09-19.json');
const selectedCatalogId='M198';
const selectedFenixId=mapping[selectedCatalogId];
const report={startedUtc:new Date().toISOString(),selectedCatalogId,selectedFenixId,
  complete:false,restored:false};
let controller;
let adapter;
let baseline;

function save() {
  const temp=output+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(report,null,2));
  fs.renameSync(temp,output);
}

function waitReady(timeoutMs=15000) {
  return new Promise((resolve,reject)=>{
    const deadline=Date.now()+timeoutMs;
    const timer=setInterval(()=>{
      const state=controller.publicState();
      if(state.simConnected && state.aircraftLoaded && state.supportedAircraft && state.adapterReady) {
        clearInterval(timer); resolve(state);
      } else if(Date.now()>deadline) {
        clearInterval(timer); reject(new Error(`Integration readiness timeout: ${JSON.stringify(state)}`));
      }
    },100);
  });
}

(async()=>{
  try {
    const userData=path.join(process.env.APPDATA,'MEL Generator');
    const dll=findSimConnectDll({resourcesPath:path.join(__dirname,'missing'),userData});
    if(!dll) throw new Error('Approved SimConnect.dll path was not found.');
    report.simConnectDll=dll;
    adapter=new FenixAdapter({mapping});
    const states=[];
    controller=new IntegrationController({
      bridgePath:path.resolve(__dirname,'../../../production/integration/SimConnectBridge.exe'),
      simConnectDll:dll,
      adapter,
      pollMs:500,
      onState:state=>states.push({...state,atUtc:new Date().toISOString()})
    });
    controller.start();
    const ready=await waitReady();
    report.readyState=ready;
    report.firstIndicatorReady=ready.simConnected && ready.aircraftLoaded;
    report.secondIndicatorReady=ready.supportedAircraft && ready.adapterReady;
    report.stateHistory=states;

    baseline=await adapter.catalogue();
    const selectedBefore=baseline.get(selectedFenixId);
    if(!selectedBefore) throw new Error(`${selectedFenixId} is missing.`);
    if(selectedBefore.failed || selectedBefore.failureCondition != null) throw new Error(`${selectedFenixId} is not initially clear.`);
    report.selectedBefore=selectedBefore;
    report.preexistingActive=[...baseline.values()].filter(item=>item.failed || item.failureCondition != null)
      .map(item=>({id:item.id,title:item.title,...stableState(item)}));

    report.activation=await controller.activate([selectedCatalogId]);
    const active=await adapter.catalogue();
    report.selectedActive=active.get(selectedFenixId);
    if(report.activation.overall!=='success' || active.get(selectedFenixId)?.failed!==true) {
      throw new Error('Production controller did not verify the selected failure.');
    }

    await new Promise(resolve=>setTimeout(resolve,750));
    await adapter.setFailure(selectedBefore,false);
    const restored=await adapter.catalogue();
    report.selectedRestored=restored.get(selectedFenixId);
    report.restored=sameState(stableState(restored.get(selectedFenixId)),stableState(selectedBefore));
    const changed=[];
    for(const [id,item] of baseline) if(!sameState(stableState(restored.get(id)),stableState(item))) changed.push(id);
    report.changedAfterRestoration=changed;
    if(!report.restored || changed.length) throw new Error(`Restoration mismatch: ${changed.join(', ')}`);
    report.complete=true;
  } catch(error) {
    report.error=error.stack || error.message;
    if(adapter && baseline) {
      try {
        const before=baseline.get(selectedFenixId);
        const current=(await adapter.catalogue()).get(selectedFenixId);
        if(before && current && !sameState(stableState(current),stableState(before))) {
          await adapter.setFailure(before,before.failed===true);
          report.emergencyRestoration=true;
        }
      } catch(restoreError) { report.emergencyRestorationError=restoreError.message; }
    }
  } finally {
    controller?.stop();
    report.finishedUtc=new Date().toISOString();
    save();
  }
  if(!report.complete) process.exitCode=1;
  console.log(JSON.stringify({complete:report.complete,aircraft:report.readyState?.aircraftTitle,
    firstIndicatorReady:report.firstIndicatorReady,secondIndicatorReady:report.secondIndicatorReady,
    activation:report.activation?.overall,restored:report.restored,
    preexistingActive:report.preexistingActive?.map(item=>item.id),error:report.error},null,2));
})();
