/* V17 regression: KOMA Field Kit-inspired engine and mobile parametric EQ. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const field=fs.readFileSync('field-kit.js','utf8');
const studio=fs.readFileSync('studio-features.js','utf8');
const master=fs.readFileSync('audio-extensions.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const keyboard=fs.readFileSync('studio-keyboard.js','utf8');
const creator=fs.readFileSync('psy-track-creator.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('mobile-v17.css','utf8');

class Param{
 constructor(v=0){this.value=v;this.events=[];}
 setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}
 setTargetAtTime(v,t,a){this.value=v;this.events.push(['target',v,t,a]);}
 linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);}
 exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exponential',v,t]);}
 cancelScheduledValues(t){this.events.push(['cancel',t]);}
}
let started=0,stopped=0;
class Node{
 constructor(kind){this.kind=kind;this.type='sine';this.targets=[];this.onended=null;
 this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(.71);
 this.delayTime=new Param(.18);this.pan=new Param(0);}
 connect(node){assert.ok(node);this.targets.push(node);return node;}
 disconnect(){this.disconnected=true;this.targets=[];}
 start(t){assert.ok(Number.isFinite(t));this.startTime=t;started++;}
 stop(t){assert.ok(Number.isFinite(t));this.stopTime=t;stopped++;}
}
const context={currentTime:10,state:'running',sampleRate:48000,
 createGain:()=>new Node('gain'),createDelay:()=>new Node('delay'),
 createOscillator:()=>new Node('oscillator'),createBiquadFilter:()=>new Node('filter'),
 createBufferSource:()=>new Node('sample'),createStereoPanner:()=>new Node('stereo'),
 createAnalyser:()=>new Node('analyser'),
 createBuffer(channels,frames,rate){
  const data=Array.from({length:channels},()=>new Float32Array(frames));
  return {duration:frames/rate,length:frames,sampleRate:rate,numberOfChannels:channels,
   getChannelData:i=>data[i]};
 }};
const output=new Node('main-mix');
const safeDocument={getElementById:()=>null,querySelectorAll:()=>[]};
const storage=[];
const sandbox={ctx:context,chanGain:{fieldkit:output},bpm:128,
 hz:()=>220,document:safeDocument,setTimeout,clearTimeout,setInterval,clearInterval,
 Math,Array,Object,Number,JSON,Map,Float32Array,Promise,
 saveLiveState:()=>storage.push('saved')};
const kit=vm.runInNewContext(field+
 '\n({getState:()=>fieldkitState,fieldkitSanitize,fieldkitEnsurePatterns,fieldkitProjectState,fieldkitRestoreState,fieldkitApplyPreset,fieldkitEnsureGraph,fieldkitTrigger,fieldkitStopVoices,fieldkitVoices,fieldkitUseSample,fieldkitSource,fieldkitApplyMix,fieldkitStopMic,FIELDKIT_PRESETS})',sandbox);

const bank=Object.fromEntries(['A','B','C','D'].map(k=>[k,{}]));
kit.fieldkitEnsurePatterns(bank);
assert.equal(bank.C.fieldkit.length,16);
assert.equal(bank.C.fieldkit.filter(Boolean).length,0,'do not start extra voices automatically');
bank.C.fieldkit[9]={note:'G3',vel:.8};
kit.fieldkitEnsurePatterns(bank);
assert.equal(bank.C.fieldkit[9].note,'G3','existing notes remain intact');
console.log('✓ 17th sequencer track and non-destructive migration');

const clean=kit.fieldkitSanitize({master:30,radioTune:-1,enabled:false,channels:[
 {source:'invalid',gain:5,level:-2,tone:NaN,aux:.8}]});
assert.equal(clean.master,1);assert.equal(clean.radioTune,0);assert.equal(clean.enabled,false);
assert.equal(clean.channels.length,4);assert.equal(clean.channels[0].source,'osc');
assert.equal(clean.channels[0].gain,1);assert.equal(clean.channels[0].level,0);
assert.equal(clean.channels[0].tone,.46);
assert.ok(kit.fieldkitApplyPreset('antenna'));
assert.equal(kit.getState().channels[0].source,'radio');
assert.equal(kit.fieldkitApplyPreset('NOT_VALID'),false);
console.log('✓ Validated four-channel presets and bounded parameters');

const graph=kit.fieldkitEnsureGraph();
assert.equal(graph.channels.length,4);
assert.ok(graph.master.targets.includes(output),'master routed into studio fieldkit channel');
assert.ok(graph.wet.targets.includes(output),'aux return reaches export bus');
const before=started;
assert.equal(kit.fieldkitTrigger('F3',10.1,.78),true);
assert.ok(started-before>=4,'4 radio/motor/noise channels scheduled');
assert.equal(kit.fieldkitVoices.length,1,'bounded event voice');
const voice=kit.fieldkitVoices[0];
assert.equal(voice.gains.length,4);
assert.equal(voice.sources.length,4,'two virtual radio-noise lanes plus motor and noise sources');
for(let i=0;i<4;i++)assert.ok(voice.gains[i].targets.includes(graph.channels[i].input),'independent mixer strip '+i);
assert.ok(voice.sources.every(n=>n.stopTime>n.startTime),'all nodes terminate');
kit.fieldkitTrigger('G3',10.3,.7);
assert.equal(kit.fieldkitVoices.length,1,'no mobile CPU voice pileup');
assert.ok(voice.gains[0].gain.events.some(e=>e[0]==='cancel'),'old voice fades');
kit.fieldkitStopVoices();
assert.equal(kit.fieldkitVoices.length,0);
console.log('✓ 4 independent sound generators, mixer, AUX and bounded voice stealing');

const input=context.createBuffer(2,48000,48000);
const L=input.getChannelData(0),R=input.getChannelData(1);
L.fill(.4);R.fill(-.2);
assert.equal(kit.fieldkitUseSample(input,'test.wav'),true);
assert.ok(kit.fieldkitProjectState().sampleName==='test.wav');
const sample=kit.fieldkitSource('sample','C3',10.5,.5,3);
assert.ok(sample.sources.length===1,'imported audio can be auditioned');
const saved=JSON.parse(JSON.stringify({fieldkit:kit.fieldkitProjectState()}));
kit.fieldkitRestoreState(saved);
assert.equal(kit.fieldkitProjectState().sampleName,null,'import JSON never falsely revives lost audio samples');
console.log('✓ PCM sample remix, JSON patch persistence and honest transient sample state');

const eqWorld={ctx:context,chanGain:{kick:new Node('kick'),fieldkit:new Node('fieldkit')},
 Math,Number,JSON,Object,Array,document:safeDocument};
const eq=vm.runInNewContext(studio+
 '\n({STUDIO_TRACKS,STUDIO_EQ,studioChannels,studioNodes,studioInitChannel,studioApplyMix,studioEqTrim,studioApplyEqPreset,restoreStudioState,studioEqFrequencies})',eqWorld);
assert.equal(eq.STUDIO_TRACKS.length,17);
assert.equal(eq.STUDIO_EQ.length,4);
assert.ok(eq.STUDIO_TRACKS.includes('fieldkit'));
assert.notEqual(eq.studioEqFrequencies('kick',48000)[0],eq.studioEqFrequencies('speak',48000)[0]);
const kIn=new Node('kick in'),kOut=new Node('kick out');
eq.studioInitChannel('kick',kIn,kOut);
assert.equal(eq.studioNodes.kick.filters.length,4);
assert.ok(eq.studioApplyEqPreset('kick','punch'));
const trim1=eq.studioEqTrim(eq.studioChannels.kick);
assert.ok(trim1<.88,'positive EQ must consume headroom');
eq.studioChannels.kick.eqOn=false;assert.equal(eq.studioEqTrim(eq.studioChannels.kick),.88);
eq.studioApplyMix();
assert.ok(eq.studioNodes.kick.filters.every(f=>f.gain.value===0),'bypass zeroes all 4 band gains');
eq.restoreStudioState({studio:{channels:{fieldkit:{eqOn:true,low:2,mid:-1,high:1}},bars:16}});
assert.equal(eq.studioChannels.fieldkit.presence,0,'old 3 band projects gain neutral presence');
console.log('✓ 17-channel 4-band EQ, per-instrument frequencies, presets, bypass and anti-clip compensation');

const mastering=vm.runInNewContext(master+
 '\n({eqState,masterEqHeadroom,masterEqPreset})',{Math,Number,Object,Array,ctx:null,document:safeDocument});
assert.equal(mastering.masterEqHeadroom(),.78);
mastering.eqState.gains=[6,6,6,6,6];
assert.ok(mastering.masterEqHeadroom()<.78);
assert.ok(mastering.masterEqPreset('field'));
assert.equal(mastering.eqState.preset,'field');
console.log('✓ 5-band master EQ presets and adaptive headroom');

assert.ok(html.includes("fieldkitEnsurePatterns(bank)")&&html.includes("fieldkitRestoreState(state)"));
assert.ok(html.includes("const fieldCell=m.fieldkit")&&html.includes("fieldkitBuildRack()"));
assert.ok(creator.includes('<option value="fieldkit">'));
assert.ok(keyboard.includes("if(mode==='fieldkit')return fieldkitTrigger"));
assert.ok(sw.includes('lovestronautes-v17')&&sw.includes("new URL('./field-kit.js', scope).href"));
assert.ok(html.includes('mobileUIBuild()')&&css.includes('.mobile-studio-dock'));
console.log('✓ Song Mode, keyboard, loops, offline PWA and phone dock wired');
console.log('\nField Kit + mobile EQ V17 regression: OK');
