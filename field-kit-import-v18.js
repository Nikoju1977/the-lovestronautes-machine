/* LOVESTRONAUTES V18 · MEMORY-SAFE FIELD KIT IMPORT
 * 100 MiB maximum. PCM WAV: read only the initial 12 seconds using Blob.slice().
 * Compressed or unsupported long audio: native media-element streaming into
 * the FIELD KIT Web Audio bus, avoiding a full 100 MiB decode into RAM.
 * Streaming is real-time, not sample-accurate on step boundaries.
 */
'use strict';
const FIELDKIT_IMPORT_MAX=100*1024*1024;
const FIELDKIT_DIRECT_DECODE_MAX=4*1024*1024;
const FIELDKIT_PREVIEW_SECONDS=12;
let fieldkitStreamAudio=null,fieldkitStreamURL=null,fieldkitStreamNode=null,fieldkitStreamGain=null;
let fieldkitStreamSourceCtx=null,fieldkitStreamStopTimer=null,fieldkitStreamName='';
let fieldkitImportMode='none';

function fieldkitImportStatus(message){
 if(typeof fieldkitStatus==='function')fieldkitStatus(message);
 const node=typeof document!=='undefined'?document.getElementById('fieldkit-import-status'):null;
 if(node)node.textContent=message;
}
function fieldkitFreeStream(){
 if(fieldkitStreamStopTimer){clearTimeout(fieldkitStreamStopTimer);fieldkitStreamStopTimer=null;}
 const audio=fieldkitStreamAudio;
 if(audio){
  try{audio.pause();audio.removeAttribute('src');audio.load();}catch(e){}
 }
 if(fieldkitStreamNode)try{fieldkitStreamNode.disconnect();}catch(e){}
 if(fieldkitStreamGain)try{fieldkitStreamGain.disconnect();}catch(e){}
 if(fieldkitStreamURL)URL.revokeObjectURL(fieldkitStreamURL);
 fieldkitStreamAudio=null;fieldkitStreamURL=null;fieldkitStreamNode=null;
 fieldkitStreamGain=null;fieldkitStreamSourceCtx=null;fieldkitStreamName='';
 fieldkitImportMode='none';
}
function fieldkitStopStream(){
 if(fieldkitStreamStopTimer){clearTimeout(fieldkitStreamStopTimer);fieldkitStreamStopTimer=null;}
 if(fieldkitStreamGain&&ctx){
  const now=ctx.currentTime;
  fieldkitStreamGain.gain.cancelScheduledValues(now);
  fieldkitStreamGain.gain.setTargetAtTime(0,now,.015);
 }
 if(fieldkitStreamAudio){
  const audio=fieldkitStreamAudio;
  fieldkitStreamStopTimer=setTimeout(()=>{
   if(fieldkitStreamAudio===audio){try{audio.pause();}catch(e){}}
   fieldkitStreamStopTimer=null;
   if(typeof fieldkitSyncRack==='function')fieldkitSyncRack();
  },85);
 }
 return true;
}
function fieldkitConnectStream(){
 if(!ctx||!fieldkitGraph||!fieldkitStreamAudio)return false;
 if(fieldkitStreamSourceCtx!==ctx){
  if(typeof ctx.createMediaElementSource!=='function')
   throw Error('Lecture en flux non disponible sur ce navigateur.');
  fieldkitStreamNode=ctx.createMediaElementSource(fieldkitStreamAudio);
  fieldkitStreamGain=ctx.createGain();fieldkitStreamGain.gain.value=0;
  fieldkitStreamNode.connect(fieldkitStreamGain);
  fieldkitStreamSourceCtx=ctx;
 }
 fieldkitStreamGain.disconnect();
 if(fieldkitState.enabled){
  fieldkitState.channels.forEach((ch,i)=>{
   if(ch.source==='sample')fieldkitStreamGain.connect(fieldkitGraph.channels[i].input);
  });
 }
 return true;
}
async function fieldkitPlayStream(){
 if(!fieldkitStreamAudio)return false;
 if(!ctx||ctx.state==='closed')throw Error('Active le son avant la lecture du fichier.');
 if(fieldkitStreamStopTimer){clearTimeout(fieldkitStreamStopTimer);fieldkitStreamStopTimer=null;}
 // Prepare the graph even if the user imported a file before auditioning
 // any synth. The play() call stays in the same touch gesture for iOS Safari.
 if(typeof fieldkitEnsureGraph==='function'&&!fieldkitEnsureGraph())return false;
 if(!fieldkitConnectStream())return false;
 const audio=fieldkitStreamAudio;
 if(!fieldkitState.channels.some(ch=>ch.source==='sample')){
  fieldkitImportStatus('Choisis SAMPLE / REC sur une voie pour entendre le fichier.');
  return false;
 }
 if(!audio.paused){
  fieldkitStopStream();return true;
 }
 // A simple HTMLMediaElement is used for large files; it does not allocate
 // an AudioBuffer for the entire file. The channel EQ/master export still apply.
 if(Number.isFinite(audio.duration)&&audio.currentTime>=audio.duration-.05)audio.currentTime=0;
 fieldkitStreamGain.gain.setTargetAtTime(1,ctx.currentTime,.022);
 try{
  await audio.play();
  fieldkitImportStatus('LECTURE STREAM : '+fieldkitStreamName+' · fichier complet, sans décodage intégral');
  if(typeof fieldkitSyncRack==='function')fieldkitSyncRack();
  return true;
 }catch(error){
  fieldkitStreamGain.gain.setTargetAtTime(0,ctx.currentTime,.02);
  fieldkitImportStatus('LECTURE : '+(error.message||'touche PLAY pour autoriser le son sur iOS'));
  return false;
 }
}
function fieldkitRead16(view,offset){return view.getInt16(offset,true)/32768;}
function fieldkitWavSample(view,offset,bits,format){
 if(format===3){
  if(bits===32)return Math.max(-1,Math.min(1,view.getFloat32(offset,true)));
  if(bits===64)return Math.max(-1,Math.min(1,view.getFloat64(offset,true)));
  return 0;
 }
 if(bits===8)return (view.getUint8(offset)-128)/128;
 if(bits===16)return fieldkitRead16(view,offset);
 if(bits===24){
  let n=view.getUint8(offset)|(view.getUint8(offset+1)<<8)|(view.getUint8(offset+2)<<16);
  if(n&0x800000)n-=0x1000000;
  return n/8388608;
 }
 if(bits===32)return view.getInt32(offset,true)/2147483648;
 return 0;
}
async function fieldkitReadWavPreview(file){
 if(!ctx||typeof ctx.createBuffer!=='function')return null;
 if(!/\.(wav|wave)$/i.test(String(file.name||'')) && !/^(audio\/wav|audio\/x-wav|audio\/wave)$/i.test(file.type||''))return null;
 const head=new DataView(await file.slice(0,Math.min(file.size,1048576)).arrayBuffer());
 if(head.byteLength<44||
  head.getUint32(0,false)!==0x52494646||head.getUint32(8,false)!==0x57415645)return null; // RIFF/WAVE
 let fmt=null,dataStart=-1,dataLength=0,pos=12;
 while(pos+8<=head.byteLength){
  const fourcc=head.getUint32(pos,false),size=head.getUint32(pos+4,true);
  const offset=pos+8;
  if(fourcc===0x666d7420 && size>=16 && offset+16<=head.byteLength){
   let format=head.getUint16(offset,true);
   if(format===0xfffe && size>=40 && offset+40<=head.byteLength)
    format=head.getUint16(offset+24,true); // WAVE_FORMAT_EXTENSIBLE subformat GUID
   fmt={format,channels:head.getUint16(offset+2,true),rate:head.getUint32(offset+4,true),
    align:head.getUint16(offset+12,true),bits:head.getUint16(offset+14,true)};
  }
  if(fourcc===0x64617461){dataStart=offset;dataLength=Math.min(size,file.size-offset);break;}
  pos=offset+size+(size&1);
 }
 if(!fmt||dataStart<0||![1,3].includes(fmt.format)||![8,16,24,32,64].includes(fmt.bits))return null;
 if(fmt.format===1&&fmt.bits===64)return null;
 if(fmt.format===3&&![32,64].includes(fmt.bits))return null;
 if(fmt.channels<1||fmt.channels>8||fmt.rate<8000||fmt.rate>192000)return null;
 if(fmt.align<fmt.channels*fmt.bits/8)return null;
 const frames=Math.min(Math.floor(FIELDKIT_PREVIEW_SECONDS*fmt.rate),
  Math.floor(dataLength/fmt.align));
 if(frames<256)return null;
 const bytes=frames*fmt.align;
 // The largest PCM preview is ~18 MiB (8ch/192k/64-bit/12s); never copy 100 MiB.
 const raw=new DataView(await file.slice(dataStart,dataStart+bytes).arrayBuffer());
 const buffer=ctx.createBuffer(1,frames,fmt.rate),data=buffer.getChannelData(0);
 const stride=fmt.bits/8,mixChannels=Math.min(fmt.channels,2);
 for(let i=0;i<frames;i++){
  let sum=0;
  for(let c=0;c<mixChannels;c++)
   sum+=fieldkitWavSample(raw,i*fmt.align+c*stride,fmt.bits,fmt.format);
  data[i]=sum/mixChannels;
 }
 return {buffer,seconds:frames/fmt.rate};
}
async function fieldkitOpenStream(file,keepPreview=false){
 if(typeof document==='undefined'||typeof URL==='undefined'||!URL.createObjectURL)
  throw Error('Lecture de gros fichiers indisponible dans ce navigateur.');
 fieldkitFreeStream();
 const url=URL.createObjectURL(file);
 let audio=null;
 try{
  audio=document.createElement('audio');
  audio.preload='metadata';
  audio.playsInline=true;
  audio.setAttribute('playsinline','');
  audio.src=url;
  const ready=new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error)=>{
    if(settled)return;
    settled=true;clearTimeout(timer);
    audio.removeEventListener('loadedmetadata',onLoad);
    audio.removeEventListener('error',onError);
    if(error)reject(error);else resolve();
   };
   const onLoad=()=>finish();
   const onError=()=>finish(Error('Ce format audio ne peut pas être lu sur cet appareil.'));
   const timer=setTimeout(()=>finish(Error('Métadonnées audio non reçues : essaie WAV, MP3 ou M4A.')),12000);
   audio.addEventListener('loadedmetadata',onLoad);
   audio.addEventListener('error',onError);
  });
  audio.load();
  await ready;
  // Retain a single HTMLMediaElement and its source, irrespective of file size.
  fieldkitStreamAudio=audio;fieldkitStreamURL=url;
  fieldkitStreamName=String(file.name||'FICHIER AUDIO').slice(0,70);
  fieldkitImportMode=keepPreview?'wav+stream':'stream';
  if(typeof fieldkitEnsureGraph==='function')fieldkitEnsureGraph();
  else fieldkitConnectStream();
  audio.addEventListener('ended',()=>{
   if(fieldkitStreamAudio===audio){
    if(typeof fieldkitSyncRack==='function')fieldkitSyncRack();
    fieldkitImportStatus('FICHIER TERMINÉ · REJOUER disponible');
   }
  });
  fieldkitImportStatus('FICHIER '+(file.size/1048576).toFixed(1)+' Mo · FLUX LOCAL : '+fieldkitStreamName+
   ' · appuie sur LIRE FICHIER');
  if(typeof fieldkitSyncRack==='function')fieldkitSyncRack();
  return true;
 }catch(error){
  if(fieldkitStreamAudio===audio)fieldkitFreeStream();
  else {try{if(audio){audio.pause();audio.removeAttribute('src');audio.load();}}catch(e){}URL.revokeObjectURL(url);}
  throw error;
 }
}
async function fieldkitImportLargeFile(file){
 if(!file||!Number.isFinite(file.size)||file.size<1)
  throw Error('Fichier vide ou non disponible.');
 if(file.size>FIELDKIT_IMPORT_MAX)throw Error('Import limité à 100 Mo par fichier.');
 if(!ctx||ctx.state!=='running')throw Error('Active le son avant IMPORT AUDIO.');
 fieldkitImportStatus('ANALYSE AUDIO · '+(file.size/1048576).toFixed(1)+' Mo · aucune donnée envoyée');
 const isWav=/\.(wav|wave)$/i.test(String(file.name||''));
 if(isWav){
  const preview=await fieldkitReadWavPreview(file);
  if(preview){
   fieldkitFreeStream();
   fieldkitUseSample(preview.buffer,file.name||'WAV');
   fieldkitImportMode='wav';
   if(file.size>preview.buffer.length*2){ // full file accessible via streaming too
    try{await fieldkitOpenStream(file,true);}catch(error){
     fieldkitImportStatus('WAV : extrait '+preview.seconds.toFixed(1)+' s prêt. Lecture longue : '+error.message);
    }
   }
   if(typeof fieldkitSyncRack==='function')fieldkitSyncRack();
   return true;
  }
 }
 // Only decode tiny compressed clips when the browser reports a short duration;
 // long MP3/AAC files go through the OS media pipeline, never decodeAudioData().
 if(file.size<=FIELDKIT_DIRECT_DECODE_MAX){
  let probe=null;
  try{
   await fieldkitOpenStream(file);
   probe=fieldkitStreamAudio;
   if(probe&&Number.isFinite(probe.duration)&&probe.duration<=FIELDKIT_PREVIEW_SECONDS){
    const bytes=await file.arrayBuffer();
    const decoded=await ctx.decodeAudioData(bytes);
    fieldkitFreeStream();
    fieldkitUseSample(decoded,file.name||'SAMPLE');
    fieldkitImportMode='buffer';
    return true;
   }
   return true;
  }catch(error){
   fieldkitFreeStream();
   throw error;
  }
 }
 await fieldkitOpenStream(file);
 return true;
}
