/* Composition Pro V23. The existing synths and stereo graph are shared.
 * Clips own their notes: editing a phrase never overwrites legacy A/B/C/D.
 * Scheduling and MIDI use the same deterministic event plan. No remote API. */
'use strict';
const COMPOSE_TRACKS=STUDIO_TRACKS;
const COMPOSE_DRUMS=new Set(['kick','snare','hat','metal','speak','mbase']);
const COMPOSE_LABELS={kick:'KICK',snare:'SNARE',hat:'HI-HAT',sub:'BASSE',acid:'ACID',fm:'FM',biniou:'BINIOU',metal:'METAL',theremin:'THEREMIN',speak:'VOIX',s1:'S1 MK2',taiga:'TAÏGA',mbase:'MBASE',solar:'SOLAR',modfm:'MOD FM',wing:'WING',fieldkit:'FIELD KIT',grandmother:'GRANDMOTHER'};
const COMPOSE_DRUM_NOTES={kick:36,snare:38,hat:42,metal:51,speak:75,mbase:35};
const COMPOSE_SCALES={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],harmonic:[0,2,3,5,7,8,11],pentatonic:[0,3,5,7,10]};
const COMPOSE_ROOTS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const COMPOSE_LIMITS={clips:16,sections:32,bars:1024};
let composeState={version:1,title:'Mon morceau',root:'F',scale:'minor',clips:[],sections:[],selected:0,nextId:1,seed:1977};
let composeView={track:'fm',bar:0,step:0,octave:3,erase:false,clipboard:null};
let composeRun={active:false,mode:'song',clip:0,section:-1,endBar:0,finite:false,gate:0,events:[],paintTimer:null};

