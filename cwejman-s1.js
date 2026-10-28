/* LOVESTRONAUTES · S1 MK2 ANALOG LAB · unofficial Web Audio instrument
   Inspired by the Cwejman S1 MK2 signal-flow: 3 VCOs, ring modulation,
   noise, 4/6-pole LPF, 2/4/6-pole multimode filter, dual envelopes, LFO, VCA.
   Not an official Cwejman product or a circuit-accurate emulation. No samples. */
'use strict';

const S1_WAVES=['sine','triangle','sawtooth','pulse'];
const S1_MMF_MODES=['lowpass','highpass','bandpass'];
const S1_DEFAULT={
  enabled:true,osc1Wave:'sawtooth',osc2Wave:'pulse',osc3Wave:'triangle',
  osc1Level:.78,osc2Level:.52,osc3Level:.32,osc2Tune:0,osc3Tune:-12,
  osc2Fine:7,osc3Fine:-6,pulseWidth:.46,ring:.11,noise:.012,
  lpfCutoff:.68,lpfRes:.24,lpfPoles:4,
  mmfMode:'bandpass',mmfCutoff:.47,mmfRes:.21,mmfPoles:2,
  route:'parallel',mmfMix:.30,envDepth:.42,
  attack:.045,decay:.24,sustain:.54,release:.19,
  lfoRate:.34,lfoDepth:.09,drive:.13,level:.72,gate:.68
};
const S1_PRESETS={
  lead:{label:'PSY LEAD · VCO TRIO',patch:{...S1_DEFAULT}},
  bass:{label:'SOLID ANALOG BASS',patch:{
    ...S1_DEFAULT,osc1Wave:'sawtooth',osc2Wave:'pulse',osc3Wave:'sine',
    osc1Level:.76,osc2Level:.32,osc3Level:.62,osc3Tune:-12,ring:.02,noise:0,
    lpfCutoff:.38,lpfRes:.37,lpfPoles:6,mmfMode:'lowpass',mmfMix:.12,
    envDepth:.7,attack:.01,decay:.18,sustain:.17,release:.085,drive:.28,lfoDepth:0,gate:.56
  }},
  modular:{label:'MODULAR RING · INDUSTRIAL',patch:{
    ...S1_DEFAULT,osc1Wave:'pulse',osc2Wave:'sawtooth',osc3Wave:'sawtooth',
    osc2Tune:7,osc3Tune:-5,ring:.65,noise:.07,lpfCutoff:.73,lpfRes:.65,
    mmfMode:'highpass',mmfPoles:4,mmfMix:.46,envDepth:.54,lfoRate:.68,lfoDepth:.24,drive:.35
  }},
  cosmic:{label:'COSMIC FILTER · SPACE',patch:{
    ...S1_DEFAULT,osc1Wave:'triangle',osc2Wave:'sine',osc3Wave:'pulse',
    osc2Tune:12,osc3Tune:7,ring:.04,noise:.045,lpfCutoff:.79,lpfRes:.15,
    mmfMode:'bandpass',mmfCutoff:.68,mmfMix:.56,attack:.21,decay:.55,
    sustain:.79,release:.66,lfoRate:.26,lfoDepth:.32,drive:.04,gate:.97
  }}
};
const S1_NUMERICS={
  osc1Level:[0,1],osc2Level:[0,1],osc3Level:[0,1],
  osc2Tune:[-24,24],osc3Tune:[-24,24],osc2Fine:[-40,40],osc3Fine:[-40,40],
  pulseWidth:[.12,.88],ring:[0,1],noise:[0,1],
  lpfCutoff:[0,1],lpfRes:[0,1],mmfCutoff:[0,1],mmfRes:[0,1],
  mmfMix:[0,1],envDepth:[0,1],
  attack:[0,1],decay:[0,1],sustain:[0,1],release:[0,1],
  lfoRate:[0,1],lfoDepth:[0,1],drive:[0,1],level:[0,1],gate:[0,1]
};
const S1_KEYS=['C3','D3','Eb3','F3','G3','Ab3','Bb3','C4'];
let s1State={...S1_DEFAULT},s1Preset='lead';
const s1Voices=[];
let s1SaveTimer=null;
let s1PulseCacheContext=null,s1PulseCache=new Map();
let s1DriveCacheValue=-1,s1DriveCurve=null;

