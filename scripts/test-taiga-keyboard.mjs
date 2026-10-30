/* Regression tests: Taiga-inspired synth engine, voice limits and V13 keyboards. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=fs.readFileSync('taiga-modular.js','utf8');
const kb=fs.readFileSync('studio-keyboard.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('studio-features.js','utf8');
const creator=fs.readFileSync('psy-track-creator.js','utf8');

class Param {
  constructor(value=1){this.value=value;this.events=[];}
  setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}
  setTargetAtTime(v,t,k){this.value=v;this.events.push(['target',v,t,k]);}
  linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);}
  exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exp',v,t]);}
  cancelScheduledValues(t){this.events.push(['cancel',t]);}
}
let startCount=0,stopCount=0;
const nodes=[];
class Node {
  constructor(kind){
    this.kind=kind;this.type='sine';this.gain=new Param(1);
    this.frequency=new Param(440);this.Q=new Param(.8);
    this.delayTime=new Param(.2);this.playbackRate=new Param(1);
    this.targets=[];nodes.push(this);
  }
  connect(target){assert.ok(target);this.targets.push(target);return target;}
  disconnect(){this.disconnected=true;}
  start(time){assert.ok(Number.isFinite(time));this.startAt=time;startCount++;}
  stop(time){assert.ok(Number.isFinite(time));this.stopAt=time;stopCount++;}
}
const ctx={currentTime:10,state:'running',sampleRate:48000,
  createOscillator:()=>new Node('osc'),
  createWaveShaper:()=>new Node('shaper'),
  createGain:()=>new Node('gain'),
  createBiquadFilter:()=>new Node('filter'),
  createBufferSource:()=>new Node('buffer'),
  createDelay:(maximum)=>{assert.ok(maximum>=.7);return new Node('delay');}
};
const output=new Node('output');
const view={textContent:'',value:'',classList:{toggle(){},add(){},remove(){}},setAttribute(){}};
const save=[];
const world={ctx,chanGain:{taiga:output},bpm:145,hz:()=>174.6,
  getDrumNoise:()=>({duration:.75}),saveLiveState:()=>save.push(1),
  document:{getElementById:()=>null,querySelectorAll:()=>[]},
  setTimeout,clearTimeout,Math,Number,Float32Array,Array,Map,JSON,Object,Promise,Error};
const app=vm.runInNewContext(src+
  '\n({taigaState:()=>taigaState,taigaVoices,taigaSanitize,taigaProjectState,taigaRestoreState,taigaEnsurePatterns,taigaApplyPreset,taigaFoldShape,taigaTrigger,taigaStopVoices,taigaEnsureBus,TAIGA_PRESETS})',world);

const bank=Object.fromEntries(['A','B','C','D'].map(letter=>[letter,{}]));
app.taigaEnsurePatterns(bank,true);
assert.equal(bank.C.taiga.length,16);
assert.ok(bank.C.taiga.some(n=>n&&n.note==='F3'));
const old=Object.fromEntries(['A','B','C','D'].map(letter=>[letter,{}]));
app.taigaEnsurePatterns(old,false);
assert.equal(old.C.taiga.filter(Boolean).length,0);
old.B.taiga[2]={note:'G3',vel:.6};
app.taigaEnsurePatterns(old,false);
assert.equal(old.B.taiga[2].note,'G3');
console.log('✓ Taiga 12th track: factory patterns plus nondestructive old project migration');

app.taigaRestoreState({taiga:{preset:'acid',patch:{osc1Wave:'garbage',osc2Tune:400,
  osc3Fine:-400,cutoff:4,resonance:-2,dynamicsMode:'invalid',echoFeedback:5}}});
const p=app.taigaState();
assert.equal(p.osc1Wave,'triangle');
assert.equal(p.osc2Tune,24);
assert.equal(p.osc3Fine,-40);
assert.equal(p.cutoff,1);
assert.equal(p.resonance,0);
assert.equal(p.dynamicsMode,'lpg');
assert.equal(p.echoFeedback,1);
assert.equal(JSON.parse(JSON.stringify(app.taigaProjectState())).preset,'acid');
assert.ok(app.taigaApplyPreset('forest'));
assert.equal(app.taigaState().filterSource,'snh');
assert.equal(app.taigaApplyPreset('unknown'),false);
console.log('✓ Taiga patches: sanitization, presets, import/export JSON and safe feedback');

app.taigaApplyPreset('mountain');
assert.equal(app.taigaTrigger('F3',10.07,.82),true);
assert.ok(startCount>=4,'three oscillators plus LFO / noise start');
assert.ok(nodes.filter(n=>n.kind==='shaper').length>=4,'three folding stages plus preamp');
assert.ok(nodes.some(n=>n.kind==='delay'),'one shared echo delay');
assert.ok(nodes.some(n=>n.kind==='filter'&&n.type==='lowpass'),'multimode LPF');
const first=app.taigaVoices[0];
assert.ok(first.amp.gain.events.some(e=>e[0]==='exp'),'ADSR release');
assert.ok(first.sources.every(n=>n.stopAt>n.startAt),'voices bounded');
assert.ok(nodes.some(n=>n.kind==='gain'&&n.targets.includes(output)),'output routes into studio master channel');
assert.equal(app.taigaVoices.length,1);
app.taigaTrigger('G3',10.24,.74);
assert.equal(app.taigaVoices.length,1,'monophonic voice stealing');
assert.ok(first.amp.gain.events.some(e=>e[0]==='cancel'),'previous voice fades before replacement');
const before=startCount;
app.taigaState().enabled=false;
assert.equal(app.taigaTrigger('A3',10.37,.9),false);
assert.equal(startCount,before);
app.taigaStopVoices();
assert.equal(app.taigaVoices.length,0);
console.log('✓ Three folding VCOs, filter, dynamics LPG, dual envelopes, LFO and bounded CPU');

const midiNotes=[],held=[],stopped=[];
const keyboardContext={
 ctx:{state:'running',currentTime:20},document:{
  querySelectorAll:()=>[],
  getElementById:id=>id==='studio-key-feedback'?view:null
 },
 taigaTrigger:(...args)=>{held.push(args);return true;},
 taigaStopVoices:()=>stopped.push('stop'),
 s1Trigger:(...args)=>{held.push(['s1',...args]);return true;},
 s1StopVoices:()=>stopped.push('s1'),
 psyTriggerFM2:(...args)=>midiNotes.push(args),
 psyTriggerTD3:(...args)=>midiNotes.push(args),
 psyTriggerTheremin:(...args)=>midiNotes.push(args),
 activateStudioAudio:async()=>true,
 Math,Map,Number,Object,Array,JSON,Promise,Error};
const keyboard=vm.runInNewContext(kb+
  '\n({studioNoteByMidi,studioKeyboardStart,studioKeyboardFinish,studioKeyboardMidiMessage,studioKeyboardOffAll,studioKeyPointers,studioKeyMidi,setMode:m=>studioKeyMode=m})',
 keyboardContext);
assert.equal(keyboard.studioNoteByMidi(60),'C4');
assert.equal(keyboard.studioNoteByMidi(61),'C#4');
assert.equal(keyboard.studioNoteByMidi(69),'A4');
assert.equal(keyboard.studioNoteByMidi(-5),null);
await keyboard.studioKeyboardStart('F3',.8,keyboard.studioKeyPointers,10);
assert.equal(held.length,1);
assert.equal(held[0][0],'F3');
assert.equal(held[0][3],true,'Taiga touched keys should sustain while finger held');
keyboard.studioKeyboardFinish(keyboard.studioKeyPointers,10);
assert.ok(stopped.length>=1,'releases stop note to avoid hung oscillators');
keyboard.setMode('fm2');
await keyboard.studioKeyboardStart('C4',.82,keyboard.studioKeyPointers,11);
assert.ok(midiNotes.length>=1,'other modes route to FM2');
keyboard.studioKeyboardFinish(keyboard.studioKeyPointers,11);
keyboard.setMode('taiga');
assert.equal(keyboard.studioKeyboardMidiMessage([0x90,62,112]),true);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(held.at(-1)[0],'D4');
assert.equal(keyboard.studioKeyboardMidiMessage([0x80,62,0]),true);
assert.equal(keyboard.studioKeyMidi.size,0);
assert.equal(keyboard.studioKeyboardMidiMessage([0xb0,1,80]),false,'CC left for normal MIDI handler');
keyboard.studioKeyboardOffAll();
console.log('✓ Touch, MIDI note-on/off, pressure, instrument route and anti-stuck release');

assert.ok(html.includes('function buildKeyboard() { studioKeyboardBuild(); }'));
assert.ok(html.includes('taigaEnsurePatterns(bank, true)'));
assert.ok(html.includes('taiga: taigaProjectState()'));
assert.ok(html.includes('taigaRestoreState(state)'));
assert.ok(html.includes('const taigaStep=m.taiga'));
assert.ok(html.includes("['theremin','speak','s1','taiga','mbase','solar','modfm','wing','fieldkit','grandmother'].forEach"));
assert.ok(studio.includes("'s1','taiga','mbase','solar','modfm','wing','fieldkit','grandmother']"));
assert.ok(creator.includes('<option value="taiga">'));
assert.ok(creator.includes('p.taiga[step]')||creator.includes('p.taiga[0]'));
assert.ok(html.includes('studioKeyboardMidiMessage(e.data)'));
console.log('✓ Taiga sequencer, mixer, master exports, piano roll, MIDI and keyboard wired');
console.log('\nTaiga V13 + keyboard regression tests: OK');