function composeClamp(value,min,max,fallback){return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;}
function composeText(value,max=40){return String(value||'').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,max);}
function composeHTML(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function composeClone(value){return JSON.parse(JSON.stringify(value));}
function composeMidi(note){
 const m=/^([A-G])([#b]?)([0-8])$/.exec(String(note));if(!m)return null;
 return (Number(m[3])+1)*12+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);
}
function composeNote(midi){const n=Math.round(composeClamp(midi,12,119,60));return COMPOSE_ROOTS[n%12]+(Math.floor(n/12)-1);}
function composeCell(value,track){
 if(!value)return null;
 const raw=typeof value==='object'?value:{};
 const note=typeof value==='string'?value:raw.note;
 const pitch=composeMidi(note);
 if(!COMPOSE_DRUMS.has(track)&&pitch===null)return null;
 return {note:COMPOSE_DRUMS.has(track)?composeNote(COMPOSE_DRUM_NOTES[track]):composeNote(pitch),
  vel:composeClamp(raw.vel,.05,1,typeof value==='number'?composeClamp(value,.05,1,.8):.8),
  gate:composeClamp(raw.gate,.25,8,track==='sub'?.7:1),
  probability:composeClamp(raw.probability,0,1,1),shift:composeClamp(raw.shift,-20,20,0)};
}
function composeEmptyTracks(bars){return Object.fromEntries(COMPOSE_TRACKS.map(t=>[t,Array(bars*16).fill(null)]));}
function composeSanitize(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const state={version:1,title:composeText(raw.title,60)||'Mon morceau',root:COMPOSE_ROOTS.includes(raw.root)?raw.root:'F',
  scale:Object.prototype.hasOwnProperty.call(COMPOSE_SCALES,raw.scale)?raw.scale:'minor',clips:[],sections:[],selected:0,nextId:1,seed:Math.round(composeClamp(raw.seed,1,10000000,1977))};
 for(const item of (Array.isArray(raw.clips)?raw.clips:[]).slice(0,COMPOSE_LIMITS.clips)){
  if(!item||!Number.isInteger(item.id)||item.id<1||item.id>999999||state.clips.some(c=>c.id===item.id))continue;
  const bars=[1,2,4,8].includes(item.bars)?item.bars:1,tracks=composeEmptyTracks(bars);
  for(const track of COMPOSE_TRACKS){
   const data=item.tracks&&Array.isArray(item.tracks[track])?item.tracks[track]:[];
   tracks[track]=tracks[track].map((_,i)=>composeCell(data[i],track));
  }
  state.clips.push({id:item.id,name:composeText(item.name)||'Clip '+item.id,bars,tracks});
 }
 let total=0;
 for(const s of (Array.isArray(raw.sections)?raw.sections:[]).slice(0,COMPOSE_LIMITS.sections)){
  if(!s)continue;
  const clip=state.clips.find(c=>c.id===s.clip);if(!clip)continue;
  const repeat=Math.round(composeClamp(s.repeat,1,32,1));
  if(total+clip.bars*repeat>COMPOSE_LIMITS.bars)continue;
  total+=clip.bars*repeat;
  state.sections.push({name:composeText(s.name)||clip.name,clip:clip.id,repeat,
   transpose:Math.round(composeClamp(s.transpose,-24,24,0)),
   tracks:Array.isArray(s.tracks)?COMPOSE_TRACKS.filter(t=>s.tracks.includes(t)):COMPOSE_TRACKS.slice()});
 }
 state.nextId=state.clips.reduce((max,c)=>Math.max(max,c.id+1),1);
 state.selected=state.clips.some(c=>c.id===raw.selected)?raw.selected:(state.clips[0]?.id||0);
 return state;
}
function composeProjectState(){return composeClone(composeState);}
function composeRestoreState(project){
 composeState=composeSanitize(project?.composition);
 composeRun.active=false;composeRun.section=-1;composeRun.events=[];
 composeView.bar=Math.max(0,Math.min(composeView.bar,(composeSelected()?.bars||1)-1));
 composeView.step=Math.max(0,Math.min(15,composeView.step));
}
function composeSelected(){return composeState.clips.find(c=>c.id===composeState.selected)||null;}
function composeTotalBars(){return composeState.sections.reduce((sum,s)=>sum+(composeState.clips.find(c=>c.id===s.clip)?.bars||0)*s.repeat,0);}
function composeAtBar(bar,mode='song',clipId=composeState.selected){
 if(mode==='clip'){
  const clip=composeState.clips.find(c=>c.id===clipId);
  return clip?{clip,local:bar%clip.bars,index:-1,transpose:0,tracks:COMPOSE_TRACKS,name:clip.name}:null;
 }
 let start=0;
 for(let i=0;i<composeState.sections.length;i++){
  const section=composeState.sections[i],clip=composeState.clips.find(c=>c.id===section.clip);
  if(!clip)continue;
  const end=start+clip.bars*section.repeat;
  if(bar>=start&&bar<end)return {clip,local:(bar-start)%clip.bars,index:i,transpose:section.transpose,tracks:section.tracks,name:section.name};
  start=end;
 }
 return null;
}
function composeHit(cell,bar,track,step){
 let n=(composeState.seed+Math.imul(bar+1,374761393)+Math.imul(track+1,668265263)+Math.imul(step+1,1274126177))|0;
 n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;
 return ((n>>>0)/4294967296)<cell.probability;
}
function composeTrackEnabled(track){
 switch(track){
  case 'biniou':return biniouEnabled;
  case 's1':return typeof s1State==='undefined'||s1State.enabled;
  case 'taiga':return typeof taigaState==='undefined'||taigaState.enabled;
  case 'fieldkit':return typeof fieldkitState==='undefined'||fieldkitState.enabled;
  case 'grandmother':return typeof grandmotherState==='undefined'||grandmotherState.enabled;
  default:return typeof hardwareState==='undefined'||!hardwareState[track]||hardwareState[track].enabled;
 }
}
// Pure event plan: identical swing, probability, transpose and timing for audio/MIDI.
function composeEvents(bar,step,mode='song',clipId=composeState.selected){
 const at=composeAtBar(bar,mode,clipId);if(!at)return [];
 const hasSolo=COMPOSE_TRACKS.some(t=>studioChannels[t].solo),events=[];
 COMPOSE_TRACKS.forEach((track,i)=>{
  if(!at.tracks.includes(track)||studioChannels[track].mute||(hasSolo&&!studioChannels[track].solo))return;
  if(!composeTrackEnabled(track))return;
  const cell=at.clip.tracks[track][at.local*16+step];
  if(!cell||!composeHit(cell,bar,i,step))return;
  const pitch=COMPOSE_DRUMS.has(track)?COMPOSE_DRUM_NOTES[track]:Math.round(composeClamp(composeMidi(cell.note)+at.transpose,12,119,60));
  events.push({track,note:composeNote(pitch),pitch,vel:cell.vel,gate:cell.gate,shift:cell.shift});
 });
 return events;
}
// A note duration override exists only during a synchronous composition trigger.
// Legacy playback and live keyboard retain the instrument's own gate setting.
function composeDuration(fallback){return composeRun.gate>0?composeRun.gate:fallback;}
function composeDispatch(event,time){
 const t=Math.max(ctx.currentTime+.003,time+event.shift/1000),v=event.vel,n=event.note;
 composeRun.gate=event.gate*60/(bpm*4);
 try{
  switch(event.track){
   case 'kick':return psyState.t8.enabled?psyTriggerT8Kick(t,v):triggerKick(t,v);
   case 'snare':return psyState.t8.enabled?psyTriggerT8Snare(t,v):triggerSnare(t,v);
   case 'hat':return psyState.t8.enabled?psyTriggerT8Hat(t,v):triggerHat(t,v);
   case 'metal':return triggerMetal(t,v);
   case 'sub':return creatorRollingBass(n,t,v);
   case 'acid':return psyState.td3.enabled?psyTriggerTD3(n,v,t):triggerAcid(n,v,t);
   case 'fm':return psyState.fm2.enabled?psyTriggerFM2(n,t,v):triggerFM(n,t,undefined,v);
   case 'biniou':return triggerBiniou(n,t,v);
   case 'theremin':return psyTriggerTheremin(n,t,v);
   case 'speak':return psyTriggerSpeak(t,v);
   case 's1':return s1Trigger(n,t,v);
   case 'taiga':return taigaTrigger(n,t,v);
   case 'fieldkit':return fieldkitTrigger(n,t,v);
   case 'grandmother':return grandmotherTrigger(n,t,v);
   default:return hardwareTrigger(event.track,n,t,v);
  }
 }finally{composeRun.gate=0;}
}
function composeScheduleStep(time){
 const bar=SEQ.barCount,step=SEQ.masterStep;
 for(const event of composeEvents(bar,step,composeRun.mode,composeRun.clip)){
  studioSafeTrigger(event.track,()=>composeDispatch(event,time));
 }
 // UI follows the audio clock, never rebuilds the piano roll in the scheduler.
 composeRun.events.push({time,bar,step});
 if(composeRun.events.length>48)composeRun.events.splice(0,composeRun.events.length-48);
}
function composeBoundary(bar,time){
 if(!composeRun.active)return true;
 if((composeRun.mode==='song'||composeRun.finite)&&bar>=composeRun.endBar){SEQ.endTime=time;return false;}
 return true;
}
function composeNotice(message){const el=document.getElementById('cp-notice');if(el)el.textContent=message;}
function composeCanEdit(){
 if(studioExportBusy||SEQ.playing||isPlaying){composeNotice('Arrête la lecture ou termine l’export avant de modifier la composition.');return false;}
 return true;
}
function composeCommit(change,message='Composition sauvegardée dans le navigateur.',render=true){
 if(!composeCanEdit()){composeRender();return false;}
 pushUndo();change();if(render)composeRender();saveLiveState();composeNotice(message);return true;
}
function composeNewClip(source=null,name='Nouveau clip',bars=4){
 if(composeState.clips.length>=COMPOSE_LIMITS.clips)return null;
 const clip={id:composeState.nextId++,name:composeText(name)||'Nouveau clip',bars,tracks:composeEmptyTracks(bars)};
 if(source){
  for(const track of COMPOSE_TRACKS){
   clip.tracks[track]=clip.tracks[track].map((_,i)=>composeCell(source[track]?.[i%16],track));
  }
 }
 composeState.clips.push(clip);composeState.selected=clip.id;composeView.bar=0;composeView.step=0;
 return clip;
}
function composeSeedFromPatterns(){
 if(composeState.clips.length)return;
 const ids={};
 for(const key of ['A','B','C','D'])ids[key]=composeNewClip(patterns[key],'Pattern '+key,4).id;
 composeState.root=creatorState.root;composeState.scale=creatorState.scale;
 composeState.sections=creatorState.sections.map(s=>({name:s.name,clip:ids[s.pat],repeat:Math.max(1,Math.round(s.bars/4)),transpose:0,tracks:COMPOSE_TRACKS.slice()}));
 composeState.selected=ids.C;
}
function composeResize(clip,bars){
 const old=clip.bars*16;
 for(const track of COMPOSE_TRACKS){const data=clip.tracks[track];clip.tracks[track]=Array.from({length:bars*16},(_,i)=>composeClone(data[i%old]));}
 clip.bars=bars;composeView.bar=Math.min(composeView.bar,bars-1);
}
function composeQuantize(pitch){
 const root=COMPOSE_ROOTS.indexOf(composeState.root),scale=COMPOSE_SCALES[composeState.scale];
 let best=pitch,distance=999;
 for(let n=12;n<120;n++)if(scale.includes((n-root+120)%12)&&Math.abs(n-pitch)<distance){best=n;distance=Math.abs(n-pitch);}
 return best;
}
function composeTransform(kind){
 const clip=composeSelected(),track=composeView.track;if(!clip)return;
 if(COMPOSE_DRUMS.has(track)&&kind!=='humanize'){composeNotice('Sélectionne une piste mélodique pour transposer ou accorder.');return;}
 composeCommit(()=>{
  clip.tracks[track]=clip.tracks[track].map((cell,i)=>{
   if(!cell)return null;
   const next={...cell},pitch=composeMidi(cell.note);
   if(kind==='quantize')next.note=composeNote(composeQuantize(pitch));
   else if(kind==='humanize'){
    // Deterministic, gentle timing/velocity; kick and sub remain on the grid.
    next.vel=composeClamp(cell.vel*(.91+((i*17+clip.id*13)%23)/100),.1,1,.8);
    next.shift=['kick','sub','mbase'].includes(track)?0:((i*7+clip.id)%11)-5;
   }else next.note=composeNote(pitch+Number(kind));
   return next;
  });
 },kind==='humanize'?'Vélocités nuancées ; décalage léger, kick et basse sur la grille.':'Notes de la piste mises à jour.');
}
async function composePlay(mode='song',forExport=false){
 if(studioExportBusy&&!forExport)return false;
 if(!composeSelected()||(mode==='song'&&!composeTotalBars())){composeNotice('Ajoute au moins une section à ton arrangement.');return false;}
 if((!ctx||ctx.state!=='running')&&!await activateStudioAudio())return false;
 if(SEQ.playing||isPlaying){stopSeq();isPlaying=false;}
 creatorState.running=false;loopsState.running=false;
 composeRun.active=true;composeRun.mode=mode;composeRun.clip=composeState.selected;
 composeRun.section=-1;composeRun.events=[];composeRun.finite=forExport;
 composeRun.endBar=mode==='clip'?composeSelected().bars:composeTotalBars();
 startSeq();isPlaying=true;
 document.getElementById('play-btn').textContent='⏸ PAUSE';
 composeStartPaint();composeNotice(mode==='song'?'Lecture de l’arrangement.':'Lecture du clip en boucle.');
 return true;
}
function composeOnStop(){
 composeRun.active=false;composeRun.gate=0;composeRun.events=[];
 if(composeRun.paintTimer!==null){clearInterval(composeRun.paintTimer);composeRun.paintTimer=null;}
 document.querySelectorAll('.cp-section.playing').forEach(el=>el.classList.remove('playing'));
 const el=document.getElementById('cp-position');if(el)el.textContent='Lecture arrêtée · '+composeTotalBars()+' mesures dans l’arrangement';
}
function composeStartPaint(){
 if(composeRun.paintTimer!==null)clearInterval(composeRun.paintTimer);
 composeRun.paintTimer=setInterval(()=>{
  if(!composeRun.active||!ctx)return;
  let heard=null;
  while(composeRun.events.length&&composeRun.events[0].time<=ctx.currentTime)heard=composeRun.events.shift();
  if(!heard)return;
  const at=composeAtBar(heard.bar,composeRun.mode,composeRun.clip);
  const el=document.getElementById('cp-position');
  if(el)el.textContent=(composeRun.mode==='song'?'Morceau':'Boucle')+' · mesure '+(heard.bar+1)+' · temps '+(1+Math.floor(heard.step/4))+' · '+(at?.name||'');
  if(at&&at.index!==composeRun.section){
   composeRun.section=at.index;
   document.querySelectorAll('[data-cp-section]').forEach(row=>row.classList.toggle('playing',Number(row.dataset.cpSection)===at.index));
  }
 },100);
}

/* Standard MIDI File type 1, 480 PPQ. Each instrument has its own named track.
 * Twelve melodic channels; six percussion tracks share GM channel 10.
 * Note-offs sort before note-ons at equal ticks; section markers are retained. */
function composeVLQ(value){let n=Math.max(0,Math.round(value)),bytes=[n&127];while((n>>>=7)>0)bytes.unshift((n&127)|128);return bytes;}
function composeBE(value,size){return Array.from({length:size},(_,i)=>(value>>>(8*(size-i-1)))&255);}
function composeUTF8(text){return Array.from(new TextEncoder().encode(text));}
function composeMeta(type,text){const data=composeUTF8(text);return [255,type,...composeVLQ(data.length),...data];}
function composeMidiBytes(mode='song'){
 const selected=composeSelected(),bars=mode==='song'?composeTotalBars():(selected?.bars||0);
 if(!bars||bars>COMPOSE_LIMITS.bars)throw Error('Arrangement vide ou trop long.');
 const end=bars*1920,tempo=Math.round(60000000/bpm),conductor=[
  {tick:0,order:0,data:composeMeta(3,composeState.title)},
  {tick:0,order:0,data:[255,81,3,...composeBE(tempo,3)]},
  {tick:0,order:0,data:[255,88,4,4,2,24,8]}
 ];
 let offset=0;
 if(mode==='song')for(const section of composeState.sections){
  conductor.push({tick:offset,order:0,data:composeMeta(6,section.name)});
  offset+=(composeState.clips.find(c=>c.id===section.clip)?.bars||0)*section.repeat*1920;
 }
 const tracks=Object.fromEntries(COMPOSE_TRACKS.map(t=>[t,[{tick:0,order:0,data:composeMeta(3,COMPOSE_LABELS[t])}]]));
  const previousOff=Object.fromEntries(COMPOSE_TRACKS.map(t=>[t,new Map()]));
 const channels={},melodic=[0,1,2,3,4,5,6,7,8,10,11,12];let m=0;
 for(const track of COMPOSE_TRACKS)channels[track]=COMPOSE_DRUMS.has(track)?9:melodic[m++];
 for(let bar=0;bar<bars;bar++)for(let step=0;step<16;step++){
  const stepTick=bar*1920+Math.floor(step/2)*240+(step%2?240*swing:0);
  for(const e of composeEvents(bar,step,mode,selected?.id)){
   const tick=Math.max(0,Math.min(end-1,Math.round(stepTick+e.shift*bpm*480/60000)));
   const off=Math.min(end,tick+Math.max(1,Math.round(e.gate*120))),channel=channels[e.track];
   const prior=previousOff[e.track].get(e.pitch);if(prior&&prior.tick>tick)prior.tick=tick;
   const noteOff={tick:off,order:1,data:[0x80|channel,e.pitch,0]};previousOff[e.track].set(e.pitch,noteOff);
   tracks[e.track].push({tick,order:2,data:[0x90|channel,e.pitch,Math.max(1,Math.round(e.vel*127))]});
   tracks[e.track].push(noteOff);
  }
 }
 function pack(events){
  events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
  let last=0;const data=[];
  for(const e of events){data.push(...composeVLQ(e.tick-last),...e.data);last=e.tick;}
  data.push(...composeVLQ(end-last),255,47,0);
  return [...composeUTF8('MTrk'),...composeBE(data.length,4),...data];
 }
 const chunks=[pack(conductor),...COMPOSE_TRACKS.map(t=>pack(tracks[t]))];
 const head=[...composeUTF8('MThd'),0,0,0,6,0,1,...composeBE(chunks.length,2),1,224];
 const bytes=new Uint8Array(head.length+chunks.reduce((n,c)=>n+c.length,0));let at=0;
 for(const chunk of [head,...chunks]){bytes.set(chunk,at);at+=chunk.length;}
 return bytes;
}
function composeExportMidi(mode){
 try{
  downloadBlob(new Blob([composeMidiBytes(mode)],{type:'audio/midi'}),'lovestronautes-'+(mode==='clip'?'clip':'composition')+'.mid');
  composeNotice('MIDI créé : 18 pistes séparées, tempo, swing, vélocités, durées et marqueurs. Importe-le dans Ableton Live ; choisis les instruments dans ton DAW.');
 }catch(error){composeNotice(error.message);}
}
function composeSaveProject(){downloadBlob(new Blob([JSON.stringify(projectState(),null,2)],{type:'application/json'}),'lovestronautes-composition.json');composeNotice('Projet JSON exporté : clips, arrangement, mix et réglages des synthés. Les prises audio importées restent en mémoire et doivent être conservées séparément.');}
async function composeLoadProject(file){
 if(!file||!composeCanEdit())return false;
 try{
  if(file.size>8*1024*1024)throw Error('Projet JSON trop volumineux (8 Mo maximum).');
  const state=JSON.parse(await file.text());
  if(!composeCanEdit())return false;
  if(!validPatternBank(state.pat))throw Error('Projet Lovestronautes incompatible.');
  pushUndo();applyProjectState(state,true);composeSeedFromPatterns();syncProjectUI();
  composeNotice('Projet chargé.');return true;
 }catch(error){composeNotice('Import impossible : '+error.message);return false;}
}
function composeEditCell(change){
 const clip=composeSelected(),index=composeView.bar*16+composeView.step;
 if(!clip?.tracks[composeView.track][index]){composeNotice('Touche une case du piano roll pour écrire une note.');return;}
 composeCommit(()=>change(clip.tracks[composeView.track][index]));
}
function composeRenderRoll(){
 const clip=composeSelected(),root=document.getElementById('cp-roll');if(!root||!clip)return;
 const track=composeView.track,data=clip.tracks[track],drum=COMPOSE_DRUMS.has(track);
 const pitches=drum?[COMPOSE_DRUM_NOTES[track]]:Array.from({length:24},(_,i)=>(composeView.octave+1)*12+23-i);
 let html='<div class="cp-pitch cp-step-head">PAS</div>'+Array.from({length:16},(_,i)=>'<div class="cp-step-head">'+(i+1)+'</div>').join('');
 for(const pitch of pitches){
  const note=composeNote(pitch),isRoot=pitch%12===COMPOSE_ROOTS.indexOf(composeState.root);
  html+='<div class="cp-pitch'+(isRoot?' root':'')+'">'+(drum?'HIT':note)+'</div>';
  for(let step=0;step<16;step++){
   const cell=data[composeView.bar*16+step],on=cell&&(drum||composeMidi(cell.note)===pitch),selected=step===composeView.step&&on;
   html+='<button type="button" class="cp-cell'+(note.includes('#')?' accidental':'')+(step%4===0?' beat':'')+(on?' on':'')+(selected?' selected':'')+'" data-cp-pitch="'+pitch+'" data-cp-step="'+step+'" aria-label="'+note+', pas '+(step+1)+(on?', vélocité '+Math.round(cell.vel*100)+' %':'')+'" aria-pressed="'+!!on+'" tabindex="'+(step===composeView.step&&pitch===pitches[0]?'0':'-1')+'"></button>';
  }
 }
 root.innerHTML=html;
 root.querySelectorAll('[data-cp-pitch]').forEach(button=>{
  button.addEventListener('click',()=>{
   if(!composeCanEdit())return;
   const step=Number(button.dataset.cpStep),pitch=Number(button.dataset.cpPitch),index=composeView.bar*16+step;
   composeView.step=step;
   const previous=data[index];
   if(composeView.erase){composeCommit(()=>{data[index]=null;});return;}
   if(!previous||composeMidi(previous.note)!==pitch){
    composeCommit(()=>{data[index]=previous?{...previous,note:composeNote(pitch)}:composeCell({note:composeNote(pitch),vel:.8},track);});
   }else{composeRenderRoll();composeRenderNoteTools();}
  });
  button.addEventListener('keydown',event=>{
   const keys={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
   if(!keys[event.key])return;
   event.preventDefault();
   const [ds,dp]=keys[event.key],s=composeClamp(Number(button.dataset.cpStep)+ds,0,15,0),p=Number(button.dataset.cpPitch)+dp;
   const next=root.querySelector('[data-cp-step="'+s+'"][data-cp-pitch="'+p+'"]');
   if(next){button.tabIndex=-1;next.tabIndex=0;next.focus();}
  });
 });
 document.getElementById('cp-octave').disabled=drum;
}
function composeRenderNoteTools(){
 const clip=composeSelected();if(!clip)return;
 const cell=clip.tracks[composeView.track][composeView.bar*16+composeView.step];
 const label=document.getElementById('cp-selection');
 if(label)label.textContent=COMPOSE_LABELS[composeView.track]+' · mesure '+(composeView.bar+1)+' · pas '+(composeView.step+1)+' · '+(cell?cell.note:'silence');
 for(const [key,mult] of [['vel',100],['gate',1],['probability',100],['shift',1]]){
  const input=document.getElementById('cp-note-'+key);if(!input)continue;
  input.disabled=!cell;input.value=cell?Math.round(cell[key]*mult*100)/100:(key==='gate'?1:key==='shift'?0:key==='probability'?100:80);
  input.nextElementSibling.textContent=input.value+(mult===100?' %':key==='shift'?' ms':' pas');
 }
}
function composeRenderSections(){
 const root=document.getElementById('cp-sections');if(!root)return;
 let start=1;
 root.innerHTML=composeState.sections.map((section,i)=>{
  const clip=composeState.clips.find(c=>c.id===section.clip),bars=(clip?.bars||0)*section.repeat,first=start;start+=bars;
  return '<div class="cp-section" data-cp-section="'+i+'"><div class="cp-section-fields">'+
   '<label>SECTION '+(i+1)+' · M. '+first+'–'+(start-1)+'<input type="text" maxlength="40" data-cp-field="name" value="'+composeHTML(section.name)+'"></label>'+
   '<label>CLIP <select data-cp-field="clip">'+composeState.clips.map(c=>'<option value="'+c.id+'"'+(c.id===section.clip?' selected':'')+'>'+composeHTML(c.name)+' · '+c.bars+' m.</option>').join('')+'</select></label>'+
   '<label>RÉPÉTITIONS<input data-cp-field="repeat" type="number" min="1" max="32" value="'+section.repeat+'"></label>'+
   '<label>DEMI-TONS<input data-cp-field="transpose" type="number" min="-24" max="24" value="'+section.transpose+'"></label>'+
   '<div class="cp-section-actions"><button type="button" data-cp-move="-1" aria-label="Monter section '+(i+1)+'"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-cp-move="1" aria-label="Descendre section '+(i+1)+'"'+(i===composeState.sections.length-1?' disabled':'')+'>↓</button><button type="button" data-cp-duplicate aria-label="Dupliquer section '+(i+1)+'">⧉</button><button type="button" data-cp-delete class="cp-danger" aria-label="Supprimer section '+(i+1)+'">×</button></div></div>'+
   '<details><summary>'+section.tracks.length+' / 18 pistes actives · choisir les instruments de cette section</summary><div class="cp-track-checks">'+COMPOSE_TRACKS.map(t=>'<label><input type="checkbox" data-cp-lane="'+t+'"'+(section.tracks.includes(t)?' checked':'')+'>'+COMPOSE_LABELS[t]+'</label>').join('')+'</div></details></div>';
 }).join('');
 root.querySelectorAll('[data-cp-section]').forEach(row=>{
  const i=Number(row.dataset.cpSection);
  row.querySelectorAll('[data-cp-field]').forEach(input=>input.addEventListener('change',()=>{
   const key=input.dataset.cpField;
   const next=key==='name'?composeText(input.value):key==='clip'?Number(input.value):Math.round(composeClamp(Number(input.value),key==='repeat'?1:-24,key==='repeat'?32:24,key==='repeat'?1:0));
   const candidate=composeClone(composeState);candidate.sections[i][key]=next;
   const sanitized=composeSanitize(candidate);
   if(sanitized.sections.length!==candidate.sections.length){composeNotice('Arrangement limité à 1 024 mesures.');composeRenderSections();return;}
   if(composeState.sections[i][key]===next)return;
   if(composeCommit(()=>{composeState.sections[i][key]=next;},undefined,false)){
    input.value=String(next);composeRefreshSummary();
   }
  }));
  row.querySelectorAll('[data-cp-lane]').forEach(input=>input.addEventListener('change',()=>{composeCommit(()=>{
   const s=composeState.sections[i];s.tracks=input.checked?s.tracks.concat(input.dataset.cpLane):s.tracks.filter(t=>t!==input.dataset.cpLane);
  },undefined,false);composeRefreshSummary();}));
  row.querySelectorAll('[data-cp-move]').forEach(button=>button.addEventListener('click',()=>composeCommit(()=>{
   const target=i+Number(button.dataset.cpMove);[composeState.sections[i],composeState.sections[target]]=[composeState.sections[target],composeState.sections[i]];
  })));
  row.querySelector('[data-cp-delete]').addEventListener('click',()=>composeCommit(()=>composeState.sections.splice(i,1)));
  row.querySelector('[data-cp-duplicate]').addEventListener('click',()=>{
   if(composeState.sections.length>=COMPOSE_LIMITS.sections||composeTotalBars()+(composeState.clips.find(c=>c.id===composeState.sections[i].clip)?.bars||0)*composeState.sections[i].repeat>1024){composeNotice('Limite : 32 sections ou 1 024 mesures.');return;}
   composeCommit(()=>composeState.sections.splice(i+1,0,composeClone(composeState.sections[i])));
  });
 });
}
function composeRefreshSummary(){
 const bars=composeTotalBars(),seconds=bars*240/bpm,duration=document.getElementById('cp-duration');
 if(duration)duration.textContent=bars+' mesures · '+Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0')+' · '+bpm+' BPM';
 let start=1;
 document.querySelectorAll('[data-cp-section]').forEach((row,i)=>{
  const section=composeState.sections[i];if(!section)return;
  const bars=(composeState.clips.find(c=>c.id===section.clip)?.bars||0)*section.repeat;
  const label=row.querySelector('label');if(label?.firstChild)label.firstChild.nodeValue='SECTION '+(i+1)+' · M. '+start+'–'+(start+bars-1);
  const summary=row.querySelector('summary');if(summary)summary.textContent=section.tracks.length+' / 18 pistes actives · choisir les instruments de cette section';
  start+=bars;
 });
}
function composeRender(){
 const root=document.getElementById('panel-compose');if(!root?.querySelector('#cp-clip'))return;
 const clip=composeSelected();
 document.getElementById('cp-title').value=composeState.title;
 document.getElementById('cp-tempo').value=bpm;
 document.getElementById('cp-root').value=composeState.root;
 document.getElementById('cp-scale').value=composeState.scale;
 document.getElementById('cp-clip').innerHTML=composeState.clips.map(c=>'<option value="'+c.id+'">'+composeHTML(c.name)+'</option>').join('');
 document.getElementById('cp-clip').value=String(composeState.selected);
 document.getElementById('cp-clip-name').value=clip?.name||'';
 document.getElementById('cp-bars').value=String(clip?.bars||4);
 document.getElementById('cp-octave').value=String(composeView.octave);
 document.getElementById('cp-erase').setAttribute('aria-pressed',String(composeView.erase));
 document.getElementById('cp-erase').textContent=composeView.erase?'GOMME ACTIVE':'GOMME';
 const bars=composeTotalBars(),seconds=bars*240/bpm;
 document.getElementById('cp-duration').textContent=bars+' mesures · '+Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0')+' · '+bpm+' BPM';
 const lanes=document.getElementById('cp-lanes');
 lanes.innerHTML=COMPOSE_TRACKS.map(t=>'<button type="button" data-cp-track="'+t+'" aria-pressed="'+(t===composeView.track)+'"><span>'+COMPOSE_LABELS[t]+'</span><small>'+(clip?.tracks[t].filter(Boolean).length||0)+'</small></button>').join('');
 lanes.querySelectorAll('[data-cp-track]').forEach(button=>button.addEventListener('click',()=>{
  composeView.track=button.dataset.cpTrack;
  const note=clip?.tracks[composeView.track].find(Boolean);
  if(note&&!COMPOSE_DRUMS.has(composeView.track))composeView.octave=Math.max(0,Math.min(6,Math.floor(composeMidi(note.note)/12)-2));
  composeRender();
 }));
 const tabs=document.getElementById('cp-bar-tabs');
 tabs.innerHTML=Array.from({length:clip?.bars||0},(_,i)=>'<button type="button" data-cp-bar="'+i+'" aria-pressed="'+(i===composeView.bar)+'">Mesure '+(i+1)+'</button>').join('');
 tabs.querySelectorAll('[data-cp-bar]').forEach(button=>button.addEventListener('click',()=>{composeView.bar=Number(button.dataset.cpBar);composeRender();}));
 composeRenderRoll();composeRenderNoteTools();composeRenderSections();
}
function composeInstall(){
 const root=document.getElementById('panel-compose');if(!root)return;
 composeSeedFromPatterns();
 root.innerHTML='<section class="cp-head"><div class="cp-eyebrow">COMPOSITION PRO · V23</div><h2>Du motif au morceau.</h2><p>Écris des phrases de plusieurs mesures, construis tes sections et retrouve tes pistes dans Ableton Live. Les 18 instruments partagent le mix et les effets de la machine.</p>'+
  '<div class="cp-tools"><label class="cp-wide">TITRE<input type="text" id="cp-title" maxlength="60"></label><label>TEMPO<input type="number" id="cp-tempo" min="40" max="220"></label><label>TONALITÉ<select id="cp-root">'+COMPOSE_ROOTS.map(n=>'<option>'+n+'</option>').join('')+'</select></label><label>GAMME<select id="cp-scale"><option value="minor">Mineure</option><option value="major">Majeure</option><option value="dorian">Dorienne</option><option value="phrygian">Phrygienne</option><option value="harmonic">Mineure harmonique</option><option value="pentatonic">Pentatonique mineure</option></select></label></div>'+
  '<div class="cp-transport"><button type="button" id="cp-play-song" class="cp-primary">▶ LIRE LE MORCEAU</button><button type="button" id="cp-play-clip">↻ ÉCOUTER LE CLIP</button><button type="button" id="cp-stop">■ STOP</button><button type="button" id="cp-undo">ANNULER</button><button type="button" id="cp-redo">RÉTABLIR</button><button type="button" id="cp-save">SAUVER LE PROJET</button><button type="button" id="cp-load">OUVRIR UN PROJET</button><input type="file" id="cp-project-file" accept=".json,application/json" hidden></div>'+
  '<div id="cp-position" role="status">Prêt · choisis un clip, puis touche une case pour écrire.</div><p id="cp-save-status" role="status">Pense à exporter ton projet JSON pour conserver une copie.</p><div id="cp-notice" role="status" aria-live="polite">Tes patterns A–D sont copiés dans des clips indépendants au premier lancement. Sauve ton projet JSON pour le conserver et changer d’appareil.</div></section>'+
  '<div class="cp-workspace"><section class="cp-card"><h3>01 / Clips et piano roll</h3><div class="cp-tools"><label>CLIP<select id="cp-clip"></select></label><label class="cp-wide">NOM<input id="cp-clip-name" type="text" maxlength="40"></label><label>MESURES<select id="cp-bars">'+[1,2,4,8].map(n=>'<option>'+n+'</option>').join('')+'</select></label></div>'+
  '<div class="cp-transport"><button type="button" id="cp-new">+ CLIP VIDE</button><button type="button" id="cp-duplicate">DUPLIQUER CLIP</button><button type="button" id="cp-delete-clip" class="cp-danger">SUPPRIMER CLIP</button></div>'+
  '<details><summary>Reprendre un pattern A–D dans la mesure affichée</summary><div class="cp-tools"><label>PATTERN SOURCE<select id="cp-import-pattern"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><button type="button" id="cp-import">COPIER DANS CETTE MESURE</button></div></details>'+
  '<div id="cp-lanes" class="cp-lanes" aria-label="Choisir une piste"></div><div id="cp-bar-tabs" class="cp-bar-tabs" aria-label="Mesures du clip"></div>'+
  '<div class="cp-tools"><label>OCTAVES<select id="cp-octave">'+Array.from({length:7},(_,i)=>'<option value="'+i+'">'+i+'–'+(i+1)+'</option>').join('')+'</select></label><button type="button" id="cp-erase" aria-pressed="false">GOMME</button><button type="button" id="cp-copy-bar">COPIER MESURE</button><button type="button" id="cp-paste-bar">COLLER MESURE</button></div>'+
  '<p>Une note par pas et par piste. Touche une case pour écrire ou déplacer une note ; la gomme l’efface. Les accords peuvent être répartis entre plusieurs instruments.</p><div class="cp-roll-scroll"><div id="cp-roll" class="cp-roll" aria-label="Piano roll, doubles croches"></div></div>'+
  '<div id="cp-selection"></div><div class="cp-note-tools">'+[['vel','VÉLOCITÉ',5,100,1],['gate','DURÉE (PAS)',.25,8,.25],['probability','PROBABILITÉ',0,100,1],['shift','DÉCALAGE (MS)',-20,20,1]].map(([key,title,min,max,step])=>'<label>'+title+'<input type="range" id="cp-note-'+key+'" min="'+min+'" max="'+max+'" step="'+step+'"><output></output></label>').join('')+'</div>'+
  '<div class="cp-transport"><button type="button" data-cp-transform="-12">− OCTAVE</button><button type="button" data-cp-transform="12">+ OCTAVE</button><button type="button" data-cp-transform="quantize">ACCORDER À LA GAMME</button><button type="button" data-cp-transform="humanize">NUANCER LE GROOVE</button></div></section>'+
  '<section class="cp-card"><h3>02 / Arrangement</h3><p>Chaque section répète un clip. Réordonne les sections, transpose les mélodies ou retire des instruments pour construire une intro, un break et un drop.</p><strong id="cp-duration"></strong><div id="cp-sections" class="cp-arrangement"></div><button type="button" id="cp-add-section">+ AJOUTER CE CLIP</button></section></div>'+
  '<section class="cp-card"><h3>03 / Exporter la composition</h3><div class="cp-tools"><label>SOURCE<select id="cp-export-source"><option value="song">Morceau entier</option><option value="clip">Clip sélectionné (un passage)</option></select></label><button type="button" id="cp-midi" class="cp-primary">MIDI · 18 PISTES</button><button type="button" id="cp-wav">WAV STÉRÉO 24 BITS</button><button type="button" id="cp-mp3">MP3 320 KB/S</button></div><p class="cp-export-note">MIDI : notes, vélocités, durées, swing, tempo et sections ; choisis ensuite tes instruments dans Ableton Live. WAV/MP3 : capture du son des synthés et du master en temps réel, à la fréquence du navigateur. Garde la page visible. Le mix Mute/Solo est respecté.</p><button type="button" id="cp-export-cancel" hidden>ANNULER L’EXPORT AUDIO</button><div id="cp-export-status" role="status" aria-live="polite"></div><progress id="cp-export-progress" value="0" max="100" aria-label="Progression export audio"></progress></section>';
 const bind=(id,event,fn)=>document.getElementById(id).addEventListener(event,fn);
 bind('cp-title','change',e=>{const value=composeText(e.target.value,60)||'Mon morceau';if(value!==composeState.title)composeCommit(()=>{composeState.title=value;e.target.value=value;},undefined,false);});
 bind('cp-tempo','change',e=>{const value=Math.round(composeClamp(Number(e.target.value),40,220,128));if(value!==bpm)composeCommit(()=>{bpm=value;e.target.value=bpm;document.getElementById('bpm-input').value=bpm;composeRefreshSummary();},undefined,false);});
 for(const key of ['root','scale'])bind('cp-'+key,'change',e=>composeCommit(()=>{composeState[key]=e.target.value;}));
 bind('cp-clip','change',e=>{composeState.selected=Number(e.target.value);composeView.bar=0;composeView.step=0;composeRender();saveLiveState();});
 bind('cp-clip-name','change',e=>{
  const clip=composeSelected(),name=composeText(e.target.value)||'Clip';if(name===clip.name)return;
  composeCommit(()=>{
   clip.name=name;e.target.value=name;
   const option=document.querySelector('#cp-clip option[value="'+clip.id+'"]');if(option)option.textContent=name;
   document.querySelectorAll('[data-cp-field="clip"] option[value="'+clip.id+'"]').forEach(o=>{o.textContent=name+' · '+clip.bars+' m.';});
  },undefined,false);
 });
 bind('cp-bars','change',e=>{
  const bars=Number(e.target.value),clip=composeSelected();
  const extra=composeState.sections.filter(s=>s.clip===clip.id).reduce((n,s)=>n+(bars-clip.bars)*s.repeat,0);
  if(composeTotalBars()+extra>1024){composeNotice('L’agrandissement dépasse 1 024 mesures.');composeRender();return;}
  composeCommit(()=>composeResize(clip,bars),'Durée du clip modifiée. L’agrandissement répète la phrase existante.');
 });
 bind('cp-new','click',()=>{
  if(composeState.clips.length>=16){composeNotice('Maximum : 16 clips.');return;}
  composeCommit(()=>composeNewClip());
 });
 bind('cp-duplicate','click',()=>{
  if(composeState.clips.length>=16){composeNotice('Maximum : 16 clips.');return;}
  composeCommit(()=>{const copy=composeClone(composeSelected());copy.id=composeState.nextId++;copy.name=composeText(copy.name+' copie');composeState.clips.push(copy);composeState.selected=copy.id;});
 });
 bind('cp-delete-clip','click',()=>{
  if(composeState.clips.length<=1){composeNotice('Conserve au moins un clip.');return;}
  if(composeState.sections.some(s=>s.clip===composeState.selected)){composeNotice('Ce clip est utilisé dans l’arrangement. Retire d’abord ses sections.');return;}
  composeCommit(()=>{composeState.clips=composeState.clips.filter(c=>c.id!==composeState.selected);composeState.selected=composeState.clips[0].id;composeView.bar=0;});
 });
 bind('cp-import','click',()=>composeCommit(()=>{
  const clip=composeSelected(),pattern=patterns[document.getElementById('cp-import-pattern').value];
  for(const t of COMPOSE_TRACKS)for(let i=0;i<16;i++)clip.tracks[t][composeView.bar*16+i]=composeCell(pattern[t]?.[i],t);
 },'Pattern copié dans la mesure affichée. Annuler permet de retrouver tes notes.'));
 bind('cp-octave','change',e=>{composeView.octave=Number(e.target.value);composeRenderRoll();});
 bind('cp-erase','click',()=>{composeView.erase=!composeView.erase;composeRender();});
 bind('cp-copy-bar','click',()=>{
  const clip=composeSelected();composeView.clipboard=Object.fromEntries(COMPOSE_TRACKS.map(t=>[t,composeClone(clip.tracks[t].slice(composeView.bar*16,composeView.bar*16+16))]));composeNotice('Mesure copiée avec ses 18 pistes.');
 });
 bind('cp-paste-bar','click',()=>{
  if(!composeView.clipboard){composeNotice('Copie d’abord une mesure.');return;}
  composeCommit(()=>{const c=composeSelected();for(const t of COMPOSE_TRACKS)c.tracks[t].splice(composeView.bar*16,16,...composeClone(composeView.clipboard[t]));});
 });
 for(const [key,mult] of [['vel',100],['gate',1],['probability',100],['shift',1]]){
  bind('cp-note-'+key,'input',e=>{e.target.nextElementSibling.textContent=e.target.value+(mult===100?' %':key==='shift'?' ms':' pas');});
  bind('cp-note-'+key,'change',e=>composeEditCell(cell=>{cell[key]=Number(e.target.value)/mult;}));
 }
 root.querySelectorAll('[data-cp-transform]').forEach(button=>button.addEventListener('click',()=>composeTransform(button.dataset.cpTransform)));
 bind('cp-add-section','click',()=>{
  if(composeState.sections.length>=32||composeTotalBars()+composeSelected().bars>1024){composeNotice('Limite : 32 sections ou 1 024 mesures.');return;}
  composeCommit(()=>{const c=composeSelected();composeState.sections.push({name:c.name,clip:c.id,repeat:1,transpose:0,tracks:COMPOSE_TRACKS.slice()});});
 });
 bind('cp-play-song','click',()=>composePlay('song'));
 bind('cp-play-clip','click',()=>composePlay('clip'));
 bind('cp-stop','click',()=>{if(studioExportBusy){studioExportCancel=true;return;}stopSeq();isPlaying=false;document.getElementById('play-btn').textContent='▶ PLAY';});
 bind('cp-save','click',composeSaveProject);
 bind('cp-undo','click',()=>{if(composeCanEdit())undoProject();});
 bind('cp-redo','click',()=>{if(composeCanEdit())redoProject();});
 bind('cp-load','click',()=>{if(composeCanEdit())document.getElementById('cp-project-file').click();});
 bind('cp-project-file','change',async e=>{await composeLoadProject(e.target.files[0]);e.target.value='';});
 bind('cp-midi','click',()=>composeExportMidi(document.getElementById('cp-export-source').value));
 for(const format of ['wav','mp3'])bind('cp-'+format,'click',()=>studioExport(format,{composition:document.getElementById('cp-export-source').value,wavBits:24}));
 bind('cp-export-cancel','click',()=>{studioExportCancel=true;});
 document.getElementById('studio-compose-btn')?.addEventListener('click',()=>{
  document.querySelector('.nt[data-panel="compose"]').click();root.scrollIntoView({behavior:'smooth',block:'start'});
 });
 composeRender();
}
