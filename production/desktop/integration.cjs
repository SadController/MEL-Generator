'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const readline = require('node:readline');

const PROTOCOL_VERSION = 2;

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

class IntegrationServiceClient {
  constructor({servicePath,simConnectDll,dataDirectory,onState,requestTimeoutMs=30000}={}) {
    this.servicePath=servicePath;
    this.simConnectDll=simConnectDll;
    this.dataDirectory=dataDirectory;
    this.onState=typeof onState === 'function' ? onState : ()=>{};
    this.requestTimeoutMs=requestTimeoutMs;
    this.process=null;
    this.sequence=0;
    this.pending=new Map();
    this.state={simConnected:false,aircraftLoaded:false,aircraftTitle:null,
      supportedAircraft:false,adapterReady:false,sessionId:0,bridgeError:null,adapterError:null};
  }

  publish(patch={}) {
    const next={...this.state,...patch};
    if(JSON.stringify(next)===JSON.stringify(this.state)) return;
    this.state=next;
    this.onState(this.publicState());
  }

  publicState() { return {...this.state}; }

  start() {
    if(this.process) return;
    if(!this.servicePath || !fs.existsSync(this.servicePath)) {
      this.publish({bridgeError:'Integration service is missing.'});
      return;
    }
    const args=[];
    if(this.dataDirectory) args.push('--data',this.dataDirectory);
    if(this.simConnectDll) args.push('--dll',this.simConnectDll);
    this.process=spawn(this.servicePath,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});
    const lines=readline.createInterface({input:this.process.stdout});
    lines.on('line',line=>this.handleLine(line));
    this.process.stderr.on('data',chunk=>{
      const text=String(chunk).trim();
      if(text) this.publish({bridgeError:text.slice(0,500)});
    });
    this.process.on('error',error=>this.stopWithError(error.message));
    this.process.on('exit',(code,signal)=>this.stopWithError(
      `Integration service stopped${code==null?'':` with code ${code}`}${signal?` (${signal})`:''}.`));
  }

  handleLine(line) {
    let message;
    try { message=JSON.parse(line); }
    catch { this.publish({bridgeError:'Integration service returned invalid JSON.'}); return; }
    if(message.protocolVersion!==PROTOCOL_VERSION) {
      this.publish({bridgeError:'Integration service protocol is incompatible.'});
      return;
    }
    if(message.type==='state') {
      this.publish({simConnected:message.simConnected===true,
        aircraftLoaded:message.aircraftLoaded===true,aircraftTitle:message.aircraftTitle || null,
        supportedAircraft:message.supportedAircraft===true,adapterReady:message.adapterReady===true,
        sessionId:Number.isSafeInteger(message.sessionId) ? message.sessionId : 0,
        bridgeError:message.error || null,adapterError:message.adapterError || null});
      return;
    }
    if(message.type==='response' && typeof message.requestId === 'string') {
      const pending=this.pending.get(message.requestId);
      if(!pending) return;
      this.pending.delete(message.requestId);
      clearTimeout(pending.timer);
      if(message.ok === true) pending.resolve(message.result);
      else pending.reject(new Error(message.error?.message || 'Integration service request failed.'));
    }
  }

  stopWithError(message) {
    const child=this.process;
    this.process=null;
    for(const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    this.pending.clear();
    this.publish({simConnected:false,aircraftLoaded:false,aircraftTitle:null,
      supportedAircraft:false,adapterReady:false,bridgeError:message,adapterError:null});
    if(child && !child.killed) try { child.kill(); } catch { }
  }

  request(method,payload,timeoutMs=this.requestTimeoutMs) {
    if(!this.process?.stdin?.writable) return Promise.reject(new Error('Integration service is unavailable.'));
    const requestId=`${process.pid}-${Date.now()}-${++this.sequence}`;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        this.pending.delete(requestId);
        reject(new Error(`Integration service ${method} request timed out.`));
      },timeoutMs);
      this.pending.set(requestId,{resolve,reject,timer});
      const message=JSON.stringify({protocolVersion:PROTOCOL_VERSION,type:'request',requestId,method,payload});
      this.process.stdin.write(message+'\n',error=>{
        if(!error) return;
        const pending=this.pending.get(requestId);
        if(!pending) return;
        this.pending.delete(requestId);clearTimeout(timer);reject(error);
      });
    });
  }

  generate(selection) { return this.request('generate',selection,15000); }
  activate(catalogIds) { return this.request('activate',{catalogIds},45000); }
  deactivate() { return this.request('deactivate',{},45000); }

  stop() {
    const child=this.process;
    this.process=null;
    if(child && !child.killed) try { child.kill(); } catch { }
    for(const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Integration service stopped.'));
    }
    this.pending.clear();
  }
}

module.exports={IntegrationServiceClient,findSimConnectDll,isSupportedFenix,PROTOCOL_VERSION};
