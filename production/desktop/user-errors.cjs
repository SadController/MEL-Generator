'use strict';

const CATALOG=Object.freeze({
  APP_START_FAILED:{title:'MEL Generator could not start',message:'The application could not finish loading.',action:'Close MEL Generator and open it again. Reinstall it if the problem continues.',severity:'error',retryable:true},
  APP_RESOURCE_MISSING:{title:'A required application file is missing',message:'MEL Generator cannot continue because an installed resource is unavailable.',action:'Reinstall MEL Generator from the official release.',severity:'error',retryable:false},
  APP_RENDERER_STOPPED:{title:'The interface stopped unexpectedly',message:'The application window is no longer responding correctly.',action:'Close MEL Generator and open it again.',severity:'error',retryable:true},
  SETTINGS_RECOVERED:{title:'Settings were reset',message:'The saved settings could not be read, so safe defaults were restored.',action:'Review the Settings screen before generating your next briefing.',severity:'warning',retryable:false},
  SETTINGS_SAVE_FAILED:{title:'Settings were not saved',message:'The requested change could not be stored for the next launch.',action:'Check that your Windows user profile has free space and permission to write application data, then try again.',severity:'warning',retryable:true},
  GENERATION_UNAVAILABLE:{title:'Scenario generation is unavailable',message:'The Integration Service did not return a scenario.',action:'Close and reopen MEL Generator, then try again.',severity:'error',retryable:true},
  GENERATION_DATA_INVALID:{title:'The scenario data is unavailable',message:'The selected aircraft profile or failure catalogue could not produce a valid briefing.',action:'Reinstall the current release. If the problem continues, enable the diagnostic log and report the error code.',severity:'error',retryable:false},
  SOURCE_MISSING:{title:'The document is missing',message:'The document required for this card is not installed.',action:'Reinstall MEL Generator from the official release.',severity:'error',retryable:false},
  SOURCE_OPEN_FAILED:{title:'The document could not be opened',message:'The installed document is present but its viewer could not be started.',action:'Close the document window and try again. Reopen MEL Generator if the problem continues.',severity:'error',retryable:true},
  INTEGRATION_SERVICE_MISSING:{title:'Simulator integration is unavailable',message:'The Integration Service is missing from the installation.',action:'Reinstall MEL Generator from the official release.',severity:'error',retryable:false},
  INTEGRATION_SERVICE_STOPPED:{title:'Simulator integration stopped',message:'The Integration Service is not responding.',action:'Close and reopen MEL Generator, then try activation again.',severity:'error',retryable:true},
  SIMCONNECT_RUNTIME_MISSING:{title:'SimConnect is unavailable',message:'The Microsoft SimConnect client library could not be loaded.',action:'Reinstall MEL Generator from the official release.',severity:'error',retryable:false},
  SIMULATOR_NOT_READY:{title:'Simulator is not ready',message:'MSFS is not connected or no user aircraft is loaded.',action:'Start MSFS, load a flight and wait for the first status light to turn green.',severity:'warning',retryable:true},
  AIRCRAFT_UNSUPPORTED:{title:'Automatic activation is unavailable for this aircraft',message:'The loaded aircraft does not have a supported failure adapter.',action:'Load a supported aircraft, or activate the briefing manually.',severity:'warning',retryable:true},
  AIRCRAFT_FAILURE_INTERFACE_UNAVAILABLE:{title:'Aircraft failure controls are unavailable',message:'MEL Generator could not reach the loaded aircraft\'s failure interface.',action:'Confirm that a supported aircraft is fully loaded, then retry. You can still activate the briefing manually.',severity:'warning',retryable:true},
  FAILURE_MAPPING_INCOMPLETE:{title:'A generated failure is not mapped',message:'A required failure record is unavailable in the loaded aircraft\'s failure system.',action:'Do not retry automatically. Activate the marked failure manually and update MEL Generator.',severity:'error',retryable:false},
  ACTIVATION_REJECTED:{title:'Automatic activation was rejected',message:'At least one failure is armed or active in a state that MEL Generator cannot safely replace.',action:'Review the aircraft\'s failure controls, clear conflicting entries and retry, or activate the briefing manually.',severity:'warning',retryable:true},
  ACTIVATION_NOT_CONFIRMED:{title:'Failure activation was not confirmed',message:'The command was sent, but the aircraft\'s failure system did not confirm the requested state.',action:'Review the per-card status and activate unconfirmed failures manually before flight.',severity:'error',retryable:true},
  ACTIVATION_ROLLBACK_FAILED:{title:'Failure rollback was incomplete',message:'Automatic activation failed and at least one newly changed failure could not be restored.',action:'Review every failure in this briefing in the aircraft\'s failure controls before continuing.',severity:'error',retryable:false},
  ACTIVATION_FAILED:{title:'Automatic activation was not completed',message:'The briefing was generated, but its failures were not fully activated.',action:'Review the per-card status, retry when the adapter is ready, or activate the failures manually.',severity:'warning',retryable:true},
  UPDATE_NETWORK_UNAVAILABLE:{title:'Could not connect to GitHub',message:'MEL Generator could not check or download the update.',action:'Check your internet connection and try again later.',severity:'warning',retryable:true},
  UPDATE_RATE_LIMITED:{title:'GitHub temporarily limited update checks',message:'The update service rejected the request because too many requests were made.',action:'Wait and try again later. Do not interpret this result as meaning that no update exists.',severity:'warning',retryable:true},
  UPDATE_METADATA_INVALID:{title:'Update information is invalid',message:'GitHub returned release information that MEL Generator could not verify.',action:'Keep the installed version and try again later.',severity:'error',retryable:true},
  UPDATE_NO_SPACE:{title:'Not enough disk space for the update',message:'The update could not be downloaded or prepared.',action:'Free disk space on the Windows system drive and try again.',severity:'warning',retryable:true},
  UPDATE_PERMISSION_DENIED:{title:'Windows blocked the update',message:'MEL Generator could not write or start the downloaded installer.',action:'Close other copies of the application and try again from your Windows user account.',severity:'error',retryable:true},
  UPDATE_VERIFICATION_FAILED:{title:'The update could not be verified',message:'The downloaded installer did not pass the required signature or integrity check.',action:'Keep the installed version. Do not run the downloaded file manually.',severity:'error',retryable:true},
  UPDATE_DOWNLOAD_FAILED:{title:'The update was not downloaded',message:'The installed version was not changed.',action:'Try again later or use the official GitHub release page.',severity:'warning',retryable:true},
  UPDATE_INSTALL_FAILED:{title:'The update could not be installed',message:'The installed version remains available.',action:'Restart MEL Generator and try again, or install the official release manually.',severity:'error',retryable:true},
  UPDATE_NOT_AVAILABLE:{title:'No compatible update is ready',message:'MEL Generator has not found a newer compatible release in this session.',action:'Run Check for updates again.',severity:'warning',retryable:true},
  UNEXPECTED_ERROR:{title:'The operation could not be completed',message:'MEL Generator encountered an unexpected error.',action:'Try again. If the problem continues, enable the diagnostic log and report the error code.',severity:'error',retryable:true}
});

