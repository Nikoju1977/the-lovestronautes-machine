/* LOVESTRONAUTES V13 · shared playable keyboards.
 * One consistent engine for touch, mouse, slide/gliss, physical keys and MIDI.
 * Instrument selection is saved locally; no extra AudioContexts or timers.
 */
'use strict';
const STUDIO_KEYBOARD_MODES=[
 ['taiga','TAÏGA · WAVEFOLD'],
 ['solar','SOLAR 50 · DRONE'],
 ['modfm','JOMOX MOD FM'],
 ['wing','WING PINGER'],
 ['mbase','MBASE 11 · KICK'],
 ['fieldkit','FIELD KIT · ELECTRO'],
 ['s1','S1 MK2 · ANALOG'],
 ['fm2','VOLCA FM2'],
 ['td3','TD-3 · ACID'],
 ['theremin','THEREMIN'],
 ['biniou','BINIOU']
];
const STUDIO_PIANO_WHITES=['C','D','E','F','G','A','B'];
const STUDIO_PIANO_BLACKS=[['C#',0],['D#',1],['F#',3],['G#',4],['A#',5]];
const STUDIO_KEYS_QWERTY=[
 ['KeyA',0],['KeyW',1],['KeyS',2],['KeyE',3],['KeyD',4],
 ['KeyF',5],['KeyT',6],['KeyG',7],['KeyY',8],['KeyH',9],
 ['KeyU',10],['KeyJ',11],['KeyK',12]
];
const STUDIO_CHROMATIC=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
let studioKeyMode='taiga',studioKeyOctave=3,studioKeySpan=1;
const studioKeyPointers=new Map(),studioKeyComputer=new Map(),studioKeyMidi=new Map();
let studioKeyCurrentVoice=null,studioKeyboardGlobalBound=false;

