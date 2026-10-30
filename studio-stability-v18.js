/* LOVESTRONAUTES V18 · MOBILE AUDIO STABILITY
 * Prevents background scheduling storms, keeps heavy scope/UI draws optional,
 * adds recovery feedback and a consecutive sequencer-error circuit breaker.
 */
'use strict';
let studioEcoMode=typeof window!=='undefined'&&
 typeof window.matchMedia==='function'&&window.matchMedia('(pointer: coarse)').matches;
let studioAudioFaults=0,studioFaultAt=0;
let studioStabilityMounted=false;
// Track-local circuit breaker: one defective synth must not stop all 18 tracks.
const studioTrackFailureState=Object.create(null);
// Enter a short degradation window only when Android/iOS timer delivery is late.
// Rhythmic core stays audible; optional high-CPU textures can miss a few notes.
let studioAudioPressureUntil=0,studioAudioPressureNotice=0;
let studioAudioLateAt=0,studioAudioLateCount=0,studioAudioPressureCounter=0;
const studioOptionalTracks=new Set(['biniou','theremin','speak','s1','taiga','solar','modfm','wing','fieldkit','grandmother']);
function studioStabilityReportLateStep(){
 if(!studioEcoMode)return;
 const now=Date.now();
 // A single Android timer hiccup must not mute every texture for 1.6 seconds.
 // Only repeated late scheduler ticks trigger short, partial load shedding.
 studioAudioLateCount=now-studioAudioLateAt<1500?studioAudioLateCount+1:1;
 studioAudioLateAt=now;
 if(studioAudioLateCount<2)return;
 studioAudioPressureUntil=now+650;
 if(now-studioAudioPressureNotice>6500){
  studioAudioPressureNotice=now;
  if(typeof setStatus==='function')setStatus('AUDIO : CHARGE ÉLEVÉE · RÉDUCTION PARTIELLE DES TEXTURES','al');
 }
}
function studioSafeTrigger(track,trigger){
 const now=Date.now();
 const state=studioTrackFailureState[track]||
  (studioTrackFailureState[track]={failures:0,last:0,muteUntil:0});
 if(now<state.muteUntil)return false;
 // Shed at most one optional note in three; never erase ALL textures.
 if(studioEcoMode && now<studioAudioPressureUntil && studioOptionalTracks.has(track)){
  studioAudioPressureCounter++;
  if(studioAudioPressureCounter%3===0)return false;
 }
 try{
  trigger();
  state.failures=0;
  return true;
 }catch(error){
  if(now-state.last>6000)state.failures=0;
  state.last=now;
  state.failures++;
  if(state.failures>=3){
   state.muteUntil=now+4000;
   state.failures=0;
   console.error('Piste '+track+' désactivée 4 s après erreurs répétées',error);
   if(typeof setStatus==='function')setStatus('PISTE '+track.toUpperCase()+' EN PROTECTION · AUTRES PISTES ACTIVES','al');
   const hint=document.getElementById('studio-audio-guide');
   if(hint)hint.textContent='Piste '+track.toUpperCase()+' temporairement isolée (4 s). Les autres instruments continuent. Recharge si le problème persiste.';
  }else{
   console.warn('Piste '+track+' : note ignorée',error);
  }
  return false;
 }
}
function studioStabilityPaint(){
 const el=document.getElementById('studio-stability-toggle');
 if(el){
  el.textContent=studioEcoMode?'STABILITÉ AUDIO · ÉCO ON':'STABILITÉ AUDIO · STUDIO';
  el.setAttribute('aria-pressed',String(studioEcoMode));
 }
 const note=document.getElementById('studio-stability-hint');
 if(note)note.textContent=studioEcoMode?
  'Mode téléphone : animations réduites, lecture mise en pause si l’application passe en arrière-plan.':
  'Mode studio : animations normales. Le navigateur peut limiter l’audio en arrière-plan.';
 document.documentElement.classList.toggle('studio-eco',studioEcoMode);
 const dock=document.querySelector('[data-mobile-action="eco"]');
 if(dock){dock.textContent=studioEcoMode?'ÉCO ✓':'ÉCO';dock.setAttribute('aria-pressed',String(studioEcoMode));}
}
function studioStabilityToggle(){
 studioEcoMode=!studioEcoMode;
 studioStabilityPaint();
 if(typeof setStatus==='function')setStatus(studioEcoMode?'ÉCO AUDIO ACTIVÉ':'MODE STUDIO ACTIVÉ','ok');
 return studioEcoMode;
}
function studioStabilityFault(error){
 const now=Date.now();
 if(now-studioFaultAt>6500)studioAudioFaults=0;
 studioFaultAt=now;studioAudioFaults++;
 console.error('V18 Audio : note ignorée ('+studioAudioFaults+')',error);
 if(studioAudioFaults>=4){
  if(typeof stopSeq==='function')stopSeq();
  if(typeof isPlaying!=='undefined')isPlaying=false;
  const play=document.getElementById('play-btn');
  if(play){play.textContent='▶ PLAY';play.disabled=false;}
  if(typeof setStatus==='function')setStatus('AUDIO PAUSÉ : ERREURS RÉPÉTÉES','al');
  const hint=document.getElementById('studio-audio-guide');
  if(hint)hint.textContent='Trop d’erreurs de synthèse. Réduis les instruments actifs puis touche RÉACTIVER AUDIO.';
  studioAudioFaults=0;
  return false;
 }
 return true;
}
function studioStabilityPausePlayback(reason){
 if(typeof SEQ==='undefined'||!SEQ.playing)return false;
 if(typeof studioExportBusy!=='undefined'&&studioExportBusy)return false;
 if(typeof stopSeq==='function')stopSeq();
 if(typeof isPlaying!=='undefined')isPlaying=false;
 const play=document.getElementById('play-btn');
 if(play){play.textContent='▶ PLAY';play.disabled=false;}
 if(typeof fieldkitStopStream==='function')fieldkitStopStream();
 if(typeof studioKeyboardOffAll==='function')studioKeyboardOffAll();
 if(typeof setStatus==='function')setStatus(reason||'LECTURE EN PAUSE · REPRENDS AVEC PLAY','al');
 return true;
}
function studioStabilityInstall(){
 if(studioStabilityMounted||typeof document==='undefined')return;
 studioStabilityMounted=true;
 const bar=document.querySelector('.studio-quickbar');
 if(bar){
  const row=document.createElement('div');
  row.id='studio-stability-bar';row.className='studio-stability-bar';
  row.innerHTML='<button type="button" id="studio-stability-toggle" aria-pressed="false">STABILITÉ AUDIO</button>'+
    '<button type="button" id="studio-stability-recover">↻ RÉACTIVER AUDIO</button>'+
    '<span id="studio-stability-hint" role="status" aria-live="polite"></span>';
  bar.appendChild(row);
  row.querySelector('#studio-stability-toggle').addEventListener('click',studioStabilityToggle);
  row.querySelector('#studio-stability-recover').addEventListener('click',async()=>{
   try{
    if(typeof ctx!=='undefined'&&ctx&&ctx.state==='closed'){
     if(typeof saveLiveState==='function')saveLiveState();
     location.reload();return;
    }
    const ok=await activateStudioAudio();
    if(typeof setStatus==='function')setStatus(ok?'AUDIO RÉACTIVÉ':'AUDIO NON RÉACTIVÉ',ok?'ok':'al');
   }catch(error){
    if(typeof setStatus==='function')setStatus('RÉACTIVATION : '+error.message,'al');
   }
  });
 }
 document.addEventListener('visibilitychange',function(){
  if(document.hidden&&studioEcoMode){
   studioStabilityPausePlayback('LECTURE PAUSÉE EN ARRIÈRE-PLAN · REPRENDS AVEC PLAY');
   if(typeof fieldkitStopStream==='function')fieldkitStopStream();
  }
 });
 window.addEventListener('pagehide',function(){
  if(typeof fieldkitStopStream==='function')fieldkitStopStream();
  if(typeof fieldkitStopMic==='function')fieldkitStopMic();
 });
 studioStabilityPaint();
}
