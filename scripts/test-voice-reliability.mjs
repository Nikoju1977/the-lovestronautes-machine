/* Audio regression: untruncated voice, PCM microphone and bounded FM polyphony. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code=fs.readFileSync('psy-machines.js','utf8');
const stopCalls=[],startCalls=[];
class Param{
  constructor(v=0){this.value=v;}
  setValueAtTime(v){this.value=v;}
  setTargetAtTime(v){this.value=v;}
  linearRampToValueAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
  cancelScheduledValues(){}
}
class MockNode {
  constructor(){this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1);
    this.playbackRate=new Param(1);this.detune=new Param(0);}
  connect(target){assert.ok(target);return target;}
  disconnect(){}
  start(time){startCalls.push(time);}
  stop(time){stopCalls.push(time);}
}
const soundNodes={};
const ctx={
  currentTime:10,sampleRate:44100,state:'running',
  createGain:()=>new MockNode(),
  createOscillator:()=>new MockNode(),
  createBiquadFilter:()=>new MockNode(),
  createBufferSource:()=>{const src=new MockNode();soundNodes.lastSource=src;return src;},
  createMediaStreamSource:()=>new MockNode(),
  createScriptProcessor:()=>{const p=new MockNode();soundNodes.processor=p;return p;},
  createBuffer:(_channels,size,rate)=>{
    const data=new Float32Array(size);
    return {duration:size/rate,getChannelData:()=>data};
  },
  async decodeAudioData(){return {duration:2.8};},
  destination:new MockNode()
};
const statusEl={textContent:''},recordEl={disabled:false,textContent:'MICRO 3 S'};
let streamStopped=0,permissionAsked=0;
const sandbox={
  ctx,chanGain:{speak:new MockNode(),fm:new MockNode()},
  studioChannels:{speak:{mute:false}},
  navigator:{mediaDevices:{async getUserMedia(){permissionAsked++;return {getTracks:()=>[{stop(){streamStopped++;}}]};}}},
  document:{getElementById(id){return id==='psy-record-voice'?recordEl:id==='psy-voice-status'?statusEl:null;}},
  activateStudioAudio:async()=>true,
  studioEnsurePCMWorklet:async()=>false,
  initAudio:()=>{},
  hz:()=>261.6256,
  bpm:145,
  setTimeout(fn,_delay){
    if(soundNodes.processor?.onaudioprocess){
      const values=Float32Array.from({length:4096},(_,i)=>Math.sin(i/40)*.12);
      soundNodes.processor.onaudioprocess({inputBuffer:{getChannelData:()=>values}});
    }
    fn();
    return 1;
  },
  Math,Float32Array,ArrayBuffer,Number,JSON,Array,Object,Error,Promise
};
const realm=vm.createContext(sandbox);
const app=vm.runInContext(code+'\n({psyTriggerFM2,psyTriggerSpeak,psyCaptureMicroPCM,psyRecordVoice,psyLoadVoiceFile,psyPlayingVoices,psyVoiceLoaded,getVoiceBuffer:()=>psyVoiceBuffer})',realm);

for(let i=0;i<12;i++)app.psyTriggerFM2('C4',10+i*.07,.85);
assert.ok(app.psyPlayingVoices.fm.length<=3,'FM polyphony must remain <=3');
console.log('✓ FM simultaneous voices capped at three');

const buffer={duration:3,getChannelData:()=>new Float32Array(4096)};
app.psyVoiceLoaded(buffer,'TEST 3 S');
const before=stopCalls.length;
app.psyTriggerSpeak(18,.9);
assert.ok(stopCalls.slice(before).some(t=>Math.abs(t-21)<.005),'Recorded voice playback must last 3 seconds');
console.log('✓ 3-second recorded voice plays full 3 seconds (not 0.7 s)');

const fromFile={size:2000,name:'ma-voix.wav',arrayBuffer:async()=>new ArrayBuffer(16)};
const decoded=await app.psyLoadVoiceFile(fromFile);
assert.equal(decoded.duration,2.8);
assert.match(statusEl.textContent,/VOIX PRÊTE/);
console.log('✓ Imported voice decodes and status becomes VOIX PRÊTE');

await app.psyRecordVoice();
assert.equal(permissionAsked,1,'Micro permission requested exactly once');
assert.equal(streamStopped,1,'Micro stream stopped on completion');
assert.equal(recordEl.disabled,false,'Record button usable after capture');
assert.ok(app.getVoiceBuffer().duration>.15,'PCM capture must produce a decoded buffer');
assert.match(statusEl.textContent,/MICRO OK/);
assert.ok(startCalls.length>0,'Voice automatically previewed after recording');
console.log('✓ Android-style PCM microphone capture, playback and cleanup');

console.log('\nVoice and audio stability regression tests: OK');
