import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('psy-track-creator.js','utf8');
let startCount=0,stopCount=0;
class Param{
  constructor(v=0){this.value=v;this.history=[];}
  setValueAtTime(v,t){this.value=v;this.history.push(['set',v,t]);}
  linearRampToValueAtTime(v,t){this.value=v;this.history.push(['linear',v,t]);}
  exponentialRampToValueAtTime(v,t){this.value=v;this.history.push(['exponential',v,t]);}
}
class Node{
  constructor(){this.gain=new Param(1);this.frequency=new Param(100);this.Q=new Param(1);}
  connect(node){assert.ok(node);return node;}
  start(){startCount++;}
  stop(){stopCount++;}
}
const patterns=Object.fromEntries(['A','B','C','D'].map(k=>[k,{
  kick:Array(16).fill(0),snare:Array(16).fill(0),hat:Array(16).fill(0),
  sub:Array(16).fill(null),acid:Array(16).fill(null),fm:Array(16).fill(null),
  theremin:Array(16).fill(null),taiga:Array(16).fill(null),metal:Array(16).fill(0),speak:Array(16).fill(0),
  biniou:Array(16).fill(null),auto:Array(16).fill(.6)
}]));
const scope={
  console,Float32Array,Number,Math,Array,JSON,Object,String,
  bpm:145,patterns,curPat:'A',matrix:patterns.A,morphAmount:.1,
  ctx:{currentTime:10,sampleRate:44100,createBiquadFilter:()=>new Node(),createGain:()=>new Node(),createOscillator:()=>new Node()},
  chanGain:{sub:new Node()},hz:note=>130,
  document:{getElementById:()=>null,querySelectorAll:()=>[]},
  applyMorph:()=>{},buildSeq:()=>{},setStatus:()=>{},
  isPlaying:false,SEQ:{playing:false},stopSeq:()=>{}
};
const context=vm.createContext(scope);
const expose='\n({creatorState,creatorProjectState,creatorRestoreState,creatorTotalBars,creatorSectionAtBar,creatorDurationSeconds,creatorGeneratePatterns,creatorScalePitch,creatorMidi,creatorRollingBass,creatorSelectSongBar,creatorSongBoundary,creatorNote})';
const api=vm.runInContext(source+expose,context);

assert.equal(api.creatorTotalBars(),192);
assert.equal(api.creatorSectionAtBar(0).section.name,'INTRO');
assert.equal(api.creatorSectionAtBar(15).section.name,'INTRO');
assert.equal(api.creatorSectionAtBar(16).section.name,'BUILD');
assert.equal(api.creatorSectionAtBar(48).section.name,'DROP');
assert.equal(api.creatorSectionAtBar(96).section.name,'BREAK');
assert.equal(api.creatorSectionAtBar(112).section.name,'RISE');
assert.equal(api.creatorSectionAtBar(136).section.name,'FINAL DROP');
assert.equal(api.creatorSectionAtBar(176).section.name,'OUTRO');
assert.equal(api.creatorSectionAtBar(192),null);
assert.ok(api.creatorDurationSeconds()>300 && api.creatorDurationSeconds()<330);
assert.equal(api.creatorState.sections[5].bars,40);
const saved=api.creatorProjectState();
api.creatorRestoreState({creator:saved});
assert.equal(api.creatorTotalBars(),192, '40-bar FINAL DROP must survive export/import');
console.log('✓ 40-bar section preserved across JSON save/restore');
console.log('✓ 192-bar arrangement and precise section boundaries');

assert.equal(api.creatorScalePitch(0,4),'F4');
assert.equal(api.creatorScalePitch(2,4),'G#4');
assert.equal(api.creatorScalePitch(7,4),'F5');
assert.equal(api.creatorMidi('F4'),65);
assert.equal(api.creatorNote(65),'F4');
const first=api.creatorGeneratePatterns(),second=api.creatorGeneratePatterns();
assert.equal(JSON.stringify(first),JSON.stringify(second),'seeded generator deterministic');
for(const p of Object.values(first)){
  for(const key of ['kick','snare','hat','sub','acid','fm','theremin','taiga','metal','speak','biniou','auto']){
    assert.equal(p[key].length,16,key+' must have 16 steps');
  }
}
assert.deepEqual([...first.C.kick],[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]);
for(let i=0;i<16;i++){
  if(i%4===0)assert.equal(first.C.sub[i],null);
  else assert.ok(first.C.sub[i].note,'rolling bass on all 12 offbeat 16ths');
}
assert.ok(first.C.fm.some(Boolean));
assert.ok(first.B.acid.some(Boolean));
assert.ok(first.C.taiga.some(Boolean),'Taiga lead has generated notes in DROP');
assert.ok(first.D.theremin.some(Boolean));
console.log('✓ tonal seeded 64-step melody + K-B-B-B kick/bass');

const beforeStart=startCount;
api.creatorRollingBass('F2',11,.75);
assert.equal(startCount-beforeStart,2);
assert.equal(stopCount,2);
console.log('✓ rolling bass schedules two oscillators');

api.creatorState.running=true;
api.creatorRestoreState({creator:{tempo:500,root:'not-note',scale:'unknown',sections:[{name:'Custom',pat:'D',bars:24,morph:5}],bass:{level:-1}}});
assert.equal(api.creatorState.running,false);
assert.equal(api.creatorState.tempo,165);
assert.equal(api.creatorState.root,'F');
assert.equal(api.creatorState.scale,'minor');
assert.equal(api.creatorState.sections[0].pat,'D');
assert.equal(api.creatorState.sections[0].bars,24);
assert.equal(api.creatorState.sections[0].morph,1);
assert.equal(api.creatorState.bass.level,0);
console.log('✓ safe bounds and save/load of V10 settings');

api.creatorRestoreState({creator:{sections:[{name:'INTRO',pat:'A',bars:4,morph:0},{name:'DROP',pat:'C',bars:8,morph:.4}]}});
api.creatorState.running=true;
assert.equal(api.creatorSelectSongBar(0),true);
assert.equal(scope.curPat,'A');
assert.equal(api.creatorSongBoundary(4),true);
assert.equal(scope.curPat,'C');
assert.equal(scope.matrix,patterns.C);
assert.equal(api.creatorSongBoundary(12),false);
console.log('✓ actual pattern switching on musical bar boundaries and finite song');

console.log('\nPSY TRACK CREATOR V10 tests: OK');
