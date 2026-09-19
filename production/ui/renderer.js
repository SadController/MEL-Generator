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
let integrationState = null;
const selection = () => ({aircraft:form.elements.aircraft.value, count:Number(form.elements.count.value)});
const pad = n => String(n).padStart(2,'0');
function message(text = '') {
  const el = document.getElementById('app-message');
  el.textContent = text;
  el.hidden = !text;
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
function renderScenario(result) {
  const activationById = new Map((result.activation?.results || []).map(item=>[item.catalogId,item]));
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
    const activation=activationById.get(record.id);
    if(activation) {
      const labels={activated:'Activated', 'already-active':'Already active',
        'rolled-back':'Activation rolled back',failed:'Activation failed',unsupported:'Manual activation required'};
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
      try { await window.mel.openSource(record.id,record.branch_id); }
      catch { message('Unable to open the bundled MMEL. Please reopen the application or reinstall it.'); }
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
  if(result.activation?.requested) {
    summary.hidden=false;
    summary.className=`activation-summary ${result.activation.overall}`;
    summary.textContent=result.activation.overall === 'success'
      ? 'All generated failures are active in Fenix.'
      : `Automatic activation was not completed. ${result.activation.message || 'Activate the marked failures manually.'}`;
    document.getElementById('activation-footer').textContent=result.activation.overall === 'success'
      ? 'Automatic activation verified in Fenix.' : 'Review the activation status on each card.';
  } else {
    summary.hidden=true;
    summary.textContent='';
    document.getElementById('activation-footer').textContent='Activate these failures manually in Fenix.';
  }
}
form.addEventListener('change', async () => {
  updateSummary();
  try {
    const result = await window.mel.saveSelection(selection());
    if (!result.saved) message('Your selection works for this session, but could not be saved.');
  } catch { message('Your selection could not be saved. Please try again.'); }
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
    const result = await window.mel.generate(selection());
    renderScenario(result);
    scenario = result;
    switchView('failures',true);
  } catch { message('Unable to generate a scenario. Please try again.'); }
  finally { busy = false; submit.disabled = false; label.textContent = 'To failures'; form.setAttribute('aria-busy','false'); }
});
document.getElementById('back-button').addEventListener('click',()=>switchView('setup',true));
setupTab.addEventListener('click',()=>switchView('setup'));
failuresTab.addEventListener('click',()=>switchView('failures'));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();switchView('setup',true);});
const settingsDialog=document.getElementById('settings-dialog');
document.getElementById('settings-button').addEventListener('click',()=>settingsDialog.showModal());
document.getElementById('settings-close').addEventListener('click',()=>settingsDialog.close());
settingsDialog.addEventListener('click',event=>{ if(event.target===settingsDialog) settingsDialog.close(); });
async function saveBooleanSetting(input,key,errorText) {
  const previous=!input.checked;
  input.disabled=true;
  try { await window.mel.saveAppSettings({[key]:input.checked}); }
  catch { input.checked=previous; message(errorText); }
  finally { input.disabled=false; }
}
document.getElementById('startup-update-setting').addEventListener('change',event=>{
  saveBooleanSetting(event.currentTarget,'checkForUpdatesOnStartup','The update setting could not be saved.');
});
document.getElementById('auto-activate-setting').addEventListener('change',event=>{
  saveBooleanSetting(event.currentTarget,'activateFailuresOnBriefing','The automatic activation setting could not be saved.');
});
document.getElementById('diagnostic-log-setting').addEventListener('change',event=>{
  saveBooleanSetting(event.currentTarget,'enableDiagnosticLog','The diagnostic log setting could not be saved.');
});
const updateButton=document.getElementById('update-available');
const checkUpdatesButton=document.getElementById('check-updates');
const updateStatus=document.getElementById('settings-update-status');
function renderUpdateState(state) {
  const available=state?.status === 'available';
  updateButton.hidden=!available;
  checkUpdatesButton.disabled=state?.status === 'checking';
  updateStatus.className=`settings-status ${state?.status || ''}`;
  if(state?.status === 'checking') updateStatus.textContent='Checking for updates…';
  else if(available) updateStatus.textContent=`Version ${state.latestVersion} is available.`;
  else if(state?.status === 'current' && state.manual) updateStatus.textContent='No updates available';
  else if(state?.status === 'error') updateStatus.textContent=state.message || 'Unable to check for updates.';
  else updateStatus.textContent='';
  updateStatus.hidden=!updateStatus.textContent;
}
checkUpdatesButton.addEventListener('click',async()=>{
  renderUpdateState({status:'checking',manual:true});
  try { renderUpdateState(await window.mel.checkForUpdates()); }
  catch { renderUpdateState({status:'error',manual:true,message:'Unable to check for updates.'}); }
});
updateButton.addEventListener('click',async()=>{
  updateButton.disabled=true;
  try { await window.mel.openUpdate(); }
  catch { message('Unable to open the release page. Please try again.'); }
  finally { updateButton.disabled=false; }
});
function renderIntegrationState(state) {
  integrationState=state;
  const sim=document.getElementById('sim-status');
  const adapter=document.getElementById('adapter-status');
  const simReady=state?.simConnected && state?.aircraftLoaded;
  const adapterReady=simReady && state?.supportedAircraft && state?.adapterReady;
  sim.classList.toggle('ready',Boolean(simReady));
  adapter.classList.toggle('ready',Boolean(adapterReady));
  const simText=simReady ? `Simulator and aircraft detected: ${state.aircraftTitle}` : 'Simulator and aircraft not detected';
  const adapterText=adapterReady ? 'Automatic activation available' : 'Automatic activation unavailable';
  sim.title=simText; sim.setAttribute('aria-label',simText);
  adapter.title=adapterText; adapter.setAttribute('aria-label',adapterText);
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
    const info = await window.mel.initialize();
    form.elements.aircraft.value = info.settings.aircraft;
    form.elements.count.value = String(info.settings.count);
    document.getElementById('version-badge').textContent = `v${info.version}`;
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
    label.textContent = 'To failures';
  } catch {
    label.textContent = 'Unavailable';
    message('Unable to load the application. Please close and reopen MEL Generator.');
  }
})();
