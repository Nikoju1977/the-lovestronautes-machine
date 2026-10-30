/* LOVESTRONAUTES V13 — TAIGA ANALOG LAB
 * Unofficial Web Audio instrument inspired by Pittsburgh Modular Taiga.
 * 3 VCO, wavefold per oscillator, noise/mixer, multimode filter, 2 ADSR,
 * dynamics low-pass gate, LFO, sample & hold and shared echo. Not circuit-accurate.
 */
'use strict';
const TAIGA_WAVES=['sine','triangle','sawtooth','square'];
const TAIGA_MODES=['lowpass','bandpass','highpass'];
const TAIGA_DEFAULT={
 enabled:true,osc1Wave:'triangle',osc2Wave:'sawtooth',osc3Wave:'sine',
 osc1Level:.79,osc2Level:.50,osc3Level:.28,
 osc1Shape:.52,osc2Shape:.63,osc3Shape:.46,
 osc1Fold:.36,osc2Fold:.58,osc3Fold:.24,
 osc2Tune:0,osc3Tune:-12,osc2Fine:5,osc3Fine:-4,noise:.015,
 filterMode:'lowpass',cutoff:.61,resonance:.28,envDepth:.55,
 filterSource:'env1',snhAmount:.18,dynamicsMode:'lpg',response:.50,
 eg1Attack:.025,eg1Decay:.29,eg1Sustain:.39,eg1Release:.26,
 eg2Attack:.012,eg2Decay:.28,eg2Sustain:.51,eg2Release:.22,
 lfoRate:.31,lfoDepth:.10,fmSource:'lfo',
 drive:.10,echoTime:.35,echoFeedback:.20,echoMix:.12,gate:.78,level:.72
};
const TAIGA_NUMERIC={};
for(const key of Object.keys(TAIGA_DEFAULT)){
 if(typeof TAIGA_DEFAULT[key]==='number')TAIGA_NUMERIC[key]=key.endsWith('Tune')?[-24,24]:key.endsWith('Fine')?[-40,40]:[0,1];
}
const TAIGA_PRESETS={
 mountain:{label:'MOUNTAIN FOLD · PSY',patch:{...TAIGA_DEFAULT}},
 acid:{label:'ACID WEST · RESONANT BASS',patch:{...TAIGA_DEFAULT,
  osc1Wave:'sawtooth',osc2Wave:'square',osc3Wave:'sine',osc1Level:.78,
  osc2Level:.24,osc3Level:.28,osc1Fold:.48,osc2Fold:.33,cutoff:.34,
  resonance:.65,envDepth:.75,eg1Decay:.17,eg2Decay:.15,eg2Sustain:.21,
  eg2Release:.08,response:.3,echoMix:.03,gate:.51}},
 organism:{label:'ORGANIC LPG · PLUCK',patch:{...TAIGA_DEFAULT,
  osc1Wave:'triangle',osc2Wave:'sine',osc3Wave:'triangle',osc1Fold:.52,
  osc2Fold:.66,osc3Fold:.27,cutoff:.78,resonance:.14,dynamicsMode:'lpg',
  response:.67,eg2Decay:.28,eg2Sustain:.09,eg2Release:.14,
  eg1Decay:.22,echoMix:.24,echoFeedback:.31,gate:.43}},
 forest:{label:'FOREST DRONE · MODULAR',patch:{...TAIGA_DEFAULT,
  osc1Wave:'sine',osc2Wave:'triangle',osc3Wave:'sawtooth',osc2Tune:7,
  osc3Tune:-5,osc1Fold:.65,osc2Fold:.77,osc3Fold:.76,
  filterMode:'bandpass',filterSource:'snh',snhAmount:.45,cutoff:.52,
  resonance:.43,eg1Attack:.27,eg2Attack:.27,eg2Decay:.55,
  eg2Sustain:.79,eg2Release:.65,lfoRate:.19,lfoDepth:.30,
  echoTime:.55,echoMix:.27,gate:.97}}
};
const TAIGA_KEYS=['C3','D3','Eb3','F3','G3','Ab3','Bb3','C4'];
let taigaState={...TAIGA_DEFAULT},taigaPreset='mountain',taigaSaveTimer=null;
let taigaBus=null,taigaBusCtx=null,taigaDelay=null,taigaWet=null,taigaFeedback=null;
let taigaCurveCtx=null,taigaCurves=new Map();
const taigaVoices=[];

