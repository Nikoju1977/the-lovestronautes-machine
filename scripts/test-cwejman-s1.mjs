/* Regression tests for the unofficial S1 MK2 semi-modular Web Audio synth. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code=fs.readFileSync('cwejman-s1.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('studio-features.js','utf8');
const creator=fs.readFileSync('psy-track-creator.js','utf8');

class AudioParam{
  constructor(value=0){this.value=value;this.calls=[];}
  setValueAtTime(value,time){this.value=value;this.calls.push(['set',value,time]);}
  linearRampToValueAtTime(value,time){this.value=value;this.calls.push(['linear',value,time]);}
  exponentialRampToValueAtTime(value,time){this.value=value;this.calls.push(['exp',value,time]);}
  setTargetAtTime(value,time,tau){this.value=value;this.calls.push(['target',value,time,tau]);}
  cancelScheduledValues(time){this.calls.push(['cancel',time]);}
}
let starts=0,stops=0,pulseWaves=0;
const made=[];
class AudioNode{
  constructor(type){
    this.kind=type;this.type=type==='filter'?'lowpass':'sine';
    this.gain=new AudioParam(1);this.frequency=new AudioParam(440);
    this.Q=new AudioParam(.7);this.playbackRate=new AudioParam(1);
    this.connections=[];this.disconnected=false;this.onended=null;
    made.push(this);
  }
  connect(target){
    assert.ok(target,'AudioNode needs a destination');
    this.connections.push(target);
    return target;
  }
  disconnect(){this.disconnected=true;}
  start(time){assert.ok(Number.isFinite(time));this.started=time;starts++;}
  stop(time){assert.ok(Number.isFinite(time));this.stopped=time;stops++;}
  setPeriodicWave(wave){this.periodicWave=wave;}
}
const ctx={
  state:'running',currentTime:30,sampleRate:48000,
  createGain:()=>new AudioNode('gain'),
  createOscillator:()=>new AudioNode('oscillator'),
  createBiquadFilter:()=>new AudioNode('filter'),
  createWaveShaper:()=>new AudioNode('waveshaper'),
  createBufferSource:()=>new AudioNode('sample'),
  createPeriodicWave:(real,imag)=>{pulseWaves++;return {real,imag};}
};
const output=new AudioNode('output');
const storageCalls=[];
const env={ctx,chanGain:{s1:output},bpm:145,hz:n=>{
  const m=String(n).match(/^([A-G][b#]?)([0-8])$/);
  return m?220:220;
},getDrumNoise:()=>({duration:1}),saveLiveState:()=>storageCalls.push('saved'),
  document:{getElementById:()=>null,querySelectorAll:()=>[]},
  Math,Map,Float32Array,Number,Object,Array,JSON,Error,Set,clearTimeout,setTimeout};
const app=vm.runInNewContext(code+
  '\n({S1_DEFAULT,S1_PRESETS,s1State:()=>s1State,s1Voices,s1Sanitize,s1ProjectState,s1RestoreState,s1EnsurePatterns,s1ApplyPreset,s1Trigger,s1StopVoices,s1DriveShape,s1PulseWave})',env);

const bank=Object.fromEntries(['A','B','C','D'].map(n=>[n,{}]));
app.s1EnsurePatterns(bank,true);
assert.equal(bank.C.s1.length,16);
assert.equal(bank.C.s1[0].note,'F3');
assert.ok(bank.C.s1.filter(Boolean).length>=4);
const older=Object.fromEntries(['A','B','C','D'].map(n=>[n,{}]));
app.s1EnsurePatterns(older,false);
assert.equal(older.C.s1.filter(Boolean).length,0);
older.C.s1[5]={note:'Eb4',vel:.8};
app.s1EnsurePatterns(older,false);
assert.equal(older.C.s1[5].note,'Eb4');
console.log('✓ 11th track S1 MK2: factory patterns + non-destructive migration');

app.s1RestoreState({s1:{preset:'bass',patch:{
  enabled:true,osc1Wave:'bad',lpfCutoff:8,lpfRes:-1,osc2Tune:50,osc3Fine:-900,
  lpfPoles:99,mmfMode:'what',route:'invalid',level:.8
}}});
const settings=app.s1State();
assert.equal(settings.lpfCutoff,1);
assert.equal(settings.lpfRes,0);
assert.equal(settings.osc2Tune,24);
assert.equal(settings.osc3Fine,-40);
assert.equal(settings.osc1Wave,'sawtooth');
assert.equal(settings.lpfPoles,4);
assert.equal(settings.mmfMode,'bandpass');
assert.equal(settings.route,'parallel');
assert.equal(JSON.parse(JSON.stringify(app.s1ProjectState())).patch.level,.8);
assert.ok(app.s1ApplyPreset('modular'));
assert.equal(app.s1State().ring,.65);
assert.ok(storageCalls.length>0);
assert.equal(app.s1ApplyPreset('__unknown'),false);
console.log('✓ Presets, migration and validation of unsafe/corrupted parameters');

app.s1ApplyPreset('lead');
const before=starts;
assert.equal(app.s1Trigger('F3',30.08,.87),true);
assert.ok(starts-before>=4,'3 oscillators + LFO/noise must start');
assert.ok(pulseWaves>=1,'pulse oscillator uses a PeriodicWave when supported');
assert.ok(made.some(n=>n.kind==='filter'&&n.type==='bandpass'),'multimode bandpass works');
assert.ok(made.some(n=>n.kind==='waveshaper'),'distortion stage created');
assert.ok(made.some(n=>n.kind==='gain'&&n.connections.includes(output)),'real output connected to s1 mixer bus');
assert.ok(made.some(n=>n.kind==='oscillator'&&n.connections.some(c=>c instanceof AudioParam)),'ring mod uses audio-rate gain modulation');
const firstVoice=app.s1Voices[0];
assert.ok(firstVoice.amp.gain.calls.some(c=>c[0]==='exp'),'ADSR release is scheduled');
assert.ok(firstVoice.sources.every(n=>n.stopped>n.started),'sources have bounded life');
assert.equal(app.s1Voices.length,1);
console.log('✓ 3 oscillators, ring mod, pulse width, noise, LPF/MMF, EG/LFO and mixer bus');

app.s1Trigger('G3',30.18,.77);
assert.equal(app.s1Voices.length,1,'S1 remains monophonic');
assert.ok(firstVoice.amp.gain.calls.some(c=>c[0]==='cancel'),'voice stealing fades previous voice');
const after=starts;
app.s1State().enabled=false;
assert.equal(app.s1Trigger('C4',30.28,.9),false);
assert.equal(starts,after);
app.s1StopVoices();
assert.equal(app.s1Voices.length,0);
console.log('✓ Monophonic voice stealing, stop and bypass protect Android CPU');

assert.ok(html.includes("s1EnsurePatterns(bank, true)")&&html.includes("s1RestoreState(state)"));
assert.ok(html.includes("const s1Step=m.s1")&&html.includes("s1Trigger("));
assert.ok(html.includes("studioInitChannel(t,g,output)"));
assert.ok(html.includes("s1BuildRack()")&&html.includes('id="s1-jump"'));
assert.ok(studio.includes("'speak','s1']"));
assert.ok(creator.includes("creatorEditTrack")&&creator.includes('<option value="s1">'));
assert.ok(creator.includes("p.s1[step]")||creator.includes("p.s1[0]"));
console.log('✓ Wiring into sequencer, mix, patterns, Song Mode and piano roll');

console.log('\nCwejman S1 MK2 inspired synth tests: OK');
