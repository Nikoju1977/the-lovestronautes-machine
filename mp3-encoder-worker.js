'use strict';
/* LGPL-3.0 MP3 encoder dependency: ../vendor/lame.min.js */
importScripts('./vendor/lame.min.js');
self.onmessage=function(e){
  try{
    const {chunks,sampleRate,bitRate}=e.data;
    if(![32000,44100,48000].includes(sampleRate))throw Error('MP3 exige 32, 44.1 ou 48 kHz');
    const encoder=new lamejs.Mp3Encoder(2,sampleRate,bitRate);
    const encoded=[];let total=0;
    function push(buffer){
      if(!buffer||!buffer.length)return;
      const bytes=Uint8Array.from(buffer,n=>n&255);encoded.push(bytes);total+=bytes.length;
    }
    function pcm(x){
      const n=Math.max(-1,Math.min(1,x));
      return Math.round(n*(n<0?32768:32767));
    }
    for(const chunk of chunks){
      const left=new Float32Array(chunk.left),right=new Float32Array(chunk.right);
      for(let start=0;start<left.length;start+=1152){
        const len=Math.min(1152,left.length-start),l=new Int16Array(len),r=new Int16Array(len);
        for(let i=0;i<len;i++){l[i]=pcm(left[start+i]);r[i]=pcm(right[start+i]);}
        push(encoder.encodeBuffer(l,r));
      }
    }
    push(encoder.flush());
    if(total<128)throw Error('MP3 vide');
    const result=new Uint8Array(total);let pos=0;
    for(const part of encoded){result.set(part,pos);pos+=part.length;}
    self.postMessage({buffer:result.buffer},[result.buffer]);
  }catch(error){self.postMessage({error:error.message||'Erreur encodeur MP3'});}
};