function taigaClamp(value,min,max,fallback){
 return typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
}
function taigaSanitize(saved){
 const input=saved&&typeof saved==='object'?saved:{},s={...TAIGA_DEFAULT};
 for(const k of Object.keys(TAIGA_NUMERIC)){
  const [min,max]=TAIGA_NUMERIC[k];
  s[k]=taigaClamp(input[k],min,max,s[k]);
  if(k.endsWith('Tune'))s[k]=Math.round(s[k]);
 }
 for(const k of ['osc1Wave','osc2Wave','osc3Wave'])
  if(TAIGA_WAVES.includes(input[k]))s[k]=input[k];
 if(TAIGA_MODES.includes(input.filterMode))s.filterMode=input.filterMode;
 if(['env1','snh','lfo'].includes(input.filterSource))s.filterSource=input.filterSource;
 if(['lpg','vca'].includes(input.dynamicsMode))s.dynamicsMode=input.dynamicsMode;
 if(['lfo','off'].includes(input.fmSource))s.fmSource=input.fmSource;
 if(typeof input.enabled==='boolean')s.enabled=input.enabled;
 return s;
}
function taigaProjectState(){return {preset:taigaPreset,patch:{...taigaState}};}
function taigaRestoreState(project){
 const obj=project&&project.taiga&&typeof project.taiga==='object'?project.taiga:{};
 taigaState=taigaSanitize(obj.patch);
 taigaPreset=Object.prototype.hasOwnProperty.call(TAIGA_PRESETS,obj.preset)?obj.preset:'custom';
 taigaUpdateDelay();
}
function taigaEnsurePatterns(bank,factory){
 const notes={A:[[0,'F3']],B:[[0,'F3'],[6,'Ab3'],[12,'C4']],
 C:[[0,'F3'],[3,'Ab3'],[6,'C4'],[10,'Eb4'],[12,'C4'],[14,'Ab3']],
 D:[[0,'F3'],[8,'C4']]};
 for(const letter of ['A','B','C','D']){
  if(!bank[letter])continue;
  if(!Array.isArray(bank[letter].taiga)||bank[letter].taiga.length!==16){
   bank[letter].taiga=Array(16).fill(null);
   if(factory)for(const [step,note] of notes[letter])
    bank[letter].taiga[step]={note,vel:.78};
  }
 }
}
function taigaApplyPreset(name){
 if(!Object.prototype.hasOwnProperty.call(TAIGA_PRESETS,name))return false;
 taigaState=taigaSanitize(TAIGA_PRESETS[name].patch);taigaPreset=name;
 taigaUpdateDelay();taigaSyncRack();
 if(typeof saveLiveState==='function')saveLiveState();
 return true;
}
function taigaSaveSoon(){
 if(typeof clearTimeout==='function')clearTimeout(taigaSaveTimer);
 if(typeof setTimeout==='function')
  taigaSaveTimer=setTimeout(function(){if(typeof saveLiveState==='function')saveLiveState();taigaSaveTimer=null;},240);
 else if(typeof saveLiveState==='function')saveLiveState();
}
function taigaCutoff(v){
 const max=Math.min(14000,ctx.sampleRate*.43);
 return Math.max(35,Math.min(max,37*Math.pow(max/37,taigaClamp(v,0,1,.5))));
}
function taigaFoldShape(shape,fold){
 if(!ctx)return null;
 if(taigaCurveCtx!==ctx){taigaCurveCtx=ctx;taigaCurves=new Map();}
 const a=Math.round(shape*12),b=Math.round(fold*14),key=a+'-'+b;
 if(taigaCurves.has(key))return taigaCurves.get(key);
 const curve=new Float32Array(513),skew=(a/12-.5)*1.1,depth=b/14;
 for(let i=0;i<curve.length;i++){
  const x=i/256-1;
  let y=Math.tanh((x+skew*(1-x*x))*(1+depth*3));
  for(let pass=0;pass<6;pass++){
   if(depth<=.002)break;
   y=(2/Math.PI)*Math.asin(Math.sin(y*(1+depth*(.36+pass*.12))*Math.PI/2));
  }
  curve[i]=Math.max(-1,Math.min(1,y));
 }
 if(taigaCurves.size>=72)taigaCurves.clear();
 taigaCurves.set(key,curve);return curve;
}
function taigaEnsureBus(){
 if(!ctx||!chanGain.taiga)return null;
 if(taigaBusCtx===ctx&&taigaBus)return taigaBus;
 taigaBusCtx=ctx;taigaBus=ctx.createGain();taigaBus.gain.value=.82;
 const dry=ctx.createGain();dry.gain.value=1;
 taigaDelay=ctx.createDelay(1.5);
 taigaWet=ctx.createGain();taigaFeedback=ctx.createGain();
 taigaBus.connect(dry);dry.connect(chanGain.taiga);
 taigaBus.connect(taigaDelay);taigaDelay.connect(taigaWet);
 taigaWet.connect(chanGain.taiga);
 taigaDelay.connect(taigaFeedback);taigaFeedback.connect(taigaDelay);
 taigaUpdateDelay();
 return taigaBus;
}
function taigaUpdateDelay(){
 if(!ctx||!taigaDelay||taigaBusCtx!==ctx)return;
 const t=ctx.currentTime,p=taigaState;
 taigaDelay.delayTime.setTargetAtTime(.075+p.echoTime*.65,t,.025);
 taigaWet.gain.setTargetAtTime(p.echoMix*.46,t,.025);
 taigaFeedback.gain.setTargetAtTime(Math.min(.38,p.echoFeedback*.38),t,.025);
}
function taigaStopVoices(at){
 if(!ctx)return;
 const now=Number.isFinite(at)?Math.max(ctx.currentTime,at):ctx.currentTime;
 while(taigaVoices.length){
  const voice=taigaVoices.shift();
  try{
   voice.amp.gain.cancelScheduledValues(now);
   voice.amp.gain.setTargetAtTime(.0001,now,.009);
   voice.sources.forEach(n=>{try{n.stop(now+.07);}catch(e){}});
  }catch(e){}
 }
}
function taigaTrigger(note,time,velocity=.82,live=false){
 if(!ctx||ctx.state!=='running'||!chanGain.taiga||!taigaState.enabled)return false;
 if(!taigaEnsureBus())return false;
 const p=taigaState,t=Math.max(ctx.currentTime+.001,time);
 const freq=typeof hz==='function'?hz(note||'F3'):174.6;
 const step=60/(Math.max(40,bpm)*4);
 const ownGate=live?4:Math.max(.06,step*(.55+p.gate*1.45));
 const gate=typeof composeDuration==='function'?composeDuration(ownGate):ownGate;
 const a1=Math.min(gate*.3,.002+p.eg1Attack*p.eg1Attack*1.35);
 const a2=Math.min(gate*.3,.002+p.eg2Attack*p.eg2Attack*1.35);
 const d1=Math.min(gate*.55,.012+p.eg1Decay*p.eg1Decay*.85);
 const d2=Math.min(gate*.55,.012+p.eg2Decay*p.eg2Decay*.85);
 const release=.03+p.eg2Release*p.eg2Release*1.1,end=t+gate+release+.05;
 const nodes=[],sources=[];
 taigaStopVoices(t);
 const amp=ctx.createGain();nodes.push(amp);
 const peak=.45*taigaClamp(velocity,.1,1,.82)*(.18+p.level*.8);
 const sus=Math.max(.0001,peak*p.eg2Sustain);
 amp.gain.setValueAtTime(.0001,t);
 amp.gain.linearRampToValueAtTime(Math.max(.0001,peak),t+a2);
 amp.gain.linearRampToValueAtTime(sus,t+a2+d2);
 amp.gain.setValueAtTime(sus,t+gate);
 amp.gain.exponentialRampToValueAtTime(.0001,t+gate+release);
 amp.connect(taigaBus);
 const f=ctx.createBiquadFilter();nodes.push(f);
 f.type=p.filterMode;f.Q.value=.65+p.resonance*10;
 const base=taigaCutoff(taigaClamp(p.cutoff+(p.filterSource==='snh'?
   (Math.random()*2-1)*p.snhAmount*.3:0),0,1,p.cutoff));
 f.frequency.setValueAtTime(base,t);
 if(p.filterSource==='env1'){
  const high=Math.min(ctx.sampleRate*.44,base*(1+p.envDepth*8));
  f.frequency.exponentialRampToValueAtTime(Math.max(base+1,high),t+a1+.008);
  f.frequency.exponentialRampToValueAtTime(Math.max(40,base*(.3+p.eg1Sustain*.7)),t+gate*.8);
 }
 const dynamics=ctx.createBiquadFilter();nodes.push(dynamics);
 dynamics.type='lowpass';dynamics.Q.value=.7;
 dynamics.frequency.setValueAtTime(p.dynamicsMode==='lpg'?Math.max(550,base):ctx.sampleRate*.44,t);
 if(p.dynamicsMode==='lpg'){
  const open=Math.min(ctx.sampleRate*.44,2200+p.response*11200);
  dynamics.frequency.linearRampToValueAtTime(open,t+a2+.007);
  dynamics.frequency.exponentialRampToValueAtTime(Math.max(280,open*(.08+p.eg2Sustain*.32)),t+gate+release);
 }
 f.connect(dynamics);dynamics.connect(amp);
 const mixer=ctx.createGain();nodes.push(mixer);mixer.gain.value=.22;
 const pre=ctx.createWaveShaper();nodes.push(pre);
 pre.curve=taigaFoldShape(.5,p.drive*.38);pre.oversample='none';
 mixer.connect(pre);pre.connect(f);
 const freqSet=[freq,freq*Math.pow(2,p.osc2Tune/12)*Math.pow(2,p.osc2Fine/1200),
  freq*Math.pow(2,p.osc3Tune/12)*Math.pow(2,p.osc3Fine/1200)];
 const oscillators=[];
 for(let i=0;i<3;i++){
  const o=ctx.createOscillator(),fold=ctx.createWaveShaper(),vol=ctx.createGain();
  nodes.push(fold,vol);
  o.type=p['osc'+(i+1)+'Wave'];
  o.frequency.setValueAtTime(Math.min(ctx.sampleRate*.37,Math.max(18,freqSet[i])),t);
  fold.curve=taigaFoldShape(p['osc'+(i+1)+'Shape'],p['osc'+(i+1)+'Fold']);
  fold.oversample='none';vol.gain.value=p['osc'+(i+1)+'Level'];
  o.connect(fold);fold.connect(vol);vol.connect(mixer);sources.push(o);oscillators.push(o);
 }
 if(p.noise>.005&&typeof getDrumNoise==='function'){
  const n=ctx.createBufferSource(),vol=ctx.createGain();
  nodes.push(vol);n.buffer=getDrumNoise();n.loop=true;
  vol.gain.value=p.noise*.13;n.connect(vol);vol.connect(mixer);sources.push(n);
 }
 if(p.lfoDepth>.005&&(p.filterSource==='lfo'||p.fmSource==='lfo')){
  const lfo=ctx.createOscillator(),depth=ctx.createGain();
  sources.push(lfo);nodes.push(depth);
  lfo.type='triangle';lfo.frequency.setValueAtTime(.12+p.lfoRate*9,t);
  lfo.connect(depth);
  if(p.filterSource==='lfo'){
   depth.gain.value=base*p.lfoDepth*.42;depth.connect(f.frequency);
  }else{
   depth.gain.value=freq*p.lfoDepth*.016;
   for(const o of oscillators)depth.connect(o.frequency);
  }
 }
 const voice={amp,sources,nodes,end};taigaVoices.push(voice);
 oscillators[0].onended=function(){
  const idx=taigaVoices.indexOf(voice);if(idx>=0)taigaVoices.splice(idx,1);
  for(const n of sources.concat(nodes))try{n.disconnect();}catch(e){}
 };
 for(const n of sources){n.start(t);n.stop(end);}
 return true;
}
function taigaStatus(message){
 const el=typeof document!=='undefined'?document.getElementById('taiga-status'):null;
 if(el)el.textContent=message;
}
function taigaControl(label,key,min=0,max=1,step=.01){
 const v=taigaState[key];
 const display=key.endsWith('Tune')||key.endsWith('Fine')?v:Math.round(v*100)+'%';
 return '<label class="taiga-control"><span>'+label+'</span><input type="range" data-taiga-param="'+key+
  '" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'" aria-label="Taiga '+label+'"><output>'+display+'</output></label>';
}
function taigaChoice(label,key,opts){
 return '<label class="taiga-select"><span>'+label+'</span><select data-taiga-choice="'+key+'" aria-label="Taiga '+label+'">'+
 opts.map(o=>'<option value="'+o[0]+'"'+(String(taigaState[key])===String(o[0])?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></label>';
}
function taigaBuildRack(){
 const root=typeof document!=='undefined'?document.getElementById('panel-gear'):null;
 if(!root)return;
 const card=document.createElement('section');
 card.id='taiga-rack';card.className='fxcard taiga-rack';
 const oscillators=[1,2,3].map(i=>
  taigaChoice('OSC '+i+' · SEED','osc'+i+'Wave',TAIGA_WAVES.map(w=>[w,w.toUpperCase()]))+
  taigaControl('OSC '+i+' · LEVEL','osc'+i+'Level')+
  taigaControl('OSC '+i+' · SHAPE','osc'+i+'Shape')+
  taigaControl('OSC '+i+' · WAVEFOLD','osc'+i+'Fold')).join('');
 const envelopes=[['eg1Attack','EG1 ATTACK'],['eg1Decay','EG1 DECAY'],
  ['eg1Sustain','EG1 SUSTAIN'],['eg1Release','EG1 RELEASE'],
  ['eg2Attack','EG2 ATTACK'],['eg2Decay','EG2 DECAY'],
  ['eg2Sustain','EG2 SUSTAIN'],['eg2Release','EG2 RELEASE']]
  .map(([key,label])=>taigaControl(label,key)).join('');
 card.innerHTML=
  '<div class="taiga-heading"><span>STUDIO NIKO · ORGANIC WEST COAST · 07</span>'+
  '<div class="taiga-title-row"><div><h2>TAÏGA <em>MODULAR</em></h2>'+
  '<p>Trois oscillateurs à wavefolding et dynamique organique · inspiré du Pittsburgh Taiga.</p>'+
  '</div><button id="taiga-enable" type="button" class="mb">TAÏGA ON</button></div></div>'+
  '<div class="taiga-toolbar"><label>PRESETS <select id="taiga-preset">'+
   Object.keys(TAIGA_PRESETS).map(k=>'<option value="'+k+'">'+TAIGA_PRESETS[k].label+'</option>').join('')+
   '<option value="custom">PATCH PERSONNEL</option></select></label>'+
  '<label>NOTE TEST <select id="taiga-test-note">'+
   ['C2','F2','G2','C3','D3','Eb3','F3','G3','Ab3','Bb3','C4','D4','F4'].map(n=>
   '<option value="'+n+'"'+(n==='F3'?' selected':'')+'>'+n+'</option>').join('')+
   '</select></label><button id="taiga-test" type="button" class="taiga-test">▶ TEST TAÏGA</button></div>'+
  '<div class="taiga-signal"><span>3 VCO</span>→<span>WAVEFOLD</span>→<span>FILTER</span>→<span>LPG</span>→<span>ECHOS</span></div>'+
  '<div class="taiga-primary">'+
   taigaControl('FILTER CUTOFF','cutoff')+
   taigaControl('RESONANCE','resonance')+
   taigaControl('OSC 1 · FOLD','osc1Fold')+
   taigaControl('LPG · RESPONSE','response')+
   '</div>'+
  '<details class="taiga-module" open><summary>01 · OSCILLATEURS × 3 / SIX FOLDS</summary><div class="taiga-grid">'+
    oscillators+
    taigaControl('OSC 2 · SEMITONES','osc2Tune',-24,24,1)+
    taigaControl('OSC 2 · CENTS','osc2Fine',-40,40,1)+
    taigaControl('OSC 3 · SEMITONES','osc3Tune',-24,24,1)+
    taigaControl('OSC 3 · CENTS','osc3Fine',-40,40,1)+
    taigaControl('NOISE','noise')+taigaControl('DRIVE','drive')+
  '</div></details>'+
  '<details class="taiga-module"><summary>02 · PGH MULTIMODE FILTER / DYNAMICS</summary><div class="taiga-grid">'+
    taigaChoice('FILTER MODE','filterMode',TAIGA_MODES.map(m=>[m,m.toUpperCase()]))+
    taigaChoice('DYNAMICS','dynamicsMode',[['lpg','LOW PASS GATE'],['vca','VCA']])+
    taigaControl('FILTER CV DEPTH','envDepth')+
    taigaControl('DYNAMICS RESPONSE','response')+
  '</div></details>'+
  '<details class="taiga-module"><summary>03 · PATCH CV / DUAL ADSR / LFO / SAMPLE & HOLD</summary><div class="taiga-grid">'+
    taigaChoice('FILTER CV','filterSource',[['env1','EG1 → CUTOFF'],['snh','S&H → CUTOFF'],['lfo','LFO → CUTOFF']])+
    taigaChoice('OSC FM','fmSource',[['lfo','LFO → PITCH'],['off','OFF']])+
    taigaControl('S&H RANDOM','snhAmount')+
    taigaControl('LFO RATE','lfoRate')+
    taigaControl('LFO DEPTH','lfoDepth')+
    envelopes+
    taigaControl('GATE LENGTH','gate')+
  '</div></details>'+
  '<details class="taiga-module"><summary>04 · ECHOS / ANALOG-INSPIRED DELAY</summary><div class="taiga-grid">'+
    taigaControl('ECHO TIME','echoTime')+
    taigaControl('REGEN','echoFeedback')+
    taigaControl('ECHO MIX','echoMix')+
    taigaControl('VCA LEVEL','level')+
  '</div></details>'+
  '<div class="taiga-mini-keys" role="group" aria-label="Clavier tactile Taïga">'+
   TAIGA_KEYS.map(n=>'<button type="button" class="taiga-key" data-taiga-note="'+n+'">'+n+'</button>').join('')+
   '</div><p id="taiga-status" class="taiga-status" role="status" aria-live="polite">'+
   'Active le son, choisis un preset puis joue. Compose dans SEQ ou MORCEAU.</p>'+
   '<p class="taiga-disclaimer">Synthé Web Audio non officiel, sans firmware ni circuits analogiques de Pittsburgh Modular.</p>';
 root.appendChild(card);
 card.querySelectorAll('[data-taiga-param]').forEach(input=>{
  input.addEventListener('pointerdown',()=>{if(typeof pushUndo==='function')pushUndo();});
  input.addEventListener('input',function(){
   const key=this.dataset.taigaParam,[min,max]=TAIGA_NUMERIC[key];
   taigaState[key]=taigaClamp(Number(this.value),min,max,TAIGA_DEFAULT[key]);
   if(key.endsWith('Tune'))taigaState[key]=Math.round(taigaState[key]);
   taigaPreset='custom';taigaUpdateDelay();taigaSyncRack();taigaSaveSoon();
  });
 });
 card.querySelectorAll('[data-taiga-choice]').forEach(select=>{
  select.addEventListener('change',function(){
   if(typeof pushUndo==='function')pushUndo();
   taigaState=taigaSanitize({...taigaState,[this.dataset.taigaChoice]:this.value});
   taigaPreset='custom';taigaSyncRack();taigaSaveSoon();
  });
 });
 document.getElementById('taiga-preset').addEventListener('change',function(){
  if(this.value==='custom')return;
  if(typeof pushUndo==='function')pushUndo();
  taigaApplyPreset(this.value);taigaStatus('Preset '+TAIGA_PRESETS[this.value].label+' chargé.');
 });
 document.getElementById('taiga-enable').addEventListener('click',function(){
  if(typeof pushUndo==='function')pushUndo();
  taigaState.enabled=!taigaState.enabled;
  if(!taigaState.enabled)taigaStopVoices();
  taigaSyncRack();saveLiveState();
  taigaStatus(taigaState.enabled?'TAÏGA activé.':'TAÏGA désactivé · réactive-le pour jouer.');
 });
 async function preview(note){
  if(!await activateStudioAudio()){taigaStatus('Audio bloqué · appuie sur ACTIVER LE SON.');return;}
  if(!taigaState.enabled){taigaStatus('TAÏGA désactivé · active le panneau.');return;}
  const heard=taigaTrigger(note,ctx.currentTime+.025,.83);
  taigaStatus(heard?'TAÏGA · '+note+' · '+(TAIGA_PRESETS[taigaPreset]?.label||'PATCH PERSONNEL')+
   ' · piste MIX/TAÏGA':'Sortie indisponible · vérifie MIX / MUTE.');
 }
 document.getElementById('taiga-test').addEventListener('click',()=>preview(document.getElementById('taiga-test-note').value));
 if(typeof studioWireMiniKeyboard==='function'){
  studioWireMiniKeyboard(card,'.taiga-key',note=>preview(note));
 }else card.querySelectorAll('.taiga-key').forEach(el=>el.addEventListener('click',()=>preview(el.dataset.taigaNote)));
 taigaSyncRack();
}
function taigaSyncRack(){
 if(typeof document==='undefined')return;
 document.querySelectorAll('[data-taiga-param]').forEach(el=>{
  const key=el.dataset.taigaParam,v=taigaState[key],out=el.nextElementSibling;
  el.value=String(v);
  if(out&&out.tagName==='OUTPUT')out.textContent=key.endsWith('Tune')?(v>0?'+':'')+v+' st':
   key.endsWith('Fine')?(v>0?'+':'')+v+' ct':Math.round(v*100)+'%';
 });
 document.querySelectorAll('[data-taiga-choice]').forEach(el=>el.value=String(taigaState[el.dataset.taigaChoice]));
 const btn=document.getElementById('taiga-enable');
 if(btn){btn.textContent=taigaState.enabled?'TAÏGA · ON':'TAÏGA · OFF';
  btn.classList.toggle('on',taigaState.enabled);btn.setAttribute('aria-pressed',String(taigaState.enabled));}
 const preset=document.getElementById('taiga-preset');if(preset)preset.value=taigaPreset;
}
