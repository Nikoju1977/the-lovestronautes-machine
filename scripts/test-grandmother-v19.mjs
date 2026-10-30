/* V19 Grandmother Web Audio synth - isolated functional engine regression. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('grandmother-synth.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('studio-features.js','utf8');
const keyboard=fs.readFileSync('studio-keyboard.js','utf8');
const creator=fs.readFileSync('psy-track-creator.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('grandmother-synth.css','utf8');

class Param{
 constructor(value=0){this.value=value;this.events=[];}
 setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);}
 setTargetAtTime(value,time,smoothing){this.value=value;this.events.push(['target',value,time,smoothing]);}
 linearRampToValueAtTime(value,time){this.value=value;this.events.push(['linear',value,time]);}
 exponentialRampToValueAtTime(value,time){this.value=value;this.events.push(['exponential',value,time]);}
 cancelScheduledValues(time){this.events.push(['cancel',time]);}
}
const made=[],sources=[];
class Node{
 constructor(kind){this.kind=kind;this.type='sine';this.connections=[];this.stopTime=null;this.startTime=null;
  this.gain=new Param(1);this.Q=new Param(.71);this.frequency=new Param(440);this.delayTime=new Param(0);}
 connect(destination){assert.ok(destination,'Every audio connection needs a destination');this.connections.push(destination);return destination;}
 disconnect(){this.connections=[];}
 setPeriodicWave(wave){assert.ok(wave,'pulse waveform must be allocated');this.wave=wave;}
 start(time){assert.ok(Number.isFinite(time));this.startTime=time;}
 stop(time){assert.ok(Number.isFinite(time));this.stopTime=time;}
}
const mk=kind=>{const node=new Node(kind);made.push(node);if(['osc','sample'].includes(kind))sources.push(node);return node;};
const ctx={state:'running',currentTime:10,sampleRate:48000,
 createGain:()=>mk('gain'),createOscillator:()=>mk('osc'),createBufferSource:()=>mk('sample'),
 createBiquadFilter:()=>mk('filter'),createDelay:()=>mk('delay'),
 createPeriodicWave:()=>({type:'periodic'}),
 createBuffer(channels,length,rate){
  const planes=Array.from({length:channels},()=>new Float32Array(length));
  return {length,duration:length/rate,sampleRate:rate,numberOfChannels:channels,getChannelData:i=>planes[i]};
 }
};
const bus=mk('master-channel');
const doc={hidden:false,getElementById:()=>null,querySelectorAll:()=>[]};
let writes=0;
const scope={ctx,chanGain:{grandmother:bus},hz:()=>130.8128,
 console,Math,Number,Array,Object,JSON,Float32Array,Promise,
 document:doc,setTimeout,clearTimeout,saveLiveState:()=>writes++,
 activateStudioAudio:async()=>true,bpm:140};
const api=vm.runInNewContext(source+
 '\n({GRANDMOTHER_DEFAULT,GRANDMOTHER_PRESETS,grandmotherSanitize,'+
 'grandmotherProjectState,grandmotherRestoreState,grandmotherEnsurePatterns,'+
 'grandmotherApplyPreset,grandmotherEnsureGraph,grandmotherTrigger,'+
 'grandmotherRelease,grandmotherReleaseAll,grandmotherStop,'+
 'grandmotherToggleArp,grandmotherStopArp,'+
 'grandmotherPulse,grandmotherWave,getState:()=>grandmotherState,'+
 'getVoice:()=>grandmotherVoice,getArp:()=>grandmotherArpActive})',scope);

const bank=Object.fromEntries(['A','B','C','D'].map(k=>[k,{}]));
api.grandmotherEnsurePatterns(bank);
assert.equal(bank.A.grandmother.length,16);
assert.equal(bank.A.grandmother.filter(Boolean).length,0,'the 18th track starts silent, protecting old projects');
bank.B.grandmother[7]={note:'F3',vel:.8};
api.grandmotherEnsurePatterns(bank);
assert.equal(bank.B.grandmother[7].note,'F3','migration does not erase existing notes');
console.log('✓ New 18th sequencer track and non-destructive migration');

const corrupt=api.grandmotherSanitize({osc1:'unknown',osc2:'pulse',cutoff:99,release:-3,
 noise:Infinity,resonance:NaN,sync:true,osc1Octave:28,lfoTarget:'corrupted'});
assert.equal(corrupt.osc1,'sawtooth');
assert.equal(corrupt.osc2,'pulse');assert.equal(corrupt.cutoff,1);
assert.equal(corrupt.release,0);assert.equal(corrupt.sync,true);
assert.equal(corrupt.osc1Octave,2);assert.equal(corrupt.lfoTarget,'filter');
assert.equal(Object.keys(api.GRANDMOTHER_PRESETS).length,5);
assert.ok(api.grandmotherApplyPreset('rave'));
assert.equal(api.getState().osc1,'pulse');
assert.equal(api.grandmotherApplyPreset('invalid'),false);
console.log('✓ Five distinct patches, bounded sliders, valid VCO and mod destinations');

const graph=api.grandmotherEnsureGraph();
assert.ok(graph.dry.connections.includes(bus));
assert.ok(graph.wet.connections.includes(bus));
assert.equal(made.filter(n=>n.kind==='delay').length,2);
console.log('✓ Light spring-style dual delay routed to same master/mixer/export bus');

const before=sources.length;
assert.equal(api.grandmotherTrigger('C3',10.1,.76,true),true);
const voice=api.getVoice();
assert.ok(voice&&!voice.released,'Live note sustains until note-off');
assert.ok(sources.length-before>=2,'two independent oscillators are scheduled');
assert.equal(voice.sources.filter(n=>n.kind==='osc').length,3,'two VCO + low-rate LFO');
assert.equal(made.filter(n=>n.kind==='filter').length>=3,true,'ladder-like filters and HPF created');
assert.equal(api.grandmotherRelease('D3'),false,'unrelated MIDI note-off must not kill current note');
assert.equal(api.grandmotherRelease('C3'),true);
assert.equal(voice.released,true);
assert.ok(voice.sources.every(n=>Number.isFinite(n.stopTime)));
console.log('✓ ADSR, two VCOs, noise, LFO and reliable note-off');

assert.equal(api.grandmotherTrigger('F3',10.3,.8,false),true);
const old=api.getVoice();assert.equal(old.released,true);
assert.equal(api.grandmotherTrigger('G3',10.4,.65,false),true);
assert.notStrictEqual(api.getVoice(),old,'new note replaces the old monophonic voice');
assert.ok(old.sources.every(n=>n.stopTime<=10.5),'voice stealing forces early release');
api.grandmotherStop();assert.equal(api.getVoice(),null);
console.log('✓ Mobile monophony: fast retrigger steals previous voices and STOP clears synth');

const saved=JSON.parse(JSON.stringify({grandmother:api.grandmotherProjectState()}));
api.grandmotherRestoreState(saved);
assert.equal(api.grandmotherProjectState().preset,'rave');
assert.equal(api.getState().osc1,'pulse');
api.grandmotherRestoreState({});
assert.equal(api.getState().enabled,true);
console.log('✓ Preset JSON persistence and safe restoration of old V18 projects');

assert.ok(studio.includes("'wing','fieldkit','grandmother']"),'new voice is exposed in mixer');
assert.ok(html.includes("grandmotherEnsurePatterns(bank)")&&html.includes("grandmotherEnsurePatterns(patterns)"));
assert.ok(html.includes("grandmother: grandmotherProjectState()")&&html.includes("grandmotherRestoreState(state)"));
assert.ok(html.includes('const gmCell=m.grandmother')&&html.includes('grandmotherTrigger('));
assert.ok(html.includes('grandmotherBuildRack()')&&html.includes('grandmotherStop()'));
assert.ok(keyboard.includes("if(mode==='grandmother')return grandmotherTrigger(note,time,v,held)"));
assert.ok(keyboard.includes("grandmotherRelease(token.note)"));
assert.ok(creator.includes('<option value="grandmother">'));
assert.ok(css.includes('.grandmother-modules')&&css.includes('@media(max-width:680px)'));
assert.ok(sw.includes('lovestronautes-v19')&&sw.includes("new URL('./grandmother-synth.js', scope).href"));
console.log('✓ Keyboard/MIDI, FX, sequencer, Melody Lab, JSON and PWA all wired');
console.log('\nGrandmother V19 functional regression: OK');