function s1Clamp(v,min,max,fallback){return typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;}
function s1Sanitize(saved){
  const src=saved&&typeof saved==='object'?saved:{};
  const state={...S1_DEFAULT};
  for(const key of Object.keys(S1_NUMERICS)){
    const [min,max]=S1_NUMERICS[key];
    state[key]=s1Clamp(src[key],min,max,state[key]);
    if(key==='osc2Tune'||key==='osc3Tune')state[key]=Math.round(state[key]);
  }
  for(const name of ['osc1Wave','osc2Wave','osc3Wave'])
    if(S1_WAVES.includes(src[name]))state[name]=src[name];
  for(const name of ['lpfPoles','mmfPoles']){
    const allowed=name==='lpfPoles'?[4,6]:[2,4,6];
    if(allowed.includes(src[name]))state[name]=src[name];
  }
  if(S1_MMF_MODES.includes(src.mmfMode))state.mmfMode=src.mmfMode;
  if(['parallel','serial'].includes(src.route))state.route=src.route;
  if(typeof src.enabled==='boolean')state.enabled=src.enabled;
  return state;
}
function s1ProjectState(){return {preset:s1Preset,patch:{...s1State}};}
function s1RestoreState(project){
  const obj=project&&project.s1&&typeof project.s1==='object'?project.s1:{};
  s1State=s1Sanitize(obj.patch);
  s1Preset=Object.prototype.hasOwnProperty.call(S1_PRESETS,obj.preset)?obj.preset:'custom';
}
function s1EnsurePatterns(bank,factory){
  const factoryNotes={
    A:[[0,'F3']],
    B:[[0,'F3'],[6,'Ab3'],[12,'C4']],
    C:[[0,'F3'],[3,'Ab3'],[6,'C4'],[10,'Eb4'],[12,'C4'],[14,'Ab3']],
    D:[[0,'F3'],[8,'C3']]
  };
  for(const letter of ['A','B','C','D']){
    if(!bank[letter])continue;
    if(!Array.isArray(bank[letter].s1)||bank[letter].s1.length!==16){
      bank[letter].s1=Array(16).fill(null);
      if(factory)for(const [step,note] of factoryNotes[letter])
        bank[letter].s1[step]={note,vel:.72};
    }
  }
}
function s1ApplyPreset(name){
  if(!Object.prototype.hasOwnProperty.call(S1_PRESETS,name))return false;
  s1State=s1Sanitize(S1_PRESETS[name].patch);s1Preset=name;
  s1SyncRack();
  if(typeof saveLiveState==='function')saveLiveState();
  return true;
}
function s1SaveSoon(){
  if(typeof clearTimeout==='function')clearTimeout(s1SaveTimer);
  if(typeof setTimeout==='function')
    s1SaveTimer=setTimeout(function(){saveLiveState();s1SaveTimer=null;},240);
  else saveLiveState();
}
function s1Hz(note){
  // Preserve the project's note-to-frequency mapping, including flats.
  return typeof hz==='function'?hz(note):220;
}
function s1Cutoff(v){
  const top=Math.min(14500,ctx.sampleRate*.42);
  return Math.max(36,Math.min(top,32*Math.pow(top/32,s1Clamp(v,0,1,.5))));
}
function s1DriveShape(amount){
  const k=Math.round(amount*100);
  if(s1DriveCurve&&s1DriveCacheValue===k)return s1DriveCurve;
  const curve=new Float32Array(257),drive=1+k*.07,denom=Math.tanh(drive);
  for(let i=0;i<curve.length;i++){
    const x=(i/(curve.length-1))*2-1;
    curve[i]=Math.tanh(x*drive)/denom;
  }
  s1DriveCacheValue=k;s1DriveCurve=curve;
  return curve;
}
function s1PulseWave(width){
  if(!ctx||typeof ctx.createPeriodicWave!=='function')return null;
  if(ctx!==s1PulseCacheContext){s1PulseCacheContext=ctx;s1PulseCache=new Map();}
  const duty=Math.round(s1Clamp(width,.12,.88,.46)*20)/20;
  if(s1PulseCache.has(duty))return s1PulseCache.get(duty);
  const real=new Float32Array(25),imag=new Float32Array(25);
  for(let n=1;n<25;n++){
    real[n]=Math.sin(2*Math.PI*n*duty)/(Math.PI*n);
    imag[n]=(1-Math.cos(2*Math.PI*n*duty))/(Math.PI*n);
  }
  const wave=ctx.createPeriodicWave(real,imag,{disableNormalization:false});
  s1PulseCache.set(duty,wave);
  return wave;
}
function s1Oscillator(wave,freq,time){
  const osc=ctx.createOscillator();
  if(wave==='pulse'&&typeof osc.setPeriodicWave==='function'){
    const periodic=s1PulseWave(s1State.pulseWidth);
    if(periodic)osc.setPeriodicWave(periodic);else osc.type='square';
  }else osc.type=wave==='pulse'?'square':wave;
  osc.frequency.setValueAtTime(Math.max(16,Math.min(ctx.sampleRate*.39,freq)),time);
  return osc;
}
function s1StopVoices(){
  if(!ctx)return;
  const time=ctx.currentTime;
  while(s1Voices.length){
    const voice=s1Voices.shift();
    try{
      voice.amp.gain.cancelScheduledValues(time);
      voice.amp.gain.setTargetAtTime(.0001,time,.008);
    }catch(e){}
    voice.sources.forEach(function(source){try{source.stop(time+.04);}catch(e){}});
  }
}
function s1Trigger(note,time,velocity=.82){
  if(!ctx||ctx.state!=='running'||!chanGain.s1||!s1State.enabled)return false;
  const p=s1State;
  const t=Math.max(ctx.currentTime+.001,time);
  const freq=s1Hz(note||'F3');
  const step=60/(Math.max(40,bpm)*4);
  const gateTime=Math.max(.052,step*(.65+p.gate*1.2));
  const attack=Math.min(gateTime*.38,.003+Math.pow(p.attack,2)*.75);
  const decay=Math.min(gateTime*.50,.012+Math.pow(p.decay,2)*.8);
  const release=.025+Math.pow(p.release,2)*1.1;
  const end=t+gateTime+release+.015;
  const peak=.42*s1Clamp(velocity,.1,1,.82);
  const voiceNodes=[],sourceNodes=[];

  // Monophonic analog-style voice stealing: no runaway oscillator accumulation.
  while(s1Voices.length){
    const previous=s1Voices.shift();
    try{
      previous.amp.gain.cancelScheduledValues(t);
      previous.amp.gain.setTargetAtTime(.0001,t,.007);
    }catch(e){}
    previous.sources.forEach(function(src){try{src.stop(t+.035);}catch(e){}});
  }

  const amp=ctx.createGain();voiceNodes.push(amp);
  amp.gain.setValueAtTime(.0001,t);
  amp.gain.linearRampToValueAtTime(peak,t+attack);
  amp.gain.linearRampToValueAtTime(Math.max(.0001,peak*p.sustain),t+attack+decay);
  amp.gain.setValueAtTime(Math.max(.0001,peak*p.sustain),t+gateTime);
  amp.gain.exponentialRampToValueAtTime(.0001,t+gateTime+release);
  amp.connect(chanGain.s1);

  const pre=ctx.createGain();voiceNodes.push(pre);
  // Keep summing levels below clipping before analogue-inspired drive.
  pre.gain.value=.24;
  const shaper=ctx.createWaveShaper();voiceNodes.push(shaper);
  shaper.curve=s1DriveShape(p.drive);
  shaper.oversample='none';pre.connect(shaper);

  const makeFilterStack=function(input,type,poles,cut,res,envScale){
    let previous=input,first=null;
    const count=type==='bandpass'?Math.max(1,poles/2):Math.max(1,poles/2);
    for(let i=0;i<count;i++){
      const f=ctx.createBiquadFilter();voiceNodes.push(f);
      f.type=type;f.Q.value=i===0?(.65+res*7):.71;
      const base=s1Cutoff(cut);
      const hi=Math.min(ctx.sampleRate*.44,base*(1+envScale*7));
      f.frequency.setValueAtTime(base,t);
      f.frequency.exponentialRampToValueAtTime(Math.max(base+1,hi),t+attack+.008);
      f.frequency.exponentialRampToValueAtTime(base,t+gateTime*.8);
      previous.connect(f);previous=f;
      if(!first)first=f;
    }
    return {output:previous,first};
  };
  const lpf=makeFilterStack(shaper,'lowpass',p.lpfPoles,p.lpfCutoff,p.lpfRes,p.envDepth);
  const mmf=makeFilterStack(p.route==='serial'?lpf.output:shaper,
    p.mmfMode,p.mmfPoles,p.mmfCutoff,p.mmfRes,p.envDepth*.72);
  const lpGain=ctx.createGain(),mmGain=ctx.createGain();
  voiceNodes.push(lpGain,mmGain);
  lpGain.gain.value=1-p.mmfMix*.82;
  mmGain.gain.value=p.mmfMix*.8;
  lpf.output.connect(lpGain);lpGain.connect(amp);
  mmf.output.connect(mmGain);mmGain.connect(amp);

  const osc1=s1Oscillator(p.osc1Wave,freq,t);
  const osc2=s1Oscillator(p.osc2Wave,freq*Math.pow(2,p.osc2Tune/12)*Math.pow(2,p.osc2Fine/1200),t);
  const osc3=s1Oscillator(p.osc3Wave,freq*Math.pow(2,p.osc3Tune/12)*Math.pow(2,p.osc3Fine/1200),t);
  const oscillators=[osc1,osc2,osc3];
  const levels=[p.osc1Level,p.osc2Level,p.osc3Level];
  oscillators.forEach(function(osc,i){
    const volume=ctx.createGain();voiceNodes.push(volume);
    volume.gain.value=levels[i];osc.connect(volume);volume.connect(pre);
    sourceNodes.push(osc);
  });

  if(p.ring>.005){
    // VCO2 multiplied by VCO3: actual audio-rate ring modulation.
    const ring=ctx.createGain(),ringLevel=ctx.createGain();voiceNodes.push(ring,ringLevel);
    ring.gain.value=0;ringLevel.gain.value=p.ring*.65;
    osc2.connect(ring);osc3.connect(ring.gain);ring.connect(ringLevel);ringLevel.connect(pre);
  }
  if(p.noise>.005 && typeof getDrumNoise==='function'){
    const noise=ctx.createBufferSource();sourceNodes.push(noise);
    noise.buffer=getDrumNoise();noise.loop=true;
    const level=ctx.createGain();voiceNodes.push(level);
    level.gain.value=p.noise*.22;noise.connect(level);level.connect(pre);
  }
  if(p.lfoDepth>.005){
    const lfo=ctx.createOscillator(),depth=ctx.createGain();sourceNodes.push(lfo);
    lfo.type='triangle';
    lfo.frequency.setValueAtTime(.06+p.lfoRate*11,t);
    depth.gain.value=s1Cutoff(p.lpfCutoff)*p.lfoDepth*.42;
    lfo.connect(depth);voiceNodes.push(depth);
    // LFO to both filter corner frequencies (classic prepatched CV).
    depth.connect(lpf.first.frequency);depth.connect(mmf.first.frequency);
  }

  const voice={sources:sourceNodes,amp,end};
  s1Voices.push(voice);
  // Disconnect every node when the first oscillator completes, including
  // connections to AudioParams. Important for long mobile sessions.
  osc1.onended=function(){
    const index=s1Voices.indexOf(voice);
    if(index>=0)s1Voices.splice(index,1);
    for(const node of sourceNodes.concat(voiceNodes))try{node.disconnect();}catch(e){}
  };
  for(const node of sourceNodes){node.start(t);node.stop(end);}
  return true;
}
function s1NoteStatus(message){
  const el=typeof document!=='undefined'?document.getElementById('s1-status'):null;
  if(el)el.textContent=message;
}
function s1Control(label,key,min,max,step=.01){
  const value=s1State[key];
  const pct=key.endsWith('Tune')||key.endsWith('Fine')?value:(Math.round(value*100)+'%');
  return '<label class="s1-control"><span>'+label+'</span><input type="range" data-s1-param="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'" aria-label="S1 MK2 '+label+'"><output>'+pct+'</output></label>';
}
function s1Choice(label,key,options){
  return '<label class="s1-select"><span>'+label+'</span><select data-s1-choice="'+key+'" aria-label="S1 MK2 '+label+'">'+
    options.map(function(o){return '<option value="'+o[0]+'"'+(String(s1State[key])===String(o[0])?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>';
}
function s1BuildRack(){
  const root=typeof document!=='undefined'?document.getElementById('panel-gear'):null;
  if(!root)return;
  const card=document.createElement('section');
  card.className='fxcard s1-rack';card.id='s1-rack';
  card.innerHTML=
    '<div class="s1-heading"><div><span class="s1-eyebrow">STUDIO NIKO · ANALOG LAB · 06</span>'+
    '<h2>CWEJMAN <b>S1 MK2</b></h2><p>Synthèse virtuelle semi-modulaire inspirée du S1 MK2 : aucun firmware ni circuit propriétaire.</p>'+
    '</div><button type="button" id="s1-enable" class="mb">S1 · ON</button></div>'+
    '<div class="s1-toolbar"><label>PRESETS <select id="s1-preset">'+
      Object.keys(S1_PRESETS).map(function(k){return '<option value="'+k+'">'+S1_PRESETS[k].label+'</option>';}).join('')+
      '<option value="custom">PATCH PERSONNEL</option></select></label>'+
    '<label>NOTE TEST <select id="s1-test-note">'+
      ['C2','F2','G2','C3','D3','Eb3','F3','G3','Ab3','Bb3','C4','D4','F4','G4'].map(function(n){return '<option value="'+n+'"'+(n==='F3'?' selected':'')+'>'+n+'</option>';}).join('')+
    '</select></label><button class="s1-test" type="button" id="s1-test">▶ ÉCOUTER S1</button></div>'+
    '<div class="s1-basics">'+
      s1Control('LPF CUTOFF','lpfCutoff',0,1)+
      s1Control('RESONANCE','lpfRes',0,1)+
      s1Control('MOD ENV2','envDepth',0,1)+
      s1Control('DRIVE','drive',0,1)+
    '</div>'+
    '<details class="s1-module" open><summary>01 · TROIS OSCILLATEURS / RING MOD / NOISE</summary>'+
    '<div class="s1-mod-grid">'+
    s1Choice('VCO1 · WAVE','osc1Wave',S1_WAVES.map(x=>[x,x.toUpperCase()]))+
    s1Control('VCO1 · MIX','osc1Level',0,1)+
    s1Choice('VCO2 · WAVE','osc2Wave',S1_WAVES.map(x=>[x,x.toUpperCase()]))+
    s1Control('VCO2 · MIX','osc2Level',0,1)+
    s1Control('VCO2 · SEMITONES','osc2Tune',-24,24,1)+
    s1Control('VCO2 · FINE CENTS','osc2Fine',-40,40,1)+
    s1Choice('VCO3 · WAVE','osc3Wave',S1_WAVES.map(x=>[x,x.toUpperCase()]))+
    s1Control('VCO3 · MIX','osc3Level',0,1)+
    s1Control('VCO3 · SEMITONES','osc3Tune',-24,24,1)+
    s1Control('VCO3 · FINE CENTS','osc3Fine',-40,40,1)+
    s1Control('PULSE WIDTH','pulseWidth',.12,.88)+
    s1Control('RING MOD','ring',0,1)+
    s1Control('NOISE','noise',0,1)+
    '</div></details>'+
    '<details class="s1-module"><summary>02 · LPF + MULTIMODE · ROUTAGE SEMI-MODULAIRE</summary>'+
    '<div class="s1-mod-grid">'+
    s1Choice('LPF · PÔLES','lpfPoles',[[4,'4 PÔLES · 24 dB/oct'],[6,'6 PÔLES · 36 dB/oct']])+
    s1Choice('MMF · MODE','mmfMode',[['lowpass','LOWPASS'],['highpass','HIGHPASS'],['bandpass','BANDPASS']])+
    s1Choice('MMF · PÔLES','mmfPoles',[[2,'2 PÔLES'],[4,'4 PÔLES'],[6,'6 PÔLES']])+
    s1Choice('ROUTAGE','route',[['parallel','PARALLÈLE'],['serial','SÉRIE']])+
    s1Control('MMF CUTOFF','mmfCutoff',0,1)+
    s1Control('MMF Q-PEAK','mmfRes',0,1)+
    s1Control('MMF MIX','mmfMix',0,1)+
    '</div></details>'+
    '<details class="s1-module"><summary>03 · EG1 / EG2 · LFO · VCA</summary>'+
    '<div class="s1-mod-grid">'+
    s1Control('EG1 ATTACK','attack',0,1)+
    s1Control('EG1 DECAY','decay',0,1)+
    s1Control('EG1 SUSTAIN','sustain',0,1)+
    s1Control('EG1 RELEASE','release',0,1)+
    s1Control('LFO RATE','lfoRate',0,1)+
    s1Control('LFO → FILTER','lfoDepth',0,1)+
    s1Control('NOTE LENGTH','gate',0,1)+
    s1Control('VCA LEVEL','level',0,1)+
    '</div></details>'+
    '<div class="s1-mini-keys" aria-label="Clavier de démonstration S1 MK2">'+
    S1_KEYS.map(n=>'<button type="button" class="s1-key" data-s1-note="'+n+'">'+n+'</button>').join('')+
    '</div><p class="s1-status" id="s1-status" role="status" aria-live="polite">'+
    'Prêt · écoute via ▶ ÉCOUTER S1, puis compose dans SEQ → S1 MK2 ou MORCEAU → MELODY LAB.</p>'+
    '<p class="s1-disclaimer">Modélisation de synthèse Web Audio non officielle. Filtrage numérique, pas de reproduction exacte des circuits analogiques Cwejman.</p>';
  root.appendChild(card);
  card.querySelectorAll('[data-s1-param]').forEach(function(input){
    input.addEventListener('pointerdown',function(){if(typeof pushUndo==='function')pushUndo();});
    input.addEventListener('input',function(){
      const key=this.dataset.s1Param,[min,max]=S1_NUMERICS[key];
      s1State[key]=s1Clamp(Number(this.value),min,max,S1_DEFAULT[key]);
      if(key==='osc2Tune'||key==='osc3Tune')s1State[key]=Math.round(s1State[key]);
      s1Preset='custom';
      const preset=document.getElementById('s1-preset');if(preset)preset.value='custom';
      s1SyncRack();s1SaveSoon();
    });
  });
  card.querySelectorAll('[data-s1-choice]').forEach(function(select){
    select.addEventListener('change',function(){
      if(typeof pushUndo==='function')pushUndo();
      const key=this.dataset.s1Choice;
      const value=['lpfPoles','mmfPoles'].includes(key)?Number(this.value):this.value;
      s1State=s1Sanitize({...s1State,[key]:value});
      s1Preset='custom';s1SyncRack();s1SaveSoon();
    });
  });
  document.getElementById('s1-preset').addEventListener('change',function(){
    if(typeof pushUndo==='function')pushUndo();
    if(this.value==='custom')return;
    s1ApplyPreset(this.value);s1NoteStatus('Preset '+S1_PRESETS[this.value].label+' chargé · joue une note.');
  });
  document.getElementById('s1-enable').addEventListener('click',function(){
    if(typeof pushUndo==='function')pushUndo();
    s1State.enabled=!s1State.enabled;
    if(!s1State.enabled)s1StopVoices();
    s1SyncRack();saveLiveState();
    s1NoteStatus(s1State.enabled?'S1 actif · piste du séquenceur prête.':'S1 désactivé · réactive-le pour jouer.');
  });
  async function play(note){
    if(!await activateStudioAudio()){s1NoteStatus('Audio indisponible · appuie sur ACTIVER LE SON.');return;}
    if(!s1State.enabled){s1NoteStatus('Synthé S1 désactivé · touche S1 OFF pour le réactiver.');return;}
    const played=s1Trigger(note,ctx.currentTime+.035,.84);
    s1NoteStatus(played?'S1 MK2 · '+note+' · '+(S1_PRESETS[s1Preset]?.label||'PATCH PERSONNEL')+
      ' · sortie sur MIX / S1':'Sortie S1 indisponible. Vérifie MIX / MUTE.');
  }
  document.getElementById('s1-test').addEventListener('click',function(){
    play(document.getElementById('s1-test-note').value);
  });
  card.querySelectorAll('[data-s1-note]').forEach(function(btn){
    btn.addEventListener('click',function(){play(btn.dataset.s1Note);});
  });
  s1SyncRack();
}
function s1SyncRack(){
  if(typeof document==='undefined')return;
  document.querySelectorAll('[data-s1-param]').forEach(function(el){
    const key=el.dataset.s1Param,value=s1State[key];
    el.value=String(value);
    const output=el.nextElementSibling;
    if(output && output.tagName==='OUTPUT')
      output.textContent=key.endsWith('Tune')?(value>0?'+':'')+value+' st':
        key.endsWith('Fine')?(value>0?'+':'')+value+' ct':Math.round(value*100)+'%';
  });
  document.querySelectorAll('[data-s1-choice]').forEach(function(el){
    el.value=String(s1State[el.dataset.s1Choice]);
  });
  const btn=document.getElementById('s1-enable');
  if(btn){btn.textContent=s1State.enabled?'S1 MK2 · ON':'S1 MK2 · OFF';btn.classList.toggle('on',s1State.enabled);
    btn.setAttribute('aria-pressed',String(s1State.enabled));}
  const preset=document.getElementById('s1-preset');
  if(preset)preset.value=s1Preset;
}
