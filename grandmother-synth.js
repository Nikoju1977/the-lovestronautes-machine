/* LOVESTRONAUTES V19 · GRANDMOTHER-INSPIRED SEMI-MODULAR MONOSYNTH
 * Independent synthesis, not an official Moog model or circuit-accurate emulation.
 * 2 VCO, noise, 4-pole ladder-like cascade, HPF, ADSR, LFO, glide and a
 * lightweight resonant multi-tap delay approximating a spring reverb.
 * One synth voice at a time: low CPU usage on iOS Safari and Android Chrome.
 */
'use strict';
const GRANDMOTHER_WAVES=['triangle','sawtooth','square','pulse'];
const GRANDMOTHER_MOD_TARGETS=['off','pitch','filter','both'];
const GRANDMOTHER_DEFAULT={
 enabled:true,osc1:'sawtooth',osc2:'pulse',osc1Level:.75,osc2Level:.52,noise:.08,
 osc1Octave:0,osc2Octave:-1,osc2Detune:.12,pulseWidth:.42,sync:false,
 cutoff:.47,resonance:.35,highpass:.10,filterEnv:.53,
 attack:.04,decay:.29,sustain:.48,release:.32,
 lfoRate:.23,lfoDepth:.12,lfoTarget:'filter',glide:.06,
 spring:.24,drive:.22,output:.76
};
const GRANDMOTHER_PRESETS={
 bass:{label:'DEEP LADDER BASS',patch:{...GRANDMOTHER_DEFAULT,osc1:'sawtooth',osc2:'square',
  osc2Octave:-1,cutoff:.32,resonance:.41,filterEnv:.62,attack:.01,decay:.25,sustain:.36,release:.14,spring:.10,drive:.37}},
 acid:{label:'ACID MODULAR LEAD',patch:{...GRANDMOTHER_DEFAULT,osc1:'pulse',osc2:'sawtooth',
  osc2Octave:0,osc2Detune:.44,cutoff:.49,resonance:.73,filterEnv:.82,attack:.005,decay:.15,sustain:.26,release:.11,lfoRate:.52,lfoDepth:.17}},
 drone:{label:'DARK VINTAGE DRONE',patch:{...GRANDMOTHER_DEFAULT,osc1:'triangle',osc2:'sawtooth',
  osc1Octave:-1,osc2Octave:-1,cutoff:.23,resonance:.34,filterEnv:.22,attack:.55,decay:.65,sustain:.90,release:.82,lfoDepth:.25,spring:.55}},
 organ:{label:'COSMIC ANALOG KEYS',patch:{...GRANDMOTHER_DEFAULT,osc1:'triangle',osc2:'pulse',
  osc1Octave:0,osc2Octave:1,osc2Detune:.08,cutoff:.59,resonance:.23,filterEnv:.31,attack:.10,decay:.26,sustain:.72,release:.47,spring:.42}},
 rave:{label:'RAVE PULSE 140',patch:{...GRANDMOTHER_DEFAULT,osc1:'pulse',osc2:'square',
  osc1Octave:0,osc2Octave:0,pulseWidth:.26,osc2Detune:.28,cutoff:.55,resonance:.54,filterEnv:.70,attack:.007,decay:.18,sustain:.63,release:.13,lfoRate:.64,lfoDepth:.19,drive:.52}}
};
let grandmotherState=grandmotherSanitize(GRANDMOTHER_PRESETS.bass.patch);
let grandmotherPreset='bass',grandmotherGraph=null,grandmotherGraphCtx=null;
let grandmotherVoice=null,grandmotherNoiseContext=null,grandmotherNoiseBuffer=null;
let grandmotherLastFrequency=0,grandmotherSaveTimer=null,grandmotherArpTimer=null;
let grandmotherArpIndex=0,grandmotherArpActive=false;
const GRANDMOTHER_ARP_NOTES=['C3','Eb3','G3','Bb3','C4','Bb3','G3','Eb3'];
function grandmotherClamp(v,a,b,fallback){
 return typeof v==='number'&&Number.isFinite(v)?Math.min(b,Math.max(a,v)):fallback;
}
function grandmotherSanitize(raw){
 const src=raw&&typeof raw==='object'?raw:{},out={};
 for(const [key,value] of Object.entries(GRANDMOTHER_DEFAULT)){
  const candidate=src[key];
  if(typeof value==='boolean')out[key]=typeof candidate==='boolean'?candidate:value;
  else if(typeof value==='string'){
   const allowed=key==='lfoTarget'?GRANDMOTHER_MOD_TARGETS:GRANDMOTHER_WAVES;
   out[key]=allowed.includes(candidate)?candidate:value;
  }else if(key.endsWith('Octave'))out[key]=Number.isInteger(candidate)?
   grandmotherClamp(candidate,-2,2,value):value;
  else out[key]=grandmotherClamp(candidate,0,1,value);
 }
 return out;
}
function grandmotherProjectState(){
 return {preset:grandmotherPreset,patch:JSON.parse(JSON.stringify(grandmotherState))};
}
function grandmotherRestoreState(project){
 const src=project&&project.grandmother&&typeof project.grandmother==='object'?project.grandmother:{};
 grandmotherStopArp();
 grandmotherReleaseAll();
 grandmotherState=grandmotherSanitize(src.patch);
 grandmotherPreset=Object.prototype.hasOwnProperty.call(GRANDMOTHER_PRESETS,src.preset)?src.preset:'custom';
 grandmotherApplyGraph();
 grandmotherSyncRack();
}
function grandmotherEnsurePatterns(bank){
 for(const letter of ['A','B','C','D']){
  if(bank[letter]&&(!Array.isArray(bank[letter].grandmother)||bank[letter].grandmother.length!==16))
   bank[letter].grandmother=Array(16).fill(null);
 }
}
function grandmotherQueueSave(){
 clearTimeout(grandmotherSaveTimer);
 grandmotherSaveTimer=setTimeout(()=>{
  grandmotherSaveTimer=null;
  if(typeof saveLiveState==='function')saveLiveState();
 },300);
}
function grandmotherStatus(message){
 const el=typeof document!=='undefined'?document.getElementById('grandmother-status'):null;
 if(el)el.textContent=message;
}
function grandmotherApplyPreset(name){
 if(!Object.prototype.hasOwnProperty.call(GRANDMOTHER_PRESETS,name))return false;
 grandmotherState=grandmotherSanitize(GRANDMOTHER_PRESETS[name].patch);
 grandmotherPreset=name;grandmotherApplyGraph();grandmotherSyncRack();grandmotherQueueSave();
 return true;
}
function grandmotherFrequency(note){
 if(typeof hz==='function')return hz(note);
 return 110;
}
function grandmotherNoise(){
 if(grandmotherNoiseContext===ctx&&grandmotherNoiseBuffer)return grandmotherNoiseBuffer;
 const frames=Math.max(256,Math.round(ctx.sampleRate*.15));
 const buffer=ctx.createBuffer(1,frames,ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<frames;i++)data[i]=Math.random()*2-1;
 grandmotherNoiseContext=ctx;grandmotherNoiseBuffer=buffer;return buffer;
}
function grandmotherEnsureGraph(){
 if(!ctx||!chanGain.grandmother)return null;
 if(grandmotherGraphCtx===ctx&&grandmotherGraph)return grandmotherGraph;
 const input=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain();
 const a=ctx.createDelay(.22),b=ctx.createDelay(.22),feedback=ctx.createGain(),
       damping=ctx.createBiquadFilter(),send=ctx.createGain();
 // Short staggered echoes: a deliberately lightweight spring-like texture,
 // not a physically modelled tank or an impulse response captured from Moog.
 a.delayTime.value=.034;b.delayTime.value=.047;
 damping.type='lowpass';damping.frequency.value=3500;
 feedback.gain.value=.12;
 input.connect(dry);dry.connect(chanGain.grandmother);
 input.connect(send);send.connect(a);a.connect(b);b.connect(damping);
 damping.connect(wet);wet.connect(chanGain.grandmother);
 damping.connect(feedback);feedback.connect(a);
 grandmotherGraph={input,dry,wet,send,a,b,feedback,damping};
 grandmotherGraphCtx=ctx;grandmotherApplyGraph();
 return grandmotherGraph;
}
function grandmotherApplyGraph(){
 if(!ctx||!grandmotherGraph||grandmotherGraphCtx!==ctx)return;
 const p=grandmotherState,t=ctx.currentTime;
 grandmotherGraph.dry.gain.setTargetAtTime(p.enabled?grandmotherClamp(p.output,0,1,.7)*.72:0,t,.022);
 grandmotherGraph.wet.gain.setTargetAtTime(p.enabled?p.spring*.31:0,t,.035);
 grandmotherGraph.send.gain.setTargetAtTime(p.enabled?p.spring*.42:0,t,.035);
}
function grandmotherPulse(osc,width){
 if(!ctx.createPeriodicWave){osc.type='square';return;}
 const duty=grandmotherClamp(width,.12,.88,.5),real=new Float32Array(33),
       imag=new Float32Array(33);
 for(let n=1;n<33;n++){
  real[n]=Math.sin(2*Math.PI*n*duty)/(Math.PI*n);
  imag[n]=(1-Math.cos(2*Math.PI*n*duty))/(Math.PI*n);
 }
 osc.setPeriodicWave(ctx.createPeriodicWave(real,imag,{disableNormalization:false}));
}
function grandmotherWave(osc,name){
 if(name==='pulse')grandmotherPulse(osc,grandmotherState.pulseWidth);
 else osc.type=GRANDMOTHER_WAVES.includes(name)?name:'triangle';
}
function grandmotherReleaseVoice(v,when,fast=false){
 if(!v||(v.released&&!fast))return;
 v.released=true;
 const t=Math.max(v.startTime,Number.isFinite(when)?when:ctx.currentTime);
 const rel=fast?.025:.035+grandmotherState.release*1.4;
 try{
  const gain=v.amp.gain;
  gain.cancelScheduledValues(t);
  gain.setValueAtTime(Math.max(.0002,gain.value||.03),t);
  gain.exponentialRampToValueAtTime(.0001,t+rel);
 }catch(e){}
 for(const node of v.sources){
  try{node.stop(t+rel+.035);}catch(e){}
 }
}
function grandmotherRelease(note){
 if(!grandmotherVoice)return false;
 if(note&&grandmotherVoice.note!==note)return false;
 grandmotherReleaseVoice(grandmotherVoice,ctx?ctx.currentTime:0);
 return true;
}
function grandmotherReleaseAll(){
 if(grandmotherVoice)grandmotherReleaseVoice(grandmotherVoice,ctx?ctx.currentTime:0,true);
 grandmotherVoice=null;
}
function grandmotherStopArp(){
 grandmotherArpActive=false;
 if(grandmotherArpTimer!==null){clearTimeout(grandmotherArpTimer);grandmotherArpTimer=null;}
 grandmotherSyncRack();
}
function grandmotherStop(){
 grandmotherStopArp();grandmotherReleaseAll();
}
function grandmotherTrigger(note,time,velocity=.78,held=false){
 if(!ctx||ctx.state!=='running'||!chanGain.grandmother||!grandmotherState.enabled)return false;
 const graph=grandmotherEnsureGraph();if(!graph)return false;
 const p=grandmotherState,t=Math.max(ctx.currentTime+.005,Number.isFinite(time)?time:ctx.currentTime+.008);
 grandmotherReleaseAll();
 const base=grandmotherFrequency(note||'C3');
 if(!Number.isFinite(base)||base<20||base>8000)return false;
 const gate=typeof composeDuration==='function'?composeDuration(.13+p.decay*.35):.13+p.decay*.35,attack=.003+p.attack*.9,decay=.028+p.decay*1.05,
       rel=.035+p.release*1.4,peak=grandmotherClamp(velocity,.08,1,.78)*.51;
 const amp=ctx.createGain(),pre=ctx.createGain(),filter1=ctx.createBiquadFilter(),
       filter2=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter();
 pre.gain.value=.60+p.drive*.16;
 const freq=Math.min(ctx.sampleRate*.40,38*Math.pow(2,p.cutoff*8.55));
 const envPeak=Math.min(ctx.sampleRate*.41,freq+250+p.filterEnv*7500);
 filter1.type=filter2.type='lowpass';filter2.Q.value=1+p.resonance*10;
 filter1.Q.value=.71;hp.type='highpass';
 hp.frequency.value=28+p.highpass*p.highpass*1050;
 for(const filter of [filter1,filter2]){
  filter.frequency.setValueAtTime(Math.max(30,freq),t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(32,envPeak),t+attack);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30,freq),t+attack+decay);
 }
 pre.connect(filter1);filter1.connect(filter2);filter2.connect(hp);hp.connect(amp);
 amp.connect(graph.input);
 amp.gain.setValueAtTime(.0001,t);
 amp.gain.linearRampToValueAtTime(Math.max(.001,peak),t+attack);
 const sustainPeak=Math.max(.0002,peak*p.sustain);
 amp.gain.exponentialRampToValueAtTime(sustainPeak,t+attack+decay);
 const main=ctx.createOscillator(),osc2=ctx.createOscillator();
 grandmotherWave(main,p.osc1);grandmotherWave(osc2,p.osc2);
 const osc1Frequency=base*Math.pow(2,p.osc1Octave);
 const detune=(p.osc2Detune-.5)*.45;
 const osc2Frequency=base*Math.pow(2,p.osc2Octave+detune);
 const glideTime=p.glide*.48;
 const old=grandmotherLastFrequency;
 for(const [osc,target,baseRatio] of [[main,osc1Frequency,1],[osc2,osc2Frequency,osc2Frequency/osc1Frequency]]){
  const start=old&&glideTime>.005?old*baseRatio:target;
  osc.frequency.setValueAtTime(Math.max(16,start),t);
  if(glideTime>.005)osc.frequency.exponentialRampToValueAtTime(Math.max(16,target),t+glideTime);
  const level=ctx.createGain();
  level.gain.value=osc===main?p.osc1Level*.68:p.osc2Level*.55;
  osc.connect(level);level.connect(pre);
  osc._grandmotherMix=level;
 }
 // Native Web Audio does not expose hard VCO sync. In SYNC mode use an
 // additional harmonic relationship, explicitly labelled as an approximation.
 if(p.sync)osc2.frequency.setValueAtTime(osc1Frequency*2,t);
 grandmotherLastFrequency=osc1Frequency;
 const sources=[main,osc2],nodes=[pre,filter1,filter2,hp,amp,main._grandmotherMix,osc2._grandmotherMix];
 if(p.noise>.005){
  const noise=ctx.createBufferSource(),nGain=ctx.createGain();
  noise.buffer=grandmotherNoise();noise.loop=true;nGain.gain.value=p.noise*.32;
  noise.connect(nGain);nGain.connect(pre);sources.push(noise);nodes.push(nGain);
 }
 if(p.lfoDepth>.005&&p.lfoTarget!=='off'){
  const lfo=ctx.createOscillator(),depth=ctx.createGain();
  lfo.type='sine';lfo.frequency.value=.09+p.lfoRate*18;
  if(p.lfoTarget==='pitch'||p.lfoTarget==='both'){
   depth.gain.value=base*p.lfoDepth*.09;
   depth.connect(main.frequency);depth.connect(osc2.frequency);
  }
  if(p.lfoTarget==='filter'||p.lfoTarget==='both'){
   const filterDepth=p.lfoTarget==='both'?ctx.createGain():depth;
   filterDepth.gain.value=freq*p.lfoDepth*.35;
   if(filterDepth!==depth){lfo.connect(filterDepth);nodes.push(filterDepth);}
   filterDepth.connect(filter1.frequency);filterDepth.connect(filter2.frequency);
  }
  lfo.connect(depth);sources.push(lfo);nodes.push(depth);
 }
 const v={note:note||'C3',startTime:t,amp,sources,nodes,released:false};
 grandmotherVoice=v;
 main.onended=()=>{
  for(const node of sources.concat(nodes))try{node.disconnect();}catch(e){}
  if(grandmotherVoice===v)grandmotherVoice=null;
 };
 for(const source of sources)source.start(t);
 if(!held){
  const releaseAt=Math.max(t+gate,t+attack+decay+.025);
  amp.gain.setValueAtTime(sustainPeak,releaseAt);
  amp.gain.exponentialRampToValueAtTime(.0001,releaseAt+rel);
  for(const source of sources)source.stop(releaseAt+rel+.04);
  v.released=true;
 }
 return true;
}
function grandmotherArpTick(){
 if(!grandmotherArpActive||!ctx||ctx.state!=='running'||!grandmotherState.enabled){
  grandmotherStopArp();return;
 }
 if(typeof document!=='undefined'&&document.hidden){grandmotherStopArp();return;}
 const note=GRANDMOTHER_ARP_NOTES[grandmotherArpIndex++%GRANDMOTHER_ARP_NOTES.length];
 grandmotherTrigger(note,ctx.currentTime+.015,.78,false);
 const stepMs=Math.max(95,Math.round(30000/Math.max(45,Math.min(210,typeof bpm==='number'?bpm:128))));
 grandmotherArpTimer=setTimeout(grandmotherArpTick,stepMs);
}
async function grandmotherToggleArp(){
 if(grandmotherArpActive){grandmotherStopArp();return;}
 if(!await activateStudioAudio()){grandmotherStatus('Audio bloqué : touche ACTIVER LE SON');return;}
 grandmotherArpActive=true;grandmotherArpIndex=0;
 grandmotherArpTick();grandmotherSyncRack();
 grandmotherStatus('ARP 8 NOTES · synchronisé sur le BPM du studio');
}
function grandmotherControl(key,label){
 const v=grandmotherState[key];
 return '<label class="grandmother-control"><span>'+label+'</span>'+
  '<input type="range" min="0" max="1" step=".01" data-grandmother-key="'+key+
  '" value="'+v+'" aria-label="Grandmother '+label+'">'+
  '<output>'+Math.round(v*100)+'%</output></label>';
}
function grandmotherSelect(key,label,items){
 return '<label class="grandmother-select"><span>'+label+'</span><select data-grandmother-key="'+key+'">'+
  items.map(item=>{
   const pair=Array.isArray(item)?item:[item,item];
   return '<option value="'+pair[0]+'">'+pair[1]+'</option>';
  }).join('')+'</select></label>';
}
function grandmotherBuildRack(){
 const root=document.getElementById('panel-gear');if(!root)return;
 const section=document.createElement('section');section.id='grandmother-rack';section.className='grandmother-rack';
 section.innerHTML=
 '<header class="grandmother-header"><div><p class="grandmother-eyebrow">V19 · GRANDMOTHER / SEMI-MODULAR</p>'+
 '<h2>GRANDMOTHER <span>ANALOG LAB</span></h2>'+
 '<p>Deux VCO · filtre ladder simulé 24 dB/oct · ADSR · LFO · glide · réverbération type ressort. Monophonique, aucun serveur.</p>'+
 '</div><button type="button" id="grandmother-enable">GRANDMOTHER ON</button></header>'+
 '<div class="grandmother-toolbar">'+
 '<label>PATCH <select id="grandmother-preset">'+
 Object.entries(GRANDMOTHER_PRESETS).map(([key,p])=>'<option value="'+key+'">'+p.label+'</option>').join('')+
 '<option value="custom">PATCH PERSONNEL</option></select></label>'+
 '<label>NOTE TEST <select id="grandmother-note">'+['C2','F2','C3','Eb3','G3','C4','F4'].map(n=>'<option value="'+n+'"'+(n==='C3'?' selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
 '<button type="button" id="grandmother-test" class="grandmother-play">▶ TEST SYNTHÉ</button>'+
 '<button type="button" id="grandmother-arp">▶ ARP 8 NOTES</button></div>'+
 '<div class="grandmother-modules">'+
 '<article><h3>01 · OSCILLATEURS</h3>'+
 grandmotherSelect('osc1','VCO 1 WAVE',GRANDMOTHER_WAVES)+
 grandmotherControl('osc1Level','VCO 1 LEVEL')+
 grandmotherSelect('osc1Octave','VCO 1 OCTAVE',[[-2,'-2'],[-1,'-1'],[0,'0'],[1,'+1'],[2,'+2']])+
 grandmotherSelect('osc2','VCO 2 WAVE',GRANDMOTHER_WAVES)+
 grandmotherControl('osc2Level','VCO 2 LEVEL')+
 grandmotherSelect('osc2Octave','VCO 2 OCTAVE',[[-2,'-2'],[-1,'-1'],[0,'0'],[1,'+1'],[2,'+2']])+
 grandmotherControl('osc2Detune','VCO 2 DETUNE')+
 grandmotherControl('pulseWidth','PULSE WIDTH')+
 grandmotherControl('noise','NOISE MIX')+
 '<label class="grandmother-switch"><input type="checkbox" data-grandmother-key="sync"> SYNC HARMONIQUE (APPROX.)</label></article>'+
 '<article><h3>02 · FILTER / ADSR</h3>'+
 grandmotherControl('cutoff','LADDER CUTOFF')+
 grandmotherControl('resonance','RESONANCE')+
 grandmotherControl('highpass','HIGH PASS')+
 grandmotherControl('filterEnv','FILTER ENV AMOUNT')+
 grandmotherControl('attack','ATTACK')+
 grandmotherControl('decay','DECAY')+
 grandmotherControl('sustain','SUSTAIN')+
 grandmotherControl('release','RELEASE')+'</article>'+
 '<article><h3>03 · MODULATION / FX</h3>'+
 grandmotherSelect('lfoTarget','LFO → PATCH',GRANDMOTHER_MOD_TARGETS)+
 grandmotherControl('lfoRate','LFO RATE')+
 grandmotherControl('lfoDepth','LFO DEPTH')+
 grandmotherControl('glide','GLIDE / PORTAMENTO')+
 grandmotherControl('drive','PREAMP DRIVE')+
 grandmotherControl('spring','SPRING-STYLE REVERB')+
 grandmotherControl('output','MASTER LEVEL')+
 '<p class="grandmother-note">LADDER, SYNC et SPRING : modèles numériques approchés, sans circuits analogiques ni patch CV physique.</p></article>'+
 '</div>'+
 '<p id="grandmother-status" class="grandmother-status" role="status" aria-live="polite">ACTIVER LE SON, puis TEST SYNTHÉ. Disponible dans CLAVIER LIVE, SEQ, MIX et BOUCLES.</p>';
 root.appendChild(section);
 section.querySelector('#grandmother-enable').addEventListener('click',()=>{
  if(typeof pushUndo==='function')pushUndo();
  grandmotherState.enabled=!grandmotherState.enabled;
  if(!grandmotherState.enabled)grandmotherStop();
  grandmotherApplyGraph();grandmotherSyncRack();grandmotherQueueSave();
 });
 section.querySelector('#grandmother-preset').addEventListener('change',event=>{
  if(event.target.value==='custom')return;
  if(typeof pushUndo==='function')pushUndo();
  grandmotherApplyPreset(event.target.value);
  grandmotherStatus('PATCH : '+GRANDMOTHER_PRESETS[event.target.value].label);
 });
 section.querySelectorAll('[data-grandmother-key]').forEach(el=>{
  el.addEventListener('pointerdown',()=>{
   if(typeof pushUndo==='function')pushUndo();
  });
  el.addEventListener(el.type==='range'?'input':'change',()=>{
   const k=el.dataset.grandmotherKey,old=grandmotherState[k];
   grandmotherState[k]=typeof old==='boolean'?el.checked:
    typeof old==='string'?el.value:k.endsWith('Octave')?Number(el.value):
    grandmotherClamp(Number(el.value),0,1,old);
   grandmotherState=grandmotherSanitize(grandmotherState);
   grandmotherPreset='custom';grandmotherApplyGraph();grandmotherSyncRack();
   grandmotherQueueSave();
  });
 });
 section.querySelector('#grandmother-test').addEventListener('click',async()=>{
  if(!await activateStudioAudio()){
   grandmotherStatus('Audio bloqué : touche ACTIVER LE SON.');
   return;
  }
  const note=section.querySelector('#grandmother-note').value;
  const ok=grandmotherTrigger(note,ctx.currentTime+.025,.84,false);
  grandmotherStatus(ok?'GRANDMOTHER · SON PROGRAMMÉ · '+note:'Impossible de déclencher le synthé.');
 });
 section.querySelector('#grandmother-arp').addEventListener('click',grandmotherToggleArp);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){grandmotherStopArp();grandmotherReleaseAll();}
 });
 grandmotherSyncRack();
}
function grandmotherSyncRack(){
 if(typeof document==='undefined')return;
 document.querySelectorAll('[data-grandmother-key]').forEach(el=>{
  const value=grandmotherState[el.dataset.grandmotherKey];
  if(el.type==='checkbox')el.checked=value;
  else el.value=String(value);
  if(el.nextElementSibling&&el.nextElementSibling.tagName==='OUTPUT')
   el.nextElementSibling.textContent=Math.round(value*100)+'%';
 });
 const p=document.getElementById('grandmother-preset');if(p)p.value=grandmotherPreset;
 const enable=document.getElementById('grandmother-enable');
 if(enable){enable.textContent=grandmotherState.enabled?'GRANDMOTHER · ON':'GRANDMOTHER · OFF';
  enable.classList.toggle('on',grandmotherState.enabled);}
 const arp=document.getElementById('grandmother-arp');
 if(arp)arp.textContent=grandmotherArpActive?'■ STOP ARP':'▶ ARP 8 NOTES';
}
