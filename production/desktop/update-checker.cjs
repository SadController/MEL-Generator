'use strict';
const https = require('node:https');

const RELEASES_URL='https://api.github.com/repos/SadController/MEL-Generator/releases/latest';

function parseVersion(value) {
  const match=String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if(!match) return null;
  return {major:Number(match[1]),minor:Number(match[2]),patch:Number(match[3]),pre:match[4] || null};
}

function compareVersions(left,right) {
  const a=parseVersion(left), b=parseVersion(right);
  if(!a || !b) throw new Error('Invalid application version.');
  for(const key of ['major','minor','patch']) if(a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
  if(a.pre === b.pre) return 0;
  if(a.pre == null) return 1;
  if(b.pre == null) return -1;
  return a.pre.localeCompare(b.pre,undefined,{numeric:true,sensitivity:'base'});
}

function requestJson(url,{timeoutMs=8000}={}) {
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{timeout:timeoutMs,headers:{
      Accept:'application/vnd.github+json','User-Agent':'MEL-Generator',
      'X-GitHub-Api-Version':'2022-11-28'
    }},response=>{
      const chunks=[];
      response.on('data',chunk=>chunks.push(chunk));
      response.on('end',()=>{
        if(response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub Releases returned HTTP ${response.statusCode}.`));
          return;
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('GitHub Releases returned invalid data.')); }
      });
    });
    request.on('timeout',()=>request.destroy(new Error('The update check timed out.')));
    request.on('error',reject);
  });
}

class UpdateChecker {
  constructor({currentVersion,request=requestJson,url=RELEASES_URL}={}) {
    this.currentVersion=currentVersion;
    this.request=request;
    this.url=url;
  }

  async check() {
    const release=await this.request(this.url);
    const tagVersion=String(release?.tag_name || '').replace(/^v/i,'');
    const nameVersion=String(release?.name || '').replace(/^v/i,'');
    const latestVersion=parseVersion(tagVersion) ? tagVersion : nameVersion;
    if(!parseVersion(latestVersion) || release?.draft === true || release?.prerelease === true ||
      typeof release?.html_url !== 'string' || !/^https:\/\/github\.com\/SadController\/MEL-Generator\/releases\//i.test(release.html_url)) {
      throw new Error('GitHub returned an invalid stable release.');
    }
    const available=compareVersions(latestVersion,this.currentVersion) > 0;
    return {status:available?'available':'current',currentVersion:this.currentVersion,
      latestVersion,releaseName:String(release.name || release.tag_name).slice(0,200),
      releaseUrl:available ? release.html_url : null};
  }
}

module.exports={UpdateChecker,parseVersion,compareVersions,requestJson,RELEASES_URL};
