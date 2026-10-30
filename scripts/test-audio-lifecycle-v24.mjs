/* V24 audio lifecycle regression: realistic Web Audio scheduled-source endings.
 * The fake graph counts disconnects and verifies shared mixer buses survive. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

class Param {
 constructor(){this.value=1;}
 setValueAtTime(value){this.value=value;return this;}
 linearRampToValueAtTime(value){this.value=value;return this;}
 exponentialRampToValueAtTime(value){this.value=value;return this;}
 setTargetAtTime(value){this.value=value;return this;}
 cancelScheduledValues(){return this;}
}
class Node {
 constructor(){this.gain=new Param();this.frequency=new Param();this.detune=new Param();
  this.Q=new Param();this.playbackRate=new Param();this.listeners=[];this.disconnects=0;}
 connect(destination){assert.ok(destination);return destination;}
 disconnect(){this.disconnects++;}
 addEventListener(type,handler){if(type==='ended')this.listeners.push(handler);}
 start(){}
 stop(){}
 finish(){this.listeners.splice(0).forEach(fn=>fn());}
}
let created=[];
const make=()=>{const n=new Node();created.push(n);return n;};
const ctx={
 currentTime:0,sampleRate:48000,
 createGain:make,createOscillator:make,createBufferSource:make,
 createBiquadFilter:make,
 createBuffer:(_channels,frames)=>({getChannelData:()=>new Float32Array(frames)})
};
const buses=Object.fromEntries(['kick','snare','hat','sub','acid','fm','biniou','metal','theremin','speak'].map(t=>[t,new Node()]));
const sandbox={
 ctx,chanGain:buses,biniouInput:buses.biniou,drumNoiseBuffer:null,
 bpm:145,composeDuration:x=>x,hz:()=>220,
 extClamp:(v,lo,hi,def)=>Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):def,
 machineParams:{snareSnap:.5,hatDecay:.4,subDecay:.5},
 biniouParams:{pitch:0,cyber:false,harmony:.3,drive:.1},morphAmount:0,
 isMultiOut:true,duckingGain:null,tension:0,
 console,Math,Date
};
const source=fs.readFileSync('audio-extensions.js','utf8');
const moduleSource=source.slice(source.indexOf('function studioAutoRelease('),source.indexOf('function buildExtendedFX()'));
assert.ok(moduleSource.includes('function triggerSub('));
const main=fs.readFileSync('index.html','utf8');
const coreSource=main.slice(main.indexOf('function _gate('),main.indexOf('// ── SCHEDULER & TURING'));
const psy=fs.readFileSync('psy-machines.js','utf8');
const exposed=vm.runInNewContext(moduleSource+'\n'+coreSource+'\n'+psy+
  '\n({triggerSnare,triggerHat,triggerSub,triggerKick,triggerAcid,triggerFM,triggerMetal,triggerBiniou,psyTriggerTD3,psyTriggerFM2,psyTriggerT8Kick,psyTriggerT8Snare,psyTriggerTheremin,psyTriggerSpeak})',sandbox);
for(const [name,args] of [
 ['triggerSnare',[1,.8]],['triggerHat',[1,.8]],['triggerSub',['C2',1,.8]],
 ['triggerKick',[1,.8]],['triggerAcid',['C3',.8,1]],['triggerFM',['C4',1]],
 ['triggerMetal',[1,.7]],['triggerBiniou',['A4',1,.8]],
 ['psyTriggerTD3',['C3',.8,1]],['psyTriggerFM2',['C4',1,.8]],
 ['psyTriggerT8Kick',[1,.8]],['psyTriggerT8Snare',[1,.8]],
 ['psyTriggerTheremin',['C4',1,.8]],['psyTriggerSpeak',[1,.8]]
]){
 created=[];
 exposed[name](...args);
 const nodes=created.slice();
 assert.ok(nodes.length>=2,name+' must construct a real note graph');
 for(const n of nodes)n.finish();
 assert.equal(nodes.filter(n=>n.disconnects===0).length,0,
  name+' left orphan per-note nodes: '+nodes.filter(n=>n.disconnects===0).length+'/'+nodes.length);
}
assert.ok(Object.values(buses).every(node=>node.disconnects===0),
 'Shared studio mixer channels may never be disconnected by per-note cleanup');
console.log('PASS: 14 real note generators free their private audio graphs after ended, shared buses stay connected');
