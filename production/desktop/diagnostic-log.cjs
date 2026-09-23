'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const FILE_PATTERN = /^mel-generator-\d{4}-\d{2}-\d{2}(?:-\d+)?\.jsonl$/;

function safeData(value) {
  if(value == null) return {};
  if(Array.isArray(value)) return value.slice(0,20).map(safeData);
  if(typeof value !== 'object') return String(value).slice(0,1000);
  const result={};
  for(const [key,item] of Object.entries(value)) {
    if(/token|password|secret|authorization|credential/i.test(key)) continue;
    if(item == null || typeof item === 'boolean' || typeof item === 'number') result[key]=item;
    else if(typeof item === 'string') result[key]=item.slice(0,1000);
    else if(Array.isArray(item)) result[key]=item.slice(0,20).map(safeData);
    else result[key]=safeData(item);
  }
  return result;
}

class DiagnosticLogger {
  constructor({directory,enabled=false,now=()=>new Date(),maxBytes=DEFAULT_MAX_BYTES}={}) {
    this.directory=directory;
    this.enabled=enabled === true;
    this.now=now;
    this.maxBytes=maxBytes;
  }

  setEnabled(value) { this.enabled=value === true; }

  cleanup() {
    fs.mkdirSync(this.directory,{recursive:true});
    const cutoff=this.now().getTime() - 7 * DAY_MS;
    for(const entry of fs.readdirSync(this.directory,{withFileTypes:true})) {
      if(!entry.isFile() || !FILE_PATTERN.test(entry.name)) continue;
      const file=path.join(this.directory,entry.name);
      try { if(fs.statSync(file).mtimeMs < cutoff) fs.rmSync(file); } catch { /* Best effort. */ }
    }
  }

  fileFor(date) {
    const day=date.toISOString().slice(0,10);
    for(let index=0;;index++) {
      const suffix=index ? `-${index}` : '';
      const file=path.join(this.directory,`mel-generator-${day}${suffix}.jsonl`);
      try { if(fs.statSync(file).size >= this.maxBytes) continue; } catch { /* New file. */ }
      return file;
    }
  }

  event(type,data={}) {
    if(!this.enabled) return false;
    try {
      fs.mkdirSync(this.directory,{recursive:true});
      const at=this.now();
      const record={at:at.toISOString(),type:String(type).slice(0,120),data:safeData(data)};
      fs.appendFileSync(this.fileFor(at),JSON.stringify(record)+'\n','utf8');
      return true;
    } catch { return false; }
  }
}

module.exports={DiagnosticLogger,safeData,FILE_PATTERN,DEFAULT_MAX_BYTES,DAY_MS};
