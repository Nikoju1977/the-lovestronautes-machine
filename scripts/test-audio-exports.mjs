import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code=fs.readFileSync('studio-features.js','utf8');
const features=vm.runInNewContext(code + '\n({studioWav,studioTrimPCM,studioProjectState,studioChannels,restoreStudioState})',{Blob,Float32Array,ArrayBuffer,DataView,Math,Number});
const left=new Float32Array(1024),right=new Float32Array(1024);
for(let i=0;i<left.length;i++){left[i]=Math.sin(2*Math.PI*i/64)*0.6;right[i]=-left[i];}
const wav=features.studioWav([{left,right}],44100);
const bytes=new DataView(await wav.arrayBuffer());
function textAt(offset,len){let s='';for(let i=0;i<len;i++)s+=String.fromCharCode(bytes.getUint8(offset+i));return s;}
assert.equal(textAt(0,4),'RIFF');
assert.equal(textAt(8,4),'WAVE');
assert.equal(textAt(12,4),'fmt ');
assert.equal(textAt(36,4),'data');
assert.equal(bytes.getUint32(24,true),44100);
assert.equal(bytes.getUint16(22,true),2);
assert.equal(bytes.getUint16(34,true),16);
assert.equal(bytes.getUint32(40,true),1024*4);
assert.equal(bytes.byteLength,44+1024*4);
assert.equal(bytes.getInt16(4*16+44,true),Math.round(left[16]*32767));
assert.equal(bytes.getInt16(4*16+46,true),Math.round(right[16]*32768));
console.log('✓ PCM WAV stereo: header + signed samples');

const hi=new Float32Array(1024),hr=new Float32Array(1024);
hi[0]=-1;hi[1]=1;hi[2]=.123456;hi[3]=NaN;hr[0]=.5;
const wav24=new DataView(await features.studioWav([{left:hi,right:hr}],48000,24).arrayBuffer());
assert.equal(wav24.getUint16(34,true),24);assert.equal(wav24.getUint16(32,true),6);
assert.equal(wav24.getUint32(28,true),48000*6);assert.equal(wav24.byteLength,44+1024*6);
function signed24(at){let n=wav24.getUint8(at)|(wav24.getUint8(at+1)<<8)|(wav24.getUint8(at+2)<<16);return n&0x800000?n-0x1000000:n;}
assert.equal(signed24(44),-8388608);assert.equal(signed24(50),8388607);
assert.equal(signed24(47),4194304);assert.equal(signed24(56),Math.round(hi[2]*8388607));
assert.equal(signed24(62),0,'Nonfinite PCM cannot corrupt the WAV');
assert.throws(()=>features.studioWav([{left:hi,right:hr}],48000,32));
const trimmed=features.studioTrimPCM([
 {left:new Float32Array([0,1,2,3]),right:new Float32Array([0,1,2,3]),frame:100},
 {left:new Float32Array([4,5,6,7]),right:new Float32Array([4,5,6,7]),frame:104}
],100,1.02,1.07);
assert.deepEqual(Array.from(trimmed,c=>Array.from(c.left)).flat(),[2,3,4,5,6],'PCM trimmed on exact clock frames across chunk boundaries');
const fallback=features.studioTrimPCM([{left:hi,right:hr}],100,1.1,1.2,1);
assert.equal(fallback[0].left.length,10);
console.log('✓ 24-bit PCM signed little-endian, finite samples and exact frame trimming');

features.restoreStudioState({studio:{channels:{kick:{solo:true,pan:9,low:-20,high:3}},bars:16}});
assert.equal(features.studioChannels.kick.solo,true);
assert.equal(features.studioChannels.kick.pan,1);
assert.equal(features.studioChannels.kick.low,-9);
assert.equal(features.studioChannels.kick.high,3);
assert.equal(features.studioProjectState().bars,16);
console.log('✓ Studio save/load migration and value clamps');

let processorType,workerMessages=[];
const capture=fs.readFileSync('pcm-capture-processor.js','utf8');
vm.runInNewContext(capture,{
  AudioWorkletProcessor:class{constructor(){this.port={postMessage(m){workerMessages.push(m);}};}},
  registerProcessor(name,klass){assert.equal(name,'lovestronautes-pcm-capture');processorType=klass;},
  Float32Array
});
const recorder=new processorType();
recorder.process([[left.subarray(0,128),right.subarray(0,128)]],[[new Float32Array(128),new Float32Array(128)]]);
recorder.port.onmessage({data:{type:'stop'}});
recorder.process([[left.subarray(128,256),right.subarray(128,256)]],[[new Float32Array(128),new Float32Array(128)]]);
assert.equal(workerMessages[0].type,'chunk');
assert.equal(workerMessages[0].left.length,256);
assert.equal(workerMessages[1].type,'done');
console.log('✓ Worklet stereo capture and flush');

const vendor=fs.readFileSync('vendor/lame.min.js','utf8');
const encoderScript=fs.readFileSync('mp3-encoder-worker.js','utf8');
let encodedResult=null;
const sandbox={console,Float32Array,Int16Array,Uint8Array,Int8Array,ArrayBuffer,Math,Number,
  self:{postMessage(message){encodedResult=message;}}};
const context=vm.createContext(sandbox);
sandbox.importScripts=function(path){
  assert.equal(path,'./vendor/lame.min.js');
  vm.runInContext(vendor,context);
};
vm.runInContext(encoderScript,context);
const frames=1152*5,pcmL=new Float32Array(frames),pcmR=new Float32Array(frames);
for(let i=0;i<frames;i++){pcmL[i]=0.5*Math.sin(2*Math.PI*440*i/44100);pcmR[i]=0.5*Math.sin(2*Math.PI*330*i/44100);}
sandbox.self.onmessage({data:{sampleRate:44100,bitRate:320,chunks:[{left:pcmL.buffer,right:pcmR.buffer}]}});
assert.ok(encodedResult,'MP3 worker returned a response');
assert.equal(encodedResult.error,undefined,'MP3 encoder returned error: '+encodedResult.error);
assert.ok(encodedResult.buffer instanceof ArrayBuffer);
const mp3=new Uint8Array(encodedResult.buffer);
assert.ok(mp3.length>128,'MP3 payload should be nonempty');
let hasFrame=false;
for(let i=0;i<Math.min(mp3.length-1,2048);i++){if(mp3[i]===0xff && (mp3[i+1]&0xe0)===0xe0){hasFrame=true;break;}}
assert.ok(hasFrame,'MPEG audio frame sync');
console.log('✓ MP3 320 kb/s stereo: actual LAME encode + MPEG frame header');

console.log('\nStudio Pro audio encoder tests: OK');
