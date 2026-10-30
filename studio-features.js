/* LOVESTRONAUTES STUDIO PRO — mobile-friendly console and PCM audio export.
   This extension is loaded before the sequencer's main inline script. */
'use strict';

const STUDIO_TRACKS=['kick','snare','hat','sub','acid','fm','biniou','metal','theremin','speak','s1','taiga','mbase','solar','modfm','wing','fieldkit','grandmother'];
const STUDIO_EQ=[
  ['low',90,'lowshelf'],['mid',650,'peaking'],
  ['presence',3200,'peaking'],['high',9600,'highshelf']
];
const STUDIO_EQ_PRESETS={
 flat:{label:'NEUTRE',values:[0,0,0,0]},
 punch:{label:'PUNCH',values:[2,-1.5,1,.5]},
 clarity:{label:'CLARTÉ',values:[-1,-1,2,1]},
 warmth:{label:'CHALEUR',values:[1.5,.8,-.8,-1.5]},
 air:{label:'AIR',values:[-1,-.5,1,2]},
 sub:{label:'SUB FOCUS',values:[2.5,-1.5,-.7,-2]}
};
const STUDIO_EQ_FREQUENCIES={
 kick:[72,380,2800,8500],mbase:[65,400,2800,8500],sub:[65,240,1900,7400],
 snare:[145,720,3700,9800],hat:[165,1100,5200,10900],metal:[145,900,4000,10800],
 acid:[90,770,3600,9300],fm:[120,950,3700,10600],
 biniou:[115,820,3000,9600],speak:[135,1000,3400,10800],
 s1:[95,660,3000,9800],taiga:[110,690,3700,10200],
 solar:[72,550,2750,9400],modfm:[105,950,4000,10800],
 wing:[125,960,4700,10500],theremin:[115,920,3900,10200],fieldkit:[100,840,3300,10000],grandmother:[75,620,2400,8700]
};
const STUDIO_EQ_RECOMMENDED={
 kick:'punch',mbase:'punch',sub:'sub',snare:'clarity',hat:'air',metal:'air',
 acid:'warmth',fm:'clarity',biniou:'warmth',speak:'clarity',
 s1:'punch',taiga:'warmth',solar:'warmth',modfm:'clarity',wing:'air',
 theremin:'clarity',fieldkit:'warmth',grandmother:'warmth'
};
function studioEqFrequencies(name,rate){
 const defs=STUDIO_EQ_FREQUENCIES[name]||STUDIO_EQ.map(b=>b[1]);
 return defs.map(f=>Math.min(f,rate*.41));
}
function studioEqTrim(settings){
 if(settings.eqOn===false)return .88;
 const positive=STUDIO_EQ.reduce((sum,b)=>sum+Math.max(0,settings[b[0]]||0),0);
 // Half the summed boosts are compensated before the filters to protect
 // transient peaks without allowing a large positive EQ to clip the bus.
 return Math.max(.23,.88*Math.pow(10,-positive*.58/20));
}
const studioChannels={};
STUDIO_TRACKS.forEach(n=>studioChannels[n]={
 mute:false,solo:false,pan:0,eqOn:true,eqPreset:'flat',low:0,mid:0,presence:0,high:0
});
const studioNodes={};
let studioExportBars=8,studioExportBusy=false,studioExportCancel=false;
let masterOutput=null,masterLimiter=null;
function studioSafe(v,min,max,otherwise){return Number.isFinite(v)?Math.min(max,Math.max(min,v)):otherwise;}
function studioProjectState(){return {channels:JSON.parse(JSON.stringify(studioChannels)),bars:studioExportBars,patchRoutes:typeof studioPatchProjectState==='function'?studioPatchProjectState():{}};}
function restoreStudioState(state){
  const saved=state && state.studio && typeof state.studio==='object'?state.studio:{};
  const tracks=saved.channels && typeof saved.channels==='object'?saved.channels:{};
  STUDIO_TRACKS.forEach(function(name){
    const src=tracks[name] && typeof tracks[name]==='object'?tracks[name]:{};
    const ch=studioChannels[name];ch.mute=src.mute===true;ch.solo=src.solo===true;
    ch.pan=studioSafe(src.pan,-1,1,0);
    ch.eqOn=src.eqOn!==false;
    ch.eqPreset=Object.prototype.hasOwnProperty.call(STUDIO_EQ_PRESETS,src.eqPreset)?src.eqPreset:'flat';
    STUDIO_EQ.forEach(function(b){ch[b[0]]=studioSafe(src[b[0]],-9,9,0);});
  });
  studioExportBars=[-1,1,2,4,8,16,32].includes(saved.bars)?saved.bars:8;
  if(typeof studioPatchRestore==='function')studioPatchRestore(saved.patchRoutes);
}
function studioInitChannel(name,input,destination){
  const frequencies=studioEqFrequencies(name,ctx.sampleRate);
  const trim=ctx.createGain(),filters=STUDIO_EQ.map(function(b,i){
    const node=ctx.createBiquadFilter();
    node.type=b[2];node.frequency.value=frequencies[i];
    if(b[2]==='peaking')node.Q.value=i===1?.84:1.05;
    return node;
  });
  input.connect(trim);
  trim.connect(filters[0]);
  for(let i=1;i<filters.length;i++)filters[i-1].connect(filters[i]);
  const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  const tail=filters[filters.length-1];
  if(pan){tail.connect(pan);pan.connect(destination);}
  else tail.connect(destination);
  studioNodes[name]={trim,filters,pan,output:destination};
  studioApplyMix();
}
function studioApplyMix(){
  const hasSolo=STUDIO_TRACKS.some(n=>studioChannels[n].solo);
  STUDIO_TRACKS.forEach(function(name){
    const settings=studioChannels[name],g=chanGain[name],nodes=studioNodes[name];
    if(g && ctx){
      const heard=!settings.mute && (!hasSolo || settings.solo);
      g.gain.setTargetAtTime(heard?studioSafe(chanVol[name],0,1,0.5):0,ctx.currentTime,0.015);
    }
    if(!nodes || !ctx)return;
    STUDIO_EQ.forEach(function(b,i){
      nodes.filters[i].gain.setTargetAtTime(settings.eqOn?settings[b[0]]:0,ctx.currentTime,.025);
    });
    nodes.trim.gain.setTargetAtTime(studioEqTrim(settings),ctx.currentTime,.025);
    if(nodes.pan)nodes.pan.pan.setTargetAtTime(settings.pan,ctx.currentTime,0.02);
  });
}
function studioApplyEqPreset(name,preset){
 const ch=studioChannels[name],presets=STUDIO_EQ_PRESETS;
 if(!ch||!Object.prototype.hasOwnProperty.call(presets,preset))return false;
 presets[preset].values.forEach(function(value,i){ch[STUDIO_EQ[i][0]]=value;});
 ch.eqOn=true;ch.eqPreset=preset;studioApplyMix();studioSyncMixer();
 return true;
}
function studioExtendChannel(name,root){
 root.dataset.studioTrack=name;
 const ch=studioChannels[name];
 const actions=document.createElement('div');actions.className='studio-mute-solo';
 actions.innerHTML='<button type="button" class="mb" aria-label="Mute '+name+'">M</button><button type="button" class="mb" aria-label="Solo '+name+'">S</button>';
 ['mute','solo'].forEach(function(key,i){
  actions.children[i].addEventListener('click',function(){
   pushUndo();ch[key]=!ch[key];studioApplyMix();studioSyncMixer();saveLiveState();
  });
 });
 root.appendChild(actions);
 const details=document.createElement('details');details.className='studio-eq-details';
 details.innerHTML='<summary>EQ 4 BANDES · RÉGLER</summary>';
 const controls=document.createElement('div');controls.className='studio-channel-controls';
 const preset=document.createElement('label');preset.className='studio-eq-preset';
 preset.innerHTML='<span>COURBE</span><select data-eq-preset aria-label="Courbe EQ '+name+'">'+
  Object.keys(STUDIO_EQ_PRESETS).map(k=>'<option value="'+k+'">'+STUDIO_EQ_PRESETS[k].label+'</option>').join('')+
  '<option value="custom">PERSONNELLE</option></select>';
 controls.appendChild(preset);
 const row=document.createElement('div');row.className='studio-eq-actions';
 row.innerHTML='<button type="button" data-eq-suggest class="mb">AUTO STYLE</button>'+
  '<button type="button" data-eq-bypass class="mb">EQ ON</button>'+
  '<button type="button" data-eq-flat class="mb">FLAT</button>';
 controls.appendChild(row);
 [['pan','PANORAMIQUE',-1,1,.05]].concat(STUDIO_EQ.map(b=>[b[0],b[0].toUpperCase(),-9,9,.5]))
   .forEach(function(b){
  const label=document.createElement('label');label.className='studio-channel-param';
  const index=STUDIO_EQ.findIndex(x=>x[0]===b[0]);
  const info=index<0?'':Math.round(studioEqFrequencies(name,48000)[index])+' Hz';
  label.innerHTML='<span>'+b[1]+(info?'<small>'+info+'</small>':'')+
    '</span><input type="range" data-studio="'+b[0]+'" min="'+b[2]+
    '" max="'+b[3]+'" step="'+b[4]+'" aria-label="'+name+' '+b[1]+
    '"><output></output>';
  const input=label.querySelector('input');
  input.addEventListener('pointerdown',pushUndo);
  input.addEventListener('input',function(){
   ch[b[0]]=Number(input.value);
   if(b[0]!=='pan'){ch.eqPreset='custom';ch.eqOn=true;}
   studioApplyMix();studioSyncMixer();saveLiveState();
  });
  controls.appendChild(label);
 });
 const trim=document.createElement('p');trim.className='studio-eq-headroom';
 trim.textContent='Headroom automatique';
 controls.appendChild(trim);
 details.appendChild(controls);root.appendChild(details);
 preset.querySelector('select').addEventListener('change',function(){
  if(this.value==='custom')return;
  pushUndo();studioApplyEqPreset(name,this.value);saveLiveState();
 });
 row.querySelector('[data-eq-suggest]').addEventListener('click',function(){
  pushUndo();studioApplyEqPreset(name,STUDIO_EQ_RECOMMENDED[name]||'flat');saveLiveState();
 });
 row.querySelector('[data-eq-bypass]').addEventListener('click',function(){
  pushUndo();ch.eqOn=!ch.eqOn;studioApplyMix();studioSyncMixer();saveLiveState();
 });
 row.querySelector('[data-eq-flat]').addEventListener('click',function(){
  pushUndo();studioApplyEqPreset(name,'flat');saveLiveState();
 });
 studioSyncMixer();
}
function studioSyncMixer(){
 if(typeof document==='undefined')return;
 document.querySelectorAll('#panel-mix [data-studio-track]').forEach(function(root){
  const ch=studioChannels[root.dataset.studioTrack];if(!ch)return;
  const buttons=root.querySelectorAll('.studio-mute-solo button');
  if(buttons.length===2){
   buttons[0].classList.toggle('on',ch.mute);buttons[1].classList.toggle('on',ch.solo);
   buttons[0].setAttribute('aria-pressed',String(ch.mute));
   buttons[1].setAttribute('aria-pressed',String(ch.solo));
  }
  root.querySelectorAll('input[data-studio]').forEach(function(input){
   const key=input.dataset.studio,value=ch[key];
   input.value=value;
   const out=input.nextElementSibling;
   if(out&&out.tagName==='OUTPUT')
    out.textContent=key==='pan'?(Math.abs(value)<.01?'C':value<0?'L'+Math.round(-value*100):'R'+Math.round(value*100))
      :(value>0?'+':'')+value.toFixed(1)+' dB';
  });
  const select=root.querySelector('[data-eq-preset]');
  if(select)select.value=ch.eqPreset;
  const bypass=root.querySelector('[data-eq-bypass]');
  if(bypass){
   bypass.textContent=ch.eqOn?'EQ ON':'BYPASS';
   bypass.classList.toggle('on',ch.eqOn);
   bypass.setAttribute('aria-pressed',String(ch.eqOn));
  }
  const trim=root.querySelector('.studio-eq-headroom');
  if(trim)trim.textContent='Headroom : '+(20*Math.log10(studioEqTrim(ch))).toFixed(1)+' dB · anti-saturation';
 });
}
function studioMakeMaster(input){
  masterLimiter=ctx.createDynamicsCompressor();
  masterLimiter.threshold.value=-2;masterLimiter.knee.value=0;
  masterLimiter.ratio.value=20;masterLimiter.attack.value=0.003;masterLimiter.release.value=0.1;
  masterOutput=ctx.createGain();masterOutput.gain.value=0.87;
  input.connect(masterLimiter);masterLimiter.connect(masterOutput);
}
function studioExportCard(){
  const panel=document.getElementById('panel-fx');if(!panel)return;
  const card=document.createElement('section');card.className='fxcard studio-export-card';
  card.id='studio-export-card';
  card.innerHTML='<div class="fxtitle">STUDIO EXPORT // WAV + MP3</div>'+
  '<p class="biniou-hint">Capture en temps réel du master stéréo traité (EQ, mix, compresseur, limiteur et effets). Gardez cette page active. Le séquenceur démarre au premier pas du pattern, ou suit toute la timeline en mode MORCEAU ENTIER.</p>'+
  '<div class="studio-export-opts"><label for="studio-bars">MESURES</label><select id="studio-bars"><option>1</option><option>2</option><option>4</option><option>8</option><option>16</option><option>32</option><option value="-1">MORCEAU ENTIER</option></select><span>WAV PCM 16 bits · MP3 320 kb/s</span></div>'+
  '<div class="studio-export-actions"><button type="button" class="dbtn g" id="studio-export-wav">EXPORT WAV</button>'+
  '<button type="button" class="dbtn m" id="studio-export-mp3">EXPORT MP3</button>'+
  '<button type="button" class="dbtn a" id="studio-export-stop" disabled>ARRÊTER</button></div>'+
  '<div id="studio-export-message" role="status" aria-live="polite" class="studio-export-message">Prêt : arrêter PLAY avant export.</div>'+
  '<progress id="studio-export-progress" max="100" value="0" aria-label="Avancement export"></progress>';
  panel.prepend(card);
  const select=document.getElementById('studio-bars');select.value=String(studioExportBars);
  select.addEventListener('change',function(){studioExportBars=Number(select.value);saveLiveState();});
  document.getElementById('studio-export-wav').addEventListener('click',()=>studioExport('wav'));
  document.getElementById('studio-export-mp3').addEventListener('click',()=>studioExport('mp3'));
  document.getElementById('studio-export-stop').addEventListener('click',()=>{studioExportCancel=true;});
}
function studioProgress(msg,pct){
  const label=document.getElementById('studio-export-message'),progress=document.getElementById('studio-export-progress');
  if(label)label.textContent=msg;if(progress && Number.isFinite(pct))progress.value=Math.min(100,Math.max(0,pct));
}
function studioButtons(busy){
  ['studio-export-wav','studio-export-mp3','studio-bars'].forEach(function(id){const el=document.getElementById(id);if(el)el.disabled=busy;});
  const stop=document.getElementById('studio-export-stop');if(stop)stop.disabled=!busy;
}
function studioSleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
// Chaque AudioContext n'enregistre le processor qu'une fois. Une seconde
// importation de module peut sinon provoquer une erreur NotSupportedError.
const studioPCMWorkletLoads=new WeakMap();
async function studioEnsurePCMWorklet(){
  if(!ctx||!ctx.audioWorklet||typeof AudioWorkletNode==='undefined')return false;
  let loading=studioPCMWorkletLoads.get(ctx);
  if(!loading){
    loading=ctx.audioWorklet.addModule('./pcm-capture-processor.js');
    studioPCMWorkletLoads.set(ctx,loading);
  }
  try{await loading;return true;}
  catch(error){
    studioPCMWorkletLoads.delete(ctx);
    console.warn('Capture PCM : repli ScriptProcessor',error);
    return false;
  }
}
async function studioReady(){
  // Called directly from the user's EXPORT click: keep activation within its gesture.
  if(!ctx||ctx.state!=='running'){
    if(!await activateStudioAudio())
      throw Error('Audio bloqué sur iOS/Android : touche ACTIVER LE SON, puis relance EXPORT.');
  }
  if(!ctx||!masterOutput||ctx.state!=='running')
    throw Error('Le moteur audio ne fonctionne pas. Sur iOS, ouvre dans Safari.');
}
async function studioCaptureStart(){
  const chunks=[];
  let node,silent,worklet=false;
  if(await studioEnsurePCMWorklet()){
    try{
      node=new AudioWorkletNode(ctx,'lovestronautes-pcm-capture',{
        numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],
        channelCount:2,channelCountMode:'explicit'
      });
      worklet=true;
      node.port.onmessage=function(e){
        if(e.data&&e.data.type==='chunk')chunks.push({left:e.data.left,right:e.data.right});
      };
    }catch(error){
      // Safari may load the module but reject construction; use the PCM fallback.
      console.warn('AudioWorklet Safari : repli ScriptProcessor',error);
      node=null;worklet=false;
    }
  }
  if(!node&&ctx.createScriptProcessor){
    node=ctx.createScriptProcessor(4096,2,2);
    node.onaudioprocess=function(e){
      const input=e.inputBuffer;
      chunks.push({left:new Float32Array(input.getChannelData(0)),
        right:new Float32Array(input.getChannelData(input.numberOfChannels>1?1:0))});
    };
  }
  if(!node)throw Error('Capture PCM non supportée par ce navigateur. Essaie REC MASTER.');
  silent=ctx.createGain();silent.gain.value=0;
  masterOutput.connect(node);node.connect(silent);silent.connect(ctx.destination);
  return {
    chunks,
    async finish(){
      if(worklet){
        await new Promise(function(resolve,reject){
          const timer=setTimeout(()=>reject(Error('Finalisation PCM expirée')),3000);
          node.port.onmessage=function(e){
            if(e.data.type==='chunk')chunks.push({left:e.data.left,right:e.data.right});
            else if(e.data.type==='done'){clearTimeout(timer);resolve();}
          };
          node.port.postMessage({type:'stop'});
        });
      }
      return chunks;
    },
    close(){
      try{masterOutput.disconnect(node);}catch(e){}
      try{node.disconnect();}catch(e){}
      if(worklet){node.port.onmessage=null;node.port.close();}
      else node.onaudioprocess=null;
      try{silent.disconnect();}catch(e){}
    }
  };
}
function studioWav(chunks,sampleRate){
  const frames=chunks.reduce((n,part)=>n+part.left.length,0);
  if(frames<512)throw Error('Capture audio vide');
  if(frames*4+44>0xffffffff)throw Error('Enregistrement WAV trop long');
  const header=new ArrayBuffer(44),v=new DataView(header);
  function tag(p,s){for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));}
  tag(0,'RIFF');v.setUint32(4,frames*4+36,true);tag(8,'WAVE');
  tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
  v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);
  v.setUint32(28,sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);
  tag(36,'data');v.setUint32(40,frames*4,true);
  const parts=[header];
  chunks.forEach(function(c){
    const out=new ArrayBuffer(c.left.length*4),view=new DataView(out);
    for(let i=0;i<c.left.length;i++){
      const l=Math.min(1,Math.max(-1,c.left[i])),r=Math.min(1,Math.max(-1,c.right[i]));
      view.setInt16(4*i,Math.round(l*(l<0?32768:32767)),true);
      view.setInt16(4*i+2,Math.round(r*(r<0?32768:32767)),true);
    }
    parts.push(out);
  });
  return new Blob(parts,{type:'audio/wav'});
}
function studioMp3(chunks,sampleRate){
  return new Promise(function(resolve,reject){
    if(typeof Worker==='undefined'){reject(Error('Web Worker MP3 non disponible'));return;}
    const encoder=new Worker('./mp3-encoder-worker.js');
    const timeout=setTimeout(function(){encoder.terminate();reject(Error('MP3 : délai expiré'));},300000);
    encoder.onmessage=function(e){
      clearTimeout(timeout);encoder.terminate();
      if(e.data.error)reject(Error(e.data.error));
      else resolve(new Blob([e.data.buffer],{type:'audio/mpeg'}));
    };
    encoder.onerror=function(e){clearTimeout(timeout);encoder.terminate();reject(Error('Erreur MP3 : '+e.message));};
    const transferable=[];
    const data=chunks.map(function(c){
      transferable.push(c.left.buffer,c.right.buffer);
      return {left:c.left.buffer,right:c.right.buffer};
    });
    encoder.postMessage({chunks:data,sampleRate,bitRate:320},transferable);
  });
}
async function studioExport(format){
  if(studioExportBusy)return;
  if(isPlaying || SEQ.playing){studioProgress('Arrêtez PLAY pour exporter depuis le début.',0);return;}
  if(isMultiOut){studioProgress('Désactivez MULTI-OUT 4CH et rechargez pour exporter en stéréo.',0);return;}
  if(mediaRecorder && mediaRecorder.state==='recording'){studioProgress('Arrêtez REC MASTER avant export.',0);return;}
  studioExportBusy=true;studioExportCancel=false;studioButtons(true);
  let tap=null,started=false;
  const exportSong=studioExportBars===-1;
  const previous={pat:curPat,morph:morphAmount};
  const play=document.getElementById('play-btn');
  try{
    studioProgress('Armement audio…',0);await studioReady();
    tap=await studioCaptureStart();
    if(studioExportCancel)throw Error('Export annulé');
    const barCount=exportSong?creatorTotalBars():studioExportBars;
    if(barCount<1||barCount>1024)throw Error('Durée du morceau invalide');
    const duration=barCount*240/(exportSong?creatorState.tempo:bpm),at=ctx.currentTime;
    if(exportSong){
      bpm=creatorState.tempo;
      const bpmInput=document.getElementById('bpm-input');if(bpmInput)bpmInput.value=bpm;
      creatorState.running=true;creatorLastSongSection=-1;
    }
    startSeq();isPlaying=true;started=true;
    if(play){play.textContent='⏸ EXPORT';play.disabled=true;}
    while(ctx.currentTime-at<duration){
      if(studioExportCancel)throw Error('Export annulé');
      if(ctx.state!=='running')throw Error('Audio interrompu');
      const amount=Math.min(1,(ctx.currentTime-at)/duration);
      studioProgress('Enregistrement '+format.toUpperCase()+' · '+Math.floor(amount*barCount)+' / '+barCount+' mesures',amount*92);
      await studioSleep(80);
    }
    stopSeq();isPlaying=false;started=false;
    if(play)play.textContent='▶ PLAY';
    studioProgress('Queue des effets…',94);
    await studioSleep(1600);
    if(studioExportCancel)throw Error('Export annulé');
    const pcm=await tap.finish();tap.close();tap=null;
    if(!pcm.length)throw Error('Capture audio vide');
    studioProgress('Encodage '+format.toUpperCase()+'…',97);
    const output=format==='wav'?studioWav(pcm,ctx.sampleRate):await studioMp3(pcm,ctx.sampleRate);
    if(output.size<128)throw Error('Fichier audio vide');
    downloadBlob(output,'lovestronautes-'+(exportSong?'song-'+barCount+'bars':curPat+'-'+barCount+'bars')+'-'+new Date().toISOString().slice(0,10)+'.'+format);
    studioProgress('Fichier '+format.toUpperCase()+' créé · '+(output.size/1048576).toFixed(1)+' Mo',100);
    setStatus('STUDIO '+format.toUpperCase()+' EXPORT OK','ok');
  }catch(error){
    studioProgress(error.message||'Export impossible',0);setStatus('EXPORT : '+(error.message||'ERREUR'),'al');
  }finally{
    if(started){stopSeq();isPlaying=false;}
    if(play){play.textContent='▶ PLAY';play.disabled=false;}
    if(tap)tap.close();
    if(exportSong){
      creatorStopSong();
      curPat=previous.pat;matrix=patterns[curPat];applyMorph(previous.morph,false);
      buildSeq();
      document.querySelectorAll('.pt').forEach(b=>b.classList.toggle('active',b.dataset.pat===curPat));
    }
    studioExportBusy=false;studioButtons(false);
  }
}
