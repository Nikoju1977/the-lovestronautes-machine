/* FIELD KIT · STUDIO NIKO V17
   Inspired by KOMA Elektronik's Field Kit. Not affiliated or circuit-accurate.
   Radio, motor and sensor signals are DIGITAL SIMULATIONS; no hardware I/O.
   Real microphone and audio file input require user consent. No server.
*/
'use strict';
const FIELDKIT_SOURCES=['osc','radio','noise','motor','sample','mic'];
const FIELDKIT_DEFAULT={
 enabled:true,radioTune:.48,lfoRate:.32,lfoDepth:.22,sensor:.5,
 auxReturn:.24,decay:.52,master:.74,follower:.52,gate:.24,channels:[
 {source:'osc',gain:.65,level:.60,tone:.46,aux:.16},
 {source:'radio',gain:.57,level:.48,tone:.58,aux:.30},
 {source:'noise',gain:.37,level:.28,tone:.27,aux:.12},
 {source:'sample',gain:.67,level:.52,tone:.51,aux:.18}
]};
const FIELDKIT_PRESETS={
 field:{label:'FIELD RECORDING',patch:{...FIELDKIT_DEFAULT}},
 antenna:{label:'ANTENNA / RADIO CV',patch:{...FIELDKIT_DEFAULT,
  radioTune:.72,lfoRate:.65,lfoDepth:.66,channels:[
  {source:'radio',gain:.68,level:.56,tone:.55,aux:.28},
  {source:'radio',gain:.46,level:.41,tone:.43,aux:.32},
  {source:'motor',gain:.43,level:.30,tone:.68,aux:.14},
  {source:'noise',gain:.25,level:.25,tone:.31,aux:.10}]}},
 contact:{label:'CONTACT / INDUSTRIAL',patch:{...FIELDKIT_DEFAULT,
  sensor:.76,decay:.24,channels:[
  {source:'motor',gain:.7,level:.53,tone:.76,aux:.17},
  {source:'noise',gain:.58,level:.48,tone:.63,aux:.18},
  {source:'mic',gain:.44,level:.58,tone:.48,aux:.23},
  {source:'sample',gain:.67,level:.52,tone:.55,aux:.19}]}},
 drone:{label:'ORGANIC DRONE',patch:{...FIELDKIT_DEFAULT,
  radioTune:.19,lfoRate:.15,lfoDepth:.43,decay:.90,
  channels:[
  {source:'osc',gain:.58,level:.57,tone:.32,aux:.32},
  {source:'radio',gain:.52,level:.38,tone:.33,aux:.34},
  {source:'motor',gain:.31,level:.29,tone:.28,aux:.23},
  {source:'sample',gain:.57,level:.45,tone:.42,aux:.22}]}}
};
const fieldkitNames={osc:'OSC / CONDUCTEUR',radio:'RADIO VIRTUELLE',noise:'BRUIT / CONTACT',motor:'MOTEUR SIMULÉ',sample:'SAMPLE / REC',mic:'MICRO DIRECT'};
let fieldkitState=fieldkitSanitize(FIELDKIT_DEFAULT),fieldkitPreset='field';
let fieldkitGraph=null,fieldkitGraphCtx=null,fieldkitNoiseCtx=null,fieldkitNoiseData=null;
let fieldkitSample=null,fieldkitSampleName='',fieldkitMicStream=null,fieldkitMicSource=null;
let fieldkitBusy=false,fieldkitTimer=null,fieldkitFollowTimer=null,fieldkitAnalyser=null,fieldkitEnvelope=0;
const fieldkitVoices=[];

