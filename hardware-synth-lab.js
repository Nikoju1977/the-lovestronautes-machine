/* LOVESTRONAUTES V15 · HARDWARE-INSPIRED SYNTH LAB
 * Original Web Audio approximations, no hardware emulation claims.
 * Jomox MBase11 kick, ELTA SOLAR50 drone, Jomox MOD FM,
 * Meng Qi Wing Pinger resonators. CPU-bounded for mobile devices.
 */
'use strict';
const HARDWARE_DEFAULT={
 mbase:{enabled:true,pitch:.45,tune:.54,decay:.47,harmonics:.3,pulse:.46,noise:.18,attack:.58,eq:.73,gate:.3,compr:.3,metalize:.09,level:.66},
 solar:{enabled:true,octave:.45,detune:.42,spread:.46,filter:.65,resonance:.19,attack:.40,release:.62,drone:.61,level:.59},
 modfm:{enabled:true,ratio1:1,ratio2:2,ratio3:3,ratio4:1,algorithm:'chain',index:.42,attack:.04,decay:.30,sustain:.42,release:.29,filter:.65,level:.62},
 wing:{enabled:true,pitchL:.44,pitchR:.57,qL:.75,qR:.74,cross:.3,chaos:.27,decay:.43,level:.54}
};
const HARDWARE_PRESETS={
 mbase:{
  punch:{label:'PSY PUNCH 145',patch:{...HARDWARE_DEFAULT.mbase}},
  deep:{label:'DEEP SUB',patch:{...HARDWARE_DEFAULT.mbase,pitch:.25,tune:.2,decay:.84,harmonics:.12,pulse:.08}},
  techno:{label:'HARD TECHNO 909',patch:{...HARDWARE_DEFAULT.mbase,pitch:.72,tune:.79,decay:.31,attack:.84,metalize:.39,harmonics:.75}},
  ebm:{label:'EBM METAL',patch:{...HARDWARE_DEFAULT.mbase,metalize:.77,noise:.45,harmonics:.79}}
 },
 solar:{
  cosmic:{label:'COSMIC DRONE',patch:{...HARDWARE_DEFAULT.solar}},
  dark:{label:'DARK AMBIENT',patch:{...HARDWARE_DEFAULT.solar,octave:.14,detune:.68,filter:.36,drone:.91,release:.83}},
  choir:{label:'SPECTRAL CHOIR',patch:{...HARDWARE_DEFAULT.solar,spread:.73,attack:.63,filter:.76}},
  stars:{label:'SPACE PAD',patch:{...HARDWARE_DEFAULT.solar,drone:.91,detune:.38,release:.80}}
 },
 modfm:{
  bells:{label:'GLASS FM BELLS',patch:{...HARDWARE_DEFAULT.modfm}},
  bass:{label:'DIGITAL BASS',patch:{...HARDWARE_DEFAULT.modfm,ratio2:1,ratio3:2,index:.72,filter:.4,decay:.16}},
  lead:{label:'CYBER LEAD',patch:{...HARDWARE_DEFAULT.modfm,algorithm:'parallel',index:.68}},
  keys:{label:'SOFT KEYS',patch:{...HARDWARE_DEFAULT.modfm,index:.20,attack:.19,release:.50}}
 },
 wing:{
  zen:{label:'ZEN PING',patch:{...HARDWARE_DEFAULT.wing}},
  glass:{label:'GLASS PERCUSSION',patch:{...HARDWARE_DEFAULT.wing,pitchL:.63,pitchR:.80,decay:.17}},
  chaos:{label:'CHAOS CROSS',patch:{...HARDWARE_DEFAULT.wing,cross:.88,chaos:.81,qL:.91,qR:.89}},
  gong:{label:'DEEP GONG',patch:{...HARDWARE_DEFAULT.wing,pitchL:.21,pitchR:.27,decay:.89,level:.42}}
 }
};
const HARDWARE_NAMES={mbase:'JOMOX MBASE 11',solar:'ELTA SOLAR 50',modfm:'JOMOX MOD FM',wing:'MENG QI WING PINGER'};
const HARDWARE_IDS=['mbase','solar','modfm','wing'];
let hardwareState=Object.fromEntries(HARDWARE_IDS.map(k=>[k,{...HARDWARE_DEFAULT[k]}]));
let hardwarePreset=Object.fromEntries(HARDWARE_IDS.map(k=>[k,Object.keys(HARDWARE_PRESETS[k])[0]]));
const hardwareVoices=Object.fromEntries(HARDWARE_IDS.map(k=>[k,[]]));
let hardwareSaveHandle=null;
function hwClamp(x,a,b,f){return typeof x==='number'&&Number.isFinite(x)?Math.max(a,Math.min(b,x)):f;}
function hardwareSanitize(k,data){
 const d=data&&typeof data==='object'?data:{},s={...HARDWARE_DEFAULT[k]};
 for(const key of Object.keys(s)){
  if(key==='enabled'){if(typeof d.enabled==='boolean')s.enabled=d.enabled;continue;}
  if(key==='algorithm'){if(['chain','parallel','split'].includes(d.algorithm))s.algorithm=d.algorithm;continue;}
  s[key]=hwClamp(d[key],key.startsWith('ratio')?1:0,key.startsWith('ratio')?8:1,s[key]);
  if(key.startsWith('ratio'))s[key]=Math.round(s[key]);
 }
 return s;
}
function hardwareProjectState(){
 return Object.fromEntries(HARDWARE_IDS.map(k=>[k,{patch:{...hardwareState[k]},preset:hardwarePreset[k]}]));
}
function hardwareRestoreState(project){
 const m=project&&project.hardware&&typeof project.hardware==='object'?project.hardware:{};
 for(const k of HARDWARE_IDS){
  const obj=m[k]||{};
  hardwareState[k]=hardwareSanitize(k,obj.patch);
  hardwarePreset[k]=Object.prototype.hasOwnProperty.call(HARDWARE_PRESETS[k],obj.preset)?obj.preset:'custom';
 }
}
function hardwareEnsurePatterns(bank){
 for(const p of ['A','B','C','D']){
  if(!bank[p])continue;
  for(const k of HARDWARE_IDS){
   // Silent by default: avoid doubling the current kick and saturating the mix.
   if(!Array.isArray(bank[p][k])||bank[p][k].length!==16)
    bank[p][k]=Array(16).fill(null);
  }
 }
}
function hardwareApplyPreset(k,id){
 if(!HARDWARE_PRESETS[k]||!Object.prototype.hasOwnProperty.call(HARDWARE_PRESETS[k],id))return false;
 hardwareState[k]=hardwareSanitize(k,HARDWARE_PRESETS[k][id].patch);
 hardwarePreset[k]=id;hardwareSyncRack();if(typeof saveLiveState==='function')saveLiveState();return true;
}
function hardwareSaveSoon(){
 if(typeof clearTimeout==='function')clearTimeout(hardwareSaveHandle);
 if(typeof setTimeout==='function')hardwareSaveHandle=setTimeout(()=>{
  if(typeof saveLiveState==='function')saveLiveState();hardwareSaveHandle=null;},260);
 else if(typeof saveLiveState==='function')saveLiveState();
}
function hardwareEnd(k,v){
 const at=hardwareVoices[k].indexOf(v);if(at!==-1)hardwareVoices[k].splice(at,1);
 for(const n of v.sources.concat(v.nodes))try{n.disconnect();}catch(e){}
}
function hardwareSteal(k,time,max){
 const active=hardwareVoices[k];
 while(active.length>=max){
  const v=active.shift();
  if(v.amp){
   try{v.amp.gain.cancelScheduledValues(time);
    v.amp.gain.setTargetAtTime(.0001,time,.006);}catch(e){}
  }
  for(const source of v.sources)try{source.stop(time+.03);}catch(e){}
 }
}
function hardwareVoice(k,sources,nodes,amp,t,end){
 const voice={sources,nodes,amp};hardwareVoices[k].push(voice);
 if(sources[0])sources[0].onended=()=>hardwareEnd(k,voice);
 for(const source of sources){source.start(t);source.stop(end);}
 return true;
}
function hardwareStop(){
 if(!ctx)return;
 for(const k of HARDWARE_IDS){
  while(hardwareVoices[k].length){
   const v=hardwareVoices[k].shift();
   if(v.amp){
    try{v.amp.gain.cancelScheduledValues(ctx.currentTime);v.amp.gain.setTargetAtTime(.0001,ctx.currentTime,.005);}catch(e){}
   }
   for(const source of v.sources)try{source.stop(ctx.currentTime+.04);}catch(e){}
  }
 }
}
// One-shot kick: descending sinusoidal body, short pulse+noise transient.
// Actual MBase 11 has an analog VCO; this is a synthetic approximation.
function mbaseTrigger(t,velocity=.86){
 if(!ctx||ctx.state!=='running'||!chanGain.mbase||!hardwareState.mbase.enabled)return false;
 const p=hardwareState.mbase,t0=Math.max(ctx.currentTime+.003,t||ctx.currentTime);
 hardwareSteal('mbase',t0,3);
 const dur=.09+p.decay*p.decay*1.75,base=32+p.pitch*143;
 const nodes=[],sources=[];
 const amp=ctx.createGain(),filter=ctx.createBiquadFilter();nodes.push(amp,filter);
 const peak=(.15+.27*p.level)*hwClamp(velocity,.1,1,.86);
 amp.gain.setValueAtTime(.0001,t0);
 amp.gain.linearRampToValueAtTime(peak,t0+.003);
 amp.gain.exponentialRampToValueAtTime(.0001,t0+dur);
 filter.type='lowpass';filter.frequency.setValueAtTime(350+p.eq*11500,t0);
 amp.connect(filter);filter.connect(chanGain.mbase);
 const sine=ctx.createOscillator();sine.type='sine';
 sine.frequency.setValueAtTime(Math.min(ctx.sampleRate*.39,base*(1.5+p.tune*8)),t0);
 sine.frequency.exponentialRampToValueAtTime(base,t0+.04+p.tune*.07);
 sine.connect(amp);sources.push(sine);
 const click=ctx.createOscillator(),clickGain=ctx.createGain();
 click.type='square';click.frequency.setValueAtTime(520+p.pulse*2200,t0);
 clickGain.gain.setValueAtTime(.0001,t0);
 clickGain.gain.linearRampToValueAtTime(peak*p.pulse*p.attack*.9,t0+.001);
 clickGain.gain.exponentialRampToValueAtTime(.0001,t0+.006+p.gate*.018);
 click.connect(clickGain);clickGain.connect(filter);
 sources.push(click);nodes.push(clickGain);
 if(p.harmonics>.15){
  const over=ctx.createOscillator(),gain=ctx.createGain();
  over.type='triangle';over.frequency.setValueAtTime(base*(2+p.harmonics),t0);
  gain.gain.setValueAtTime(.0001,t0);
  gain.gain.linearRampToValueAtTime(peak*p.harmonics*.15,t0+.003);
  gain.gain.exponentialRampToValueAtTime(.0001,t0+Math.max(.03,dur*.5));
  over.connect(gain);gain.connect(filter);sources.push(over);nodes.push(gain);
 }
 if(p.noise>.01&&typeof getDrumNoise==='function'){
  const n=ctx.createBufferSource(),g=ctx.createGain();
  n.buffer=getDrumNoise();n.loop=true;
  g.gain.setValueAtTime(.0001,t0);
  g.gain.linearRampToValueAtTime(peak*p.noise*(.2+p.metalize*.2),t0+.001);
  g.gain.exponentialRampToValueAtTime(.0001,t0+.012+p.metalize*.04);
  n.connect(g);g.connect(filter);sources.push(n);nodes.push(g);
 }
 return hardwareVoice('mbase',sources,nodes,amp,t0,t0+dur+.04);
}
// Solar 50: 10 banks of five oscillators in the hardware; Web Audio
// approximates each performed note with five detuned partials.
// Max two notes at once = ten oscillators max, to protect phone performance.
function solar50Trigger(note,t,velocity=.77){
 if(!ctx||ctx.state!=='running'||!chanGain.solar||!hardwareState.solar.enabled)return false;
 const p=hardwareState.solar,t0=Math.max(ctx.currentTime+.003,t||ctx.currentTime);
 hardwareSteal('solar',t0,typeof studioEcoMode!=='undefined'&&studioEcoMode?1:2);
 const base=typeof hz==='function'?hz(note||'F3'):174.6;
 const gate=.25+p.drone*1.3,release=.08+p.release*.80,end=t0+gate+release+.05;
 const amp=ctx.createGain(),filter=ctx.createBiquadFilter(),nodes=[amp,filter],sources=[];
 const peak=.21*velocity*p.level;
 amp.gain.setValueAtTime(.0001,t0);
 amp.gain.linearRampToValueAtTime(peak,t0+.01+p.attack*.20);
 amp.gain.setValueAtTime(Math.max(.0001,peak*.75),t0+gate);
 amp.gain.exponentialRampToValueAtTime(.0001,t0+gate+release);
 filter.type='lowpass';filter.Q.value=.7+p.resonance*4;
 filter.frequency.setValueAtTime(150+p.filter*12500,t0);
 filter.connect(amp);amp.connect(chanGain.solar);
 const ratios=[.5,1,1.004,1.5,2];
 for(let i=0;i<5;i++){
  const osc=ctx.createOscillator(),volume=ctx.createGain();
  nodes.push(volume);sources.push(osc);
  osc.type=i%2===0?'triangle':'sawtooth';
  osc.frequency.setValueAtTime(Math.min(ctx.sampleRate*.35,Math.max(25,
   base*ratios[i]*(1+(i-2)*p.detune*.011)*Math.pow(2,(p.octave-.5)*.5))),t0);
  volume.gain.value=[.12,.21,.20,.11,.09][i]*(1+p.spread*.2);
  osc.connect(volume);volume.connect(filter);
 }
 return hardwareVoice('solar',sources,nodes,amp,t0,end);
}
// Digital 4-operator FM inspired by Jomox Mod FM; provides 3 routing modes,
// not the hardware's 26-algorithm architecture, analog VCAs or 8 voice outputs.
function modfmTrigger(note,t,velocity=.8){
 if(!ctx||ctx.state!=='running'||!chanGain.modfm||!hardwareState.modfm.enabled)return false;
 const p=hardwareState.modfm,t0=Math.max(ctx.currentTime+.003,t||ctx.currentTime);
 hardwareSteal('modfm',t0,typeof studioEcoMode!=='undefined'&&studioEcoMode?2:3);
 const hz0=typeof hz==='function'?hz(note||'C4'):261.63;
 const gate=.12+p.sustain*.20,release=.07+p.release*.46,end=t0+gate+release+.05;
 const amp=ctx.createGain(),filter=ctx.createBiquadFilter(),nodes=[amp,filter],sources=[];
 const peak=.28*velocity*p.level,attack=.003+p.attack*.16;
 amp.gain.setValueAtTime(.0001,t0);
 amp.gain.linearRampToValueAtTime(peak,t0+attack);
 amp.gain.linearRampToValueAtTime(Math.max(.0001,peak*p.sustain),t0+attack+.02+p.decay*.10);
 amp.gain.setValueAtTime(Math.max(.0001,peak*p.sustain),t0+gate);
 amp.gain.exponentialRampToValueAtTime(.0001,t0+gate+release);
 filter.type='lowpass';filter.Q.value=.9;filter.frequency.setValueAtTime(300+p.filter*13000,t0);
 filter.connect(amp);amp.connect(chanGain.modfm);
 const oscillators=[],levels=[];
 for(let i=1;i<=4;i++){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(Math.min(ctx.sampleRate*.37,hz0*p['ratio'+i]),t0);
  gain.gain.value=i===1?.77:i===2?.36:.14;
  osc.connect(gain);oscillators.push(osc);sources.push(osc);levels.push(gain);nodes.push(gain);
 }
 function connectFM(from,to,amount){
  const depth=ctx.createGain();nodes.push(depth);depth.gain.value=hz0*p.index*amount;
  levels[from].connect(depth);depth.connect(oscillators[to].frequency);
 }
 if(p.algorithm==='parallel'){connectFM(1,0,3.1);connectFM(2,0,2.1);connectFM(3,0,1.5);}
 else if(p.algorithm==='split'){connectFM(1,0,3.0);connectFM(3,2,2.7);levels[2].connect(filter);}
 else{connectFM(3,2,2.2);connectFM(2,1,2.8);connectFM(1,0,3.4);}
 levels[0].connect(filter);
 return hardwareVoice('modfm',sources,nodes,amp,t0,end);
}
// Wing Pinger original: a pair of 4-pole pinged resonant LPFs and chaos paths.
// Two cascaded Biquad filters per side plus lightly excited damped sine
// compensate for the fact browser digital Biquads do not self-oscillate like analog.
function wingTrigger(note,t,velocity=.78){
 if(!ctx||ctx.state!=='running'||!chanGain.wing||!hardwareState.wing.enabled)return false;
 const p=hardwareState.wing,t0=Math.max(ctx.currentTime+.003,t||ctx.currentTime);
 hardwareSteal('wing',t0,3);
 const freq0=typeof hz==='function'?hz(note||'G3'):196;
 const decay=.14+p.decay*1.1,end=t0+decay+.08;
 const amp=ctx.createGain(),nodes=[amp],sources=[];
 const peak=.18*velocity*p.level;
 amp.gain.setValueAtTime(.0001,t0);amp.gain.linearRampToValueAtTime(peak,t0+.003);
 amp.gain.exponentialRampToValueAtTime(.0001,t0+decay);
 amp.connect(chanGain.wing);
 for(let i=0;i<2;i++){
  const l=i===0,pitch=l?p.pitchL:p.pitchR,q=l?p.qL:p.qR;
  const freq=Math.min(ctx.sampleRate*.37,Math.max(40,freq0*Math.pow(2,(pitch-.5)*1.8+(l?-p.cross:p.cross)*.12)));
  const impulse=ctx.createOscillator(),impact=ctx.createGain();
  sources.push(impulse);nodes.push(impact);
  impulse.type='triangle';impulse.frequency.setValueAtTime(freq*(2.2+p.chaos),t0);
  impact.gain.setValueAtTime(.0001,t0);
  impact.gain.linearRampToValueAtTime(.25,t0+.001);
  impact.gain.exponentialRampToValueAtTime(.0001,t0+.012);
  impulse.connect(impact);
  let last=impact;
  for(let j=0;j<2;j++){
   const f=ctx.createBiquadFilter();nodes.push(f);
   f.type='lowpass';f.frequency.setValueAtTime(freq,t0);
   f.Q.value=2.5+q*16;
   last.connect(f);last=f;
  }
  const pan=typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():ctx.createGain();
  if(pan.pan)pan.pan.value=l?-.65:.65;
  nodes.push(pan);last.connect(pan);pan.connect(amp);
  const body=ctx.createOscillator(),gain=ctx.createGain();sources.push(body);nodes.push(gain);
  body.type='sine';body.frequency.setValueAtTime(freq*(1+(l?-1:1)*p.chaos*.009),t0);
  gain.gain.setValueAtTime(.0001,t0);gain.gain.linearRampToValueAtTime(.07*velocity,t0+.005);
  gain.gain.exponentialRampToValueAtTime(.0001,t0+decay);
  body.connect(gain);gain.connect(pan);
 }
 return hardwareVoice('wing',sources,nodes,amp,t0,end);
}
function hardwareTrigger(name,note,time,velocity=.82){
 if(name==='mbase')return mbaseTrigger(time,velocity);
 if(name==='solar')return solar50Trigger(note,time,velocity);
 if(name==='modfm')return modfmTrigger(note,time,velocity);
 if(name==='wing')return wingTrigger(note,time,velocity);
 return false;
}
function hardwareControl(machine,key,label){
 const value=hardwareState[machine][key],ratio=key.startsWith('ratio');
 return '<label class="hardware-control"><span>'+label+'</span><input data-hardware-knob="'+key+
  '" type="range" min="'+(ratio?1:0)+'" max="'+(ratio?8:1)+'" step="'+(ratio?1:.01)+
  '" value="'+value+'" aria-label="'+HARDWARE_NAMES[machine]+' '+label+'"><output>'+
  (ratio?value:Math.round(value*100)+'%')+'</output></label>';
}
function hardwareBuildRacks(){
 const panel=document.getElementById('panel-gear');if(!panel)return;
 const controlLabels={
  mbase:{pitch:'PITCH',tune:'TUNE SWEEP',decay:'DECAY',harmonics:'HARMONICS',pulse:'PULSE',noise:'NOISE',attack:'ATTACK',eq:'LOW-PASS EQ',gate:'GATE',compr:'COMPRESSION',metalize:'METAL NOISE',level:'OUTPUT'},
  solar:{octave:'PITCH',detune:'DRIFT',spread:'SPREAD',filter:'FILTER',resonance:'RESONANCE',attack:'ATTACK',release:'RELEASE',drone:'DRONE LENGTH',level:'OUTPUT'},
  modfm:{ratio1:'OP1 RATIO',ratio2:'OP2 RATIO',ratio3:'OP3 RATIO',ratio4:'OP4 RATIO',index:'FM DEPTH',attack:'ATTACK',decay:'DECAY',sustain:'SUSTAIN',release:'RELEASE',filter:'CUTOFF',level:'OUTPUT'},
  wing:{pitchL:'LEFT PITCH',pitchR:'RIGHT PITCH',qL:'LEFT Q',qR:'RIGHT Q',cross:'CROSS',chaos:'CHAOS',decay:'DECAY',level:'OUTPUT'}
 };
 const subtitles={
  mbase:'KICK ANALOG-INSPIRED · 808 / 909 / PSY',
  solar:'ORGANIC DRONE · FIVE OSCILLATORS PER NOTE',
  modfm:'FOUR OPERATORS · FM ALGORITHMS',
  wing:'STEREO RESONATOR · DUAL FILTER PING'
 };
 for(const machine of HARDWARE_IDS){
  const card=document.createElement('section');
  card.id='hardware-'+machine;card.className='fxcard hardware-rack';card.dataset.machine=machine;
  card.innerHTML='<div class="hardware-header"><div><span>STUDIO NIKO · NEW SYNTH LAB</span><h2>'+HARDWARE_NAMES[machine]+'</h2><p>'+subtitles[machine]+'</p></div>'+
   '<button id="hardware-enable-'+machine+'" type="button" class="mb">ON</button></div>'+
   '<div class="hardware-toolbar"><label>PRESET <select id="hardware-preset-'+machine+'">'+
    Object.entries(HARDWARE_PRESETS[machine]).map(([k,v])=>'<option value="'+k+'">'+v.label+'</option>').join('')+
    '<option value="custom">PATCH PERSONNEL</option></select></label>'+
   '<label>NOTE TEST <select id="hardware-note-'+machine+'">'+
    ['C2','F2','G2','C3','D3','F3','G3','A3','C4','F4'].map(n=>'<option value="'+n+'">'+n+'</option>').join('')+
   '</select></label><button id="hardware-test-'+machine+'" type="button">▶ TESTER LE SON</button></div>'+
   (machine==='modfm'?'<label class="hardware-algo">ALGORITHME FM <select id="hardware-algorithm">'+
   '<option value="chain">CHAÎNE</option><option value="parallel">PARALLÈLE</option><option value="split">SPLIT</option></select></label>':'')+
   '<details class="hardware-module" open><summary>MODULE · PARAMÈTRES SONORES</summary><div class="hardware-grid">'+
    Object.entries(controlLabels[machine]).map(([key,label])=>hardwareControl(machine,key,label)).join('')+
   '</div></details>'+
   '<p id="hardware-status-'+machine+'" class="hardware-status" aria-live="polite" role="status">Prêt à jouer.</p>'+
   '<p class="hardware-caveat">Modèle Web Audio indépendant inspiré du matériel : pas de reproduction exacte de ses circuits.</p>';
  panel.appendChild(card);
  card.querySelectorAll('[data-hardware-knob]').forEach(input=>{
   input.addEventListener('pointerdown',()=>{if(typeof pushUndo==='function')pushUndo();});
   input.addEventListener('input',function(){
    const key=this.dataset.hardwareKnob,ratio=key.startsWith('ratio');
    hardwareState[machine][key]=ratio?Math.round(Number(this.value)):Number(this.value);
    hardwarePreset[machine]='custom';hardwareSyncRack();hardwareSaveSoon();
   });
  });
  document.getElementById('hardware-preset-'+machine).addEventListener('change',function(){
   if(this.value==='custom')return;
   if(typeof pushUndo==='function')pushUndo();
   hardwareApplyPreset(machine,this.value);
  });
  document.getElementById('hardware-enable-'+machine).addEventListener('click',function(){
   hardwareState[machine].enabled=!hardwareState[machine].enabled;
   hardwareSyncRack();saveLiveState();
  });
  if(machine==='modfm')document.getElementById('hardware-algorithm').addEventListener('change',function(){
   hardwareState.modfm.algorithm=this.value;hardwarePreset.modfm='custom';hardwareSaveSoon();
  });
  document.getElementById('hardware-test-'+machine).addEventListener('click',async function(){
   const status=document.getElementById('hardware-status-'+machine);
   if(!await activateStudioAudio()){status.textContent='Audio bloqué : ACTIVER LE SON.';return;}
   const note=document.getElementById('hardware-note-'+machine).value;
   const played=hardwareTrigger(machine,note,ctx.currentTime+.03,.86);
   status.textContent=played?'SON PROGRAMMÉ · '+note+' · SORTIE MIX/'+machine.toUpperCase():
    'Instrument désactivé ou sortie MIX indisponible.';
  });
 }
 hardwareSyncRack();
}
function hardwareSyncRack(){
 if(typeof document==='undefined')return;
 for(const machine of HARDWARE_IDS){
  const card=document.getElementById('hardware-'+machine);if(!card)continue;
  card.querySelectorAll('[data-hardware-knob]').forEach(input=>{
   const key=input.dataset.hardwareKnob,value=hardwareState[machine][key];input.value=String(value);
   const out=input.nextElementSibling;
   if(out&&out.tagName==='OUTPUT')out.textContent=key.startsWith('ratio')?String(value):Math.round(value*100)+'%';
  });
  const preset=document.getElementById('hardware-preset-'+machine);
  if(preset)preset.value=hardwarePreset[machine];
  const enable=document.getElementById('hardware-enable-'+machine);
  if(enable){enable.textContent=hardwareState[machine].enabled?'ON':'OFF';enable.classList.toggle('on',hardwareState[machine].enabled);}
  if(machine==='modfm'){
   const algo=document.getElementById('hardware-algorithm');if(algo)algo.value=hardwareState.modfm.algorithm;
  }
 }
}
