/* LOVESTRONAUTES V20 — patchbay mobile/studio, whitelist routing and live rewire.
   Every route is one-way to a known master bus: no user-created feedback loops. */
'use strict';

const STUDIO_PATCH_BUSES = Object.freeze({
  drive: {label:'DISTO → FX',help:'Saturation analogique puis effets master'},
  crush: {label:'CRUSH → FX',help:'Réduction numérique puis effets master'},
  fx: {label:'FX MASTER',help:'Ducking, saturation et effets master'},
  clean: {label:'MASTER CLEAN',help:'Bypass des effets créatifs, EQ et limiteur conservés'},
  off: {label:'DÉBRANCHÉ',help:'Silence sur cette piste'}
});
const STUDIO_PATCH_NAMES={
  kick:'KICK',snare:'SNARE',hat:'HI-HAT',sub:'SUB',acid:'ACID',fm:'FM',
  biniou:'BINIOU',metal:'METAL',theremin:'THEREMIN',speak:'VOIX',s1:'S1 MK2',
  taiga:'TAÏGA',mbase:'MBASE 11',solar:'SOLAR 50',modfm:'MOD FM',
  wing:'WING PINGER',fieldkit:'FIELD KIT',grandmother:'GRANDMOTHER'
};
const STUDIO_PATCH_TRACKS=STUDIO_TRACKS.filter(name=>name!=='biniou');
function studioPatchDefault(name){
  if(name==='kick')return 'drive';
  if(['snare','hat','metal'].includes(name))return 'crush';
  return 'fx';
}
const studioPatchRoutes={};
STUDIO_PATCH_TRACKS.forEach(name=>studioPatchRoutes[name]=studioPatchDefault(name));
let studioPatchEventsReady=false;
function studioPatchProjectState(){return Object.assign({},studioPatchRoutes);}
function studioPatchRestore(routes){
  STUDIO_PATCH_TRACKS.forEach(name=>{
    const route=routes&&routes[name];
    studioPatchRoutes[name]=Object.prototype.hasOwnProperty.call(STUDIO_PATCH_BUSES,route)?route:studioPatchDefault(name);
  });
  studioPatchReconnectAll();
  studioPatchRefresh();
}
function studioPatchTarget(route){
  if(route==='drive')return typeof distShaper!=='undefined'?distShaper:null;
  if(route==='crush')return window.sp1200Crusher||null;
  if(route==='clean')return typeof masterFilter!=='undefined'?masterFilter:null;
  return typeof duckingGain!=='undefined'?duckingGain:null;
}
function studioPatchPhysicalChannel(name){
  if(name==='kick')return 0;
  if(name==='acid')return 1;
  if(name==='fm'||name==='sub')return 2;
  return 3;
}
function studioPatchReconnect(name){
  if(!ctx||!studioNodes[name]||!studioNodes[name].output)return false;
  const output=studioNodes[name].output;
  const route=studioPatchRoutes[name];
  let target=null;
  if(route==='off')target=null;
  else if(isMultiOut&&channelMerger)target=channelMerger;
  else target=studioPatchTarget(route)||duckingGain;
  if(!target&&route!=='off')target=duckingGain||masterFilter||null;
  // An unpatched channel is disconnected only at its unique, dedicated output.
  try{output.disconnect();}catch(error){}
  if(target){
    try{
      if(target===channelMerger)output.connect(target,0,studioPatchPhysicalChannel(name));
      else output.connect(target);
    }catch(error){
      // Conservative fallback: reconnect a known valid master bus.
      try{output.connect(duckingGain);}catch(ignore){}
      return false;
    }
  }
  return true;
}
function studioPatchReconnectAll(){
  let count=0;
  STUDIO_PATCH_TRACKS.forEach(name=>{if(studioPatchReconnect(name))count++;});
  studioPatchRefresh();
  return count;
}
function studioPatchSet(name,route){
  if(!STUDIO_PATCH_TRACKS.includes(name)||!Object.prototype.hasOwnProperty.call(STUDIO_PATCH_BUSES,route))return false;
  const previous=studioPatchRoutes[name];
  studioPatchRoutes[name]=route;
  if(!studioPatchReconnect(name)){
    // Before activation there is no graph to reconnect; this is expected.
    if(ctx&&studioNodes[name]?.output){
      studioPatchRoutes[name]=previous;
      studioPatchReconnect(name);
      studioPatchRefresh();
      return false;
    }
  }
  if(typeof saveLiveState==='function')saveLiveState();
  studioPatchRefresh();
  if(typeof setStatus==='function')setStatus(name.toUpperCase()+' → '+STUDIO_PATCH_BUSES[route].label,'ok');
  return true;
}
function studioPatchReset(){
  STUDIO_PATCH_TRACKS.forEach(name=>{studioPatchRoutes[name]=studioPatchDefault(name);});
  studioPatchReconnectAll();
  if(typeof saveLiveState==='function')saveLiveState();
  if(typeof setStatus==='function')setStatus('BRANCHEMENTS PAR DÉFAUT RESTAURÉS','ok');
}
function studioPatchRefresh(){
  const panel=document.getElementById('studio-patchbay');
  if(!panel)return;
  panel.querySelectorAll('select[data-patch-track]').forEach(select=>{
    const name=select.dataset.patchTrack;
    select.value=studioPatchRoutes[name];
    select.disabled=!!isMultiOut;
    select.title=isMultiOut?'En mode sorties physiques 4CH, les bus internes sont indisponibles':'Destination audio de la piste';
    const badge=select.closest('.patchbay-row')?.querySelector('.patchbay-route');
    if(badge)badge.textContent='→ '+STUDIO_PATCH_BUSES[studioPatchRoutes[name]].label;
  });
  const status=panel.querySelector('#patchbay-status');
  if(status){
    const connected=STUDIO_PATCH_TRACKS.filter(n=>studioPatchRoutes[n]!=='off').length;
    status.textContent=(ctx&&ctx.state==='running'?'AUDIO ACTIVÉ':'SON À ACTIVER')+' · '+connected+'/17 PISTES ROUTÉES'+
      (isMultiOut?' · SORTIES PHYSIQUES 4 CANAUX (FX INTERNES BYPASSÉS)':' · MIXAGE STÉRÉO');
  }
}
function studioPatchBuild(){
  const mix=document.getElementById('panel-mix');
  if(!mix)return;
  const previous=document.getElementById('studio-patchbay');
  const wasOpen=previous?.open??false;
  const section=document.createElement('details');
  section.id='studio-patchbay';section.className='studio-patchbay';
  section.open=wasOpen;
  section.innerHTML=
    '<summary><span>BRANCHEMENTS AUDIO · PATCHBAY</span><small>17 voies réglables + BINIOU interne</small></summary>'+
    '<div class="patchbay-content">'+
      '<p>Choisis la destination de chaque piste. Les câbles changent en direct sans recharger le studio. Toutes les voies arrivent ensuite au master, sauf les voies débranchées.</p>'+
      '<div class="patchbay-signal" aria-label="Chemin du signal">INSTRUMENT → EQ / PAN → ROUTAGE → MASTER EQ → LIMITEUR → HAUT-PARLEURS</div>'+
      '<div class="patchbay-actions">'+
        '<button type="button" id="patchbay-test">TESTER CONNEXIONS</button>'+
        '<button type="button" id="patchbay-default">RÉTABLIR CÂBLAGE</button>'+
      '</div>'+
      '<div id="patchbay-status" role="status" aria-live="polite"></div>'+
      '<div class="patchbay-rows">'+STUDIO_TRACKS.map(name=>{
        const label=STUDIO_PATCH_NAMES[name]||name;
        if(name==='biniou')return '<div class="patchbay-row patchbay-fixed"><strong>'+label+'</strong><span>EFFETS BINIOU INTERNES</span><small>FX → MASTER (fixe)</small></div>';
        const options=Object.entries(STUDIO_PATCH_BUSES).map(([key,bus])=>
          '<option value="'+key+'">'+bus.label+'</option>').join('');
        return '<label class="patchbay-row"><strong>'+label+'</strong>'+
          '<select aria-label="Branchement '+label+'" data-patch-track="'+name+'">'+options+'</select>'+
          '<small class="patchbay-route"></small></label>';
      }).join('')+'</div>'+
      '<p class="patchbay-hint">Les effets de chaque machine restent accessibles dans MACHINES. Sur téléphone, la sortie est stéréo. La sortie matérielle 4 canaux exige une interface audio réellement compatible.</p>'+
    '</div>';
  mix.prepend(section);
  studioPatchRefresh();
}
function studioPatchInstall(){
  if(studioPatchEventsReady)return;
  studioPatchEventsReady=true;
  document.addEventListener('change',event=>{
    const select=event.target.closest?.('select[data-patch-track]');
    if(select&&document.getElementById('studio-patchbay')?.contains(select)){
      studioPatchSet(select.dataset.patchTrack,select.value);
    }
  });
  document.addEventListener('click',async event=>{
    const reset=event.target.closest?.('#patchbay-default');
    if(reset){studioPatchReset();return;}
    const test=event.target.closest?.('#patchbay-test');
    if(!test)return;
    const status=document.getElementById('patchbay-status');
    const ready=await activateStudioAudio();
    if(!ready){if(status)status.textContent='Audio bloqué : vérifie la sortie, le volume et réactive le son.';return;}
    const missing=STUDIO_PATCH_TRACKS.filter(name=>!studioNodes[name]?.output);
    const connected=studioPatchReconnectAll();
    if(status)status.textContent=missing.length?
      'Connexions incomplètes : '+missing.join(', '):
      'Graphe audio présent : '+connected+'/17 voies testées. Utilise TEST SON pour vérifier le rendu audible.';
    if(typeof setStatus==='function')setStatus(missing.length?'CÂBLAGE INCOMPLET':'CÂBLAGE VÉRIFIÉ',missing.length?'al':'ok');
  });
}