function fieldkitClamp(n,a,b,d){return typeof n==='number'&&Number.isFinite(n)?Math.min(b,Math.max(a,n)):d;}
function fieldkitSanitize(raw){
 const s=raw&&typeof raw==='object'?raw:{},p={enabled:s.enabled!==false,channels:[]};
 for(const k of ['radioTune','lfoRate','lfoDepth','sensor','auxReturn','decay','master','follower','gate'])
  p[k]=fieldkitClamp(s[k],0,1,FIELDKIT_DEFAULT[k]);
 for(let i=0;i<4;i++){
  const old=FIELDKIT_DEFAULT.channels[i],r=Array.isArray(s.channels)&&s.channels[i]&&typeof s.channels[i]==='object'?s.channels[i]:old;
  p.channels.push({source:FIELDKIT_SOURCES.includes(r.source)?r.source:old.source,
    gain:fieldkitClamp(r.gain,0,1,old.gain),level:fieldkitClamp(r.level,0,1,old.level),
    tone:fieldkitClamp(r.tone,0,1,old.tone),aux:fieldkitClamp(r.aux,0,1,old.aux)});
 }
 return p;
}
function fieldkitProjectState(){
 return {preset:fieldkitPreset,patch:JSON.parse(JSON.stringify(fieldkitState)),
  sampleName:fieldkitSampleName||null};
}
function fieldkitRestoreState(project){
 const p=project&&project.fieldkit&&typeof project.fieldkit==='object'?project.fieldkit:{};
 fieldkitState=fieldkitSanitize(p.patch);
 fieldkitPreset=Object.prototype.hasOwnProperty.call(FIELDKIT_PRESETS,p.preset)?p.preset:'custom';
 // AudioBuffer remains in memory only: importing a JSON must not falsely restore a sample.
 fieldkitSample=null;fieldkitSampleName='';
 if(typeof fieldkitFreeStream==='function')fieldkitFreeStream();
 fieldkitStopMic();fieldkitStopVoices();fieldkitApplyMix();fieldkitSyncRack();
}
function fieldkitEnsurePatterns(bank){
 for(const k of ['A','B','C','D']){
  if(bank[k]&&(!Array.isArray(bank[k].fieldkit)||bank[k].fieldkit.length!==16))
   bank[k].fieldkit=Array(16).fill(null);
 }
}
function fieldkitSaveSoon(){
 clearTimeout(fieldkitTimer);
 fieldkitTimer=setTimeout(function(){if(typeof saveLiveState==='function')saveLiveState();fieldkitTimer=null;},230);
}
function fieldkitStatus(message){
 const el=typeof document!=='undefined'?document.getElementById('fieldkit-status'):null;
 if(el)el.textContent=message;
}
function fieldkitApplyPreset(name){
 if(!Object.prototype.hasOwnProperty.call(FIELDKIT_PRESETS,name))return false;
 fieldkitState=fieldkitSanitize(FIELDKIT_PRESETS[name].patch);fieldkitPreset=name;
 fieldkitApplyMix();fieldkitReconnectMic();
 if(typeof fieldkitConnectStream==='function')fieldkitConnectStream();
 fieldkitSyncRack();
 if(typeof saveLiveState==='function')saveLiveState();
 return true;
}
function fieldkitTone(v){
 return {type:v<.5?'lowpass':'highpass',hz:v<.5?
  420+Math.pow(v*2,2)*11800:35+Math.pow((v-.5)*2,2)*1600};
}
function fieldkitEnsureGraph(){
 if(!ctx||!chanGain.fieldkit)return null;
 if(fieldkitGraphCtx===ctx&&fieldkitGraph)return fieldkitGraph;
 fieldkitGraphCtx=ctx;
 const master=ctx.createGain(),delay=ctx.createDelay(.9),feedback=ctx.createGain(),wet=ctx.createGain();
 master.connect(chanGain.fieldkit);
 delay.delayTime.value=.18;feedback.gain.value=.16;wet.gain.value=.18;
 delay.connect(wet);wet.connect(chanGain.fieldkit);
 delay.connect(feedback);feedback.connect(delay);
 const channels=[];
 for(let i=0;i<4;i++){
  const input=ctx.createGain(),pre=ctx.createGain(),filter=ctx.createBiquadFilter(),level=ctx.createGain(),send=ctx.createGain();
  input.connect(pre);pre.connect(filter);filter.connect(level);level.connect(master);
  filter.connect(send);send.connect(delay);
  channels.push({input,pre,filter,level,send});
 }
 fieldkitGraph={master,delay,feedback,wet,channels};
 fieldkitApplyMix();
 fieldkitReconnectMic();
 if(typeof fieldkitConnectStream==='function')fieldkitConnectStream();
 return fieldkitGraph;
}
function fieldkitApplyMix(){
 if(!ctx||fieldkitGraphCtx!==ctx||!fieldkitGraph)return;
 const p=fieldkitState,t=ctx.currentTime;
 fieldkitGraph.master.gain.setTargetAtTime(p.enabled?p.master:0,t,.022);
 fieldkitGraph.wet.gain.setTargetAtTime(p.enabled?p.auxReturn*.35:0,t,.022);
 for(let i=0;i<4;i++){
  const bus=fieldkitGraph.channels[i],ch=p.channels[i],filter=fieldkitTone(ch.tone);
  bus.pre.gain.setTargetAtTime(ch.gain,t,.022);
  bus.level.gain.setTargetAtTime(ch.level*.65,t,.022);
  bus.send.gain.setTargetAtTime(ch.aux*.3,t,.022);
  bus.filter.type=filter.type;
  bus.filter.frequency.setTargetAtTime(Math.min(ctx.sampleRate*.43,filter.hz),t,.03);
  bus.filter.Q.value=.72;
 }
}
function fieldkitNoise(){
 if(fieldkitNoiseCtx===ctx&&fieldkitNoiseData)return fieldkitNoiseData;
 fieldkitNoiseCtx=ctx;
 const length=Math.max(128,Math.floor(ctx.sampleRate*.5));
 const buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
 fieldkitNoiseData=buffer;return buffer;
}
function fieldkitStopVoices(when){
 if(!ctx)return;
 const time=Number.isFinite(when)?Math.max(ctx.currentTime,when):ctx.currentTime;
 while(fieldkitVoices.length){
  const voice=fieldkitVoices.shift();
  for(const gain of voice.gains){
   try{gain.gain.cancelScheduledValues(time);gain.gain.setTargetAtTime(.0001,time,.007);}catch(e){}
  }
  voice.sources.forEach(source=>{try{source.stop(time+.045);}catch(e){}});
 }
}

