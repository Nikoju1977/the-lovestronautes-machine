import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const raw=fs.readFileSync('psytrance-lab.js','utf8');
const steps=[];
function audioParam(initial=0){
  return {value:initial,
    setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},
    linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},
    cancelScheduledValues(){}};
}
function node(){
  return {gain:audioParam(1),frequency:audioParam(1000),delayTime:audioParam(),
    detune:audioParam(),Q:audioParam(),pan:audioParam(),
    connect(){return this;},start(t){steps.push(['start',t]);},stop(t){steps.push(['stop',t]);}};
}
const fakeCtx={
  sampleRate:48000,currentTime:0.5,
  createGain:node,createDelay:node,createChannelMerger:node,
  createOscillator:node,createBiquadFilter:node,createWaveShaper:node,
  createBufferSource:node
};
const scope={
  ctx:fakeCtx,bpm:145,chanGain:{kick:node(),sub:node(),acid:node(),fm:node()},
  duckingGain:node(),isMultiOut:false,morphAmount:0,
  getDrumNoise(){return {duration:0.45};},
  hz(note){
    const table={F2:87.307,E2:82.407,G2:98,A2:110,F3:174.61};
    return table[note]||110;
  }
};
const world=vm.createContext(scope);
const lab=vm.runInContext(raw+'\n({PSY_PRESETS,psyStateSnapshot,psyRestoreState,psyPresetBank,psySongPattern,psyBeatTime,psyDivisionBeats,psyInitFX,psyApplyFX,psyAttachSend,psyTriggerKick,psyTriggerBass,psyTriggerAcid,psyTriggerFM,psyTriggerSweep})',world);
for(const style of ['fullon','dark','progressive','forest']){
  const bank=lab.psyPresetBank(style);
  assert.deepEqual(Object.keys(bank).sort(),['A','B','C','D']);
  for(const p of Object.values(bank)){
    assert.deepEqual(Object.keys(p).sort(),['acid','auto','biniou','fm','hat','kick','metal','snare','sub']);
    for(const v of Object.values(p))assert.equal(v.length,16);
  }
  const groove=bank.B;
  assert.deepEqual([0,4,8,12].map(i=>groove.kick[i]),[1,1,1,1]);
  for(let i=0;i<16;i++){
    assert.equal(groove.sub[i]!==null,i%4!==0,'K-B-B-B pulse');
  }
  assert.equal(bank.D.kick.every(v=>v===0),true,'breakdown without four-on-the-floor');
}
console.log('✓ Four psytrance styles: four complete patterns, tuned bass and breakdown');
lab.psyRestoreState({psy:{
  enabled:true,style:'dark',kickTune:123,delayFeedback:8,lfoRate:'bad',
  song:{enabled:true,order:'AB$CDC',barsPer:4}
}});
const restored=lab.psyStateSnapshot();
assert.equal(restored.kickTune,65);
assert.equal(restored.delayFeedback,0.72);
assert.equal(restored.lfoRate,'1/4');
assert.equal(restored.song.order,'ABCDC');
assert.equal(restored.song.enabled,true);
assert.equal(lab.psySongPattern(0).pattern,'A');
assert.equal(lab.psySongPattern(4).pattern,'B');
assert.equal(lab.psySongPattern(8).pattern,'C');
assert.equal(lab.psySongPattern(20).pattern,'A');
lab.psyRestoreState({});
assert.equal(lab.psyStateSnapshot().enabled,false,'legacy projects preserve previous synths');
console.log('✓ JSON migration, sanitization and bar-synced song mode');
lab.psyRestoreState({psy:{enabled:true,delayDivision:'3/16',delayFeedback:0.36,transitionFX:true}});
lab.psyInitFX();
const fx=vm.runInContext('psyFX',world);
assert.ok(fx);
assert.ok(Math.abs(fx.left.delayTime.value-60/145*0.75)<1e-8);
lab.psyAttachSend('acid',node());
assert.ok(fx.sends.acid);
lab.psyAttachSend('sub',node());
assert.equal(fx.sends.sub,undefined);
console.log('✓ Stereo tempo-synced ping-pong delay and selective sends');
lab.psyTriggerKick(0.7);
lab.psyTriggerBass('F2',0.9,0.75);
lab.psyTriggerAcid('F3',0.8,1.2,0.22,{accent:true,slide:true});
lab.psyTriggerFM('F3',1.4,0.2);
lab.psyTriggerSweep(1.9);
assert.ok(steps.length>=18);
assert.ok(steps.every(([,t])=>Number.isFinite(t)&&t>=0));
console.log('✓ Web Audio synth scheduling: kick, bass, 303, supersaw and transition');
console.log('\nPsytrance production suite tests: OK');
