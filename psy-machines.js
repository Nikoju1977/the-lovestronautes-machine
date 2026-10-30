/* LOVESTRONAUTES MACHINE · PSY RACK · five digital instrument engines.
   Unofficial Web Audio synthesis, no hardware ROMs or proprietary samples.
   Script loads before the existing main sequencer script. */
'use strict';

// Standalone synth tests and older integrations may load this module without
// the shared audio-extensions helper; the release still needs to work.
function psyAutoRelease(source,nodes){
 if(typeof studioAutoRelease==='function')return studioAutoRelease(source,nodes);
 if(!source||typeof source.addEventListener!=='function')return;
 source.addEventListener('ended',()=>{
  for(const node of nodes)if(node&&typeof node.disconnect==='function'){
   try{node.disconnect();}catch(ignore){}
  }
 },{once:true});
}
const PSY_TRACKS=['theremin','speak'];
const PSY_DEFAULTS={
  td3:{enabled:true,cutoff:.48,resonance:.64,env:.58,decay:.49,accent:.64,slide:.36},
  fm2:{enabled:true,algorithm:0,index:.55,feedback:.3,brightness:.62,release:.38},
  t8:{enabled:true,tune:.43,punch:.68,hatOpen:.32},
  theremin:{vibrato:.24,glide:.46,tone:.67,volume:.58},
  speak:{pitch:0,robot:.63,decay:.7}
};
const psyState=JSON.parse(JSON.stringify(PSY_DEFAULTS));
let psyVoiceBuffer=null,psyVoiceName='VOIX ROBOT (SYNTH)',psyRecording=false;
let psyThereminLive=null,psyPreviousAcid=null;
// Conserve un nombre borné de voix pour éviter les pics CPU sur smartphone.
const psyPlayingVoices={fm:[],speak:[]};
let psyMicroCaptureActive=false;
let psyVoiceNextAvailableTime=-Infinity;
const PSY_VOICE_MAX_SECONDS=3;
function psyLimitVoices(kind,oscillators,envelope,start,end,max){
  const voices=psyPlayingVoices[kind];
  for(let i=voices.length-1;i>=0;i--)if(voices[i].end<=start)voices.splice(i,1);
  // Remove finished voices and cap simultaneous oscillators on low-power phones.
  while(voices.length>=max){
    const previous=voices.shift();
    // Transition courte anti-clic avant de voler la voix la plus ancienne.
    if(previous.envelope && previous.envelope.gain){
      previous.envelope.gain.cancelScheduledValues(start);
      previous.envelope.gain.setTargetAtTime(.0001,start,.008);
    }
    previous.oscillators.forEach(function(node){
      try{node.stop(start+.03);}catch(error){}
    });
  }
  voices.push({oscillators,envelope,end});
}
function psyClamp(v,min,max,fallback){return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;}
function psyProjectState(){return JSON.parse(JSON.stringify(psyState));}
function psyRestoreState(project){
  const saved=project && project.psy && typeof project.psy==='object'?project.psy:{};
  Object.keys(PSY_DEFAULTS).forEach(function(machine){
    Object.keys(PSY_DEFAULTS[machine]).forEach(function(key){
      const fallback=PSY_DEFAULTS[machine][key],value=saved[machine]&&saved[machine][key];
      if(typeof fallback==='boolean')psyState[machine][key]=typeof value==='boolean'?value:fallback;
      else if(key==='algorithm')psyState[machine][key]=Number.isInteger(value)?Math.max(0,Math.min(2,value)):fallback;
      else psyState[machine][key]=psyClamp(value,key==='pitch'?-12:0,key==='pitch'?12:1,fallback);
    });
  });
}
function psyEnsurePatterns(bank,factory){
  const thereminNotes={A:[],B:[[0,'C4']],C:[[0,'C4'],[4,'Eb4'],[8,'G4'],[12,'Bb4']],D:[[8,'G3']]};
  const speechBeats={A:[],B:[12],C:[4,12],D:[8]};
  ['A','B','C','D'].forEach(function(name){
    if(!bank[name])return;
    if(!Array.isArray(bank[name].theremin)||bank[name].theremin.length!==16){
      bank[name].theremin=Array(16).fill(null);
      if(factory)thereminNotes[name].forEach(pair=>{bank[name].theremin[pair[0]]={note:pair[1],vel:.75};});
    }
    if(!Array.isArray(bank[name].speak)||bank[name].speak.length!==16){
      bank[name].speak=Array(16).fill(0);
      if(factory)speechBeats[name].forEach(i=>bank[name].speak[i]=1);
    }
  });
}
function psyAudioReady(){
  initAudio();
  if(!ctx)throw Error('Audio indisponible');
  if(ctx.state==='suspended')ctx.resume();
}
function psyEnvelope(time,peak,duration,destination,attack=.004){
  const gain=ctx.createGain();
  gain.gain.setValueAtTime(0.0001,time);
  gain.gain.linearRampToValueAtTime(Math.max(.0001,peak),time+attack);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  gain.connect(destination);
  return gain;
}
function psyTriggerTD3(note,velocity,time){
  if(!ctx||!chanGain.acid)return;
  const p=psyState.td3,base=hz(note||'C3'),step=60/(bpm*4);
  const dur=typeof composeDuration==='function'?composeDuration(.1+step*(.42+p.decay*2.0)):.1+step*(.42+p.decay*2.0),accent=psyClamp(velocity,.1,1,.8);
  const accentBoost=accent>.8?1+p.accent*.45:1;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';
  filter.Q.value=1+p.resonance*23;
  const cutoff=Math.min(ctx.sampleRate*.43,95+Math.pow(p.cutoff,2)*3400);
  const peak=Math.min(ctx.sampleRate*.44,cutoff+120+p.env*4800*accentBoost);
  filter.frequency.setValueAtTime(cutoff,time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(cutoff+1,peak),time+.014);
  filter.frequency.exponentialRampToValueAtTime(cutoff,time+dur);
  const amp=psyEnvelope(time,.43*accent*accentBoost,dur+.015,chanGain.acid);
  filter.connect(amp);
  const nodes=[filter,amp],voices=[];
  [ ['sawtooth',.52],['square',.16] ].forEach(function(def){
    const o=ctx.createOscillator();o.type=def[0];
    const from=psyPreviousAcid && (time-psyPreviousAcid.at)<.35
      ?psyPreviousAcid.hz:base;
    o.frequency.setValueAtTime(p.slide>0.05?from:base,time);
    if(p.slide>0.05 && Math.abs(from-base)>1){
      o.frequency.exponentialRampToValueAtTime(base,time+.01+p.slide*.105);
    }
    const g=ctx.createGain();g.gain.value=def[1];o.connect(g);g.connect(filter);
    nodes.push(g,o);voices.push(o);o.start(time);o.stop(time+dur+.06);
  });
  psyAutoRelease(voices[voices.length-1],nodes);
  psyPreviousAcid={hz:base,at:time};
}
function psyTriggerFM2(note,time,vel=.8){
  if(!ctx||!chanGain.fm)return;
  const p=psyState.fm2,f=hz(note||'C4'),duration=typeof composeDuration==='function'?composeDuration(.12+p.release*1.12):.12+p.release*1.12;
  const lowpass=ctx.createBiquadFilter();lowpass.type='lowpass';
  lowpass.frequency.value=Math.min(ctx.sampleRate*.45,1500+p.brightness*14000);
  lowpass.Q.value=.55;
  const out=psyEnvelope(time,psyClamp(vel,.1,1,.8)*.35,duration,chanGain.fm,.012);
  lowpass.connect(out);const nodes=[lowpass,out];
  const carriers=[ctx.createOscillator(),ctx.createOscillator()];
  const mod=[ctx.createOscillator(),ctx.createOscillator(),ctx.createOscillator(),ctx.createOscillator()];
  const ratios=[1,2,1.01,3,4,6];
  const algo=p.algorithm;
  carriers.forEach(function(o,i){
    o.type='sine';o.frequency.value=f*ratios[i];
    const level=ctx.createGain();level.gain.value=i===0?.76:(algo===1?.15:.36);
    o.connect(level);level.connect(lowpass);nodes.push(level);
  });
  mod.forEach(function(o,i){o.type='sine';o.frequency.value=f*ratios[i+2];});
  const routes=algo===0
    ?[carriers[0],mod[0],carriers[1],mod[2]]
    :algo===1?[carriers[0],mod[0],mod[1],carriers[0]]
    :[carriers[0],carriers[1],carriers[0],carriers[1]];
  mod.forEach(function(o,i){
    const depth=ctx.createGain();
    depth.gain.value=f*(.08+p.index*2.45)*(i===0?1+p.feedback*2:.2+i*.15);
    o.connect(depth);depth.connect(routes[i].frequency);nodes.push(depth);
  });
  const all=carriers.concat(mod);
  psyLimitVoices('fm',all,out,time,time+duration+.06,2);
  all.forEach(function(o){
    o.start(time);o.stop(time+duration+.06);
  });
  psyAutoRelease(all[all.length-1],nodes.concat(all));
}
function psyTriggerT8Kick(time,velocity=1){
  if(!ctx||!chanGain.kick)return;
  const p=psyState.t8,base=42+p.tune*22,dur=.26+p.punch*.24;
  const o=ctx.createOscillator();o.type='sine';
  o.frequency.setValueAtTime(base*(2.8+p.punch),time);
  o.frequency.exponentialRampToValueAtTime(base,time+.065);
  o.frequency.exponentialRampToValueAtTime(base*.88,time+dur);
  const toneEnv=psyEnvelope(time,1.08*velocity,dur,chanGain.kick,.002);
  o.connect(toneEnv);studioAutoRelease(o,[o,toneEnv]);
  o.start(time);o.stop(time+dur+.02);
  const noise=ctx.createBufferSource();noise.buffer=getDrumNoise();
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2800;
  const noiseEnv=psyEnvelope(time,(.14+p.punch*.26)*velocity,.025,chanGain.kick,.001);
  noise.connect(hp);hp.connect(noiseEnv);studioAutoRelease(noise,[noise,hp,noiseEnv]);
  noise.start(time);noise.stop(time+.03);
  if(!isMultiOut&&duckingGain){
    duckingGain.gain.cancelScheduledValues(time);
    duckingGain.gain.setValueAtTime(Math.max(.001,duckingGain.gain.value),time);
    duckingGain.gain.linearRampToValueAtTime(.13,time+.005);
    duckingGain.gain.exponentialRampToValueAtTime(1,time+.27);
  }
}
function psyTriggerT8Snare(time,velocity=1){
  triggerSnare(time,velocity);
  if(!ctx||!chanGain.snare)return;
  const n=ctx.createBufferSource();n.buffer=getDrumNoise();
  const band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.value=2100;band.Q.value=.7;
  const snareEnv=psyEnvelope(time,(.12+psyState.t8.punch*.18)*velocity,.095,chanGain.snare);
  n.connect(band);band.connect(snareEnv);studioAutoRelease(n,[n,band,snareEnv]);
  n.start(time);n.stop(time+.12);
}
function psyTriggerT8Hat(time,velocity=1){
  // Existing 808-inspired metallic model, expanded by T-8 decay control.
  const previous=machineParams.hatDecay;
  machineParams.hatDecay=psyState.t8.hatOpen;
  try{triggerHat(time,velocity);}finally{machineParams.hatDecay=previous;}
}
function psyTriggerTheremin(note,time,velocity=.74){
  if(!ctx||!chanGain.theremin)return;
  const p=psyState.theremin,base=hz(note||'C4'),duration=typeof composeDuration==='function'?composeDuration(.23+p.glide*.32):.23+p.glide*.32;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';
  filter.frequency.value=580+p.tone*8900;
  const amp=psyEnvelope(time,p.volume*psyClamp(velocity,.1,1,.74)*.53,duration,chanGain.theremin,.025);
  filter.connect(amp);
  const o=ctx.createOscillator();o.type='sine';o.frequency.value=base;
  const harm=ctx.createOscillator();harm.type='triangle';harm.frequency.value=base*2;
  const hgain=ctx.createGain();hgain.gain.value=.09+p.tone*.18;
  o.connect(filter);harm.connect(hgain);hgain.connect(filter);
  const vib=ctx.createOscillator();vib.frequency.value=4.4+p.vibrato*4;
  const depth=ctx.createGain();depth.gain.value=base*p.vibrato*.013;
  vib.connect(depth);depth.connect(o.frequency);depth.connect(harm.frequency);
  [o,harm,vib].forEach(node=>{node.start(time);node.stop(time+duration+.04);});
  psyAutoRelease(vib,[o,harm,vib,hgain,depth,filter,amp]);
}
function psyStopLiveTheremin(){
  const v=psyThereminLive;
  if(!v||!ctx)return;
  const now=ctx.currentTime;
  v.amp.gain.cancelScheduledValues(now);
  v.amp.gain.setTargetAtTime(.0001,now,.025);
  v.nodes.forEach(function(o){try{o.stop(now+.15);}catch(e){}});
  psyAutoRelease(v.lfo,v.nodes.concat(v.depth,v.hgain,v.tone,v.amp));
  psyThereminLive=null;
}
function psyStartLiveTheremin(x,y){
  psyAudioReady();if(!chanGain.theremin)return;
  psyStopLiveTheremin();
  const t=ctx.currentTime+.01,p=psyState.theremin;
  const amp=ctx.createGain();amp.gain.value=.0001;amp.connect(chanGain.theremin);
  const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=650+p.tone*8700;tone.connect(amp);
  const osc=ctx.createOscillator();osc.type='sine';osc.connect(tone);
  const harm=ctx.createOscillator();harm.type='triangle';
  const hgain=ctx.createGain();hgain.gain.value=.12;harm.connect(hgain);hgain.connect(tone);
  const lfo=ctx.createOscillator();lfo.frequency.value=5.3;
  const depth=ctx.createGain();depth.gain.value=0;lfo.connect(depth);
  depth.connect(osc.frequency);depth.connect(harm.frequency);
  [osc,harm,lfo].forEach(o=>o.start(t));
  psyThereminLive={osc,harm,lfo,depth,hgain,tone,amp,nodes:[osc,harm,lfo]};
  psyMoveLiveTheremin(x,y);
}
function psyMoveLiveTheremin(x,y){
  if(!psyThereminLive||!ctx)return;
  const p=psyState.theremin,v=psyThereminLive,t=ctx.currentTime;
  const f=hz('C3')*Math.pow(2,psyClamp(x,0,1,.5)*2.5);
  const amount=p.volume*(1-psyClamp(y,0,1,.5))*.48;
  const smooth=.006+p.glide*.2;
  v.osc.frequency.setTargetAtTime(f,t,smooth);
  v.harm.frequency.setTargetAtTime(f*2,t,smooth);
  v.depth.gain.setTargetAtTime(f*p.vibrato*.015,t,.02);
  v.amp.gain.setTargetAtTime(Math.max(.0001,amount),t,.02);
}
function psyTriggerSpeak(time,velocity=.86,force=false){
  if(!ctx||!chanGain.speak)return;
  const p=psyState.speak,level=psyClamp(velocity,.1,1,.86);
  const loaded=!!psyVoiceBuffer;
  // Play an entire phrase before the next step can retrigger the sample.
  // This prevents a 3-second microphone recording from being cut every 16th step.
  if(loaded && !force && time < psyVoiceNextAvailableTime)return;
  const rate=Math.pow(2,p.pitch/12);
  // Une voix enregistrée doit être intelligible : laisser jouer jusqu'à
  // 4 secondes, au lieu de la couper après 0.2-0.7 s.
  const duration=loaded
    ?Math.max(.08,Math.min(PSY_VOICE_MAX_SECONDS,psyVoiceBuffer.duration/rate))
    :.22+p.decay*.48;
  if(loaded)psyVoiceNextAvailableTime=time+duration-.015;
  const voiceGain=ctx.createGain();
  voiceGain.gain.setValueAtTime(.0001,time);
  voiceGain.gain.linearRampToValueAtTime(level*(loaded?.83:.59),time+.009);
  voiceGain.gain.setValueAtTime(level*(loaded?.83:.59),time+Math.max(.012,duration-.055));
  voiceGain.gain.linearRampToValueAtTime(.0001,time+duration);
  voiceGain.connect(chanGain.speak);
  const privateNodes=[voiceGain];
  if(loaded){
    const source=ctx.createBufferSource();
    source.buffer=psyVoiceBuffer;source.playbackRate.value=rate;
    // Douce coloration vocale sans étouffer les fréquences de la parole.
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=95;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';
    lp.frequency.value=11000-p.robot*3600;lp.Q.value=.7;
    source.connect(hp);hp.connect(lp);privateNodes.push(source,hp,lp);
    const dry=ctx.createGain();dry.gain.value=.95-p.robot*.24;
    lp.connect(dry);dry.connect(voiceGain);privateNodes.push(dry);
    if(p.robot>.03){
      const wet=ctx.createGain();wet.gain.value=.20+p.robot*.13;
      lp.connect(wet);wet.connect(voiceGain);
      const mod=ctx.createOscillator();mod.frequency.value=24+p.robot*88;
      const depth=ctx.createGain();depth.gain.value=p.robot*.13;
      mod.connect(depth);depth.connect(wet.gain);privateNodes.push(wet,mod,depth);
      psyAutoRelease(source,privateNodes);
      psyLimitVoices('speak',[source,mod],voiceGain,time,time+duration,1);
      source.start(time);source.stop(time+duration);
      mod.start(time);mod.stop(time+duration);
    }else{
      psyAutoRelease(source,privateNodes);
      psyLimitVoices('speak',[source],voiceGain,time,time+duration,1);
      source.start(time);source.stop(time+duration);
    }
  }else{
    // Démo synthétique distincte : elle n'est pas une prise du microphone.
    const source=ctx.createOscillator();source.type='sawtooth';
    privateNodes.push(source);
    source.frequency.value=hz('C3')*rate;
    [560+p.robot*290,1180+p.robot*650].forEach(function(freq,i){
      const filter=ctx.createBiquadFilter();filter.type='bandpass';
      filter.frequency.value=freq;filter.Q.value=1.3+p.robot*2.2;
      const gain=ctx.createGain();gain.gain.value=i===0?1:.53;
      source.connect(filter);filter.connect(gain);gain.connect(voiceGain);privateNodes.push(filter,gain);
    });
    psyAutoRelease(source,privateNodes);
    psyLimitVoices('speak',[source],voiceGain,time,time+duration,1);
    source.start(time);source.stop(time+duration);
  }
}
function psyVoiceStatus(text){
  const s=document.getElementById('psy-voice-status');
  if(s)s.textContent=text;
}
async function psyLoadVoiceFile(file){
  if(!file)return;
  if(file.size>12*1024*1024)throw Error('Fichier trop volumineux (12 Mo maximum).');
  if(!await activateStudioAudio())throw Error('Active le son avant de charger ta voix.');
  try{
    const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
    if(!decoded||decoded.duration<.06)throw Error('Fichier trop court.');
    if(decoded.duration>20)throw Error('Fichier trop long (20 secondes maximum).');
    psyVoiceBuffer=decoded;psyVoiceNextAvailableTime=-Infinity;psyVoiceName=file.name||'FICHIER AUDIO';
    psyVoiceStatus('VOIX PRÊTE : '+psyVoiceName+' ('+decoded.duration.toFixed(1)+' s). Appuie sur TEST VOIX.');
    return decoded;
  }catch(error){
    throw Error('Impossible de décoder cet audio. Essaie un fichier WAV ou MP3 : '+error.message);
  }
}
function psyVoiceLoaded(buffer,name){
  if(!buffer||buffer.duration<.06)throw Error('Le microphone a enregistré un son vide.');
  psyVoiceBuffer=buffer;psyVoiceNextAvailableTime=-Infinity;psyVoiceName=name;
  psyVoiceStatus('MICRO OK : '+buffer.duration.toFixed(1)+' s enregistrées · ▶ TEST VOIX pour écouter.');
}
// Enregistre le flux micro directement en PCM Web Audio : évite les WebM/Opus
// parfois impossibles à décoder sur Android. Aucun son n'est envoyé au serveur.
async function psyCaptureMicroPCM(stream,milliseconds=3000){
  if(!ctx||!ctx.createMediaStreamSource)throw Error('Audio du microphone indisponible.');
  if(psyMicroCaptureActive)throw Error('Un enregistrement est déjà en cours.');
  psyMicroCaptureActive=true;
  const context=ctx;
  let source=null,processor=null,sink=null,worklet=false;
  const chunks=[];
  let totalFrames=0;
  try{
    // Safari may reject a MediaStreamSource after permission is granted. Always
    // clear the capture lock in finally, including when source creation fails.
    source=context.createMediaStreamSource(stream);
    if(context.audioWorklet && typeof studioEnsurePCMWorklet==='function' && await studioEnsurePCMWorklet()){
      try{
        processor=new AudioWorkletNode(context,'lovestronautes-pcm-capture',{
          numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],
          channelCount:2,channelCountMode:'explicit'
        });
        worklet=true;
      }catch(err){processor=null;}
    }
    if(!processor && context.createScriptProcessor){
      processor=context.createScriptProcessor(2048,1,1);
    }
    if(!processor)throw Error('Capture micro non prise en charge par ce navigateur. Essaie IMPORT AUDIO.');
    if(worklet){
      processor.port.onmessage=function(event){
        if(event.data && event.data.type==='chunk'){
          const left=event.data.left;chunks.push(left);totalFrames+=left.length;
        }
      };
    }else{
      processor.onaudioprocess=function(event){
        const values=new Float32Array(event.inputBuffer.getChannelData(0));
        chunks.push(values);totalFrames+=values.length;
      };
    }
    sink=context.createGain();sink.gain.value=0; // Jamais de retour micro vers les enceintes.
    source.connect(processor);processor.connect(sink);sink.connect(context.destination);
    const seconds=Math.max(1,Math.ceil(milliseconds/1000));
    for(let i=seconds;i>=1;i--){
      psyVoiceStatus('● MICRO EN COURS · '+i+' seconde'+(i>1?'s':'')+' restante'+(i>1?'s':'')+'…');
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    if(worklet){
      await new Promise(function(resolve,reject){
        const timeout=setTimeout(()=>reject(Error('Fin de capture micro non reçue')),2500);
        processor.port.onmessage=function(event){
          const data=event.data;
          if(data && data.type==='chunk'){chunks.push(data.left);totalFrames+=data.left.length;}
          if(data && data.type==='done'){clearTimeout(timeout);resolve();}
        };
        processor.port.postMessage({type:'stop'});
      });
    }
    if(totalFrames<context.sampleRate*.15)throw Error('Le micro n’a pas capturé assez de son.');
    const buffer=context.createBuffer(1,totalFrames,context.sampleRate);
    const data=buffer.getChannelData(0);
    let at=0;
    for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}
    return buffer;
  }finally{
    if(source)try{source.disconnect();}catch(e){}
    if(processor){
      try{processor.disconnect();}catch(e){}
      if(worklet){processor.port.onmessage=null;processor.port.close();}
      else processor.onaudioprocess=null;
    }
    if(sink)try{sink.disconnect();}catch(e){}
    psyMicroCaptureActive=false;
  }
}
async function psyRecordVoice(){
  if(psyRecording)return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    psyVoiceStatus('Micro indisponible : ouvre Safari (iOS) ou Chrome (Android) en HTTPS, ou utilise IMPORT AUDIO.');
    return;
  }
  psyRecording=true;
  const record=document.getElementById('psy-record-voice');
  if(record){record.disabled=true;record.textContent='● ENREGISTREMENT…';}
  let stream=null,recordingOK=false;
  try{
    // Le déverrouillage sonore doit partir du clic utilisateur.
    if(!await activateStudioAudio())throw Error('Le moteur audio n’est pas autorisé.');
    psyVoiceStatus('Autorise le micro dans ton navigateur…');
    stream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
    });
    const audio=await psyCaptureMicroPCM(stream,3000);
    psyVoiceLoaded(audio,'MICRO 3 S');
    recordingOK=true;
    if(studioChannels && studioChannels.speak && studioChannels.speak.mute){
      psyVoiceStatus('Voix enregistrée. Attention : la piste SPEAK est en mode MUTE dans MIX.');
    }
  }catch(error){
    const message=error.name==='NotAllowedError'?'Autorisation micro refusée dans les réglages du navigateur.'
      :error.name==='NotFoundError'?'Aucun microphone détecté.':error.message;
    psyVoiceStatus('MICRO : '+message);
  }finally{
    if(stream)stream.getTracks().forEach(track=>track.stop());
    psyRecording=false;
    if(record){record.disabled=false;record.textContent='● MICRO 3 S';}
    if(recordingOK && ctx && ctx.state==='running' && !(studioChannels&&studioChannels.speak&&studioChannels.speak.mute)){
      psyTriggerSpeak(ctx.currentTime+.07,.9,true); // Réécouter automatiquement sa voix.
      psyVoiceStatus('MICRO OK : voici ta voix enregistrée. Relance TEST VOIX ou utilise la piste SPEAK.');
    }
  }
}
function psyParamMarkup(machine,key,label,min,max,step){
  const val=psyState[machine][key];
  return '<label class="psy-param"><span>'+label+'</span><input type="range" data-psy-machine="'+machine+'" data-psy-key="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" aria-label="'+label+' '+machine+'"><output></output></label>';
}
function psyToggleMarkup(machine,label){
  return '<button class="mb psy-toggle" type="button" data-psy-toggle="'+machine+'">'+label+'</button>';
}
function psyRackCard(id,title,subtitle,inner){
  return '<article class="fxcard psy-card" id="'+id+'"><div class="psy-card-top"><div><div class="psy-model">'+title+'</div><p class="psy-description">'+subtitle+'</p></div></div>'+inner+'</article>';
}
function buildPsyRack(){
  const root=document.getElementById('panel-gear');if(!root)return;
  root.innerHTML='<div class="psy-rack-head"><div><strong>PSYTRANCE · FIVE MACHINES</strong><p>5 instruments de synthèse numérique — aucun sample commercial ni émulation officielle.</p></div><span>V8 · PSY RACK</span></div>'+
  '<div class="psy-rack-grid">'+
  psyRackCard('psy-td3','TD-3 / ACID 303','Bassline souple et corrosive · séquenceur ACID',psyToggleMarkup('td3','TD-3 ON / OFF')+
    psyParamMarkup('td3','cutoff','CUTOFF',0,1,.01)+
    psyParamMarkup('td3','resonance','RESONANCE',0,1,.01)+
    psyParamMarkup('td3','env','ENV MOD',0,1,.01)+
    psyParamMarkup('td3','decay','DECAY',0,1,.01)+
    psyParamMarkup('td3','accent','ACCENT',0,1,.01)+
    psyParamMarkup('td3','slide','SLIDE',0,1,.01)+
    '<button class="mb psy-preview" type="button" data-psy-preview="td3">▶ TEST ACID</button>')+
  psyRackCard('psy-fm2','VOLCA FM 2 / SIX OP','Synthé FM à 6 oscillateurs · 3 algorithmes · piste FM',psyToggleMarkup('fm2','FM 6 OP ON / OFF')+
    '<label class="psy-param"><span>ALGORITHME</span><select id="psy-algorithm"><option value="0">01 · DUAL STACK</option><option value="1">02 · DEEP MOD</option><option value="2">03 · PARALLEL</option></select></label>'+
    psyParamMarkup('fm2','index','INDEX FM',0,1,.01)+
    psyParamMarkup('fm2','feedback','FEEDBACK',0,1,.01)+
    psyParamMarkup('fm2','brightness','BRIGHT',0,1,.01)+
    psyParamMarkup('fm2','release','RELEASE',0,1,.01)+
    '<button class="mb psy-preview" type="button" data-psy-preview="fm2">▶ TEST FM</button>')+
  psyRackCard('psy-t8','T-8 / RHYTHM LAB','Groovebox TR inspirée des 808 / 909 · KICK SNARE HAT',psyToggleMarkup('t8','T-8 ON / OFF')+
    psyParamMarkup('t8','tune','KICK TUNE',0,1,.01)+
    psyParamMarkup('t8','punch','KICK PUNCH',0,1,.01)+
    psyParamMarkup('t8','hatOpen','HAT OPEN',0,1,.01)+
    '<div class="psy-preview-row"><button class="mb psy-preview" type="button" data-psy-preview="kick">KICK</button>'+
      '<button class="mb psy-preview" type="button" data-psy-preview="snare">SNARE</button>'+
      '<button class="mb psy-preview" type="button" data-psy-preview="hat">HAT</button></div>')+
  psyRackCard('psy-theremin','THEREMIN / TOUCH SPACE','Glisse le doigt dans le pad : X = hauteur, Y = volume · piste THEREMIN'+
    ' (notes programmables)',psyParamMarkup('theremin','vibrato','VIBRATO',0,1,.01)+
    psyParamMarkup('theremin','glide','PORTAMENTO',0,1,.01)+
    psyParamMarkup('theremin','tone','TONE',0,1,.01)+
    psyParamMarkup('theremin','volume','LEVEL',0,1,.01)+
    '<div class="psy-theremin-pad" id="psy-theremin-pad" role="button" tabindex="0" aria-label="Jouer le thérémine tactile"><div class="psy-crosshair"></div>'+
    '<span class="psy-pad-y">LOUD ↑ / SOFT ↓</span><span class="psy-pad-x">PITCH →</span></div>'+
    '<button class="mb psy-preview" type="button" data-psy-preview="theremin">▶ TEST THEREMIN</button>')+
  psyRackCard('psy-speak','PO-35 / SPEAK LAB','Voix robotique : enregistre ton micro ou importe un son ; piste SPEAK.'+
    ' Tout reste sur cet appareil.',psyParamMarkup('speak','pitch','PITCH ±12',-12,12,1)+
    psyParamMarkup('speak','robot','ROBOT / VOCAL',0,1,.01)+
    psyParamMarkup('speak','decay','DECAY',0,1,.01)+
    '<div class="psy-voice-actions"><button type="button" class="mb" id="psy-record-voice">● MICRO 3 S</button>'+
    '<button type="button" class="mb" id="psy-upload-voice">IMPORT AUDIO</button>'+
    '<input type="file" accept="audio/*" id="psy-voice-file" hidden></div>'+
    '<div class="psy-voice-status" id="psy-voice-status">Pour enregistrer une vraie voix : MICRO 3 S, puis TEST VOIX. Sinon, synthèse robotique.</div>'+
    '<button class="mb psy-preview" type="button" data-psy-preview="speak">▶ TEST VOIX</button>'+ 
    '<button class="mb" type="button" id="psy-voice-clear">EFFACER MA VOIX</button>')+
  '</div>';
  root.querySelectorAll('[data-psy-machine]').forEach(function(input){
    input.addEventListener('pointerdown',pushUndo);
    input.addEventListener('input',function(){
      const section=psyState[input.dataset.psyMachine];
      section[input.dataset.psyKey]=Number(input.value);
      psySyncRack();saveLiveState();
    });
  });
  root.querySelectorAll('[data-psy-toggle]').forEach(function(button){
    button.addEventListener('click',function(){
      pushUndo();const s=psyState[button.dataset.psyToggle];
      s.enabled=!s.enabled;psySyncRack();saveLiveState();
    });
  });
  root.querySelectorAll('[data-psy-preview]').forEach(function(button){
    button.addEventListener('click',async function(){
      try{
        if(!await activateStudioAudio())throw Error('Le son est bloqué. Appuie sur ACTIVER LE SON.');
        const time=ctx.currentTime+.05,what=button.dataset.psyPreview;
        if(what==='td3')psyTriggerTD3('C3',.95,time);
        if(what==='fm2')psyTriggerFM2('C4',time,.92);
        if(what==='kick')psyTriggerT8Kick(time);
        if(what==='snare')psyTriggerT8Snare(time);
        if(what==='hat')psyTriggerT8Hat(time);
        if(what==='theremin')psyTriggerTheremin('C4',time,.9);
        if(what==='speak'){
          psyTriggerSpeak(time,.86,true);
          if(studioChannels && studioChannels.speak && studioChannels.speak.mute){
            psyVoiceStatus('PISTE SPEAK EN MUTE : ouvre MIX et réactive SPEAK pour entendre ta voix.');
          }else if(!psyVoiceBuffer)psyVoiceStatus('Son robotique de démonstration. Enregistre ta vraie voix avec MICRO 3 S ou importe un audio.');
          else psyVoiceStatus('LECTURE : '+psyVoiceName+' ('+psyVoiceBuffer.duration.toFixed(1)+' s).');
        }
      }catch(err){setStatus(err.message,'al');}
    });
  });
  document.getElementById('psy-algorithm').addEventListener('change',function(){
    pushUndo();psyState.fm2.algorithm=Number(this.value);saveLiveState();
  });
  document.getElementById('psy-record-voice').addEventListener('click',psyRecordVoice);
  const voiceStatus=document.getElementById('psy-voice-status');
  if(voiceStatus)voiceStatus.setAttribute('aria-live','polite');
  document.getElementById('psy-voice-clear').addEventListener('click',function(){
    psyVoiceBuffer=null;psyVoiceNextAvailableTime=-Infinity;psyVoiceName='VOIX ROBOT (SYNTH)';
    psyVoiceStatus('Voix effacée de la mémoire. Mode démo synthétique.');
  });
  const picker=document.getElementById('psy-voice-file');
  document.getElementById('psy-upload-voice').addEventListener('click',()=>picker.click());
  picker.addEventListener('change',async function(){
    try{await psyLoadVoiceFile(picker.files[0]);}catch(err){psyVoiceStatus(err.message);}
    finally{picker.value='';}
  });
  const pad=document.getElementById('psy-theremin-pad');
  function coords(e){
    const r=pad.getBoundingClientRect();
    return [psyClamp((e.clientX-r.left)/r.width,0,1,.5),psyClamp((e.clientY-r.top)/r.height,0,1,.5)];
  }
  pad.addEventListener('pointerdown',function(e){
    e.preventDefault();pad.setPointerCapture(e.pointerId);
    const [x,y]=coords(e);psyStartLiveTheremin(x,y);
    pad.classList.add('on');psyMovePuck(x,y);
  });
  pad.addEventListener('pointermove',function(e){
    if(!psyThereminLive)return;
    const [x,y]=coords(e);psyMoveLiveTheremin(x,y);psyMovePuck(x,y);
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>pad.addEventListener(name,function(){
    psyStopLiveTheremin();pad.classList.remove('on');
  }));
  pad.addEventListener('keydown',function(e){
    if(e.repeat)return;
    if(e.key===' '||e.key==='Enter'){e.preventDefault();psyStartLiveTheremin(.5,.45);}
  });
  pad.addEventListener('keyup',function(e){if(e.key===' '||e.key==='Enter')psyStopLiveTheremin();});
  psySyncRack();
  if(psyVoiceBuffer)psyVoiceStatus('VOIX PRÊTE : '+psyVoiceName+' ('+psyVoiceBuffer.duration.toFixed(1)+' s). TEST VOIX pour écouter.');
}
function psyMovePuck(x,y){
  const puck=document.querySelector('#psy-theremin-pad .psy-crosshair');
  if(puck){puck.style.left=x*100+'%';puck.style.top=y*100+'%';}
}
function psySyncRack(){
  document.querySelectorAll('[data-psy-machine]').forEach(function(el){
    const value=psyState[el.dataset.psyMachine][el.dataset.psyKey];
    el.value=value;
    const output=el.nextElementSibling;
    if(output&&output.tagName==='OUTPUT')output.textContent=
      el.dataset.psyKey==='pitch'?(value>0?'+':'')+value+' st':Math.round(value*100)+'%';
  });
  document.querySelectorAll('[data-psy-toggle]').forEach(function(button){
    const active=psyState[button.dataset.psyToggle].enabled;
    button.classList.toggle('on',active);
    button.textContent=button.dataset.psyToggle.toUpperCase()+' : '+(active?'ON':'BYPASS');
  });
  const select=document.getElementById('psy-algorithm');if(select)select.value=String(psyState.fm2.algorithm);
}