function fieldkitSource(type,note,t,duration,idx){
 if(type==='mic')return null;
 const sources=[],nodes=[];
 if(type==='sample'){
  if(!fieldkitSample)return null;
  const sample=ctx.createBufferSource();
  sample.buffer=fieldkitSample;
  // Sampler is not pitched: one-shot playback respects the original recording.
  sources.push(sample);
  return {output:sample,sources,nodes,duration:Math.min(duration,fieldkitSample.duration)};
 }
 const base=typeof hz==='function'?hz(note||'C3'):130.81;
 if(type==='noise'||type==='radio'){
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
  source.buffer=fieldkitNoise();source.loop=true;
  filter.type=type==='radio'?'bandpass':'lowpass';filter.Q.value=type==='radio'?3.8:.72;
  const p=fieldkitState,cv=(p.sensor-.5)*.21;
  const modulation=type==='radio'?Math.sin((t+idx)*(.5+p.lfoRate*11))*p.lfoDepth*.14+fieldkitEnvelope*p.follower*.25:0;
  const tune=fieldkitClamp(p.radioTune+cv+modulation,0,1,p.radioTune);
  filter.frequency.setValueAtTime(Math.min(ctx.sampleRate*.42,
   type==='radio'?120+tune*tune*8500:3900),t);
  source.connect(filter);sources.push(source);nodes.push(filter);
  return {output:filter,sources,nodes,duration};
 }
 const o=ctx.createOscillator(),filter=ctx.createBiquadFilter();
 o.type=type==='motor'?'sawtooth':'triangle';filter.type='lowpass';
 filter.frequency.value=type==='motor'?1700:6500;
 const f=Math.max(25,base*(type==='motor'?.23+.4*fieldkitState.sensor:.6+.6*fieldkitState.sensor));
 o.frequency.setValueAtTime(f,t);
 if(type==='motor')o.frequency.exponentialRampToValueAtTime(Math.max(22,f*.55),t+Math.max(.04,duration*.75));
 o.connect(filter);sources.push(o);nodes.push(filter);
 return {output:filter,sources,nodes,duration};
}
function fieldkitTrigger(note,time,velocity=.78){
 if(!ctx||ctx.state!=='running'||!chanGain.fieldkit||!fieldkitState.enabled)return false;
 if(!fieldkitEnsureGraph())return false;
 const t=Math.max(ctx.currentTime+.002,time),duration=.12+fieldkitState.decay*1.25;
 const ampPeak=fieldkitClamp(velocity,.1,1,.78)*.41;
 // Four independent channel paths, one bounded event; no cross-routing.
 fieldkitStopVoices(t);
 const sources=[],nodes=[],gains=[];
 for(let i=0;i<4;i++){
  const source=fieldkitSource(fieldkitState.channels[i].source,note,t,duration,i);
  if(!source)continue;
  const amp=ctx.createGain();
  amp.gain.setValueAtTime(.0001,t);
  amp.gain.linearRampToValueAtTime(ampPeak*.5,t+.006);
  amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
  source.output.connect(amp);amp.connect(fieldkitGraph.channels[i].input);
  sources.push(...source.sources);nodes.push(...source.nodes,amp);gains.push(amp);
 }
 if(!sources.length){
  // Large compressed files remain as an OS-decoded media stream. This playback
  // is not sample-accurate; a single trigger starts the file once, without
  // repeated seek/play requests at each step or allocating a huge AudioBuffer.
  if(fieldkitStreamAudio && fieldkitState.channels.some(ch=>ch.source==='sample')){
   if(fieldkitStreamAudio.paused)fieldkitPlayStream().catch(error=>fieldkitStatus('STREAM : '+error.message));
   return true;
  }
  return false;
 }
 const voice={sources,nodes,gains};
 fieldkitVoices.push(voice);
 let ended=0;
 for(const source of sources){
  source.onended=function(){
   ended++;
   if(ended!==sources.length)return;
   const idx=fieldkitVoices.indexOf(voice);if(idx>=0)fieldkitVoices.splice(idx,1);
   for(const node of sources.concat(nodes))try{node.disconnect();}catch(e){}
  };
  const end=source.buffer&&!source.loop?Math.min(duration+.02,source.buffer.duration):duration+.055;
  source.start(t);
  source.stop(t+Math.max(.045,end));
 }
 return true;
}

