'use strict';
const setupTab = document.getElementById('setup-tab');
const failuresTab = document.getElementById('failures-tab');
const setupPanel = document.getElementById('setup-panel');
const failuresPanel = document.getElementById('failures-panel');
const form = document.getElementById('setup-form');
const submit = form.querySelector('button[type="submit"]');
const label = document.getElementById('generate-label');
let scenario = null;
let currentView = 'setup';
let busy = false;
let activationBusy = false;
let integrationState = null;
const activationButton = document.getElementById('activate-failures');
const selection = () => ({aircraft:form.elements.aircraft.value, count:Number(form.elements.count.value)});
const pad = n => String(n).padStart(2,'0');
const unexpectedIssue={code:'UNEXPECTED_ERROR',title:'The operation could not be completed',
  message:'MEL Generator encountered an unexpected error.',
  action:'Try again. If the problem continues, enable the diagnostic log and report the error code.',severity:'error'};
function issueText(value) {
  const current=value?.code ? value : unexpectedIssue;
  return `${current.title}. ${current.message} ${current.action} (${current.code})`;
}
function message(value = null) {
  const el = document.getElementById('app-message');
  el.replaceChildren();
  if(!value) { el.hidden=true; delete el.dataset.code; return; }
  const current=value?.code ? value : unexpectedIssue;
  el.dataset.code=current.code;
  el.className=`app-message ${current.severity || 'error'}`;
  el.append(element('strong','',current.title),element('span','',current.message),
    element('small','',`${current.action} · ${current.code}`));
  el.hidden=false;
}
async function callApi(promise) {
  try {
    const response=await promise;
    if(response?.ok === true) return response.value;
    throw response?.error || unexpectedIssue;
  } catch(error) { throw error?.code ? error : unexpectedIssue; }
}
function updateSummary() {
  const {aircraft,count} = selection();
  document.getElementById('summary-aircraft').textContent = aircraft;
  document.getElementById('summary-count').textContent = pad(count);
  document.getElementById('count-description').textContent = ['One failure. A fresh challenge.','Two failures. One scenario.','Three failures. More to manage.'][count-1];
}
function switchView(view, focus = false) {
  if (view === 'failures' && !scenario) view = 'setup';
  currentView = view;
  const isSetup = view === 'setup';
  setupPanel.hidden = !isSetup;
  failuresPanel.hidden = isSetup;
  for (const [tab,active] of [[setupTab,isSetup],[failuresTab,!isSetup]]) {
    tab.classList.toggle('active',active);
    tab.setAttribute('aria-selected',String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  if (focus) (isSetup ? setupTab : document.getElementById('results-title')).focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
}
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function updateActivationButton() {
  const succeeded=scenario?.activation?.requested && scenario.activation.overall === 'success';
  const owned=scenario?.activation?.ownedCount > 0;
  const remaining=scenario?.deactivation?.remainingCount;
  const canDeactivate=succeeded && owned && remaining !== 0;
  const ready=integrationState?.simConnected && integrationState?.aircraftLoaded &&
    integrationState?.supportedAircraft && integrationState?.adapterReady;
  const sameSession=!canDeactivate || integrationState?.sessionId === scenario.activation.sessionId;
  activationButton.textContent=activationBusy ? (canDeactivate ? 'Deactivating…' : 'Activating…')
    : canDeactivate ? 'Deactivate failures' : succeeded && remaining !== 0 ? 'Failures active'
    : scenario?.activation?.requested ? 'Retry activation' : 'Activate failures';
  if(succeeded && owned && remaining === 0) activationButton.textContent='Activate failures';
  activationButton.disabled=activationBusy || !scenario || !ready || !sameSession || (succeeded && !owned);
  activationButton.title=!sameSession ? 'The simulator or aircraft changed. Generate a new briefing to manage failures.'
    : ready ? '' : 'Load a supported aircraft to manage these failures.';
  activationButton.classList.toggle('deactivate',canDeactivate);
}
function renderScenario(result) {
  const activationById = new Map((result.activation?.results || []).map(item=>[item.catalogId,item]));
  const deactivationById = new Map((result.deactivation?.results || []).map(item=>[item.catalogId,item]));
  const cards = document.getElementById('failure-cards');
  cards.dataset.count = result.count;
  cards.replaceChildren(...result.cards.map((record,i) => {
    const card = element('article','failure-card');
    card.dataset.failureId = record.id;
    card.dataset.branchId = record.branch_id;
    const header = element('header','card-head');
    const kicker = element('div','card-kicker');
    kicker.append(element('span','',`FAILURE ${pad(i+1)}`),element('span','',record.id));
    const title = element('h2','',record.name);
    title.id = `title-${record.id}`;
    card.setAttribute('aria-labelledby',title.id);
    header.append(kicker,title);
    const activation=deactivationById.get(record.id) || activationById.get(record.id);
    if(activation) {
      const labels={activated:'Activated', 'already-active':'Already active',
        'rolled-back':'Activation rolled back',failed:deactivationById.has(record.id) ? 'Deactivation failed' : 'Activation failed',
        unsupported:'Manual activation required',deactivated:'Deactivated',
        'already-inactive':'Already inactive',changed:'Changed — review manually',unavailable:'Deactivation unavailable'};
      const status=element('div',`activation-badge ${activation.status}`,labels[activation.status] || 'Activation unavailable');
      if(activation.message) status.title=activation.message;
      header.append(status);
    }
    const body = element('div','card-body');
    const conditions = element('ul','condition-list');
    conditions.append(...record.conditions.map(c=>element('li','',c)));
    const efb = element('div','efb-block');
    const efbPath = element('div','efb-path');
    const parts = record.efb_path.split(' → ');
    parts.forEach((p,n)=> {
      if (n) efbPath.append(element('span','path-arrow','›'));
      efbPath.append(element(n === parts.length-1 ? 'b' : 'span','',p));
    });
    efb.append(element('h3','card-label','FENIX EFB · FAILURES'),efbPath);
    const footer = element('footer','card-foot');
    const source = element('button','source-link','View source ↗');
    source.type = 'button';
    source.setAttribute('aria-label',`View MMEL ${record.mmel_id}, PDF page ${record.pdf_pages[0]}`);
    source.addEventListener('click', async () => {
      source.disabled = true;
      message();
      try { await callApi(window.mel.openSource(record.id,record.branch_id)); }
      catch(error) { message(error); }
      finally { source.disabled = false; }
    });
    footer.append(element('span','',`MMEL ${record.mmel_id}`),source);
    body.append(element('h3','card-label','MMEL CONDITIONS'),conditions,efb,footer);
    card.append(header,body);
    return card;
  }));
  document.getElementById('results-title').textContent = `${result.aircraft} failures`;
  document.getElementById('result-count').textContent = pad(result.count);
  document.getElementById('result-count-label').textContent = result.count === 1 ? 'failure' : 'failures';
  const badge = document.getElementById('nav-count');
  badge.textContent = result.count;
  badge.hidden = false;
  failuresTab.disabled = false;
  const summary=document.getElementById('activation-summary');
  const activationFooter=document.getElementById('activation-footer');
  if(result.deactivation) {
    const value=result.deactivation;
    const cleared=value.results.filter(item=>item.status==='deactivated').length;
    const alreadyInactive=value.results.filter(item=>item.status==='already-inactive').length;
    const suffix=value.preExistingCount ? ` ${value.preExistingCount} ${value.preExistingCount===1?'was':'were'} active before this briefing and left unchanged.` : '';
    summary.hidden=false;
    summary.className=`activation-summary ${value.overall}`;
    summary.textContent=value.overall==='success'
      ? `${cleared} ${cleared===1?'failure':'failures'} deactivated.${alreadyInactive ? ` ${alreadyInactive} already inactive.` : ''}${suffix}`
      : `Deactivation needs review. ${cleared} deactivated; ${value.remainingCount} still pending.${suffix}`;
    activationFooter.hidden=false;
    activationFooter.textContent=value.remainingCount ? 'Review each card, then retry deactivation for the remaining failures.'
      : 'Review the card status for any manually changed failure.';
  } else if(result.activation?.requested) {
    summary.hidden=false;
    summary.className=`activation-summary ${result.activation.overall}`;
    summary.textContent=result.activation.overall === 'success'
      ? 'All generated failures are active in the aircraft.'
      : issueText(result.activation.issue);
    activationFooter.hidden=false;
    activationFooter.textContent=result.activation.overall === 'success'
      ? 'Automatic activation verified in the aircraft.' : 'Review the activation status on each card.';
  } else {
    summary.hidden=true;
    summary.textContent='';
    activationFooter.hidden=true;
    activationFooter.textContent='';
  }
  if(result.activation?.ownedCount>0 && result.deactivation?.remainingCount !== 0 &&
      integrationState?.sessionId !== result.activation.sessionId) {
    summary.hidden=false;
    summary.className='activation-summary unavailable';
    summary.textContent='Deactivation is unavailable because the simulator or aircraft session changed. Review the failures in the aircraft manually.';
    activationFooter.hidden=false;
    activationFooter.textContent='Generate a new briefing to manage failures in this session.';
  }
  updateActivationButton();
}
form.addEventListener('change', async () => {
  updateSummary();
  try {
    const result = await callApi(window.mel.saveSelection(selection()));
    if (!result.saved) message(result.issue);
  } catch(error) { message(error); }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || submit.disabled) return;
  busy = true;
  submit.disabled = true;
  label.textContent = 'Generating…';
  form.setAttribute('aria-busy','true');
  message();
  try {
    const result = await callApi(window.mel.generate(selection()));
    scenario = result;
    renderScenario(result);
    switchView('failures',true);
    if(result.notice) message(result.notice);
  } catch(error) { message(error); }
  finally { busy = false; submit.disabled = false; label.textContent = 'Prepare briefing'; form.setAttribute('aria-busy','false'); }
});
document.getElementById('back-button').addEventListener('click',()=>switchView('setup',true));
activationButton.addEventListener('click',async()=>{
  if(activationBusy || activationButton.disabled || !scenario) return;
  activationBusy=true;
  updateActivationButton();
  message();
  try {
    const deactivate=scenario.activation?.overall==='success' && scenario.activation.ownedCount>0 &&
      scenario.deactivation?.remainingCount !== 0;
    if(deactivate) {
      const deactivation=await callApi(window.mel.deactivateCurrent());
      scenario={...scenario,deactivation};
    } else {
      const activation=await callApi(window.mel.activateCurrent());
      scenario={...scenario,activation,deactivation:null};
    }
    renderScenario(scenario);
  } catch(error) { message(error); }
  finally { activationBusy=false; updateActivationButton(); }
});
setupTab.addEventListener('click',()=>switchView('setup'));
failuresTab.addEventListener('click',()=>switchView('failures'));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();switchView('setup',true);});
const settingsDialog=document.getElementById('settings-dialog');
const settingsSaveStatus=document.getElementById('settings-save-status');
function renderSettingsSaveIssue(value) {
  settingsSaveStatus.textContent=value ? issueText(value) : '';
  settingsSaveStatus.hidden=!value;
}
document.getElementById('settings-button').addEventListener('click',()=>settingsDialog.showModal());
document.getElementById('settings-close').addEventListener('click',()=>settingsDialog.close());
settingsDialog.addEventListener('click',event=>{ if(event.target===settingsDialog) settingsDialog.close(); });
async function saveBooleanSetting(input,key) {
  const previous=!input.checked;
  input.disabled=true;
  try {
    await callApi(window.mel.saveAppSettings({[key]:input.checked}));
    renderSettingsSaveIssue(null);
  }
  catch(error) { input.checked=previous; renderSettingsSaveIssue(error); }
  finally { input.disabled=false; }
}
document.getElementById('startup-update-setting').addEventListener('change',event=>{
  saveBooleanSetting(event.currentTarget,'checkForUpdatesOnStartup');
});
document.getElementById('auto-activate-setting').addEventListener('change',event=>{
  saveBooleanSetting(event.currentTarget,'activateFailuresOnBriefing');
});
document.getElementById('diagnostic-log-setting').addEventListener('change',event=>{
  saveBooleanSetting(event.currentTarget,'enableDiagnosticLog');
});
const updateButton=document.getElementById('update-available');
const downloadUpdateButton=document.getElementById('download-update');
const checkUpdatesButton=document.getElementById('check-updates');
const updateStatus=document.getElementById('settings-update-status');
function renderUpdateState(state) {
  const available=state?.status === 'available';
  const downloading=state?.status === 'downloading';
  const downloaded=state?.status === 'downloaded';
  const retry=state?.status === 'error' && Boolean(state.latestVersion);
  const canUpdate=available || downloading || downloaded || retry;
  updateButton.hidden=!canUpdate;
  downloadUpdateButton.hidden=!canUpdate;
  updateButton.disabled=downloading;
  downloadUpdateButton.disabled=downloading;
  updateButton.textContent=downloading ? `Downloading ${Math.round(state.percent || 0)}%`
    : downloaded ? 'Restart to update' : retry ? 'Retry update' : 'Update available';
  downloadUpdateButton.textContent=downloading ? `Downloading ${Math.round(state.percent || 0)}%`
    : downloaded ? 'Restart to update' : retry ? 'Retry download' : 'Download update';
  checkUpdatesButton.disabled=state?.status === 'checking' || downloading;
  updateStatus.className=`settings-status ${state?.status || ''}`;
  if(state?.status === 'checking') updateStatus.textContent='Checking for updates…';
  else if(available) updateStatus.textContent=`Version ${state.latestVersion} is available.`;
  else if(downloading) updateStatus.textContent=`Downloading version ${state.latestVersion || ''}… ${Math.round(state.percent || 0)}%`;
  else if(downloaded) updateStatus.textContent=`Version ${state.latestVersion} is ready. Restart to install it.`;
  else if(state?.status === 'current' && state.manual) updateStatus.textContent='No updates available';
  else if(state?.status === 'error') updateStatus.textContent=issueText(state.issue);
  else updateStatus.textContent='';
  updateStatus.hidden=!updateStatus.textContent;
}
checkUpdatesButton.addEventListener('click',async()=>{
  renderUpdateState({status:'checking',manual:true});
  try { renderUpdateState(await callApi(window.mel.checkForUpdates())); }
  catch(error) { renderUpdateState({status:'error',manual:true,issue:error}); }
});
async function runUpdateFromButton() {
  updateButton.disabled=true;
  downloadUpdateButton.disabled=true;
  try {
    const result=await callApi(window.mel.runUpdate());
    if(result?.status) renderUpdateState(result);
  }
  catch(error) { renderUpdateState({status:'error',latestVersion:'unknown',issue:error}); }
}
updateButton.addEventListener('click',runUpdateFromButton);
downloadUpdateButton.addEventListener('click',runUpdateFromButton);
function renderIntegrationState(state) {
  integrationState=state;
  const sim=document.getElementById('sim-status');
  const adapter=document.getElementById('adapter-status');
  const simReady=state?.simConnected && state?.aircraftLoaded;
  const adapterReady=simReady && state?.supportedAircraft && state?.adapterReady;
  sim.classList.toggle('ready',Boolean(simReady));
  adapter.classList.toggle('ready',Boolean(adapterReady));
  const simText=simReady ? `Simulator and aircraft detected: ${state.aircraftTitle}`
    : state?.issue?.code==='SIMCONNECT_RUNTIME_MISSING' ? `${state.issue.title}. ${state.issue.action}`
      : 'Simulator and aircraft not detected';
  const adapterText=adapterReady ? 'Automatic activation available'
    : state?.issue && !['SIMULATOR_NOT_READY','SIMCONNECT_RUNTIME_MISSING'].includes(state.issue.code)
      ? `${state.issue.title}. ${state.issue.action}` : 'Automatic activation unavailable';
  sim.title=simText; sim.setAttribute('aria-label',simText);
  adapter.title=adapterText; adapter.setAttribute('aria-label',adapterText);
  if(scenario?.activation?.ownedCount>0 && currentView==='failures') renderScenario(scenario);
  else updateActivationButton();
}
window.mel.onIntegrationState(renderIntegrationState);
window.mel.onUpdateStatus(renderUpdateState);
document.querySelector('.tabbar').addEventListener('keydown',event=>{
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const view = event.key === 'Home' ? 'setup' : event.key === 'End' ? 'failures' : currentView === 'setup' ? 'failures' : 'setup';
  if (view === 'failures' && !scenario) return;
  switchView(view);
  (view === 'setup' ? setupTab : failuresTab).focus();
});
(async () => {
  try {
    const info = await callApi(window.mel.initialize());
    form.elements.aircraft.value = info.settings.aircraft;
    form.elements.count.value = String(info.settings.count);
    document.getElementById('settings-app-version').textContent = info.version;
    document.getElementById('settings-integration-version').textContent = info.integrationVersion;
    document.getElementById('startup-update-setting').checked = info.settings.checkForUpdatesOnStartup;
    document.getElementById('auto-activate-setting').checked = info.settings.activateFailuresOnBriefing;
    document.getElementById('diagnostic-log-setting').checked = info.settings.enableDiagnosticLog;
    renderIntegrationState(info.integration || {});
    renderUpdateState(info.update);
    document.getElementById('catalogue-count').textContent = info.catalogueCount;
    updateSummary();
    submit.disabled = false;
    label.textContent = 'Prepare briefing';
    if(info.issue) message(info.issue);
  } catch(error) {
    label.textContent = 'Unavailable';
    message(error);
  }
})();
