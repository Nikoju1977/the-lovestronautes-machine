import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const tracks=['kick','snare','hat','sub','acid','fm','biniou','metal','theremin','speak','s1','taiga','mbase','solar','modfm','wing','fieldkit','grandmother'];
const scope={STUDIO_TRACKS:tracks,studioChannels:Object.fromEntries(tracks.map(t=>[t,{mute:false,solo:false}])),
 biniouEnabled:true,bpm:120,swing:.5,TextEncoder,Blob,console,
 document:{getElementById:()=>null,querySelectorAll:()=>[]},SEQ:{nextTime:10,playing:true},
 ctx:{currentTime:1},psyState:{t8:{enabled:true},td3:{enabled:true},fm2:{enabled:true}},studioSafeTrigger:(t,fn)=>fn()};
const context=vm.createContext(scope);
const api=vm.runInContext(fs.readFileSync('composition-pro.js','utf8')+`\n({composeState,composeRun,composeView,composeSanitize,composeRestoreState,composeProjectState,composeNewClip,composeSelected,composeMidiBytes,composeEvents,composeDuration,composeDispatch,composeResize,composeQuantize,composeAtBar,composeTotalBars,composeBoundary,composeHTML})`,context);
const fresh=()=>{api.composeRestoreState({});return vm.runInContext('composeState',context);};
let state=fresh();
api.composeNewClip(null,'Phrase',4);
let clip=api.composeSelected();
assert.equal(clip.tracks.fm.length,64);
clip.tracks.fm[0]={note:'C4',vel:.8,gate:2,probability:1,shift:0};
clip.tracks.fm[17]={note:'D4',vel:.6,gate:1,probability:1,shift:0};
clip.tracks.kick[0]={note:'C2',vel:.5,gate:1,probability:1,shift:0};
clip.tracks.hat[1]={note:'F#2',vel:.4,gate:1,probability:1,shift:0};
state.sections=[{name:'Intro',clip:clip.id,repeat:2,transpose:12,tracks:['fm','kick','hat']},
 {name:'Break',clip:clip.id,repeat:1,transpose:0,tracks:['fm']}];
assert.equal(api.composeTotalBars(),12);
assert.equal(api.composeAtBar(7).local,3);
assert.equal(api.composeAtBar(8).name,'Break');
assert.equal(api.composeAtBar(12),null);
assert.equal(api.composeEvents(0,0).find(e=>e.track==='fm').pitch,72);
assert.equal(api.composeEvents(0,0).find(e=>e.track==='kick').pitch,36,'Drums never transpose');
assert.deepEqual(Array.from(api.composeEvents(8,0),e=>e.track),['fm'],'Section masks apply without muting global mixer');
assert.equal(api.composeEvents(1,1).find(e=>e.track==='fm').pitch,74,'Second bar reads a distinct melodic phrase');
scope.studioChannels.fm.mute=true;
assert.equal(api.composeEvents(0,0).some(e=>e.track==='fm'),false);
scope.studioChannels.fm.mute=false;scope.studioChannels.kick.solo=true;
assert.deepEqual(Array.from(api.composeEvents(0,0),e=>e.track),['kick']);
scope.studioChannels.kick.solo=false;
const saved=api.composeProjectState();saved.clips[0].tracks.fm[0].note='G4';
assert.equal(clip.tracks.fm[0].note,'C4','Snapshots cannot alias live notes');
api.composeResize(clip,8);assert.equal(clip.tracks.fm.length,128);
assert.equal(clip.tracks.fm[64].note,'C4','Expanded phrases repeat existing musical content');
clip.tracks.fm[64].note='E4';assert.equal(clip.tracks.fm[0].note,'C4','New measures are independent copies');
api.composeResize(clip,4);
console.log('✓ Multi-bar clips, repeat boundaries, section masks, mixer mute/solo and independent copies');

const hostile=api.composeSanitize({clips:[{id:1,bars:99,tracks:{fm:[{note:'<script>',vel:99}],kick:[{vel:9,gate:999,probability:-2,shift:999}] }},{id:1,bars:4}],
 sections:[{clip:1,repeat:1000,transpose:999,tracks:['kick','__proto__']}],selected:1});
