import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8'),src=html.slice(html.indexOf('function toggleMasterRecording()'),html.indexOf('// ── WEB MIDI'));
const recorders=[],connected=[],disconnected=[],downloads=[],timers=new Map();let id=0,status='',failDownload=false;
class Recorder{constructor(stream,opts){this.mimeType=opts.mimeType;this.state='inactive';recorders.push(this);}start(){this.state='recording';}stop(){this.state='inactive';}data(text){this.ondataavailable({data:new Blob([text])});}}
const btn={classList:{add(){},remove(){}},textContent:'',disabled:false};
const env={Blob,Date,window:{MediaRecorder:Recorder},MediaRecorder:Recorder,$id:()=>btn,studioMasterSession:null,studioMasterRetry:null,mediaRecorder:null,recordingDest:null,isMultiOut:false,audioReady:true,ctx:{createMediaStreamDestination:()=>({stream:{},id:recorders.length})},masterOutput:{connect:d=>connected.push(d),disconnect:d=>{assert.ok(connected.includes(d),'Disconnect only a connected destination');disconnected.push(d.id);}},bestRecordingMime:()=> 'audio/webm',mobileRecordingExtension:()=> 'webm',downloadBlob:(blob,name)=>{if(failDownload)throw Error('download');downloads.push({blob,name});},setStatus:s=>status=s,setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:i=>timers.delete(i)};
// Use small thresholds to exercise the exact same capture logic without allocating 80 MiB.
assert.ok(src.includes('SOFT_BYTES=64*1024*1024,HARD_BYTES=80*1024*1024'));
assert.ok(src.includes('SOFT_CHUNKS=14400,HARD_CHUNKS=14500'));
const scaled=src.replace('SOFT_BYTES=64*1024*1024,HARD_BYTES=80*1024*1024','SOFT_BYTES=64,HARD_BYTES=80').replace('SOFT_CHUNKS=14400,HARD_CHUNKS=14500','SOFT_CHUNKS=4,HARD_CHUNKS=6');
const toggle=vm.runInNewContext(scaled+'\ntoggleMasterRecording',env);
toggle();const first=recorders[0];first.data('a'.repeat(64));assert.equal(env.studioMasterSession.bytes,64);assert.equal(env.studioMasterSession.stopping,true);
first.data('b'.repeat(16));assert.equal(env.studioMasterSession.bytes,80);first.onstop();
assert.equal(downloads[0].blob.size,80);assert.match(status,/LIMITE DE CAPTURE/);assert.doesNotMatch(downloads[0].name,/partiel/);
toggle();const second=recorders[1];second.data('c'.repeat(63));second.data('d'.repeat(18));assert.equal(env.studioMasterSession.bytes,63);assert.equal(env.studioMasterSession.truncated,true);
second.data('e');assert.equal(env.studioMasterSession.bytes,63);second.onstop();assert.equal(downloads[1].blob.size,63);assert.match(downloads[1].name,/partiel/);
toggle();const third=recorders[2];for(let i=0;i<4;i++)third.data('x');assert.equal(env.studioMasterSession.stopping,true);third.data('y');third.data('z');third.data('q');assert.equal(env.studioMasterSession.chunks.length,6);third.onstop();assert.equal(await downloads[2].blob.text(),'xxxxyz');assert.match(status,/PARTIEL/);
assert.deepEqual(disconnected,[0,1,2]);assert.equal(timers.size,0);
console.log('PASS byte and chunk budget thresholds, final-fragment headroom, truncated file warning and no subsequent fragment retention (scaled limits)');
