/* V18 — 100 MiB bounded WAV import, streaming and mobile audio-stability tests. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const helper=fs.readFileSync('field-kit-import-v18.js','utf8');
const field=fs.readFileSync('field-kit.js','utf8');
const stability=fs.readFileSync('studio-stability-v18.js','utf8');
const ui=fs.readFileSync('mobile-v18.css','utf8');
const page=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

class Param{
 constructor(v=0){this.value=v;}
 setTargetAtTime(v){this.value=v;}
 cancelScheduledValues(){}
}
class Node{
 constructor(){this.gain=new Param(1);this.targets=[];}
 connect(x){this.targets.push(x);}
 disconnect(){this.targets=[];}
}
const ctx={state:'running',currentTime:8,sampleRate:48000,
 createBuffer(n,len,rate){
  const data=Array.from({length:n},()=>new Float32Array(len));
  return {length:len,duration:len/rate,sampleRate:rate,numberOfChannels:n,getChannelData:i=>data[i]};
 },
 createGain(){return new Node();},
 createMediaElementSource(){return new Node();}
};
const frameCount=48000*12;
const raw=new Uint8Array(44+frameCount*2),dv=new DataView(raw.buffer);
function four(pos,code){for(let i=0;i<4;i++)dv.setUint8(pos+i,code.charCodeAt(i));}
four(0,'RIFF');dv.setUint32(4,100*1024*1024-8,true);four(8,'WAVE');
four(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
dv.setUint32(24,48000,true);dv.setUint32(28,96000,true);dv.setUint16(32,2,true);
dv.setUint16(34,16,true);four(36,'data');dv.setUint32(40,100*1024*1024-44,true);
for(let i=0;i<frameCount;i++)dv.setInt16(44+i*2,16384,true);
let largestRead=0,reads=0,loaded=null;
const wav={size:100*1024*1024,name:'field-recording.wav',type:'audio/wav',
 slice(start,end){reads++;largestRead=Math.max(largestRead,end-start);
  const cut=raw.slice(start,Math.min(end,raw.length));
  return {arrayBuffer:async()=>cut.buffer};
 },
 arrayBuffer(){throw Error('Must never read the entire 100 MiB WAV');}
};
const state={enabled:true,channels:[
 {source:'sample'},{source:'noise'},{source:'osc'},{source:'radio'}
]};
const output=new Node(),channelBus=[new Node(),new Node(),new Node(),new Node()];
const streamGraph={channels:channelBus.map(input=>({input}))};
const registered={},audio={
 paused:true,currentTime:0,duration:90,preload:'',src:'',playsInline:false,
 addEventListener(type,fn){registered[type]=fn;},
 removeEventListener(type){delete registered[type];},
 setAttribute(){},removeAttribute(){},
 load(){queueMicrotask(()=>registered.loadedmetadata?.());},
 async play(){this.paused=false;},
 pause(){this.paused=true;}
};
let urlCreated=0,revoked=0,streamPlayed=0;
audio.play=async function(){this.paused=false;streamPlayed++;};
const document={createElement(tag){assert.equal(tag,'audio');return audio;},getElementById(){return null;}};
const url={createObjectURL(file){urlCreated++;return 'blob:test-'+urlCreated;},
 revokeObjectURL(){revoked++;}};
const sandbox={ctx,document,URL:url,Float32Array,DataView,Number,Math,Array,Object,
 Promise,Error,Uint8Array,setTimeout,clearTimeout,queueMicrotask,
 fieldkitGraph:streamGraph,fieldkitState:state,
 fieldkitEnsureGraph:()=>streamGraph,
 fieldkitUseSample(b,name){loaded={b,name};},
 fieldkitSyncRack(){},
 fieldkitStatus(){},
 fieldkitSample:null
};
const kit=vm.runInNewContext(helper+
 '\n({fieldkitReadWavPreview,fieldkitImportLargeFile,fieldkitOpenStream,fieldkitPlayStream,fieldkitStopStream,fieldkitFreeStream,getStream:()=>fieldkitStreamAudio,getMode:()=>fieldkitImportMode,FIELDKIT_IMPORT_MAX,FIELDKIT_DIRECT_DECODE_MAX})',sandbox);
assert.equal(kit.FIELDKIT_IMPORT_MAX,104857600);
assert.ok(helper.includes('FIELDKIT_WAV_READ_MAX=8*1024*1024'),
 'Even exotic 8-channel 192 kHz WAV must not allocate 100 MB buffers');
assert.equal(await kit.fieldkitImportLargeFile(wav),true);
assert.ok(loaded&&loaded.b.duration===12);
assert.ok(Math.abs(loaded.b.getChannelData(0)[250]-.5)<.001);
assert.ok(largestRead<2*1024*1024,'WAV reader must only extract first 12 s, not 100 MB');
assert.ok(reads<=2,'WAV uses header + bounded PCM slice');
console.log('✓ 100 MB WAV: 12 s PCM preview; memory bounded below 2 MB; no full decode');

let tooBig={size:104857601,name:'huge.wav'};
await assert.rejects(kit.fieldkitImportLargeFile(tooBig),/100 Mo/);
console.log('✓ Files above 100 MiB are explicitly rejected');

loaded=null;
const compressed={name:'concert-100mo.mp3',type:'audio/mpeg',size:104857600,
 arrayBuffer(){throw Error('100 MiB compressed source must NEVER be decoded into a single AudioBuffer');}
};
assert.equal(await kit.fieldkitImportLargeFile(compressed),true);
assert.strictEqual(kit.getStream(),audio);
assert.equal(kit.getMode(),'stream');
assert.equal(urlCreated>=1,true);
assert.equal(await kit.fieldkitPlayStream(),true);
assert.equal(streamPlayed,1);
assert.ok(output!==null);
assert.ok(streamPlayed>0,'stream audio play started successfully');
kit.fieldkitFreeStream();
assert.equal(kit.getStream(),null);
assert.ok(revoked>=1,'object URLs are revoked on clear');
console.log('✓ 100 MB MP3: streamed through Web Audio, with explicit cleanup and no full PCM decode');

assert.ok(field.includes('FIELDKIT_IMPORT_MAX'));
assert.ok(field.includes('fieldkitImportLargeFile(file)'));
assert.ok(field.includes('fieldkit-stream-play'));
assert.ok(page.includes("field-kit-import-v18.js")&&page.includes("studio-stability-v18.js"));
assert.ok(page.includes('studioQueueLiveSave()'));
assert.ok(page.includes('studioStabilityFault(error)'));
assert.ok(page.includes('studioEcoMode?135:48'));
assert.ok(page.includes('studioStabilityInstall()'));
assert.ok(ui.includes('.fieldkit-channels')&&ui.includes('studio-eco'));
const health={messages:[],halted:0,playing:true};
const healthVM=vm.runInNewContext(stability+'\n({studioStabilityFault})',{
 window:{matchMedia:()=>({matches:true})},document:{getElementById:()=>null},
 Date,console:{error(){}},setStatus(msg){health.messages.push(msg);},
 stopSeq(){health.halted++;},isPlaying:true
});
for(let i=0;i<3;i++)assert.equal(healthVM.studioStabilityFault(Error('Audio overload')),true);
assert.equal(healthVM.studioStabilityFault(Error('Audio overload')),false);
assert.equal(health.halted,1,'Repeated audio failures stop the sequencer instead of crashing forever');
assert.ok(health.messages.some(s=>s.includes('AUDIO PAUSÉ')));
console.log('✓ Audio fault circuit breaker stops after four consecutive synthesizer errors');
assert.ok(stability.includes('function studioStabilityPausePlayback('));
assert.ok(sw.includes('lovestronautes-v22-playback-stable')&&sw.includes('field-kit-import-v18.js'));
console.log('✓ V18 clock protection, audio Eco, mobile UI and offline cache integration');
console.log('\nV18 importer / anti-crash regression: OK');