function fieldkitStopMic(){
 if(fieldkitFollowTimer){clearInterval(fieldkitFollowTimer);fieldkitFollowTimer=null;}
 if(fieldkitAnalyser)try{fieldkitAnalyser.disconnect();}catch(e){}
 fieldkitAnalyser=null;fieldkitEnvelope=0;
 if(fieldkitMicSource)try{fieldkitMicSource.disconnect();}catch(e){}
 fieldkitMicSource=null;
 if(fieldkitMicStream){
  fieldkitMicStream.getTracks().forEach(track=>track.stop());
  fieldkitMicStream=null;
 }
}
function fieldkitReconnectMic(){
 if(!fieldkitMicSource||!fieldkitGraph)return;
 try{fieldkitMicSource.disconnect();}catch(e){}
 if(fieldkitAnalyser)fieldkitMicSource.connect(fieldkitAnalyser);
 if(!fieldkitState.enabled)return;
 for(let i=0;i<4;i++)if(fieldkitState.channels[i].source==='mic')
  fieldkitMicSource.connect(fieldkitGraph.channels[i].input);
}
async function fieldkitMonitorMic(){
 if(fieldkitMicStream){fieldkitStopMic();fieldkitSyncRack();fieldkitStatus('MONITOR MICRO ARRÊTÉ');return false;}
 if(fieldkitBusy)return false;
 fieldkitBusy=true;
 try{
  if(!await activateStudioAudio())throw Error('Active le son.');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Micro indisponible sur ce navigateur.');
  if(!fieldkitEnsureGraph())throw Error('MIX FIELD KIT indisponible.');
  if(!fieldkitState.channels.some(x=>x.source==='mic'))
   throw Error('Sélectionne MICRO DIRECT sur une des 4 voies avant le monitoring.');
  fieldkitStatus('Autorise le microphone dans les réglages du navigateur…');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
  let source=null;
  try{source=ctx.createMediaStreamSource(stream);}catch(e){
   stream.getTracks().forEach(t=>t.stop());throw e;
  }
  fieldkitMicStream=stream;fieldkitMicSource=source;
  fieldkitReconnectMic();
  // Envelope follower: true audio envelope, polled at 10 Hz for mobile efficiency.
  fieldkitAnalyser=ctx.createAnalyser();fieldkitAnalyser.fftSize=512;
  source.connect(fieldkitAnalyser);
  const samples=new Float32Array(fieldkitAnalyser.fftSize);
  fieldkitFollowTimer=setInterval(function(){
   if(!fieldkitMicStream||!fieldkitAnalyser)return;
   fieldkitAnalyser.getFloatTimeDomainData(samples);
   let power=0;for(let i=0;i<samples.length;i++)power+=samples[i]*samples[i];
   const value=Math.min(1,Math.sqrt(power/samples.length)*fieldkitState.follower*7);
   fieldkitEnvelope=fieldkitEnvelope*.65+value*.35;
   const text=document.getElementById('fieldkit-envelope');
   if(text)text.textContent=(fieldkitEnvelope>fieldkitState.gate?'● GATE':'○')+
    ' ENV '+Math.round(fieldkitEnvelope*100)+'%';
  },100);
  fieldkitStatus('MICRO LIVE + ENVELOPE FOLLOWER ACTIVÉS · utilise un casque');
  fieldkitSyncRack();return true;
 }catch(e){
  fieldkitStopMic();fieldkitStatus('MICRO : '+(e.message||'permission refusée'));return false;
 }finally{fieldkitBusy=false;}
}
function fieldkitUseSample(buffer,name){
 if(!ctx||!buffer||!buffer.duration||buffer.duration<.045)throw Error('Enregistrement vide.');
 const seconds=Math.min(12,buffer.duration);
 const frames=Math.min(buffer.length,Math.floor(seconds*buffer.sampleRate));
 if(frames<128)throw Error('Enregistrement trop court.');
 const sample=ctx.createBuffer(1,frames,buffer.sampleRate),out=sample.getChannelData(0);
 const n=Math.max(1,Math.min(2,buffer.numberOfChannels));
 for(let ch=0;ch<n;ch++){
  const source=buffer.getChannelData(ch);
  for(let i=0;i<frames;i++)out[i]+=source[i]/n;
 }
 if(typeof fieldkitFreeStream==='function')fieldkitFreeStream();
 fieldkitSample=sample;fieldkitSampleName=String(name||'SAMPLE').slice(0,60);
 fieldkitStatus('SAMPLE CHARGÉ : '+fieldkitSampleName+' · '+seconds.toFixed(1)+' s · choisir SAMPLE sur une voie.');
 fieldkitSyncRack();fieldkitSaveSoon();
 return true;
}
async function fieldkitLoadFile(file){
 if(!file)return false;
 if(fieldkitBusy){fieldkitStatus('Import/REC en cours.');return false;}
 fieldkitBusy=true;
 try{
  if(file.size>FIELDKIT_IMPORT_MAX)throw Error('Import limité à 100 Mo.');
  if(!await activateStudioAudio())throw Error('Audio indisponible.');
  return await fieldkitImportLargeFile(file);
 }catch(e){fieldkitStatus('IMPORT : '+(e.message||'format non pris en charge'));return false;}
 finally{fieldkitBusy=false;}
}
async function fieldkitRecordMic(){
 if(fieldkitBusy){fieldkitStatus('Enregistrement déjà en cours.');return false;}
 if(fieldkitMicStream){fieldkitStatus('Arrête MONITOR avant REC 3 S.');return false;}
 fieldkitBusy=true;let stream=null;
 try{
  if(!await activateStudioAudio())throw Error('Active le son.');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Micro non disponible.');
  stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  if(typeof psyCaptureMicroPCM!=='function')throw Error('Moteur d’enregistrement non disponible.');
  fieldkitStatus('● CAPTURE 3 S · conserve cette page ouverte.');
  const sample=await psyCaptureMicroPCM(stream,3000);
  return fieldkitUseSample(sample,'MICRO 3 S');
 }catch(e){fieldkitStatus('REC : '+(e.message||'erreur de capture'));return false;}
 finally{if(stream)stream.getTracks().forEach(t=>t.stop());fieldkitBusy=false;}
}
function fieldkitControl(key,label,group,idx){
 const value=group==='ch'?fieldkitState.channels[idx][key]:fieldkitState[key];
 return '<label class="fieldkit-param"><span>'+label+'</span>'+
  '<input type="range" min="0" max="1" step=".01" data-field-key="'+key+
  '"'+(group==='ch'?' data-field-channel="'+idx+'"':'')+
  ' value="'+value+'" aria-label="FIELD KIT '+label+'">'+
  '<output>'+Math.round(value*100)+'%</output></label>';
}
function fieldkitBuildRack(){
 const root=document.getElementById('panel-gear');if(!root)return;
 const article=document.createElement('section');
 article.id='fieldkit-rack';article.className='fxcard fieldkit-rack';
 article.innerHTML=
  '<header class="fieldkit-head"><div><span class="fieldkit-eyebrow">STUDIO NIKO · ELECTROACOUSTIC LAB · 08</span>'+
  '<h2>FIELD <b>KIT</b></h2><p>Inspiré du KOMA Field Kit : quatre voies, radio virtuelle, sampler et modulation. Fonctionne sans matériel externe.</p>'+
  '</div><button type="button" class="mb" id="fieldkit-enable">FIELD KIT ON</button></header>'+
  '<div class="fieldkit-toolbar"><label>PATCH <select id="fieldkit-preset">'+
  Object.keys(FIELDKIT_PRESETS).map(k=>'<option value="'+k+'">'+FIELDKIT_PRESETS[k].label+'</option>').join('')+
  '<option value="custom">PATCH PERSONNEL</option></select></label>'+
  '<label>NOTE TEST <select id="fieldkit-test-note">'+['C2','F2','C3','F3','Ab3','C4','F4'].map(x=>'<option value="'+x+'"'+(x==='F3'?' selected':'')+'>'+x+'</option>').join('')+
  '</select></label><button type="button" class="fieldkit-play" id="fieldkit-test">▶ ÉCOUTER FIELD KIT</button></div>'+
  '<div class="fieldkit-channels">'+fieldkitState.channels.map((ch,i)=>
   '<article class="fieldkit-channel"><div class="fieldkit-channel-head"><strong>CH '+(i+1)+'</strong>'+
   '<span>IN / AUX / EQ</span></div>'+
   '<label class="fieldkit-source">SOURCE <select data-field-source="'+i+'" aria-label="Field Kit voie '+(i+1)+' source">'+
   FIELDKIT_SOURCES.map(k=>'<option value="'+k+'">'+fieldkitNames[k]+'</option>').join('')+
   '</select></label>'+
   fieldkitControl('gain','PREAMP', 'ch',i)+
   fieldkitControl('level','LEVEL','ch',i)+
   fieldkitControl('tone','TONE LP/HP','ch',i)+
   fieldkitControl('aux','AUX SEND','ch',i)+
   '</article>').join('')+'</div>'+
  '<details class="fieldkit-module" open><summary>MODULATIONS · VIRTUAL CV / LFO</summary>'+
  '<div class="fieldkit-mod-grid">'+
  fieldkitControl('radioTune','RADIO TUNE')+
  fieldkitControl('lfoRate','LFO RATE')+
  fieldkitControl('lfoDepth','LFO → RADIO')+
  fieldkitControl('sensor','CAPTEUR VIRTUEL')+
  fieldkitControl('follower','ENV FOLLOW AMOUNT')+
  fieldkitControl('gate','GATE THRESHOLD')+
  fieldkitControl('decay','TRIGGER DECAY')+
  fieldkitControl('auxReturn','AUX RETURN')+
  fieldkitControl('master','MASTER LEVEL')+
  '</div><output id="fieldkit-envelope" class="fieldkit-envelope" aria-live="off">○ ENV FOLLOWER INACTIF</output><p class="fieldkit-note">RADIO et MOTEUR sont simulés ; aucun contrôle direct d’un appareil externe. Le suiveur d’enveloppe utilise le niveau du microphone quand LIVE est actif.</p></details>'+
  '<div class="fieldkit-sampler"><h3>REC / SAMPLE · FIELD RECORDING</h3>'+
  '<p>IMPORT AUDIO jusqu’à 100 Mo : WAV échantillonné sur 12 s et lecture longue en streaming ; gros MP3/M4A lus en flux local pour préserver la mémoire. Aucun envoi sur Internet.</p>'+
  '<div class="fieldkit-actions"><label class="fieldkit-import" for="fieldkit-file">IMPORT AUDIO'+
  '<input id="fieldkit-file" type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"></label>'+
  '<button id="fieldkit-record" type="button">● REC MICRO 3 S</button>'+
  '<button id="fieldkit-monitor" type="button">MICRO LIVE · OFF</button>'+
  '<button id="fieldkit-stream-play" type="button" disabled>▶ LIRE FICHIER LONG</button>'+
  '<button id="fieldkit-clear-sample" type="button">EFFACER SAMPLE</button></div>'+
  '<p id="fieldkit-sample" class="fieldkit-sample-info">Aucun sample chargé</p>'+
  '<p id="fieldkit-import-status" class="fieldkit-import-status" role="status" aria-live="polite">100 Mo max · WAV extrait 12 s · gros MP3 en streaming · lecture locale</p></div>'+
  '<p id="fieldkit-status" class="fieldkit-status" role="status" aria-live="polite">Prêt · active le son et touche ÉCOUTER. Programme FIELD KIT dans SEQ.</p>'+
  '<p class="fieldkit-note">Instrument Web Audio indépendant. Les entrées physiques, la réception radio et les sorties CV/moteur du Field Kit original ne sont pas reproduites.</p>';
 root.appendChild(article);
 document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden'&&fieldkitMicStream){fieldkitStopMic();fieldkitSyncRack();}
 });
 article.querySelectorAll('[data-field-key]').forEach(input=>{
  input.addEventListener('pointerdown',()=>{if(typeof pushUndo==='function')pushUndo();});
  input.addEventListener('input',function(){
   const key=this.dataset.fieldKey,idx=this.dataset.fieldChannel;
   const target=idx==null?fieldkitState:fieldkitState.channels[Number(idx)];
   target[key]=fieldkitClamp(Number(this.value),0,1,target[key]);
   fieldkitPreset='custom';fieldkitApplyMix();fieldkitSyncRack();fieldkitSaveSoon();
  });
 });
 article.querySelectorAll('[data-field-source]').forEach(select=>{
  select.addEventListener('change',function(){
   if(typeof pushUndo==='function')pushUndo();
   const idx=Number(this.dataset.fieldSource);
   if(FIELDKIT_SOURCES.includes(this.value))fieldkitState.channels[idx].source=this.value;
   fieldkitPreset='custom';fieldkitReconnectMic();fieldkitConnectStream();fieldkitSyncRack();fieldkitSaveSoon();
  });
 });
 document.getElementById('fieldkit-enable').addEventListener('click',()=>{
  if(typeof pushUndo==='function')pushUndo();
  fieldkitState.enabled=!fieldkitState.enabled;
  if(!fieldkitState.enabled){fieldkitStopVoices();fieldkitStopMic();fieldkitStopStream();}
  fieldkitApplyMix();fieldkitConnectStream();fieldkitSyncRack();saveLiveState();
 });
 document.getElementById('fieldkit-preset').addEventListener('change',function(){
  if(this.value==='custom')return;
  if(typeof pushUndo==='function')pushUndo();
  fieldkitApplyPreset(this.value);fieldkitStatus('Patch '+FIELDKIT_PRESETS[this.value].label+' prêt.');
 });
 document.getElementById('fieldkit-test').addEventListener('click',async()=>{
  if(!await activateStudioAudio()){fieldkitStatus('Audio indisponible : ACTIVER LE SON.');return;}
  const ok=fieldkitTrigger(document.getElementById('fieldkit-test-note').value,ctx.currentTime+.03,.84);
  fieldkitStatus(ok?'FIELD KIT · SON PROGRAMMÉ · MIX/ FIELDKIT':'Aucune source jouable : assigne OSC, RADIO, NOISE, MOTEUR ou un SAMPLE chargé.');
 });
 document.getElementById('fieldkit-file').addEventListener('change',async function(){
  const file=this.files&&this.files[0];await fieldkitLoadFile(file);this.value='';
 });
 document.getElementById('fieldkit-record').addEventListener('click',async function(){
  this.disabled=true;this.textContent='● ENREGISTREMENT…';
  try{await fieldkitRecordMic();}finally{this.disabled=false;this.textContent='● REC MICRO 3 S';}
 });
 document.getElementById('fieldkit-monitor').addEventListener('click',fieldkitMonitorMic);
 document.getElementById('fieldkit-stream-play').addEventListener('click',async function(){
  if(!await activateStudioAudio()){fieldkitImportStatus('Active le son avant LIRE FICHIER.');return;}
  if(!fieldkitStreamAudio)return;
  if(fieldkitStreamAudio.paused)await fieldkitPlayStream();
  else fieldkitStopStream();
  fieldkitSyncRack();
 });
 document.getElementById('fieldkit-clear-sample').addEventListener('click',()=>{
  fieldkitSample=null;fieldkitSampleName='';
  fieldkitFreeStream();fieldkitImportMode='none';
  fieldkitSyncRack();fieldkitStatus('Sample et fichier long libérés de la mémoire.');fieldkitSaveSoon();
 });
 fieldkitSyncRack();
}
function fieldkitSyncRack(){
 if(typeof document==='undefined')return;
 document.querySelectorAll('[data-field-key]').forEach(input=>{
  const idx=input.dataset.fieldChannel,key=input.dataset.fieldKey;
  const value=idx==null?fieldkitState[key]:fieldkitState.channels[Number(idx)][key];
  input.value=value;
  if(input.nextElementSibling)input.nextElementSibling.textContent=Math.round(value*100)+'%';
 });
 document.querySelectorAll('[data-field-source]').forEach(el=>el.value=fieldkitState.channels[Number(el.dataset.fieldSource)].source);
 const preset=document.getElementById('fieldkit-preset');if(preset)preset.value=fieldkitPreset;
 const enabled=document.getElementById('fieldkit-enable');
 if(enabled){enabled.textContent=fieldkitState.enabled?'FIELD KIT · ON':'FIELD KIT · OFF';enabled.classList.toggle('on',fieldkitState.enabled);}
 const monitor=document.getElementById('fieldkit-monitor');
 if(monitor)monitor.textContent=fieldkitMicStream?'MICRO LIVE · ON':'MICRO LIVE · OFF';
 const meter=document.getElementById('fieldkit-envelope');
 if(meter&&!fieldkitMicStream)meter.textContent='○ ENV FOLLOWER INACTIF';
 const name=document.getElementById('fieldkit-sample');
 if(name)name.textContent=fieldkitSample?
  'SAMPLE : '+fieldkitSampleName+' · extrait '+fieldkitSample.duration.toFixed(1)+' s'+(fieldkitStreamAudio?' + fichier complet en flux':''):
  fieldkitStreamAudio?'FICHIER LONG : '+fieldkitStreamName+' · lecture en flux / mémoire protégée':'Aucun sample chargé';
 const play=document.getElementById('fieldkit-stream-play');
 if(play){
  play.disabled=!fieldkitStreamAudio;
  play.textContent=fieldkitStreamAudio&&!fieldkitStreamAudio.paused?'■ STOP FICHIER LONG':'▶ LIRE FICHIER LONG';
 }
}
