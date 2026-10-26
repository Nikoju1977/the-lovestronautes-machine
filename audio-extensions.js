/* LOVESTRONAUTES — Master EQ / Drum & Bass Machines
   Web Audio only. Loaded before the main engine; functions are called once
   the main engine's AudioContext, channels and UI are available. */
'use strict';

const EQ_BANDS = [
  {name:'SUB', hz:80, type:'lowshelf'},
  {name:'BASS', hz:250, type:'peaking', q:0.85},
  {name:'MID', hz:1000, type:'peaking', q:1},
  {name:'PRES', hz:4000, type:'peaking', q:1},
  {name:'AIR', hz:10000, type:'highshelf'}
];
let eqState = {enabled:true, gains:[0,0,0,0,0]};
let eqNodes = [], eqTrim = null;
let machineParams = {snareSnap:0.65, hatDecay:0.38, subDecay:0.52};
let drumNoiseBuffer = null;

function extClamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
function ensureExtendedPatterns(bank, factory) {
  const snareBeats = {A:[4,12], B:[4,12], C:[4,12], D:[]};
  const hatBeats = {A:[2,6,10,14], B:[0,2,4,6,8,10,12,14], C:[1,3,5,7,9,11,13,15], D:[8,12]};
  const subBeats = {
    A:[[0,'C2'],[8,'C2']], B:[[0,'C2'],[6,'Eb2'],[8,'C2'],[12,'G1']],
    C:[[0,'C2'],[4,'C2'],[8,'Eb2'],[12,'G1']], D:[[0,'F1']]
  };
  ['A','B','C','D'].forEach(function(name) {
    const pat = bank[name];
    if (!pat) return;
    if (!Array.isArray(pat.snare) || pat.snare.length !== 16) {
      pat.snare = Array(16).fill(0);
      if (factory) snareBeats[name].forEach(function(step){pat.snare[step]=1;});
    }
    if (!Array.isArray(pat.hat) || pat.hat.length !== 16) {
      pat.hat = Array(16).fill(0);
      if (factory) hatBeats[name].forEach(function(step){pat.hat[step]=1;});
    }
    if (!Array.isArray(pat.sub) || pat.sub.length !== 16) {
      pat.sub = Array(16).fill(null);
      if (factory) subBeats[name].forEach(function(item){pat.sub[item[0]]={note:item[1],vel:0.8};});
    }
  });
}
function restoreExtendedState(state) {
  const oldEq = state.eq && typeof state.eq === 'object' ? state.eq : {};
  eqState.enabled = oldEq.enabled !== false;
  eqState.gains = EQ_BANDS.map(function(_,i) {
    return extClamp(Array.isArray(oldEq.gains) ? oldEq.gains[i] : 0, -12, 12, 0);
  });
  const oldMachines = state.machines && typeof state.machines === 'object' ? state.machines : {};
  machineParams.snareSnap = extClamp(oldMachines.snareSnap,0,1,0.65);
  machineParams.hatDecay = extClamp(oldMachines.hatDecay,0,1,0.38);
  machineParams.subDecay = extClamp(oldMachines.subDecay,0,1,0.52);
  updateMasterEQ();
}
function updateMasterEQ() {
  if (!ctx || !eqNodes.length) return;
  const time = ctx.currentTime;
  eqNodes.forEach(function(node,i) {
    node.gain.setTargetAtTime(eqState.enabled ? eqState.gains[i] : 0, time, 0.025);
  });
}
function initMasterEQ(input, output) {
  eqTrim = ctx.createGain();
  eqTrim.gain.value = 0.72; // headroom before boosts; same when bypassed
  input.connect(eqTrim);
  let last = eqTrim;
  eqNodes = EQ_BANDS.map(function(band) {
    const node = ctx.createBiquadFilter();
    node.type = band.type;
    node.frequency.value = Math.min(ctx.sampleRate * 0.45, band.hz);
    if (band.q) node.Q.value = band.q;
    node.gain.value = 0;
    last.connect(node);
    last = node;
    return node;
  });
  last.connect(output);
  updateMasterEQ();
}
function getDrumNoise() {
  if (!drumNoiseBuffer) {
    drumNoiseBuffer = ctx.createBuffer(1,Math.round(ctx.sampleRate * 0.45),ctx.sampleRate);
    const data = drumNoiseBuffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
  }
  return drumNoiseBuffer;
}
function drumEnvelope(target,time,peak,duration) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001,time);
  g.gain.linearRampToValueAtTime(peak,time+0.003);
  g.gain.exponentialRampToValueAtTime(0.0001,time+duration);
  g.connect(target);
  return g;
}
function triggerSnare(time) {
  if (!ctx || !chanGain.snare) return;
  const dur=0.19, snap=machineParams.snareSnap;
  const tone=ctx.createOscillator();
  tone.type='triangle';
  tone.frequency.setValueAtTime(190,time);
  tone.frequency.exponentialRampToValueAtTime(115,time+0.09);
  tone.connect(drumEnvelope(chanGain.snare,time,0.38,dur));
  tone.start(time);tone.stop(time+dur+0.02);
  const noise=ctx.createBufferSource();
  noise.buffer=getDrumNoise();
  const hp=ctx.createBiquadFilter();
  hp.type='highpass'; hp.frequency.value=1100+snap*1800;
  noise.connect(hp);
  hp.connect(drumEnvelope(chanGain.snare,time,0.24+snap*0.48,dur));
  noise.start(time);noise.stop(time+dur+0.02);
}
function triggerHat(time) {
  if (!ctx || !chanGain.hat) return;
  const dur=0.055+machineParams.hatDecay*0.28;
  const hp=ctx.createBiquadFilter();
  hp.type='highpass';hp.frequency.value=6200;
  hp.connect(drumEnvelope(chanGain.hat,time,0.52,dur));
  const noise=ctx.createBufferSource();
  noise.buffer=getDrumNoise();
  noise.connect(hp);noise.start(time);noise.stop(time+dur+0.015);
  [419,572,833].forEach(function(freq) {
    const osc=ctx.createOscillator();osc.type='square';osc.frequency.value=freq;
    const level=ctx.createGain();level.gain.value=0.07;
    osc.connect(level);level.connect(hp);
    osc.start(time);osc.stop(time+dur+0.015);
  });
}
function triggerSub(note,time,velocity) {
  if (!ctx || !chanGain.sub) return;
  const base=hz(note||'C2'),dur=0.18+machineParams.subDecay*0.65;
  const lowpass=ctx.createBiquadFilter();
  lowpass.type='lowpass';lowpass.frequency.value=220;lowpass.Q.value=0.6;
  lowpass.connect(drumEnvelope(chanGain.sub,time,extClamp(velocity,0.1,1,0.8)*0.8,dur));
  [['sine',1,0.8],['triangle',2,0.12]].forEach(function(part) {
    const osc=ctx.createOscillator();osc.type=part[0];
    osc.frequency.setValueAtTime(base*part[1]*1.08,time);
    osc.frequency.exponentialRampToValueAtTime(base*part[1],time+0.045);
    const mix=ctx.createGain();mix.gain.value=part[2];
    osc.connect(mix);mix.connect(lowpass);
    osc.start(time);osc.stop(time+dur+0.025);
  });
}
function buildExtendedFX() {
  const panel=document.getElementById('panel-fx');
  if (!panel) return;
  const eq=document.createElement('section');
  eq.className='fxcard eq-card';
  eq.innerHTML='<div class="extension-head"><div class="fxtitle">MASTER EQ / 5 BANDES</div><div class="extension-actions"><button type="button" class="mb" id="eq-toggle">EQ: ON</button><button type="button" class="mb" id="eq-reset">FLAT 0 dB</button></div></div>'+
    '<div class="eq-hint">80 / 250 / 1k / 4k / 10k Hz — ±12 dB · traitement du bus master stéréo. En multi-out, les sorties physiques restent indépendantes.</div>'+
    '<div class="eq-grid">'+EQ_BANDS.map(function(band,i) {
      return '<label class="eq-band"><span>'+band.name+'</span><small>'+band.hz+' Hz</small><input type="range" id="eq-band-'+i+'" min="-12" max="12" step="0.5" value="0" aria-label="Égaliseur '+band.name+'"><output id="eq-value-'+i+'">0 dB</output></label>';
    }).join('')+'</div>';
  panel.prepend(eq);
  const machine=document.createElement('section');
  machine.className='fxcard machine-card';
  machine.innerHTML='<div class="fxtitle">NOUVELLES MACHINES / 909 SNARE · 808 HAT · SUB BASS</div>'+
    '<div class="biniou-hint">Trois nouvelles pistes 16 pas, mixables et sauvegardées avec les patterns. Préécoutez chaque moteur.</div>'+
    [
      ['snareSnap','SNARE SNAP','snare'],
      ['hatDecay','HAT DECAY','hat'],
      ['subDecay','SUB DECAY','sub']
    ].map(function(entry) {
      return '<div class="machine-row"><label for="machine-'+entry[0]+'">'+entry[1]+'</label>'+
      '<input type="range" id="machine-'+entry[0]+'" min="0" max="1" step="0.01" aria-label="'+entry[1]+'">'+
      '<output id="machine-'+entry[0]+'-value"></output>'+
      '<button type="button" class="mb" id="machine-preview-'+entry[2]+'">TEST</button></div>';
    }).join('');
  eq.insertAdjacentElement('afterend',machine);
  EQ_BANDS.forEach(function(_,i) {
    const el=document.getElementById('eq-band-'+i);
    el.addEventListener('pointerdown',pushUndo);
    el.addEventListener('input',function() {
      eqState.gains[i]=Number(el.value);
      updateMasterEQ();syncExtendedFX();saveLiveState();
    });
  });
  document.getElementById('eq-toggle').addEventListener('click',function() {
    pushUndo();eqState.enabled=!eqState.enabled;
    updateMasterEQ();syncExtendedFX();saveLiveState();
  });
  document.getElementById('eq-reset').addEventListener('click',function() {
    pushUndo();eqState.gains=[0,0,0,0,0];
    updateMasterEQ();syncExtendedFX();saveLiveState();
  });
  ['snareSnap','hatDecay','subDecay'].forEach(function(key) {
    const el=document.getElementById('machine-'+key);
    el.addEventListener('pointerdown',pushUndo);
    el.addEventListener('input',function() {
      machineParams[key]=Number(el.value);
      syncExtendedFX();saveLiveState();
    });
  });
  ['snare','hat','sub'].forEach(function(name) {
    document.getElementById('machine-preview-'+name).addEventListener('click',function() {
      initAudio();if(!ctx)return;
      const time=ctx.currentTime+0.035;
      if(name==='snare')triggerSnare(time);
      if(name==='hat')triggerHat(time);
      if(name==='sub')triggerSub('C2',time,0.8);
    });
  });
  syncExtendedFX();
}
function syncExtendedFX() {
  const toggle=document.getElementById('eq-toggle');
  if (!toggle)return;
  toggle.textContent=eqState.enabled?'EQ: ON':'EQ: BYPASS';
  toggle.classList.toggle('on',eqState.enabled);
  EQ_BANDS.forEach(function(_,i) {
    const input=document.getElementById('eq-band-'+i);
    const out=document.getElementById('eq-value-'+i);
    if(input)input.value=eqState.gains[i];
    if(out)out.textContent=(eqState.gains[i]>0?'+':'')+eqState.gains[i].toFixed(1)+' dB';
  });
  ['snareSnap','hatDecay','subDecay'].forEach(function(key) {
    const input=document.getElementById('machine-'+key);
    const output=document.getElementById('machine-'+key+'-value');
    if(input)input.value=machineParams[key];
    if(output)output.textContent=Math.round(machineParams[key]*100)+'%';
  });
}