assert.equal(hostile.clips.length,1);
assert.equal(hostile.clips[0].bars,1);
assert.equal(hostile.clips[0].tracks.fm[0],null);
assert.equal(hostile.clips[0].tracks.kick[0].vel,1);
assert.equal(hostile.clips[0].tracks.kick[0].gate,8);
assert.equal(hostile.clips[0].tracks.kick[0].probability,0);
assert.equal(hostile.clips[0].tracks.kick[0].shift,20);
assert.deepEqual(Array.from(hostile.sections[0].tracks),['kick']);
assert.equal(hostile.sections[0].repeat,32);assert.equal(hostile.sections[0].transpose,24);
assert.equal(api.composeHTML('"<&'), '&quot;&lt;&amp;');
api.composeView.bar=3;api.composeView.step=12;
api.composeRestoreState({composition:api.composeProjectState()});
assert.equal(api.composeView.bar,3,'Undo/restore keeps the measure the musician is editing');
assert.equal(api.composeView.step,12,'Undo/restore keeps note selection');
state=vm.runInContext('composeState',context);clip=api.composeSelected();
state.root='F';state.scale='minor';assert.equal(api.composeQuantize(69),68,'Nearest F-minor tone for A4 is Ab4');
clip.tracks.fm[0].probability=0;assert.equal(api.composeEvents(0,0).some(e=>e.track==='fm'),false);
clip.tracks.fm[0].probability=.5;
assert.equal(JSON.stringify(api.composeEvents(0,0)),JSON.stringify(api.composeEvents(0,0)),'Probability is repeatable between audio and MIDI');
clip.tracks.fm[0].probability=1;
console.log('✓ Imported projects are bounded; note validation, harmony and deterministic probability');

// Independent MIDI reader: validate structure and semantics, not encoder internals.
function parseMidi(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=pos=>String.fromCharCode(...bytes.slice(pos,pos+4));
 assert.equal(tag(0),'MThd');assert.equal(v.getUint32(4),6);assert.equal(v.getUint16(8),1);
 const count=v.getUint16(10),ppq=v.getUint16(12),result=[];let pos=14;
 for(let t=0;t<count;t++){
  assert.equal(tag(pos),'MTrk');const end=pos+8+v.getUint32(pos+4);pos+=8;let tick=0;const events=[];
  const variable=()=>{let n=0,b;do{b=bytes[pos++];n=n*128+(b&127);}while(b&128);return n;};
  while(pos<end){
   tick+=variable();const status=bytes[pos++];
   if(status===255){const type=bytes[pos++],len=variable(),data=bytes.slice(pos,pos+len);pos+=len;events.push({tick,type,data});}
   else{assert.ok(status>=128&&status<240);events.push({tick,status,note:bytes[pos++],velocity:bytes[pos++]});}
  }
  assert.equal(pos,end);assert.equal(events.at(-1).type,47);result.push(events);
 }
 assert.equal(pos,bytes.length);return {ppq,tracks:result};
}
scope.swing=.65;
const midi=parseMidi(api.composeMidiBytes('song'));
assert.equal(midi.ppq,480);assert.equal(midi.tracks.length,19);
const conductor=midi.tracks[0];
assert.deepEqual(Array.from(conductor.find(e=>e.type===81).data),[7,161,32],'120 BPM = 500000 us / quarter');
assert.equal(conductor.filter(e=>e.type===6).length,2);
assert.equal(conductor.filter(e=>e.type===6)[1].tick,8*1920);
const fm=midi.tracks[tracks.indexOf('fm')+1],hat=midi.tracks[tracks.indexOf('hat')+1];
assert.equal(fm.find(e=>(e.status&240)===144).note,72);
assert.equal(fm.find(e=>(e.status&240)===128).tick,240,'Two-step gate preserved');
assert.equal(fm.find(e=>(e.status&240)===144).velocity,102);
assert.equal(hat.find(e=>(e.status&240)===144).tick,156,'65% swing displaces offbeat by 156 ticks');
assert.equal(hat.find(e=>(e.status&240)===144).status&15,9,'GM drums use channel 10');
assert.equal(midi.tracks[0].at(-1).tick,12*1920,'Song has exact finite length');
const clipMidi=parseMidi(api.composeMidiBytes('clip'));
assert.equal(clipMidi.tracks[0].at(-1).tick,4*1920);
assert.equal(clipMidi.tracks[tracks.indexOf('fm')+1].find(e=>(e.status&240)===144).note,60,'Clip export has no section transpose');
console.log('✓ Independent MIDI decoding: 19 tracks, 480 PPQ, tempo, markers, swing, velocity, gate, GM percussion and clip export');

