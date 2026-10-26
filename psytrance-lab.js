/* PSYTRANCE PRODUCTION SUITE
   Sound design + tempo-synced ping-pong delay + deterministic preset banks.
   Loaded before the app engine to support JSON state migration. */
'use strict';

const PSY_PRESETS=Object.freeze({
  fullon:{name:'FULL-ON',bpm:145,key:'F2',lead:['F3','Ab3','C4','Eb4','G3'],cutoff:0.68,resonance:0.66,delay:0.28},
  dark:{name:'DARK PSY',bpm:152,key:'E2',lead:['E3','F3','G3','Bb3','D4'],cutoff:0.38,resonance:0.82,delay:0.39},
  progressive:{name:'PROGRESSIVE',bpm:136,key:'G2',lead:['G3','Bb3','D4','F4','A3'],cutoff:0.52,resonance:0.48,delay:0.22},
  forest:{name:'FOREST',bpm:150,key:'A2',lead:['A3','C4','D4','Eb4','G3'],cutoff:0.56,resonance:0.76,delay:0.49}
});
const PSY_DEFAULTS=Object.freeze({
  enabled:false,style:'fullon',kickTune:53,kickDecay:0.22,kickPunch:0.55,
  bassDecay:0.53,duck:0.72,cutoff:0.57,resonance:0.66,
  envelope:0.67,accent:0.45,glide:0.46,lfoRate:'1/4',lfoDepth:0.28,
  delay:0.28,delayFeedback:0.40,delayDivision:'3/16',
  transitionFX:false,song:{enabled:false,order:'AABBCCDD',barsPer:4}
});
let psyState=JSON.parse(JSON.stringify(PSY_DEFAULTS));
let psyFX=null,psyLastAcidFreq=0,psySongIndex=-1;
const PSY_LFO_RATES=['1/2','1/4','1/8','1/16'];
const PSY_DELAY_RATES=['1/8','3/16','1/4'];
function psyClamp(v,lo,hi,fallback){return typeof v==='number' && Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;}
function psyStateSnapshot(){return JSON.parse(JSON.stringify(psyState));}
function psyRestoreState(project){
  const old=project && project.psy && typeof project.psy==='object'?project.psy:{};
  const settings={...PSY_DEFAULTS};
  for(const [key,lo,hi] of [
    ['kickTune',43,65],['kickDecay',0.12,0.38],['kickPunch',0,1],
    ['bassDecay',0,1],['duck',0,0.9],['cutoff',0,1],
    ['resonance',0,1],['envelope',0,1],['accent',0,1],
    ['glide',0,1],['lfoDepth',0,1],['delay',0,0.85],['delayFeedback',0,0.72]
  ])settings[key]=psyClamp(old[key],lo,hi,PSY_DEFAULTS[key]);
  settings.enabled=old.enabled===true;
  settings.style=Object.hasOwn(PSY_PRESETS,old.style)?old.style:PSY_DEFAULTS.style;
  settings.lfoRate=PSY_LFO_RATES.includes(old.lfoRate)?old.lfoRate:PSY_DEFAULTS.lfoRate;
  settings.delayDivision=PSY_DELAY_RATES.includes(old.delayDivision)?old.delayDivision:PSY_DEFAULTS.delayDivision;
  settings.transitionFX=old.transitionFX===true;
  const oldSong=old.song && typeof old.song==='object'?old.song:{};
  const rawOrder=typeof oldSong.order==='string'?oldSong.order.toUpperCase().replace(/[^ABCD]/g,''):'';
  settings.song={
    enabled:oldSong.enabled===true,
    order:rawOrder.slice(0,32)||PSY_DEFAULTS.song.order,
    barsPer:[1,2,4,8,16].includes(oldSong.barsPer)?oldSong.barsPer:4
  };
  psyState=settings;
  psyLastAcidFreq=0;psySongIndex=-1;
}
function psyPresetBank(style){
  if(!Object.hasOwn(PSY_PRESETS,style))throw Error('Preset inconnu');
  const setup=PSY_PRESETS[style];
  const bank={};
  for(const [index,pat] of ['A','B','C','D'].entries()){
    const breakdown=pat==='D',intro=pat==='A',peak=pat==='C';
    const kick=Array(16).fill(0),sub=Array(16).fill(null),snare=Array(16).fill(0);
    const hat=Array(16).fill(0),acid=Array(16).fill(null),fm=Array(16).fill(null);
    const biniou=Array(16).fill(null),metal=Array(16).fill(0),auto=Array(16).fill(0.8);
    for(let i=0;i<16;i++){
      if(!breakdown && i%4===0)kick[i]=1;
      if(!breakdown && i%4!==0 && (!intro || i%4===2)){
        // Kick + three 16th-note bass pulses: K-B-B-B, with subtle accent variation.
        const vel=[0,0.73,0.91,0.70][i%4]*(peak?1.05:1);
        sub[i]={note:setup.key,vel:Number(vel.toFixed(3))};
      }
      if(!intro && !breakdown && (i===4||i===12))snare[i]=1;
      if(i%4===2 && !breakdown)hat[i]=1;
      if(peak && i%2===0)hat[i]=1;
      if(style==='dark' && i%2===1 && !breakdown)hat[i]=1;
      if(style==='forest' && (i===3||i===11||i===15))metal[i]=1;
      if(peak && (i===7 || i===15))metal[i]=1;
      auto[i]=Math.max(0.28,Math.min(1,
        0.56+Math.sin(i/16*Math.PI*2+index*0.8)*0.26+(peak?0.12:0)));
    }
    if(!breakdown){
      const slots=intro?[6,14]:peak?[1,3,6,9,11,14,15]:[2,6,10,14];
      slots.forEach((i,j)=>{
        acid[i]={note:setup.lead[(j+index)%setup.lead.length],
          vel:peak && j%3===0?0.99:0.74,
          accent:peak && j%3===0,slide:peak && j%4===3};
      });
      fm[0]=setup.lead[1];fm[8]=setup.lead[2];
      if(peak){fm[4]=setup.lead[3];fm[12]=setup.lead[0];}
    }else{
      acid[4]={note:setup.lead[0],vel:0.54,slide:false};
      fm[0]=setup.lead[1];fm[8]=setup.lead[3];
      if(style==='forest')biniou[8]={note:'A4',vel:0.64};
    }
    bank[pat]={kick,sub,snare,hat,acid,fm,biniou,metal,auto};
  }
  return bank;
}
function psyApplyPreset(style){
  const setup=PSY_PRESETS[style];if(!setup)throw Error('Preset inconnu');
  const bank=psyPresetBank(style);
  // This is a destructive factory action; keep an undo snapshot.
  pushUndo();
  patterns=bank;curPat='B';matrix=patterns[curPat];
  trackLengths=Object.fromEntries(Object.keys(trackLengths).map(name=>[name,16]));
  trackChaos=Object.fromEntries(Object.keys(trackChaos).map(name=>[name,0]));
  bpm=setup.bpm;swing=0.5;isAiAuto=false;morphAmount=0;
  chanVol={...chanVol,kick:0.89,sub:0.58,snare:0.38,hat:0.29,acid:0.56,fm:0.28,metal:0.15,biniou:0.40};
  psyState={...psyState,enabled:true,style,cutoff:setup.cutoff,resonance:setup.resonance,
    delay:setup.delay,song:{...psyState.song,enabled:false}};
  psySongIndex=-1;psyLastAcidFreq=0;
  if(ctx){studioApplyMix();psyApplyFX();}
  syncProjectUI();psySyncUI();saveLiveState();
  setStatus('PSYTRANCE '+setup.name+' · '+bpm+' BPM','ok');
}
function psyBeatTime(){return 60/bpm;}
function psyDivisionBeats(division){
  return division==='1/16'?0.25:division==='1/8'?0.5:division==='3/16'?0.75:division==='1/4'?1:2;
}
function psyApplyFX(){
  if(!ctx || !psyFX)return;
  const when=ctx.currentTime;
  const delay=psyBeatTime()*psyDivisionBeats(psyState.delayDivision);
  psyFX.left.delayTime.setTargetAtTime(delay,when,0.035);
  psyFX.right.delayTime.setTargetAtTime(delay,when,0.035);
  psyFX.feedbackL.gain.setTargetAtTime(psyState.delayFeedback,when,0.035);
  psyFX.feedbackR.gain.setTargetAtTime(psyState.delayFeedback,when,0.035);
  psyFX.wet.gain.setTargetAtTime(psyState.enabled?psyState.delay:0,when,0.035);
  Object.entries(psyFX.sends).forEach(([name,node])=>{
    node.gain.setTargetAtTime(psyState.enabled?(name==='biniou'?0.18:1):0,when,0.035);
  });
}
function psyInitFX(){
  if(!ctx || psyFX || !duckingGain)return;
  const input=ctx.createGain();input.channelCount=1;input.channelCountMode='explicit';
  const left=ctx.createDelay(2),right=ctx.createDelay(2);
  const feedbackL=ctx.createGain(),feedbackR=ctx.createGain();
  const merger=ctx.createChannelMerger(2),wet=ctx.createGain();
  input.connect(left);
  left.connect(merger,0,0);left.connect(feedbackL);feedbackL.connect(right);
  right.connect(merger,0,1);right.connect(feedbackR);feedbackR.connect(left);
  merger.connect(wet);wet.connect(duckingGain);
  psyFX={input,left,right,feedbackL,feedbackR,wet,sends:{}};
  psyApplyFX();
}
function psyAttachSend(name,source){
  if(!psyFX||!source || isMultiOut)return;
  if(!['acid','fm','biniou'].includes(name))return;
  const send=ctx.createGain();source.connect(send);send.connect(psyFX.input);
  psyFX.sends[name]=send;psyApplyFX();
}
function psyDuck(time){
  if(!duckingGain || isMultiOut)return;
  const g=duckingGain.gain;
  g.cancelScheduledValues(time);
  g.setValueAtTime(g.value,time);
  g.linearRampToValueAtTime(1-psyState.duck,time+0.004);
  g.setTargetAtTime(1,time+0.03,Math.max(0.04,0.13+psyState.bassDecay*0.10));
}
function psyTriggerKick(time){
  if(!ctx || !chanGain.kick)return;
  const tune=psyState.kickTune,tail=psyState.kickDecay,punch=psyState.kickPunch;
  const osc=ctx.createOscillator(),level=ctx.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(tune*(3.1+punch*1.2),time);
  osc.frequency.exponentialRampToValueAtTime(tune*1.15,time+0.023);
  osc.frequency.exponentialRampToValueAtTime(tune,time+0.065);
  osc.frequency.setValueAtTime(tune,time+tail);
  level.gain.setValueAtTime(0.0001,time);
  level.gain.linearRampToValueAtTime(0.87,time+0.002);
  level.gain.exponentialRampToValueAtTime(0.0001,time+tail);
  osc.connect(level);level.connect(chanGain.kick);
  osc.start(time);osc.stop(time+tail+0.025);
  const noise=ctx.createBufferSource();noise.buffer=getDrumNoise();
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2200;
  const click=ctx.createGain();click.gain.setValueAtTime(0.18+punch*0.15,time);
  click.gain.exponentialRampToValueAtTime(0.0001,time+0.018);
  noise.connect(hp);hp.connect(click);click.connect(chanGain.kick);
  noise.start(time);noise.stop(time+0.022);
  psyDuck(time);
}
function psyTriggerBass(note,time,velocity){
  if(!ctx || !chanGain.sub)return;
  const base=hz(note||'F2');
  const dur=(60/bpm/4)*(0.54+psyState.bassDecay*0.36);
  const low=ctx.createBiquadFilter();low.type='lowpass';
  low.frequency.setValueAtTime(Math.min(base*6,4500),time);
  low.frequency.exponentialRampToValueAtTime(Math.max(120,base*1.9),time+dur);
  const output=ctx.createGain(),peak=Math.min(0.65,velocity*0.56);
  output.gain.setValueAtTime(0.0001,time);
  output.gain.linearRampToValueAtTime(peak,time+0.004);
  output.gain.setTargetAtTime(0.0001,time+dur*0.5,Math.max(0.014,dur*0.14));
  low.connect(output);output.connect(chanGain.sub);
  [['sawtooth',0.20],['sine',0.72]].forEach(function(part){
    const osc=ctx.createOscillator(),volume=ctx.createGain();
    osc.type=part[0];osc.frequency.value=base;
    volume.gain.value=part[1];osc.connect(volume);volume.connect(low);
    osc.start(time);osc.stop(time+dur+0.045);
  });
}
function psyAcidLfo(time){
  const period=psyBeatTime()*psyDivisionBeats(psyState.lfoRate);
  return Math.sin(2*Math.PI*time/Math.max(period,0.02));
}
function psyTriggerAcid(note,vel,time,morph,step){
  if(!ctx || !chanGain.acid)return;
  const f=hz(note),velocity=psyClamp(vel,0,1,0.8);
  const dur=psyBeatTime()*0.25*(0.62+psyState.glide*0.25);
  const accent=(step && step.accent===true)?psyState.accent:0;
  const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),out=ctx.createGain();
  osc.type='sawtooth';
  if(step && step.slide && psyLastAcidFreq){
    osc.frequency.setValueAtTime(psyLastAcidFreq,time);
    osc.frequency.exponentialRampToValueAtTime(f,time+0.015+psyState.glide*0.075);
  }else osc.frequency.setValueAtTime(f,time);
  psyLastAcidFreq=f;
  filter.type='lowpass';filter.Q.value=1.4+psyState.resonance*17;
  const base=160*Math.pow(30,psyState.cutoff);
  const movement=psyAcidLfo(time)*psyState.lfoDepth;
  const start=Math.max(100,Math.min(ctx.sampleRate*0.45,base*(0.6+movement*0.45)));
  const morphValue=typeof morph==='number'?morph:morphAmount;
  const maximum=Math.max(start,Math.min(ctx.sampleRate*0.45,start*(1.1+psyState.envelope*5+accent*2+morphValue)));
  filter.frequency.setValueAtTime(start,time);
  filter.frequency.exponentialRampToValueAtTime(maximum,time+0.014);
  filter.frequency.exponentialRampToValueAtTime(Math.max(130,start*0.64),time+dur);
  out.gain.setValueAtTime(0.0001,time);
  out.gain.linearRampToValueAtTime(0.25+velocity*0.26+accent*0.10,time+0.004);
  out.gain.exponentialRampToValueAtTime(0.0001,time+dur);
  const distortion=ctx.createWaveShaper();
  // Mild asymmetric overdrive to add 303 harmonics without clipping the bus.
  const curve=new Float32Array(256);
  for(let i=0;i<curve.length;i++){
    const x=i/127.5-1;
    curve[i]=Math.tanh(x*(1.35+accent*1.8))*0.85;
  }
  distortion.curve=curve;distortion.oversample='2x';
  osc.connect(distortion);distortion.connect(filter);filter.connect(out);out.connect(chanGain.acid);
  osc.start(time);osc.stop(time+dur+0.025);
}
function psyTriggerFM(note,time,morph){
  if(!ctx||!chanGain.fm)return;
  const f=hz(note),dur=Math.min(1.1,psyBeatTime()*2.15);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';
  filter.frequency.value=600+psyState.cutoff*3000+(typeof morph==='number'?morph:morphAmount)*1500;
  filter.Q.value=0.8;
  const out=ctx.createGain();
  out.gain.setValueAtTime(0.0001,time);
  out.gain.linearRampToValueAtTime(0.17,time+0.035);
  out.gain.exponentialRampToValueAtTime(0.0001,time+dur);
  filter.connect(out);out.connect(chanGain.fm);
  [-13,0,11].forEach(function(detune,i){
    const osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type=i===1?'triangle':'sawtooth';
    osc.frequency.value=f;osc.detune.value=detune;
    g.gain.value=i===1?0.38:0.24;
    osc.connect(g);g.connect(filter);osc.start(time);osc.stop(time+dur+0.05);
  });
}
function psyTriggerSweep(time){
  if(!ctx || !chanGain.fm || !psyState.transitionFX)return;
  const duration=psyBeatTime()*3.75,src=ctx.createBufferSource();
  src.buffer=getDrumNoise();src.loop=true;
  const band=ctx.createBiquadFilter(),env=ctx.createGain();
  band.type='bandpass';band.Q.value=0.55;
  band.frequency.setValueAtTime(350,time);
  band.frequency.exponentialRampToValueAtTime(6300,time+duration);
  env.gain.setValueAtTime(0.0001,time);
  env.gain.linearRampToValueAtTime(0.17,time+duration*0.83);
  env.gain.exponentialRampToValueAtTime(0.0001,time+duration);
  src.connect(band);band.connect(env);env.connect(chanGain.fm);
  src.start(time);src.stop(time+duration+0.015);
}
function psyOnStep(time){
  if(!psyState.enabled || !psyState.transitionFX)return;
  if(SEQ.masterStep===0 && SEQ.barCount%8===7)psyTriggerSweep(time);
}
function psySongPattern(bar){
  const song=psyState.song;
  const index=Math.floor(Math.max(0,bar)/song.barsPer)%song.order.length;
  return {index,pattern:song.order[index]};
}
function psyOnBar(bar){
  if(!psyState.song.enabled)return;
  const position=psySongPattern(bar);
  if(psySongIndex===position.index && curPat===position.pattern)return;
  psySongIndex=position.index;
  curPat=position.pattern;matrix=patterns[curPat];
  document.querySelectorAll('.pt').forEach(function(el){
    el.classList.toggle('active',el.getAttribute('data-pat')===curPat);
  });
  buildSeq();
  psySongStatus(bar);
}
function psySongStatus(bar){
  const status=document.getElementById('psy-song-status');
  if(!status)return;
  if(!psyState.song.enabled){status.textContent='MODE MORCEAU : désactivé';return;}
  const at=psySongPattern(bar);
  status.textContent='MODE MORCEAU : '+at.pattern+' · section '+(at.index+1)+'/'+psyState.song.order.length+' · mesure '+(bar+1);
}
function psySyncUI(){
  const root=document.getElementById('psytrance-suite');if(!root)return;
  const enable=document.getElementById('psy-enabled');
  enable.textContent=psyState.enabled?'SYNTHÈSE PSY : ON':'SYNTHÈSE PSY : OFF';
  enable.classList.toggle('on',psyState.enabled);
  const sweep=document.getElementById('psy-transitionFX');
  sweep.textContent=psyState.transitionFX?'RISERS : ON':'RISERS : OFF';
  sweep.classList.toggle('on',psyState.transitionFX);
  const song=document.getElementById('psy-song-enabled');
  song.textContent=psyState.song.enabled?'ARRANGEMENT : ON':'ARRANGEMENT : OFF';
  song.classList.toggle('on',psyState.song.enabled);
  const order=document.getElementById('psy-song-order');
  if(document.activeElement!==order)order.value=psyState.song.order;
  document.getElementById('psy-song-bars').value=String(psyState.song.barsPer);
  document.getElementById('psy-lfoRate').value=psyState.lfoRate;
  document.getElementById('psy-delayDivision').value=psyState.delayDivision;
  document.querySelectorAll('#psytrance-suite input[data-psy]').forEach(function(input){
    const key=input.dataset.psy;input.value=psyState[key];
    const value=input.parentElement.querySelector('output');
    if(value)value.textContent=key==='kickTune'?String(Math.round(psyState[key]))+' Hz':Math.round(psyState[key]*100)+'%';
  });
  root.querySelectorAll('button[data-psy-preset]').forEach(function(btn){
    btn.classList.toggle('on',psyState.style===btn.dataset.psyPreset&&psyState.enabled);
  });
  psySongStatus(SEQ.barCount);
}
function psyBuildPanel(){
  const panel=document.getElementById('panel-fx');if(!panel || document.getElementById('psytrance-suite'))return;
  const root=document.createElement('section');root.id='psytrance-suite';
  root.className='fxcard psy-suite';
  root.innerHTML='<div class="fxtitle">PSYTRANCE PRO // SOUND LAB + ARRANGEMENT</div>'+
    '<div class="biniou-hint">Un clic pour générer 4 patterns cohérents (A intro, B groove, C peak, D break). Les presets remplacent les patterns actuels : exportez votre projet JSON avant, ou utilisez UNDO.</div>'+
    '<div class="psy-presets">'+Object.entries(PSY_PRESETS).map(([key,p])=>'<button type="button" class="mb a" data-psy-preset="'+key+'">'+p.name+' · '+p.bpm+'</button>').join('')+'</div>'+
    '<div class="psy-inline"><button type="button" id="psy-enabled" class="mb"></button><button type="button" id="psy-transitionFX" class="mb m"></button></div>'+
    '<div class="psy-control-grid">'+[
      ['kickTune','KICK TUNE',43,65,1],['kickDecay','KICK DECAY',0.12,0.38,0.01],
      ['kickPunch','KICK PUNCH',0,1,0.01],['bassDecay','BASS GATE',0,1,0.01],
      ['duck','SIDECHAIN',0,0.9,0.01],['cutoff','303 CUTOFF',0,1,0.01],
      ['resonance','RESONANCE',0,1,0.01],['envelope','FILTER ENV',0,1,0.01],
      ['accent','303 ACCENT',0,1,0.01],['glide','303 GLIDE',0,1,0.01],
      ['lfoDepth','LFO DEPTH',0,1,0.01],['delay','STEREO DELAY',0,0.85,0.01],
      ['delayFeedback','FEEDBACK',0,0.72,0.01]
    ].map(function(p){
      return '<label class="psy-param"><span>'+p[1]+'</span><input data-psy="'+p[0]+'" type="range" min="'+p[2]+'" max="'+p[3]+'" step="'+p[4]+'"><output></output></label>';
    }).join('')+'</div>'+
    '<div class="psy-tempo-grid"><label>LFO SYNC <select id="psy-lfoRate"><option>1/2</option><option>1/4</option><option>1/8</option><option>1/16</option></select></label>'+
    '<label>DELAY SYNC <select id="psy-delayDivision"><option>1/8</option><option>3/16</option><option>1/4</option></select></label></div>'+
    '<div class="psy-arrange"><div class="fxtitle">SONG MODE // A B C D</div>'+
    '<div class="biniou-hint">Suite de sections A/B/C/D, automatiquement enchaînées au début de chaque groupe de mesures. Exemple : AABBCCDD à 4 mesures = arrangement de 32 mesures, en boucle et inclus dans WAV/MP3.</div>'+
    '<label for="psy-song-order">SECTIONS <input id="psy-song-order" type="text" maxlength="32" spellcheck="false" placeholder="AABBCCDD"></label>'+
    '<label for="psy-song-bars">MESURES / SECTION <select id="psy-song-bars"><option>1</option><option>2</option><option>4</option><option>8</option><option>16</option></select></label>'+
    '<button type="button" class="mb" id="psy-song-enabled"></button><div id="psy-song-status" aria-live="polite"></div></div>';
  panel.prepend(root);
  root.querySelectorAll('button[data-psy-preset]').forEach(btn=>{
    btn.addEventListener('click',function(){
      if(studioExportBusy || SEQ.playing){setStatus('STOP AVANT CHARGEMENT PRESET','al');return;}
      if(!window.confirm('Remplacer les patterns A/B/C/D par '+btn.textContent+' ? La version actuelle pourra être restaurée avec UNDO.'))return;
      psyApplyPreset(btn.dataset.psyPreset);
    });
  });
  root.querySelectorAll('input[data-psy]').forEach(input=>{
    input.addEventListener('pointerdown',pushUndo);
    input.addEventListener('input',function(){
      const key=input.dataset.psy;
      psyState[key]=Number(input.value);psyApplyFX();psySyncUI();saveLiveState();
    });
  });
  for(const key of ['lfoRate','delayDivision']){
    document.getElementById('psy-'+key).addEventListener('change',function(e){
      pushUndo();psyState[key]=e.target.value;psyApplyFX();saveLiveState();psySyncUI();
    });
  }
  document.getElementById('psy-enabled').addEventListener('click',function(){
    pushUndo();psyState.enabled=!psyState.enabled;psyApplyFX();psySyncUI();saveLiveState();
  });
  document.getElementById('psy-transitionFX').addEventListener('click',function(){
    pushUndo();psyState.transitionFX=!psyState.transitionFX;psySyncUI();saveLiveState();
  });
  document.getElementById('psy-song-enabled').addEventListener('click',function(){
    pushUndo();psyState.song.enabled=!psyState.song.enabled;psySongIndex=-1;
    if(SEQ.playing)psyOnBar(SEQ.barCount);
    psySyncUI();saveLiveState();
  });
  document.getElementById('psy-song-order').addEventListener('change',function(e){
    const clean=e.target.value.toUpperCase().replace(/[^ABCD]/g,'').slice(0,32);
    if(!clean){e.target.value=psyState.song.order;setStatus('ORDRE A/B/C/D REQUIS','al');return;}
    pushUndo();psyState.song.order=clean;psySongIndex=-1;
    if(SEQ.playing)psyOnBar(SEQ.barCount);
    psySyncUI();saveLiveState();
  });
  document.getElementById('psy-song-bars').addEventListener('change',function(e){
    pushUndo();psyState.song.barsPer=Number(e.target.value);psySongIndex=-1;
    if(SEQ.playing)psyOnBar(SEQ.barCount);
    psySyncUI();saveLiveState();
  });
  psySyncUI();
}