function studioKeyboardPersist(){
 if(typeof safeStorage==='undefined')return;
 safeStorage.setItem('lovestronautes_keyboard',JSON.stringify({
  mode:studioKeyMode,octave:studioKeyOctave,span:studioKeySpan
 }));
}
function studioKeyboardRestore(){
 if(typeof safeStorage==='undefined')return;
 try{
  const x=JSON.parse(safeStorage.getItem('lovestronautes_keyboard')||'{}');
  if(STUDIO_KEYBOARD_MODES.some(m=>m[0]===x.mode))studioKeyMode=x.mode;
  if(Number.isInteger(x.octave)&&x.octave>=1&&x.octave<=6)studioKeyOctave=x.octave;
  if([1,2].includes(x.span))studioKeySpan=x.span;
 }catch(e){}
}
function studioNoteByMidi(n){
 const index=Math.round(n);
 if(index<12||index>108)return null;
 return STUDIO_CHROMATIC[index%12]+(Math.floor(index/12)-1);
}
function studioKeyboardSound(note,velocity,held,mode=studioKeyMode){
 if(!ctx||ctx.state!=='running')return false;
 const time=ctx.currentTime+.012;
 const v=Math.max(.2,Math.min(1,velocity||.82));
 try{
  if(mode==='taiga')return taigaTrigger(note,time,v,held);
  if(mode==='s1')return s1Trigger(note,time,v);
  if(mode==='fm2'){psyTriggerFM2(note,time,v);return true;}
  if(mode==='td3'){psyTriggerTD3(note,v,time);return true;}
  if(mode==='theremin'){psyTriggerTheremin(note,time,v);return true;}
  if(['mbase','solar','modfm','wing'].includes(mode))return hardwareTrigger(mode,note,time,v);
  if(mode==='fieldkit')return fieldkitTrigger(note,time,v);
  if(mode==='biniou'){
   if(!biniouEnabled){
    const label=document.getElementById('studio-key-feedback');
    if(label)label.textContent='Active BINIOU E dans FX pour jouer le biniou.';
    return false;
   }
   triggerBiniou(note,time,v,morphAmount);return true;
  }
 }catch(error){
  const label=document.getElementById('studio-key-feedback');
  if(label)label.textContent='NOTE BLOQUÉE : '+(error.message||'Erreur Web Audio');
 }
 return false;
}
function studioKeyboardReleaseSound(token){
 if(token&&studioKeyCurrentVoice===token){
  if(token.mode==='taiga'&&typeof taigaStopVoices==='function')taigaStopVoices();
  if(token.mode==='s1'&&typeof s1StopVoices==='function')s1StopVoices();
  if(token.mode==='fieldkit'&&typeof fieldkitStopVoices==='function')fieldkitStopVoices();
  studioKeyCurrentVoice=null;
 }
}
function studioKeyboardPaint(){
 const count=new Map();
 for(const item of [...studioKeyPointers.values(),...studioKeyComputer.values(),...studioKeyMidi.values()])
  if(!item.released)count.set(item.note,(count.get(item.note)||0)+1);
 document.querySelectorAll('#kbd [data-note]').forEach(el=>{
  const pressed=count.has(el.dataset.note);
  el.classList.toggle('pressed',pressed);
  el.setAttribute('aria-pressed',String(pressed));
 });
 const feedback=document.getElementById('studio-key-feedback');
 if(feedback&&count.size){
  const last=[...count.keys()].at(-1);
  feedback.textContent=last+' · '+STUDIO_KEYBOARD_MODES.find(m=>m[0]===studioKeyMode)[1];
 }
}
function studioKeyboardRelease(token,map,id){
 if(!token)return;
 token.released=true;map.delete(id);studioKeyboardReleaseSound(token);studioKeyboardPaint();
}
async function studioKeyboardStart(note,velocity,map,id,held=true){
 const prev=map.get(id);
 if(prev&&prev.note===note)return;
 if(prev)studioKeyboardRelease(prev,map,id);
 const token={note,velocity,mode:studioKeyMode,released:false,started:false,replaced:false};
 map.set(id,token);studioKeyboardPaint();
 const ready=await activateStudioAudio();
 if(!ready){
  const hint=document.getElementById('studio-key-feedback');
  if(hint)hint.textContent='Audio bloqué · touche ACTIVER LE SON.';
  studioKeyboardRelease(token,map,id);return;
 }
 const active=map.get(id)===token;
 if(!active&&token.replaced)return;
 // Fast taps that end while AudioContext is resuming still produce a note.
 const played=studioKeyboardSound(note,velocity,active&&held,token.mode);
 token.started=played;
 if(played&&active&&(token.mode==='taiga'||token.mode==='s1'||token.mode==='fieldkit'))
  studioKeyCurrentVoice=token;
 studioKeyboardPaint();
}
function studioKeyboardFinish(map,id){
 const token=map.get(id);
 if(token)studioKeyboardRelease(token,map,id);
}
function studioKeyboardOffAll(){
 for(const [id,token] of [...studioKeyPointers])studioKeyboardRelease(token,studioKeyPointers,id);
 for(const [id,token] of [...studioKeyComputer])studioKeyboardRelease(token,studioKeyComputer,id);
 for(const [id,token] of [...studioKeyMidi])studioKeyboardRelease(token,studioKeyMidi,id);
 if(typeof taigaStopVoices==='function')taigaStopVoices();
 if(typeof s1StopVoices==='function')s1StopVoices();
 if(typeof fieldkitStopVoices==='function')fieldkitStopVoices();
 studioKeyCurrentVoice=null;
}
function studioKeyboardGlissNote(event,root){
 const node=document.elementFromPoint(event.clientX,event.clientY);
 const key=node&&node.closest?node.closest('[data-note]'):null;
 return key&&root.contains(key)?key.dataset.note:null;
}
function studioKeyboardWireMain(root){
 root.addEventListener('pointerdown',function(event){
  const target=event.target.closest('[data-note]');
  if(!target)return;
  event.preventDefault();
  try{root.setPointerCapture(event.pointerId);}catch(e){}
  const velocity=event.pointerType==='pen'&&event.pressure>.01?event.pressure:.82;
  studioKeyboardStart(target.dataset.note,velocity,studioKeyPointers,event.pointerId);
 });
 root.addEventListener('pointermove',function(event){
  const previous=studioKeyPointers.get(event.pointerId);
  if(!previous)return;
  const next=studioKeyboardGlissNote(event,root);
  if(next&&next!==previous.note){
   previous.replaced=true;
   studioKeyboardStart(next,previous.velocity,studioKeyPointers,event.pointerId);
  }
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])
  root.addEventListener(type,event=>studioKeyboardFinish(studioKeyPointers,event.pointerId));
 // Native keyboard focus for assistive use (Space/Enter on a focused piano key).
 root.addEventListener('keydown',function(event){
  if(event.repeat||!['Enter',' '].includes(event.key))return;
  const key=event.target.closest('[data-note]');if(!key)return;
  event.preventDefault();
  studioKeyboardStart(key.dataset.note,.83,studioKeyComputer,'focus');
 });
 root.addEventListener('keyup',function(event){
  if(['Enter',' '].includes(event.key))studioKeyboardFinish(studioKeyComputer,'focus');
 });
}
function studioKeyboardBuild(){
 const root=document.getElementById('kbd');if(!root)return;
 const wrap=root.closest('.kbd-wrap');
 if(!wrap)return;
 studioKeyboardRestore();
 const prior=wrap.querySelector('.studio-key-tools');
 if(prior)prior.remove();
 const toolbar=document.createElement('div');
 toolbar.className='studio-key-tools';
 toolbar.innerHTML=
  '<label>INSTRUMENT <select id="studio-key-instrument" aria-label="Instrument du clavier">'+
  STUDIO_KEYBOARD_MODES.map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join('')+'</select></label>'+
  '<div class="studio-key-octave" aria-label="Changer d’octave">'+
  '<button type="button" id="studio-key-down" aria-label="Octave inférieure">−</button>'+
  '<output id="studio-key-octave">C3</output>'+
  '<button type="button" id="studio-key-up" aria-label="Octave supérieure">+</button></div>'+
  '<label class="studio-key-span">CLAVIER <select id="studio-key-span" aria-label="Étendue du clavier"><option value="1">1 OCTAVE</option><option value="2">2 OCTAVES</option></select></label>';
 wrap.insertBefore(toolbar,root);
 const label=wrap.querySelector('.kbd-lbl');
 if(label)label.textContent='CLAVIER LIVE · DOIGT GLISSÉ · MULTITOUCH · MIDI IN';
 const hint=document.createElement('div');
 hint.id='studio-key-feedback';hint.className='studio-key-feedback';
 hint.textContent='Choisis un synthé, puis joue directement sur les touches.';
 wrap.appendChild(hint);
 document.getElementById('studio-key-instrument').value=studioKeyMode;
 document.getElementById('studio-key-span').value=String(studioKeySpan);
 document.getElementById('studio-key-instrument').addEventListener('change',function(){
  studioKeyboardOffAll();studioKeyMode=this.value;studioKeyboardPersist();
  hint.textContent='Mode '+STUDIO_KEYBOARD_MODES.find(m=>m[0]===studioKeyMode)[1]+' prêt.';
 });
 document.getElementById('studio-key-span').addEventListener('change',function(){
  studioKeyboardOffAll();studioKeySpan=Number(this.value);studioKeyboardPersist();
  studioKeyboardRenderKeys();
 });
 document.getElementById('studio-key-down').addEventListener('click',()=>studioKeyboardChangeOctave(-1));
 document.getElementById('studio-key-up').addEventListener('click',()=>studioKeyboardChangeOctave(1));
 studioKeyboardWireMain(root);
 studioKeyboardRenderKeys();
 if(!studioKeyboardGlobalBound){
  studioKeyboardGlobalBound=true;
  window.addEventListener('blur',studioKeyboardOffAll);
  window.addEventListener('pagehide',studioKeyboardOffAll);
  document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='hidden')studioKeyboardOffAll();
  });
  window.addEventListener('keydown',event=>{
   if(event.repeat||event.ctrlKey||event.altKey||event.metaKey)return;
   const tag=document.activeElement?.tagName;
   if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.activeElement?.isContentEditable)return;
   const match=STUDIO_KEYS_QWERTY.find(k=>k[0]===event.code);
   if(!match)return;
   event.preventDefault();
   const note=studioNoteByMidi((studioKeyOctave+1)*12+match[1]);
   if(note)studioKeyboardStart(note,.8,studioKeyComputer,event.code);
  });
  window.addEventListener('keyup',event=>studioKeyboardFinish(studioKeyComputer,event.code));
 }
}
function studioKeyboardChangeOctave(delta){
 const target=Math.max(1,Math.min(studioKeySpan===2?5:6,studioKeyOctave+delta));
 if(target===studioKeyOctave)return;
 studioKeyboardOffAll();studioKeyOctave=target;studioKeyboardPersist();
 studioKeyboardRenderKeys();
}
function studioKeyboardRenderKeys(){
 const root=document.getElementById('kbd');if(!root)return;
 const octaves=studioKeySpan,whiteCount=7*octaves+1;
 let html='<div class="studio-piano-scroll"><div class="studio-piano-keys" style="--white-count:'+whiteCount+'">';
 for(let i=0;i<whiteCount;i++){
  const octave=studioKeyOctave+Math.floor(i/7);
  const name=STUDIO_PIANO_WHITES[i%7],note=name+octave;
  html+='<button class="studio-piano-key white" type="button" data-note="'+note+
    '" aria-label="Jouer '+note+'" aria-pressed="false"><span>'+note+'</span></button>';
 }
 for(let octave=0;octave<octaves;octave++){
  for(const [name,white] of STUDIO_PIANO_BLACKS){
   const note=name+(studioKeyOctave+octave);
   const index=octave*7+white+1;
   const pct=index/whiteCount*100;
   html+='<button class="studio-piano-key black" type="button" data-note="'+note+
    '" style="left:'+pct+'%" aria-label="Jouer '+note+'" aria-pressed="false"><span>'+note+'</span></button>';
  }
 }
 html+='</div></div>';
 root.innerHTML=html;
 const octave=document.getElementById('studio-key-octave');if(octave)octave.textContent='C'+studioKeyOctave;
 const scroll=root.querySelector('.studio-piano-scroll');
 if(scroll)scroll.scrollLeft=0;
 studioKeyboardPaint();
}
function studioKeyboardMidiMessage(data){
 if(!data||data.length<3)return false;
 const status=data[0]&0xf0,noteNumber=data[1],velocity=data[2];
 if(status!==0x90&&status!==0x80)return false;
 const note=studioNoteByMidi(noteNumber);
 if(!note)return false;
 if(status===0x90&&velocity>0)studioKeyboardStart(note,velocity/127,studioKeyMidi,noteNumber);
 else studioKeyboardFinish(studioKeyMidi,noteNumber);
 return true;
}
// Shared mobile interaction for the small S1 and Taiga keyboards.
function studioWireMiniKeyboard(card,selector,play,release){
 const keys=[...card.querySelectorAll(selector)];
 if(!keys.length)return;
 const parent=keys[0].parentElement;
 const active=new Map();
 let current=null;
 const noteFor=e=>{
  const target=document.elementFromPoint(e.clientX,e.clientY);
  const key=target&&target.closest?target.closest(selector):null;
  return key&&parent.contains(key)?key:null;
 };
 const paint=()=>{
  for(const key of keys)key.classList.toggle('pressed',[...active.values()].some(x=>x.key===key));
 };
 parent.addEventListener('pointerdown',event=>{
  const key=event.target.closest(selector);if(!key)return;
  event.preventDefault();
  try{parent.setPointerCapture(event.pointerId);}catch(e){}
  active.set(event.pointerId,{key});current=event.pointerId;
  paint();Promise.resolve(play(key.dataset.s1Note||key.dataset.taigaNote)).catch(()=>{});
 });
 parent.addEventListener('pointermove',event=>{
  const previous=active.get(event.pointerId),key=noteFor(event);
  if(!previous||!key||previous.key===key)return;
  previous.key=key;current=event.pointerId;paint();
  Promise.resolve(play(key.dataset.s1Note||key.dataset.taigaNote)).catch(()=>{});
 });
 const finish=event=>{
  if(!active.has(event.pointerId))return;
  active.delete(event.pointerId);paint();
  if(current===event.pointerId){current=null;if(typeof release==='function')release();}
 };
 for(const type of ['pointerup','pointercancel','lostpointercapture'])parent.addEventListener(type,finish);
 for(const key of keys){
  key.addEventListener('keydown',event=>{
   if(event.repeat||!['Enter',' '].includes(event.key))return;
   event.preventDefault();key.classList.add('pressed');
   Promise.resolve(play(key.dataset.s1Note||key.dataset.taigaNote)).catch(()=>{});
  });
  key.addEventListener('keyup',event=>{
   if(['Enter',' '].includes(event.key)){key.classList.remove('pressed');if(release)release();}
  });
 }
}