function issue(code,overrides={}) {
  const definition=CATALOG[code] || CATALOG.UNEXPECTED_ERROR;
  return Object.freeze({code:CATALOG[code] ? code : 'UNEXPECTED_ERROR',...definition,...overrides});
}

function textOf(error) { return String(error?.message || error || ''); }

function classifyError(scope,error) {
  const text=textOf(error);
  if(scope==='startup') return issue(/missing|ENOENT|not found/i.test(text)?'APP_RESOURCE_MISSING':'APP_START_FAILED');
  if(scope==='settings') return issue('SETTINGS_SAVE_FAILED');
  if(scope==='source') return issue(/missing|ENOENT|not found/i.test(text)?'SOURCE_MISSING':'SOURCE_OPEN_FAILED');
  if(scope==='generation') return issue(/profile|catalog|rule|compatible|invalid/i.test(text)?'GENERATION_DATA_INVALID':'GENERATION_UNAVAILABLE');
  if(scope==='activation') {
    if(/Integration Service.*missing|service executable.*missing/i.test(text)) return issue('INTEGRATION_SERVICE_MISSING');
    if(/Integration Service|service.*unavailable|service stopped/i.test(text)) return issue('INTEGRATION_SERVICE_STOPPED');
    if(/MSFS|simulator|loaded aircraft.*not detected/i.test(text)) return issue('SIMULATOR_NOT_READY');
    if(/mapping|mapped|catalogue is missing|missing:|failure record/i.test(text)) return issue('FAILURE_MAPPING_INCOMPLETE');
    if(/not supported|unsupported/i.test(text)) return issue('AIRCRAFT_UNSUPPORTED');
    if(/ECONNREFUSED|127\.0\.0\.1|8083|gateway|timed? ?out|connection|failure interface|adapter is unavailable/i.test(text)) return issue('AIRCRAFT_FAILURE_INTERFACE_UNAVAILABLE');
    if(/readback|acknowledge|did not confirm/i.test(text)) return issue('ACTIVATION_NOT_CONFIRMED');
    if(/armed|incompatible state|rejected/i.test(text)) return issue('ACTIVATION_REJECTED');
    return issue('ACTIVATION_FAILED');
  }
  if(scope==='update-check' || scope==='update-download' || scope==='update-install') {
    if(/403|429|rate.?limit/i.test(text)) return issue('UPDATE_RATE_LIMITED');
    if(/ENOTFOUND|EAI_AGAIN|network|internet|timed? ?out|ECONN|socket|TLS|HTTP 5\d\d/i.test(text)) return issue('UPDATE_NETWORK_UNAVAILABLE');
    if(/ENOSPC|disk space|not enough space/i.test(text)) return issue('UPDATE_NO_SPACE');
    if(/EACCES|EPERM|permission|access denied/i.test(text)) return issue('UPDATE_PERMISSION_DENIED');
    if(/signature|publisher|certificate|checksum|sha512|integrity|verify/i.test(text)) return issue('UPDATE_VERIFICATION_FAILED');
    if(/metadata|invalid stable release|invalid.*release|invalid data|malformed/i.test(text)) return issue('UPDATE_METADATA_INVALID');
    if(/No compatible update/i.test(text)) return issue('UPDATE_NOT_AVAILABLE');
    return issue(scope==='update-check'?'UPDATE_METADATA_INVALID':scope==='update-install'?'UPDATE_INSTALL_FAILED':'UPDATE_DOWNLOAD_FAILED');
  }
  return issue('UNEXPECTED_ERROR');
}

function activationIssue(activation,state={}) {
  if(activation?.overall==='success' || activation?.requested===false) return null;
  if(!state.simConnected || !state.aircraftLoaded) return issue('SIMULATOR_NOT_READY');
  if(!state.supportedAircraft) return issue('AIRCRAFT_UNSUPPORTED');
  if(activation?.rollbackError) return issue('ACTIVATION_ROLLBACK_FAILED');
  return classifyError('activation',activation?.message || state.adapterError || 'Activation failed.');
}

async function resultEnvelope(scope,operation,onError) {
  try { return {ok:true,value:await operation()}; }
  catch(error) {
    onError?.(error);
    return {ok:false,error:classifyError(scope,error)};
  }
}

module.exports={CATALOG,issue,classifyError,activationIssue,resultEnvelope,textOf};
