// Step 7: fixed catalogue samples for interface review. Random generation belongs to step 8.
const samples = [
  {id:'M042', title:'Autopilot 1', mmel:'22-10-01', page:57,
   conditions:['Approach minima must not require use of the inoperative autopilot.'],
   path:['ATA 22 · AutoFlight','AP','1']},
  {id:'M144', title:'Yellow electric hydraulic pump', mmel:'29-25-01', page:266,
   conditions:['Select the associated electric pump pushbutton OFF.','Operate the forward and aft cargo doors manually.'],
   path:['ATA 29 · Hydraulic power','Elec pumps','Elec Hyd Pump Yellow Failure']},
  {id:'M323', title:'Cockpit voice recorder', mmel:'23-71-01', page:86,
   conditions:['The Flight Data Recorder (FDR) must operate normally.','Complete repairs within 3 flight-days.'],
   path:['ATA 31 · Indicating/Recording system','CVR']}
];
const setupTab=document.getElementById('setup-tab');
const failuresTab=document.getElementById('failures-tab');
const setupPanel=document.getElementById('setup-panel');
const failuresPanel=document.getElementById('failures-panel');
const form=document.getElementById('setup-form');
let hasBriefing=false;
let currentView='setup';
const selection=()=>({aircraft:form.elements.aircraft.value,count:Number(form.elements.count.value)});
const pad=n=>String(n).padStart(2,'0');
function updateSummary(){
  const {aircraft,count}=selection();
  document.getElementById('summary-aircraft').textContent=aircraft;
  document.getElementById('summary-count').textContent=pad(count);
  document.getElementById('count-description').textContent=['One failure. A fresh challenge.','Two failures. One scenario.','Three failures. More to manage.'][count-1];
}
function switchView(view,{focus=false,history=true}={}){
  if(view==='failures'&&!hasBriefing)view='setup';
  currentView=view;
  const isSetup=view==='setup';
  setupPanel.hidden=!isSetup;failuresPanel.hidden=isSetup;
  for(const [tab,active] of [[setupTab,isSetup],[failuresTab,!isSetup]]){
    tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
  }
  if(history)window.history.pushState({view},'',`#${view}`);
  if(focus)(isSetup?setupTab:document.getElementById('results-title')).focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
}
function makeBriefing(){
  const {aircraft,count}=selection();
  const cards=document.getElementById('failure-cards');
  cards.dataset.count=count;
  cards.replaceChildren(...samples.slice(0,count).map((sample,i)=>{
    const card=document.createElement('article');card.className='failure-card';
    card.setAttribute('aria-labelledby',`title-${sample.id}`);
    card.innerHTML=`<header class="card-head"><div class="card-kicker"><span>FAILURE ${pad(i+1)}</span><span>${sample.id}</span></div><h2 id="title-${sample.id}">${sample.title}</h2></header>
      <div class="card-body"><h3 class="card-label">MMEL CONDITIONS</h3><ul class="condition-list">${sample.conditions.map(c=>`<li>${c}</li>`).join('')}</ul>
      <div class="efb-block"><h3 class="card-label">FENIX EFB · FAILURES</h3><div class="efb-path">${sample.path.map((p,n)=>n===sample.path.length-1?`<b>${p}</b>`:p).join('<span class="path-arrow">›</span>')}</div></div>
      <footer class="card-foot"><span>MMEL ${sample.mmel}</span><a href="../sources_mel_mmel/00_current_mmel/FAA_A320_MMEL_Rev32_2025-07-30.pdf#page=${sample.page}" target="_blank" rel="noopener" aria-label="View MMEL ${sample.mmel}, PDF page ${sample.page}">View source <svg aria-hidden="true"><use href="#arrow-out"/></svg></a></footer></div>`;
    return card;
  }));
  document.getElementById('results-title').textContent=`${aircraft} failures`;
  document.getElementById('result-count').textContent=pad(count);
  document.getElementById('result-count-label').textContent=count===1?'failure':'failures';
  const badge=document.getElementById('nav-count');badge.textContent=count;badge.hidden=false;
  hasBriefing=true;failuresTab.disabled=false;
}
form.addEventListener('change',updateSummary);
form.addEventListener('submit',event=>{event.preventDefault();makeBriefing();switchView('failures',{focus:true});});
document.getElementById('back-button').addEventListener('click',()=>switchView('setup',{focus:true}));
setupTab.addEventListener('click',()=>switchView('setup'));
failuresTab.addEventListener('click',()=>switchView('failures'));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();switchView('setup',{focus:true});});
document.querySelector('.tabbar').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const view=event.key==='Home'?'setup':event.key==='End'?'failures':currentView==='setup'?'failures':'setup';
  if(view==='failures'&&!hasBriefing)return;
  switchView(view);(view==='setup'?setupTab:failuresTab).focus();
});
window.addEventListener('popstate',()=>switchView(location.hash==='#failures'?'failures':'setup',{history:false}));
updateSummary();
window.history.replaceState({view:'setup'},'','#setup');
