/* V21: physical-speaker probe, measured master PCM and one-tap stereo recovery.
   Measurements cannot prove the phone's speaker is unmuted. */
'use strict';
let audioRepairBusy=false;
function audioRepairMessage(message,kind=''){
 const el=document.getElementById('audio-repair-result');
 if(el){el.textContent=message;el.dataset.state=kind;}
 const hint=document.getElementById('studio-audio-guide');
 if(hint)hint.textContent=message;
}
function audioRepairStereo(){
 if(!ctx||!masterOutput)return false;
 try{
  if(channelMerger){
   try{masterOutput.disconnect(channelMerger);}catch(e){}
   try{channelMerger.disconnect();}catch(e){}
   channelMerger=null;
  }
  try{ctx.destination.channelCount=Math.min(2,ctx.destination.maxChannelCount||2);}catch(e){}
  try{masterOutput.disconnect(ctx.destination);}catch(e){}
  masterOutput.connect(ctx.destination);
  isMultiOut=false;
  const b=document.getElementById('routing-btn');
  if(b){b.classList.remove('on');b.textContent='🎛️ SORTIES : STÉRÉO';}
  return true;
 }catch(error){return false;}
}
function audioRepairReset(){
 if(!ctx||ctx.state!=='running'||!audioRepairStereo())return false;
 if(typeof SEQ!=='undefined'&&SEQ.playing){
  stopSeq();isPlaying=false;
  const play=document.getElementById('play-btn');if(play)play.textContent='▶ PLAY';
 }
 if(typeof studioPatchReset==='function')studioPatchReset();
 for(const name of STUDIO_TRACKS){
  const ch=studioChannels[name];
  if(ch){ch.mute=false;ch.solo=false;ch.pan=0;}
  if(!Number.isFinite(chanVol[name])||chanVol[name]<.05)chanVol[name]=name==='kick'?.85:.55;
 }
 studioApplyMix();
 masterOutput.gain.setTargetAtTime(.87,ctx.currentTime,.025);
 if(duckingGain?.gain)duckingGain.gain.setTargetAtTime(1,ctx.currentTime,.025);
 if(typeof masterEqPreset==='function')masterEqPreset('flat');
 if(typeof applyMorph==='function')applyMorph(0,false);
 if(masterFilter?.frequency)masterFilter.frequency.setTargetAtTime(17500,ctx.currentTime,.03);
 if(typeof studioSyncMixer==='function')studioSyncMixer();
 if(typeof saveLiveState==='function')saveLiveState();
 return true;
}
function audioRepairTone(bus,freq){
 const start=ctx.currentTime+.02,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type='sine';osc.frequency.value=freq;
 gain.gain.setValueAtTime(0,start);
 gain.gain.linearRampToValueAtTime(.105,start+.025);
 gain.gain.setValueAtTime(.105,start+.33);
 gain.gain.linearRampToValueAtTime(0,start+.41);
 osc.connect(gain);gain.connect(bus);
 osc.start(start);osc.stop(start+.44);
 osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch(e){}};
}
async function audioRepairMeter(source,monitor,freq){
 if(!ctx||ctx.state!=='running'||!source||!monitor)return 0;
 const analyser=ctx.createAnalyser(),buffer=new Float32Array(512);
 analyser.fftSize=512;analyser.smoothingTimeConstant=0;
 monitor.connect(analyser);
 // For the speaker test place the analyser IN the audible path.
 // A zero-volume analyser branch can be optimized away by Chromium.
 if(source===monitor)analyser.connect(ctx.destination);
 let maxRms=0;
 try{
  audioRepairTone(source,freq);
  for(let i=0;i<12;i++){
   await new Promise(resolve=>setTimeout(resolve,42));
   analyser.getFloatTimeDomainData(buffer);
   let sum=0;for(const sample of buffer)sum+=sample*sample;
   maxRms=Math.max(maxRms,Math.sqrt(sum/buffer.length));
  }
 }finally{
  try{monitor.disconnect(analyser);}catch(e){}
  try{analyser.disconnect();}catch(e){}
 }
 return maxRms;
}
async function audioRepairDiagnose(){
 if(audioRepairBusy)return false;
 audioRepairBusy=true;
 const btn=document.getElementById('studio-test-btn');if(btn)btn.disabled=true;
 try{
  audioRepairMessage('Activation du moteur audio…');
  if(!await activateStudioAudio()){
   audioRepairMessage('Audio suspendu : ouvre le site dans Chrome ou Safari et touche ACTIVER LE SON.','error');
   return false;
  }
  // A: audio sent directly to the requested output, independent of the sequencer.
  audioRepairMessage('1/2 · Écoute le bip de test du haut-parleur…');
  const bus=ctx.createGain();
  let direct;
  try{direct=await audioRepairMeter(bus,bus,660);}finally{bus.disconnect();}
  if(direct<.001){
   audioRepairMessage('Le signal direct ne passe pas : vérifie le volume média, la sortie Bluetooth ou le navigateur.','error');
   return false;
  }
  // B: a real note travels through the channel, patchbay and processed master.
  audioRepairMessage('2/2 · Mesure du chemin instrument → master…');
  let master=await audioRepairMeter(chanGain.kick,masterOutput,440);
  if(master<.001){
   audioRepairMessage('Bus musical silencieux : réparation des branchements…');
   if(audioRepairReset())master=await audioRepairMeter(chanGain.kick,masterOutput,440);
  }
  if(master<.001){
   audioRepairMessage('Test direct OK, mais signal absent du master : problème DSP non résolu.','error');
   if(typeof setStatus==='function')setStatus('MASTER SILENCIEUX','al');
   return false;
  }
  audioRepairMessage('Signal détecté dans le master. Si tu n’as entendu aucun bip : augmente le volume MÉDIA, vérifie les écouteurs/Bluetooth et ouvre le site dans Chrome/Safari.','success');
  if(typeof setStatus==='function')setStatus('SIGNAL MASTER DÉTECTÉ','ok');
  return true;
 }catch(error){
  audioRepairMessage('Diagnostic impossible : '+(error?.message||String(error)),'error');
  if(typeof setStatus==='function')setStatus('ERREUR AUDIO','al');
  return false;
 }finally{audioRepairBusy=false;if(btn)btn.disabled=false;}
}
function audioRepairInstall(){
 const bar=document.querySelector('.studio-quickbar');
 if(!bar||document.getElementById('studio-audio-repair'))return;
 const el=document.createElement('section');el.id='studio-audio-repair';
 el.innerHTML='<p id="audio-repair-result" role="status" aria-live="polite">Pas de son ? TEST SON émet un bip et mesure le chemin audio.</p>'+
 '<button type="button" id="audio-repair-reset">RÉPARER LE MIXAGE ET LES BRANCHEMENTS</button>';
 bar.appendChild(el);
 const test=document.getElementById('studio-test-btn');
 if(test)test.textContent='TEST SON / DIAGNOSTIC';
 el.querySelector('#audio-repair-reset').addEventListener('click',async()=>{
  if(!await activateStudioAudio())return;
  const ok=audioRepairReset();
  audioRepairMessage(ok?'Mix, muets, volumes, effets et sorties stéréo rétablis. Lance TEST SON / DIAGNOSTIC.':'Réparation impossible : audio indisponible.',ok?'success':'error');
  if(typeof setStatus==='function')setStatus(ok?'MIX RÉTABLI':'AUDIO BLOQUÉ',ok?'ok':'al');
 });
}
