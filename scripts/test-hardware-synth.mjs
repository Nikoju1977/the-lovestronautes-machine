import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code=fs.readFileSync('hardware-synth-lab.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('studio-features.js','utf8');
const keyboard=fs.readFileSync('studio-keyboard.js','utf8');
const creator=fs.readFileSync('psy-track-creator.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

class Param{
 constructor(v=0){this.value=v;this.log=[];}
 setValueAtTime(v,t){this.value=v;this.log.push(['set',v,t]);}
 linearRampToValueAtTime(v,t){this.value=v;this.log.push(['linear',v,t]);}
 exponentialRampToValueAtTime(v,t){this.value=v;this.log.push(['exp',v,t]);}
 setTargetAtTime(v,t,dt){this.value=v;this.log.push(['target',v,t,dt]);}
 cancelScheduledValues(t){this.log.push(['cancel',t]);}
}
const all=[];
let startCount=0;
class Node{
 constructor(kind){
  this.kind=kind;this.type='sine';this.frequency=new Param(440);
  this.gain=new Param(1);this.Q=new Param(.8);this.pan=new Param(0);
  this.targets=[];all.push(this);
 }
 connect(target){assert.ok(target);this.targets.push(target);return target;}
 disconnect(){this.disconnected=true;}
 start(time){startCount++;this.startAt=time;}
 stop(time){this.stopAt=time;}
}
const ctx={state:'running',currentTime:10,sampleRate:48000,
 createGain:()=>new Node('gain'),
 createOscillator:()=>new Node('osc'),
 createBiquadFilter:()=>new Node('filter'),
 createBufferSource:()=>new Node('noise'),
 createStereoPanner:()=>new Node('panner')};
const outputs=Object.fromEntries(['mbase','solar','modfm','wing'].map(k=>[k,new Node('output')]));
const saved=[];
const runtime={ctx,chanGain:outputs,getDrumNoise:()=>({duration:1}),
 hz:()=>220,saveLiveState:()=>saved.push(1),
 document:{getElementById:()=>null,querySelectorAll:()=>[]},
 setTimeout,clearTimeout,Math,Map,Object,Array,JSON,Number,Float32Array,Promise,Error};
const api=vm.runInNewContext(code+'\n({hardwareState,hardwareVoices,hardwareSanitize,hardwareProjectState,hardwareRestoreState,hardwareEnsurePatterns,hardwareApplyPreset,hardwareTrigger,hardwareStop})',runtime);
const patterns=Object.fromEntries(['A','B','C','D'].map(letter=>[letter,{kick:Array(16).fill(0)}]));
api.hardwareEnsurePatterns(patterns);
for(const p of Object.values(patterns))for(const k of ['mbase','solar','modfm','wing']){
 assert.equal(p[k].length,16);
 assert.equal(p[k].filter(Boolean).length,0);
}
patterns.C.mbase[0]=1;
api.hardwareEnsurePatterns(patterns);
assert.equal(patterns.C.mbase[0],1);
console.log('✓ Old projects migrate silently to 16 tracks without duplicating kick');

const unsafe={mbase:{preset:'deep',patch:{pitch:99,decay:-2,harmonics:.45}},
 modfm:{preset:'bells',patch:{ratio1:900,algorithm:'bad',index:2}}};
api.hardwareRestoreState({hardware:unsafe});
assert.equal(api.hardwareState.mbase.pitch,1);
assert.equal(api.hardwareState.mbase.decay,0);
assert.equal(api.hardwareState.modfm.ratio1,8);
assert.equal(api.hardwareState.modfm.algorithm,'chain');
assert.equal(api.hardwareState.modfm.index,1);
assert.ok(api.hardwareApplyPreset('mbase','techno'));
assert.ok(api.hardwareApplyPreset('solar','dark'));
assert.ok(api.hardwareApplyPreset('modfm','lead'));
assert.ok(api.hardwareApplyPreset('wing','chaos'));
assert.equal(api.hardwareApplyPreset('wing','__not_a_preset'),false);
const snapshot=JSON.parse(JSON.stringify(api.hardwareProjectState()));
api.hardwareRestoreState({hardware:snapshot});
assert.equal(api.hardwareState.wing.chaos,.81);
console.log('✓ Preset change, safe parameter clamps and JSON save/restore');

const counts={};
for(const k of ['mbase','solar','modfm','wing']){
 const before=startCount;
 assert.equal(api.hardwareTrigger(k,'F3',10.03,.7),true,k+' must be playable');
 counts[k]=startCount-before;
 assert.ok(counts[k]>=2,k+' must start real Web Audio sources');
 assert.ok(all.some(n=>n.targets.includes(outputs[k])),k+' must route to own mixer channel');
}
assert.ok(counts.solar>=5);
assert.ok(counts.modfm===4);
assert.ok(counts.wing>=4);
assert.ok(all.some(n=>n.kind==='filter'),'Filters are connected');
assert.ok(all.some(n=>n.kind==='osc'&&n.targets.length>0),'Oscillators connected');
console.log('✓ Four playable engines: kick, five-oscillator drone, four-op FM, dual resonator');

for(let i=0;i<10;i++){
 for(const k of ['mbase','solar','modfm','wing'])
  api.hardwareTrigger(k,'C3',10.15+i*.08,.8);
}
assert.ok(api.hardwareVoices.mbase.length<=3);
assert.ok(api.hardwareVoices.solar.length<=2);
assert.ok(api.hardwareVoices.modfm.length<=3);
assert.ok(api.hardwareVoices.wing.length<=3);
api.hardwareStop();
assert.ok(['mbase','solar','modfm','wing'].every(k=>api.hardwareVoices[k].length===0));
console.log('✓ Bounded mobile polyphony, voice stealing and stop');

assert.ok(html.includes('hardwareEnsurePatterns(bank)'));
assert.ok(html.includes('hardwareRestoreState(state)'));
assert.ok(html.includes('hardware: hardwareProjectState()'));
assert.ok(html.includes("['theremin','speak','s1','taiga','mbase','solar','modfm','wing','fieldkit','grandmother'].forEach"));
assert.ok(html.includes('hardwareTrigger(machine,'));
assert.ok(html.includes('hardwareBuildRacks()'));
assert.ok(studio.includes("'mbase','solar','modfm','wing','fieldkit','grandmother']"));
for(const k of ['mbase','solar','modfm','wing'])
 assert.ok(keyboard.includes("['mbase','solar','modfm','wing'].includes(mode)"));
assert.ok(creator.includes('<option value="solar">'));
assert.ok(creator.includes('<option value="modfm">'));
assert.ok(creator.includes('<option value="wing">'));
assert.ok(sw.includes('hardware-synth-lab.js')&&sw.includes('hardware-synth-lab.css'));
console.log('✓ Sequencer, touch/MIDI keyboard, mixer, Song Mode, PWA and master export integration');
console.log('\nHardware-inspired V15 synth tests: OK');
