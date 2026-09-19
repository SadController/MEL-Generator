'use strict';

class UpdateManager {
  constructor({updater,isPackaged,signaturePolicyReady=false,onState=()=>{},logger=null}={}) {
    if(!updater) throw new Error('An updater instance is required.');
    this.updater=updater;
    this.isPackaged=Boolean(isPackaged);
    this.signaturePolicyReady=Boolean(signaturePolicyReady);
    this.onState=onState;
    this.logger=logger;
    this.state={status:'idle'};
    this.operation=null;
    this.downloaded=false;

    updater.autoDownload=false;
    updater.autoInstallOnAppQuit=false;
    updater.allowPrerelease=false;
    updater.allowDowngrade=false;
    updater.on('download-progress',progress=>this.publish({status:'downloading',
      percent:Math.max(0,Math.min(100,Number(progress.percent) || 0)),
      transferred:Number(progress.transferred) || 0,total:Number(progress.total) || 0}));
    updater.on('update-downloaded',info=>{
      this.downloaded=true;
      this.publish({status:'downloaded',latestVersion:String(info?.version || '') || null});
    });
    updater.on('error',error=>{
      this.publish({status:'error',message:this.errorMessage(error)});
      this.logger?.event('update.install.failed',{error:error?.message || String(error)});
    });
  }

  publicState() { return {...this.state}; }

  publish(next) {
    this.state={...this.state,...next};
    this.onState(this.publicState());
    return this.publicState();
  }

  errorMessage(error) {
    const text=String(error?.message || error || '');
    if(/ENOTFOUND|EAI_AGAIN|network|internet|timed? ?out|ECONN/i.test(text)) {
      return 'Unable to download the update. Check your internet connection and try again.';
    }
    if(/signature|publisher|certificate|checksum|sha512|integrity/i.test(text)) {
      return 'The downloaded update could not be verified and was not installed.';
    }
    return 'Unable to download the update. The installed version was not changed.';
  }

  async download() {
    if(!this.isPackaged) throw new Error('Updates can only be installed by the packaged application.');
    if(!this.signaturePolicyReady) return this.publish({status:'error',
      message:'Automatic installation is unavailable until release signing is configured.'});
    if(this.operation) return this.operation;
    if(this.downloaded) return this.publicState();
    this.publish({status:'downloading',percent:0,message:null});
    this.logger?.event('update.download.started');
    this.operation=(async()=>{
      const result=await this.updater.checkForUpdates();
      if(!result?.updateInfo) throw new Error('No compatible update is available.');
      await this.updater.downloadUpdate();
      if(!this.downloaded) throw new Error('The update download did not complete.');
      this.logger?.event('update.download.completed',{latestVersion:this.state.latestVersion});
      return this.publicState();
    })().catch(error=>{
      const result=this.publish({status:'error',message:this.errorMessage(error)});
      this.logger?.event('update.download.failed',{error:error.message});
      return result;
    }).finally(()=>{this.operation=null;});
    return this.operation;
  }

  install() {
    if(!this.isPackaged || !this.downloaded) throw new Error('No verified update is ready to install.');
    this.logger?.event('update.install.started',{latestVersion:this.state.latestVersion});
    this.updater.quitAndInstall(false,true);
    return {installing:true};
  }
}

module.exports={UpdateManager};
