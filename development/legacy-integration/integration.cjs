'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {spawn} = require('node:child_process');
const readline = require('node:readline');

const PROTOCOL_VERSION = 1;
const DEFAULT_BASE_URL = 'http://127.0.0.1:8083/fenix';

function requestJson(url, {method='GET', body, timeoutMs=2500}={}) {
  return new Promise((resolve,reject)=>{
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const request = http.request(url,{method,timeout:timeoutMs,headers:{
      Accept:'application/json',
      ...(payload ? {'Content-Type':'application/json','Content-Length':payload.length} : {})
    }},response=>{
      const chunks=[];
      response.on('data',chunk=>chunks.push(chunk));
      response.on('end',()=>{
        const text=Buffer.concat(chunks).toString('utf8');
        if(response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Fenix gateway returned HTTP ${response.statusCode}.`));
          return;
        }
        try { resolve(JSON.parse(text)); }
        catch { reject(new Error('Fenix gateway returned invalid JSON.')); }
      });
    });
    request.on('timeout',()=>request.destroy(new Error('Fenix gateway timed out.')));
    request.on('error',reject);
    if(payload) request.write(payload);
    request.end();
  });
}

function flattenManualFailures(payload) {
  if(!payload || !Array.isArray(payload.atas)) throw new Error('Unexpected Fenix failure catalogue format.');
  const result = new Map();
  for(const ata of payload.atas) for(const group of ata.groups || []) for(const failure of group.failures || []) {
    if(!failure || typeof failure.id !== 'string') continue;
    result.set(failure.id,{...failure,ata:ata.id,group:group.groupName});
  }
  return result;
}

function stableState(item) {
  return {failed:item?.failed === true,failureCondition:item?.failureCondition ?? null};
}

function sameState(left,right) {
  return left.failed === right.failed && left.failureCondition === right.failureCondition;
}

class FenixAdapter {
  constructor({mapping,baseUrl=DEFAULT_BASE_URL,request=requestJson,clearSettleMs=750}={}) {
    this.mapping = Object.freeze({...mapping});
    this.baseUrl = baseUrl.replace(/\/$/,'');
    this.request = request;
    this.clearSettleMs = clearSettleMs;
  }

  async catalogue() {
    return flattenManualFailures(await this.request(`${this.baseUrl}/failures/manual`));
  }

  async probe() {
    const catalogue = await this.catalogue();
    const missing = Object.values(this.mapping).filter(id=>!catalogue.has(id));
    if(missing.length) throw new Error(`Fenix adapter is missing ${missing.length} mapped failure records.`);
    return {ready:true,records:catalogue.size,mapped:Object.keys(this.mapping).length};
  }

  async setFailure(item,failed) {
    const attempts=failed ? 1 : 2;
    let readback;
    for(let attempt=0;attempt<attempts;attempt++) {
      const response = await this.request(`${this.baseUrl}/failures/saveManual`,{
        method:'POST',
        body:{id:item.id,title:item.title,failureCondition:null,failed}
      });
      if(response?.failed !== failed) throw new Error(`Fenix did not acknowledge ${item.id}.`);
      readback = (await this.catalogue()).get(item.id);
      if(failed) {
        if(readback?.failed === true) return readback;
        break;
      }
      if(this.clearSettleMs>0) await new Promise(resolve=>setTimeout(resolve,this.clearSettleMs));
      readback = (await this.catalogue()).get(item.id);
      if(readback?.failed === false && readback.failureCondition == null) return readback;
    }
    throw new Error(`Fenix readback did not confirm ${item.id}=${failed}.`);
  }

  async activate(catalogIds) {
    const unique=[...new Set(catalogIds)];
    if(unique.length !== catalogIds.length || unique.some(id=>!this.mapping[id])) {
      throw new Error('Scenario contains an unsupported Fenix failure mapping.');
    }
    const baseline=await this.catalogue();
    const mappedIds=Object.values(this.mapping);
    const missing=mappedIds.filter(id=>!baseline.has(id));
    if(missing.length) throw new Error(`Fenix failure catalogue is missing: ${missing.join(', ')}.`);
    const before=new Map(mappedIds.map(id=>[id,stableState(baseline.get(id))]));
    const results=[];
    const activated=[];
    try {
      for(const catalogId of unique) {
        const fenixId=this.mapping[catalogId];
        const item=baseline.get(fenixId);
        if(item.failed === true) {
          results.push({catalogId,fenixId,status:'already-active'});
          continue;
        }
        if(item.failed === true || item.failureCondition != null) {
          throw new Error(`${fenixId} is armed or active in an incompatible state.`);
        }
        try { await this.setFailure(item,true); }
        catch(error) {
          try {
            const current=(await this.catalogue()).get(fenixId);
            if(current?.failed === true) activated.push({catalogId,fenixId,item});
          } catch { /* Preserve the original activation error. */ }
          throw error;
        }
        activated.push({catalogId,fenixId,item});
        results.push({catalogId,fenixId,status:'activated'});
      }
      const finalState=await this.catalogue();
      const intended=new Set(unique.map(id=>this.mapping[id]));
      const collateral=mappedIds.filter(id=>!intended.has(id) && !sameState(stableState(finalState.get(id)),before.get(id)));
      if(collateral.length) throw new Error(`Other mapped failures changed: ${collateral.join(', ')}.`);
      return {requested:true,overall:'success',results,rolledBack:false};
    } catch(error) {
      let rollbackError=null;
      for(const entry of activated.reverse()) {
        try {
          await this.setFailure(entry.item,false);
          const result=results.find(value=>value.catalogId===entry.catalogId);
          if(result) result.status='rolled-back';
        } catch(rollback) { rollbackError=rollback.message; }
      }
      const completed=new Set(results.map(result=>result.catalogId));
      for(const catalogId of unique) if(!completed.has(catalogId)) {
        results.push({catalogId,fenixId:this.mapping[catalogId],status:'failed',message:error.message});
      }
      return {requested:true,overall:'failed',results,rolledBack:activated.length>0,
        message:error.message,rollbackError};
    }
  }
}

function findSimConnectDll({resourcesPath,userData}={}) {
  const explicit=process.env.MEL_GENERATOR_SIMCONNECT_DLL;
  const supportFile=userData && path.join(userData,'simconnect-path.txt');
  const candidates=[explicit,resourcesPath && path.join(resourcesPath,'integration','SimConnect.dll')];
  if(supportFile) {
    try { candidates.push(fs.readFileSync(supportFile,'utf8').trim()); } catch { /* Optional support override. */ }
  }
  for(const candidate of candidates) if(candidate && fs.existsSync(candidate)) return path.resolve(candidate);
  return null;
}

function isSupportedFenix(title) {
  return typeof title === 'string' && /^FenixA(?:319|320|321)\b/i.test(title.trim());
}

class IntegrationController {
  constructor({bridgePath,simConnectDll,adapter,onState,pollMs=2500}={}) {
    this.bridgePath=bridgePath;
    this.simConnectDll=simConnectDll;
    this.adapter=adapter;
    this.onState=typeof onState === 'function' ? onState : ()=>{};
    this.pollMs=pollMs;
    this.bridge=null;
    this.timer=null;
    this.probing=false;
    this.state={simConnected:false,aircraftLoaded:false,aircraftTitle:null,
      supportedAircraft:false,adapterReady:false,bridgeError:null,adapterError:null};
  }

  publish(patch={}) {
    const next={...this.state,...patch};
    next.supportedAircraft=next.simConnected && next.aircraftLoaded && isSupportedFenix(next.aircraftTitle);
    if(!next.supportedAircraft) next.adapterReady=false;
    if(JSON.stringify(next)===JSON.stringify(this.state)) return;
    this.state=next;
    this.onState(this.publicState());
  }

  publicState() { return {...this.state}; }

  start() {
    if(!this.bridgePath || !fs.existsSync(this.bridgePath) || !this.simConnectDll) {
      this.publish({bridgeError:!this.simConnectDll ? 'SimConnect.dll was not found.' : 'Integration service is missing.'});
    } else {
      this.bridge=spawn(this.bridgePath,['--dll',this.simConnectDll],{windowsHide:true,stdio:['ignore','pipe','pipe']});
      const lines=readline.createInterface({input:this.bridge.stdout});
      lines.on('line',line=>{
        try {
          const message=JSON.parse(line);
          if(message.protocolVersion!==PROTOCOL_VERSION || message.type!=='state') return;
          this.publish({simConnected:message.simConnected===true,
            aircraftLoaded:message.aircraftLoaded===true,aircraftTitle:message.aircraftTitle || null,
            bridgeError:message.error || null});
          this.probeAdapter();
        } catch { this.publish({bridgeError:'Integration service returned invalid data.'}); }
      });
      this.bridge.on('error',error=>this.publish({simConnected:false,aircraftLoaded:false,
        aircraftTitle:null,bridgeError:error.message}));
      this.bridge.on('exit',()=>{ this.bridge=null; this.publish({simConnected:false,
        aircraftLoaded:false,aircraftTitle:null,adapterReady:false,
        bridgeError:'Integration service stopped.'}); });
    }
    this.timer=setInterval(()=>this.probeAdapter(),this.pollMs);
    this.timer.unref?.();
    this.probeAdapter();
  }

  async probeAdapter() {
    if(this.probing) return;
    if(!this.state.supportedAircraft) {
      this.publish({adapterReady:false,adapterError:null});
      return;
    }
    this.probing=true;
    try { await this.adapter.probe(); this.publish({adapterReady:true,adapterError:null}); }
    catch(error) { this.publish({adapterReady:false,adapterError:error.message}); }
    finally { this.probing=false; }
  }

  async activate(catalogIds) {
    if(!this.state.simConnected || !this.state.aircraftLoaded) {
      return {requested:true,overall:'failed',message:'MSFS and a loaded aircraft were not detected.',
        results:catalogIds.map(catalogId=>({catalogId,status:'failed'}))};
    }
    if(!this.state.supportedAircraft) {
      return {requested:true,overall:'failed',message:'The loaded aircraft is not supported for automatic activation.',
        results:catalogIds.map(catalogId=>({catalogId,status:'unsupported'}))};
    }
    if(!this.state.adapterReady) await this.probeAdapter();
    if(!this.state.adapterReady) {
      return {requested:true,overall:'failed',message:this.state.adapterError || 'The Fenix adapter is unavailable.',
        results:catalogIds.map(catalogId=>({catalogId,status:'failed'}))};
    }
    return this.adapter.activate(catalogIds);
  }

  stop() {
    if(this.timer) clearInterval(this.timer);
    this.timer=null;
    if(this.bridge) this.bridge.kill();
    this.bridge=null;
  }
}

module.exports={FenixAdapter,IntegrationController,flattenManualFailures,findSimConnectDll,
  isSupportedFenix,requestJson,stableState,sameState,PROTOCOL_VERSION};
