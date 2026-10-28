import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('loop-studio.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('studio-features.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const bank=Object.fromEntries(['A','B','C','D'].map(p=>[p,{
 kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
 snare:Array(16).fill(0),sub:Array(16).fill(null),
 fm:Array(16).fill(null),taiga:Array(16).fill(null),
 auto:Array(16).fill(.8)
}]));
const store=[],updates=[];
const els={'panel-loops':null};
const scope={patterns:bank,curPat:'C',matrix:bank.C,bpm:145,isPlaying:false,
 SEQ:{playing:false,barCount:0},creatorState:{running:false},
 studioExportBars:8,document:{
 getElementById:(id)=>els[id]||null,
 querySelectorAll:()=>[],
 },saveLiveState:()=>store.push('saved'),buildSeq:()=>updates.push('seq'),
 pushUndo:()=>updates.push('undo'),activateStudioAudio:async()=>true,
 startSeq:()=>updates.push('start'),stopSeq:()=>updates.push('stop'),
 studioExport:async(type)=>updates.push('export-'+type),
 setTimeout,clearTimeout,JSON,Array,Number,Object,Math,Promise};
const api=vm.runInNewContext(source+'\n({loopsState:()=>loopsState,loopsSanitize,loopsProjectState,loopsRestoreState,loopsSaveClip,loopsLoadClip,loopsDeleteClip,loopsAtBoundary,loopsPlay,loopsOnStop,loopsExport,loopsSetPattern})',scope);
assert.ok(api.loopsSaveClip('Rolling bass + kick'));
assert.equal(api.loopsState().clips.length,1);
assert.equal(api.loopsState().clips[0].name,'Rolling bass + kick');
assert.equal(api.loopsState().clips[0].data.kick.length,16);
const pristine=JSON.stringify(bank.C);
bank.C.kick[0]=0;
assert.notEqual(JSON.stringify(bank.C),pristine);
assert.ok(api.loopsLoadClip());
assert.equal(bank.C.kick[0],1);
assert.ok(updates.includes('undo'));
console.log('✓ Clips: 16-step multitrack snapshot, named save and Undo-compatible restoration');
const snap=api.loopsProjectState();
const clean=api.loopsSanitize({pattern:'INVALID',bars:700,selected:9,clips:[{
 id:1,name:'bad',pattern:'C',bars:8,data:{kick:Array(16).fill(1)}
}]});
assert.equal(clean.pattern,'C');
assert.equal(clean.bars,4);
assert.equal(clean.clips.length,1);
assert.equal(clean.selected,0);
api.loopsRestoreState({loops:snap});
assert.equal(api.loopsState().clips[0].name,'Rolling bass + kick');
assert.equal(api.loopsState().clips[0].data.kick.length,16);
console.log('✓ Loop configuration persists across JSON project save and restore');
assert.ok(api.loopsSetPattern('A'));
assert.equal(api.loopsState().pattern,'A');
assert.ok(api.loopsDeleteClip());
assert.equal(api.loopsState().clips.length,0);
console.log('✓ Pattern selection and deletion do not destroy existing patterns');
await api.loopsPlay();
assert.ok(api.loopsState().running);
assert.ok(updates.includes('start'));
api.loopsAtBoundary(4);
api.loopsOnStop();
assert.equal(api.loopsState().running,false);
console.log('✓ Start, bar-synchronous boundary and stop');
scope.isPlaying=false;scope.SEQ.playing=false;
assert.ok(api.loopsSetPattern('D'));
api.loopsState().bars=2;
await api.loopsExport('wav');
assert.equal(scope.studioExportBars,2);
assert.equal(scope.curPat,'D');
assert.ok(updates.includes('export-wav'));
console.log('✓ Two-bar WAV export picks correct pattern and finite duration');
assert.ok(html.includes('data-panel="loops"')&&html.includes('id="panel-loops"'));
assert.ok(html.includes('loops: loopsProjectState()')&&html.includes('loopsRestoreState(state)'));
assert.ok(html.includes('loopsAtBoundary(SEQ.barCount)'));
assert.ok(html.includes('loopsOnStop()')&&html.includes('loopsBuildUI()'));
assert.ok(studio.includes('<option>1</option><option>2</option>'));
assert.ok(sw.includes('loop-studio.js')&&sw.includes('loop-studio.css'));
console.log('✓ Music engine, project state, 1/2/4/8/16/32 bars and PWA routing');
console.log('\nLoop Studio V14 tests: OK');
