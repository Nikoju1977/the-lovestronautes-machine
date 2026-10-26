import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('psy-machines.js','utf8');
let started=0,stopped=0;
class Param {
  constructor(value=0){this.value=value;}
  setValueAtTime(v){this.value=v;}
  setTargetAtTime(v){this.value=v;}
  linearRampToValueAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
  cancelScheduledValues(){}
}
class AudioNode {
  constructor(){this.frequency=new Param(440);this.gain=new Param(1);this.Q=new Param(1);this.detune=new Param();this.playbackRate=new Param(1);}
  connect(target){assert.ok(target);return target;}
  disconnect(){}
  start(){started++;}
  stop(){stopped++;}
}
const ctx={currentTime:10,sampleRate:44100,
  createGain:()=>new AudioNode(),createOscillator:()=>new AudioNode(),
  createBiquadFilter:()=>new AudioNode(),createBufferSource:()=>new AudioNode()};
const chanGain=Object.fromEntries(['acid','fm','kick','snare','hat','theremin','speak'].map(n=>[n,new AudioNode()]));
const params={hatDecay:.38};
const sandbox={ctx,chanGain,machineParams:params,bpm:145,isMultiOut:false,duckingGain:null,
  hz:(note)=>note==='C3'?130.813:note==='C4'?261.626:220,
  getDrumNoise:()=>({duration:.45}),
  triggerSnare:()=>{started++;},triggerHat:()=>{started++;},
  initAudio:()=>{},document:{querySelector:()=>null},
  Math,Float32Array,ArrayBuffer,Number,JSON,Array,Object};
const vmc=vm.createContext(sandbox);
const obj=vm.runInContext(source+'\n({psyEnsurePatterns,psyRestoreState,psyProjectState,psyState,psyTriggerTD3,psyTriggerFM2,psyTriggerT8Kick,psyTriggerT8Snare,psyTriggerT8Hat,psyTriggerTheremin,psyTriggerSpeak,psyStartLiveTheremin,psyMoveLiveTheremin,psyStopLiveTheremin})',vmc);
const factory=Object.fromEntries(['A','B','C','D'].map(n=>[n,{}]));
obj.psyEnsurePatterns(factory,true);
assert.equal(factory.C.theremin[0].note,'C4');
assert.equal(factory.C.speak[4],1);
const older=Object.fromEntries(['A','B','C','D'].map(n=>[n,{}]));
obj.psyEnsurePatterns(older,false);
assert.equal(older.C.speak[4],0);
assert.equal(older.C.theremin[0],null);
console.log('✓ factory patterns and backwards-compatible migration');

obj.psyRestoreState({psy:{fm2:{index:5,algorithm:8},td3:{resonance:-1},speak:{pitch:24}}});
assert.equal(obj.psyState.fm2.index,1);
assert.equal(obj.psyState.fm2.algorithm,2);
assert.equal(obj.psyState.td3.resonance,0);
assert.equal(obj.psyState.speak.pitch,12);
assert.equal(JSON.parse(JSON.stringify(obj.psyProjectState())).speak.pitch,12);
console.log('✓ synth settings validation and serialisation');

obj.psyTriggerTD3('C3',.9,10);
obj.psyTriggerFM2('C4',10,.8);
obj.psyTriggerT8Kick(10);
obj.psyTriggerT8Snare(10);
obj.psyTriggerT8Hat(10);
obj.psyTriggerTheremin('C4',10,.75);
obj.psyTriggerSpeak(10,.8);
assert.ok(started>=16);
assert.ok(stopped>=15);
console.log('✓ 5 playable Web Audio engines produce scheduled voices');

obj.psyStartLiveTheremin(.45,.5);
obj.psyMoveLiveTheremin(.8,.15);
obj.psyStopLiveTheremin();
assert.ok(started>=19);
console.log('✓ real-time theremin start / move / stop');
console.log('\nPSY instruments: OK');
