/* LOVESTRONAUTES V14 · LOOP STUDIO
 * Non-destructive pattern clips, 1/2/4/8/16/32-bar repetition, continuous
 * audio playback and finite WAV/MP3 loop export through existing studio master.
 * Loop content is editable 16-step multi-track patterns, not fake audio renders.
 */
'use strict';
const LOOP_PATTERNS=['A','B','C','D'];
const LOOP_BARS=[1,2,4,8,16,32];
const LOOP_MAX_CLIPS=24;
const LOOP_MAX_NAME=48;
let loopsState={pattern:'C',bars:4,clips:[],selected:0,nextId:1,running:false};

function loopsSafeText(value){
 return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function loopsSanitize(input){
 const raw=input&&typeof input==='object'?input:{};
 const state={
  pattern:LOOP_PATTERNS.includes(raw.pattern)?raw.pattern:'C',
  bars:LOOP_BARS.includes(raw.bars)?raw.bars:4,
  clips:[],selected:0,nextId:1,running:false
 };
 if(Array.isArray(raw.clips)){
  for(const item of raw.clips.slice(0,LOOP_MAX_CLIPS)){
   if(!item||typeof item!=='object'||!item.data||typeof item.data!=='object')continue;
   const clipId=Number(item.id);
   if(!Number.isInteger(clipId)||clipId<1||clipId>9999999||state.clips.some(c=>c.id===clipId))continue;
   const tracks={};
   let found=false;
   for(const [key,steps] of Object.entries(item.data)){
    if(!/^[a-z][a-z0-9]{0,18}$/i.test(key)||!Array.isArray(steps)||steps.length!==16)continue;
    tracks[key]=steps.map(v=>v==null?null:(typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(1,v)):
      typeof v==='string'?v.slice(0,16):
      typeof v==='object'&&typeof v.note==='string'?{note:v.note.slice(0,16),vel:Number.isFinite(v.vel)?Math.max(0,Math.min(1,v.vel)):.8}:null));
    found=true;
   }
   if(!found||!Array.isArray(tracks.kick))continue;
   state.clips.push({id:clipId,name:String(item.name||'Boucle').slice(0,LOOP_MAX_NAME),
    pattern:LOOP_PATTERNS.includes(item.pattern)?item.pattern:'C',
    bars:LOOP_BARS.includes(item.bars)?item.bars:4,
    bpm:Number.isFinite(item.bpm)?Math.round(Math.max(40,Math.min(220,item.bpm))):145,data:tracks});
  }
 }
 const maxId=state.clips.reduce((max,c)=>Math.max(max,c.id),0);
 state.nextId=Math.max(maxId+1,Number.isInteger(raw.nextId)?raw.nextId:1);
 state.selected=state.clips.some(c=>c.id===raw.selected)?raw.selected:0;
 return state;
}
function loopsProjectState(){
 return {pattern:loopsState.pattern,bars:loopsState.bars,clips:loopsState.clips,
   selected:loopsState.selected,nextId:loopsState.nextId};
}
function loopsRestoreState(project){
 loopsState=loopsSanitize(project&&project.loops);
}
function loopsNotice(message){
 const node=document.getElementById('loops-status');
 if(node)node.textContent=message;
}
function loopsDuration(){
 return Math.round(loopsState.bars*240/(Math.max(40,bpm))*10)/10;
}
function loopsSetPattern(pattern){
 if(!LOOP_PATTERNS.includes(pattern))return false;
 if(SEQ.playing||isPlaying){loopsNotice('Arrête PLAY avant de changer le pattern de boucle.');return false;}
 loopsState.pattern=pattern;loopsRefresh();saveLiveState();return true;
}
function loopsSnapshotPattern(pattern){
 const target=patterns[pattern];
 const clip={};
 for(const [key,steps] of Object.entries(target)){
  if(Array.isArray(steps)&&steps.length===16)
   clip[key]=JSON.parse(JSON.stringify(steps));
 }
 return clip;
}
function loopsSaveClip(name){
 if(loopsState.clips.length>=LOOP_MAX_CLIPS){loopsNotice('Limite de 24 boucles enregistrées.');return false;}
 const title=String(name||'').trim().slice(0,LOOP_MAX_NAME)||'Boucle '+(loopsState.clips.length+1);
 const clip={
  id:loopsState.nextId++,name:title,pattern:loopsState.pattern,bars:loopsState.bars,
  bpm,data:loopsSnapshotPattern(loopsState.pattern)
 };
 loopsState.clips.push(clip);loopsState.selected=clip.id;
 loopsRefresh();saveLiveState();
 loopsNotice('BOUCLE ENREGISTRÉE : '+clip.name+'. Tu peux la rappeler ou exporter son audio.');
 return true;
}
function loopsLoadClip(){
 if(isPlaying||SEQ.playing){loopsNotice('Arrête PLAY avant de rappeler une boucle.');return false;}
 const clip=loopsState.clips.find(c=>c.id===loopsState.selected);
 if(!clip){loopsNotice('Sélectionne une boucle sauvegardée.');return false;}
 const target=loopsState.pattern;
 if(typeof pushUndo==='function')pushUndo();
 // Recalling replaces only the explicitly selected pattern, preserving the
 // other three patterns and project settings. Existing projects remain valid.
 const next=JSON.parse(JSON.stringify(patterns[target]));
 for(const [key,data] of Object.entries(clip.data)){
  if(Array.isArray(data)&&data.length===16)next[key]=JSON.parse(JSON.stringify(data));
 }
 patterns[target]=next;
 matrix=patterns[curPat];
 buildSeq();
 loopsRefresh();saveLiveState();
 loopsNotice('Boucle « '+clip.name+' » chargée dans PATTERN '+target+'. Utilise UNDO pour annuler.');
 return true;
}
function loopsDeleteClip(){
 const index=loopsState.clips.findIndex(c=>c.id===loopsState.selected);
 if(index<0){loopsNotice('Aucune boucle sélectionnée.');return false;}
 const name=loopsState.clips[index].name;
 loopsState.clips.splice(index,1);loopsState.selected=0;
 loopsRefresh();saveLiveState();
 loopsNotice('Boucle « '+name+' » supprimée. Les patterns restent intacts.');
 return true;
}
function loopsSelectPatternForPlay(){
 const pattern=loopsState.pattern;
 curPat=pattern;matrix=patterns[pattern];
 document.querySelectorAll('.pt').forEach(b=>{
  b.classList.toggle('active',b.dataset.pat===pattern);
 });
 buildSeq();
}
async function loopsPlay(){
 if(SEQ.playing&&loopsState.running){stopSeq();isPlaying=false;
  const play=document.getElementById('play-btn');if(play)play.textContent='▶ PLAY';
  loopsNotice('Boucle arrêtée.');loopsRefresh();return;}
 if(!await activateStudioAudio()){loopsNotice('Audio indisponible. Appuie sur ACTIVER LE SON.');return;}
 if(SEQ.playing){stopSeq();isPlaying=false;}
 creatorState.running=false;
 isPilot=false;
 loopsSelectPatternForPlay();
 loopsState.running=true;
 startSeq();isPlaying=true;
 const play=document.getElementById('play-btn');if(play)play.textContent='⏸ PAUSE';
 loopsNotice('BOUCLE EN LECTURE · '+loopsState.pattern+' · '+loopsState.bars+' mesures par cycle.');
 loopsRefresh();
}
function loopsAtBoundary(bar){
 if(!loopsState.running)return;
 // 16 steps per bar; keep song bar-count monotonically increasing for scheduler.
 // Avoid any scheduling timer per loop and do not restart AudioContext at boundaries.
 if(bar%loopsState.bars===0)loopsNotice('BOUCLE '+loopsState.pattern+' · REPRISE AU DÉBUT · '+loopsState.bars+' mesures.');
 const cycle=((bar%loopsState.bars)+1);
 const badge=document.getElementById('loops-position');
 if(badge)badge.textContent='MESURE '+cycle+' / '+loopsState.bars+' · RÉPÉTITION';
}
function loopsOnStop(){
 if(!loopsState.running)return;
 loopsState.running=false;
 loopsRefresh();
}
function loopsExport(format){
 if(SEQ.playing||isPlaying){loopsNotice('Arrête PLAY avant d’exporter ta boucle.');return;}
 creatorState.running=false;
 loopsSelectPatternForPlay();
 studioExportBars=loopsState.bars;
 const selector=document.getElementById('studio-bars');if(selector)selector.value=String(loopsState.bars);
 saveLiveState();
 const fx=document.querySelector('.nt[data-panel="fx"]');if(fx)fx.click();
 const card=document.getElementById('studio-export-card');
 if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
 loopsNotice('EXPORT '+format.toUpperCase()+' · '+loopsState.bars+' mesures · PATTERN '+loopsState.pattern+'.');
 // Existing studio export performs real PCM capture / MP3 encoding.
 // Call only from the user click, after exporting pattern has been selected.
 return studioExport(format);
}
function loopsBuildUI(){
 const root=document.getElementById('panel-loops');if(!root)return;
 root.innerHTML='<div class="loops-head"><div class="loops-eyebrow">LOVESTRONAUTES · LOOP STUDIO</div>'+
  '<h2>CRÉATEUR DE BOUCLES</h2>'+
  '<p>Programme tes 13 pistes dans SEQ, choisis un pattern et répète-le en rythme. Enregistre une variation et exporte-la en WAV ou MP3.</p></div>'+
  '<div class="fxcard loops-card"><h3>01 · BOUCLE AUDIO / LIVE</h3>'+
  '<div class="loops-grid"><label>PATTERN <select id="loops-pattern">'+
   LOOP_PATTERNS.map(p=>'<option value="'+p+'">PATTERN '+p+'</option>').join('')+
  '</select></label><label>DURÉE <select id="loops-bars">'+
    LOOP_BARS.map(n=>'<option value="'+n+'">'+n+' MESURE'+(n>1?'S':'')+'</option>').join('')+
  '</select></label></div>'+
  '<div class="loops-transport"><button type="button" class="loops-primary" id="loops-play">▶ BOUCLER EN CONTINU</button>'+
   '<button type="button" id="loops-stop">■ STOP</button></div>'+
  '<p id="loops-position" class="loops-position">MESURE 1 / 4 · PRÊT</p>'+
  '<p class="loops-tip">1 pattern = 16 pas = 1 mesure. Choisir 8 mesures produit 8 répétitions du même pattern. Pour une progression avec sections différentes, utilise MORCEAU.</p></div>'+
  '<div class="fxcard loops-card"><h3>02 · BIBLIOTHÈQUE DE BOUCLES</h3>'+
   '<label>NOM DE LA BOUCLE <input id="loops-name" maxlength="48" type="text" placeholder="Ex. Kick + basse 145 BPM" /></label>'+
   '<button type="button" class="loops-primary" id="loops-save">+ SAUVEGARDER CE PATTERN</button>'+
   '<label>BOUCLES SAUVEGARDÉES <select id="loops-library" aria-label="Choisir une boucle sauvegardée"></select></label>'+
   '<div class="loops-transport"><button id="loops-load" type="button">↩ CHARGER DANS LE PATTERN CHOISI</button>'+
   '<button id="loops-delete" type="button">SUPPRIMER</button></div>'+
   '<p class="loops-tip">Charger remplace uniquement le pattern sélectionné. Tu peux annuler avec UNDO ; les autres patterns restent intacts.</p></div>'+
  '<div class="fxcard loops-card"><h3>03 · EXPORTER LA BOUCLE</h3>'+
   '<div class="loops-transport"><button class="loops-primary" id="loops-export-wav" type="button">EXPORT WAV</button>'+
   '<button class="loops-primary" id="loops-export-mp3" type="button">EXPORT MP3</button></div>'+
   '<p class="loops-tip">Capture réelle du master au tempo actuel, avec tes synthés, le mixage et les effets. Les effets de queue peuvent dépasser la limite musicale de la boucle.</p>'+
   '<p id="loops-status" class="loops-status" role="status" aria-live="polite">Prêt à créer une boucle.</p></div>';
 document.getElementById('loops-pattern').addEventListener('change',function(){
  if(!loopsSetPattern(this.value))this.value=loopsState.pattern;
 });
 document.getElementById('loops-bars').addEventListener('change',function(){
  loopsState.bars=LOOP_BARS.includes(Number(this.value))?Number(this.value):4;
  loopsRefresh();saveLiveState();
 });
 document.getElementById('loops-play').addEventListener('click',loopsPlay);
 document.getElementById('loops-stop').addEventListener('click',function(){
  if(SEQ.playing){stopSeq();isPlaying=false;const play=document.getElementById('play-btn');if(play)play.textContent='▶ PLAY';}
  loopsNotice('BOUCLE ARRÊTÉE');loopsRefresh();
 });
 document.getElementById('loops-save').addEventListener('click',function(){
  loopsSaveClip(document.getElementById('loops-name').value);
 });
 document.getElementById('loops-library').addEventListener('change',function(){
  loopsState.selected=Number(this.value)||0;saveLiveState();
 });
 document.getElementById('loops-load').addEventListener('click',loopsLoadClip);
 document.getElementById('loops-delete').addEventListener('click',loopsDeleteClip);
 document.getElementById('loops-export-wav').addEventListener('click',()=>loopsExport('wav'));
 document.getElementById('loops-export-mp3').addEventListener('click',()=>loopsExport('mp3'));
 loopsRefresh();
}
function loopsRefresh(){
 const root=document.getElementById('panel-loops');if(!root)return;
 const pat=document.getElementById('loops-pattern');
 const bars=document.getElementById('loops-bars');
 if(pat)pat.value=loopsState.pattern;
 if(bars)bars.value=String(loopsState.bars);
 const library=document.getElementById('loops-library');
 if(library){
  library.innerHTML='<option value="0">— Choisir une boucle —</option>'+
   loopsState.clips.map(c=>'<option value="'+c.id+'">'+loopsSafeText(c.name)+' · '+c.bars+' M · '+c.bpm+' BPM</option>').join('');
  library.value=String(loopsState.selected);
 }
 const play=document.getElementById('loops-play');
 if(play){play.textContent=loopsState.running?'⏸ ARRÊTER LA BOUCLE':'▶ BOUCLER EN CONTINU';
  play.classList.toggle('running',loopsState.running);}
 const position=document.getElementById('loops-position');
 if(position&&!loopsState.running)position.textContent='PRÊT · '+loopsState.bars+' MESURES · ENV. '+loopsDuration()+' S';
}
