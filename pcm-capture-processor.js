'use strict';
/* Real-time stereo PCM tap. A zero-gain sink keeps this node processing. */
class LovestronautesPCM extends AudioWorkletProcessor{
  constructor(){
    super();this.left=new Float32Array(4096);this.right=new Float32Array(4096);
    this.position=0;this.stopping=false;this.closed=false;
    this.port.onmessage=e=>{if(e.data && e.data.type==='stop')this.stopping=true;};
  }
  emit(){
    if(!this.position)return;
    const left=this.left.slice(0,this.position),right=this.right.slice(0,this.position);
    this.port.postMessage({type:'chunk',left,right},[left.buffer,right.buffer]);
    this.position=0;
  }
  process(inputs,outputs){
    const input=inputs[0];
    if(!this.closed && input && input.length){
      const left=input[0],right=input.length>1?input[1]:left;
      for(let i=0;i<left.length;i++){
        this.left[this.position]=left[i];this.right[this.position]=right[i];
        if(++this.position===4096)this.emit();
      }
    }
    if(this.stopping&&!this.closed){this.emit();this.port.postMessage({type:'done'});this.closed=true;}
    if(outputs[0])outputs[0].forEach(channel=>channel.fill(0));
    return true;
  }
}
registerProcessor('lovestronautes-pcm-capture',LovestronautesPCM);