// Actual dispatcher contracts: velocity and temporary gate reach every synth.
for(const name of ['psyTriggerT8Kick','psyTriggerT8Snare','psyTriggerT8Hat','triggerMetal','creatorRollingBass','psyTriggerTD3','psyTriggerFM2','triggerBiniou','psyTriggerTheremin','psyTriggerSpeak','s1Trigger','taigaTrigger','fieldkitTrigger','grandmotherTrigger','hardwareTrigger']){
 scope[name]=(...args)=>{assert.equal(api.composeDuration(.9),.25);return args;};
}
for(const track of tracks)api.composeDispatch({track,note:'C4',vel:.5,gate:2,shift:0},2);
assert.equal(api.composeDuration(.9),.9,'Gate override cleared after each trigger');
scope.s1Trigger=()=>{throw Error('test oscillator');};
assert.throws(()=>api.composeDispatch({track:'s1',note:'C4',vel:.5,gate:2,shift:0},2));
assert.equal(api.composeDuration(.9),.9,'Gate cleared even when a synth throws');
api.composeRun.active=true;api.composeRun.mode='song';api.composeRun.endBar=12;
assert.equal(api.composeBoundary(12,24.5),false);assert.equal(scope.SEQ.endTime,24.5);
assert.equal(scope.SEQ.playing,true,'Last lookahead boundary must wait for the audio clock');
console.log('✓ 18 synth dispatchers, gate cleanup on errors and finite-song lookahead boundary');

// Execute the production scheduler with a simulated audio clock at the final step.
const html=fs.readFileSync('index.html','utf8');
const scheduler=html.slice(html.indexOf('function schedulerTick()'),html.indexOf('function startSeq()'));
let played=0,stopped=0;
const seq={playing:true,nextTime:10,masterStep:15,barCount:0,endTime:0};
const clock={currentTime:9.9,state:'running'};
const sandbox={SEQ:seq,ctx:clock,document:{hidden:false},studioEcoMode:false,studioExportBusy:false,studioExportEndBar:1,composeRun:{active:false},
 scheduleStep:()=>played++,stepInterval:()=>.125,setTimeout:()=>1,
 stopSeq:tail=>{assert.equal(tail,true);stopped++;seq.playing=false;},isPlaying:true,
 $id:()=>({}),setStatus:()=>{},studioStabilityReportLateStep:()=>{}};
const tick=vm.runInNewContext(scheduler+'\nschedulerTick',sandbox);
tick();assert.equal(played,1);assert.equal(stopped,0);assert.equal(seq.endTime,10.125);
clock.currentTime=10.05;tick();assert.equal(played,1);assert.equal(stopped,0);
clock.currentTime=10.13;tick();assert.equal(stopped,1);assert.equal(played,1,'No first note from the next loop in exported tails');
console.log('✓ Production scheduler keeps the final step, stops on the audio clock and cannot record an extra loop');

const trimSource=html.slice(html.indexOf('function trimHistoryStack('),html.indexOf('function snapshotProject('));
const trim=vm.runInNewContext(trimSource+'\ntrimHistoryStack',{HISTORY_LIMIT:32,HISTORY_BYTES_LIMIT:1024});
const history=Array.from({length:32},()=> 'x'.repeat(200));trim(history);
assert.equal(history.length,2,'Large multi-bar projects have a byte-bounded history');
const huge=['x'.repeat(2000)];trim(huge);assert.equal(huge.length,1,'Keep at least one undo snapshot');
const storageSource=html.slice(html.indexOf('window.safeStorage ='),html.indexOf('window.nikoFetch ='));
const values=new Map();let full=false;
const fake={getItem:k=>values.get(k)||null,setItem(k,v){if(full)throw Error('quota');values.set(k,v);},removeItem:k=>values.delete(k)};
const browser={localStorage:fake};vm.runInNewContext(storageSource,{window:browser,Map});
assert.equal(browser.safeStorage.setItem('project','old'),true);full=true;
assert.equal(browser.safeStorage.setItem('project','new'),false,'Report temporary storage instead of claiming persistence');
assert.equal(browser.safeStorage.getItem('project'),'new','Temporary fallback must not read stale persistent data');
console.log('✓ Mobile history memory bound and truthful local-storage quota fallback');
