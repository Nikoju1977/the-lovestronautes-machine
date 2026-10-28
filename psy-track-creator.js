/* LOVESTRONAUTES · PSY TRACK CREATOR V10
 * Song arrangement (real pattern switching), tonal melody lab and rolling K-B-B-B.
 * No external libraries, samples, network or API are required. */
'use strict';

const CREATOR_PATTERNS=['A','B','C','D'];
const CREATOR_TRACKS=['fm','acid','theremin','s1','taiga'];
const CREATOR_ROOTS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CREATOR_SCALES={
  minor:[0,2,3,5,7,8,10],
  phrygian:[0,1,3,5,7,8,10],
  harmonic:[0,2,3,5,7,8,11]
};
const CREATOR_STYLES=['fullon','dark','progressive','forest'];
const CREATOR_BAR_OPTIONS=[4,8,16,24,32,40,48,64];
const CREATOR_DEFAULT_SECTIONS=[
  {name:'INTRO',pat:'A',bars:16,morph:0.08},
  {name:'BUILD',pat:'B',bars:32,morph:0.22},
  {name:'DROP',pat:'C',bars:48,morph:0.34},
  {name:'BREAK',pat:'D',bars:16,morph:0.07},
  {name:'RISE',pat:'B',bars:24,morph:0.42},
  {name:'FINAL DROP',pat:'C',bars:40,morph:0.48},
  {name:'OUTRO',pat:'A',bars:16,morph:0.12}
];
const CREATOR_DEFAULTS={
  style:'fullon',tempo:145,root:'F',scale:'minor',energy:75,seed:1977,
  bass:{tightness:.76,cutoff:.50,drive:.23,level:.70},
  sections:CREATOR_DEFAULT_SECTIONS
};
let creatorState=JSON.parse(JSON.stringify(CREATOR_DEFAULTS));
creatorState.running=false;
let creatorEditTrack='fm',creatorEditNote='C4',creatorLastSongSection=-1;
function creatorClamp(v,min,max,fallback){
  return typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
}
function creatorSections(source){
  if(!Array.isArray(source)||!source.length)return JSON.parse(JSON.stringify(CREATOR_DEFAULT_SECTIONS));
  return source.slice(0,24).map(function(row,i){
    const old=row&&typeof row==='object'?row:{};
    const fallback=CREATOR_DEFAULT_SECTIONS[i%CREATOR_DEFAULT_SECTIONS.length];
    return {
      name:typeof old.name==='string'&&old.name.trim()?old.name.trim().replace(/[<>]/g,'').slice(0,28):fallback.name,
      pat:CREATOR_PATTERNS.includes(old.pat)?old.pat:fallback.pat,
      bars:CREATOR_BAR_OPTIONS.includes(old.bars)?old.bars:16,
      morph:creatorClamp(old.morph,0,1,fallback.morph)
    };
  });
}
function creatorProjectState(){
  return {style:creatorState.style,tempo:creatorState.tempo,root:creatorState.root,
    scale:creatorState.scale,energy:creatorState.energy,seed:creatorState.seed,
    bass:{...creatorState.bass},sections:creatorState.sections.map(s=>({...s}))};
}
function creatorRestoreState(saved){
  const state=saved&&typeof saved.creator==='object'&&saved.creator?saved.creator:{};
  creatorState.style=CREATOR_STYLES.includes(state.style)?state.style:'fullon';
  creatorState.tempo=Math.round(creatorClamp(state.tempo,125,165,145));
  creatorState.root=CREATOR_ROOTS.includes(state.root)?state.root:'F';
  creatorState.scale=Object.prototype.hasOwnProperty.call(CREATOR_SCALES,state.scale)?state.scale:'minor';
  creatorState.energy=Math.round(creatorClamp(state.energy,0,100,75));
  creatorState.seed=Math.round(creatorClamp(state.seed,0,10000000,1977));
  const bass=state.bass&&typeof state.bass==='object'?state.bass:{};
  ['tightness','cutoff','drive','level'].forEach(function(k){
    creatorState.bass[k]=creatorClamp(bass[k],0,1,CREATOR_DEFAULTS.bass[k]);
  });
  creatorState.sections=creatorSections(state.sections);
  creatorState.running=false;
  creatorLastSongSection=-1;
}
function creatorTotalBars(){return creatorState.sections.reduce((sum,s)=>sum+s.bars,0);}
function creatorDurationSeconds(bars=creatorTotalBars(),tempo=bpm){return bars*240/tempo;}
function creatorTimeLabel(seconds){const min=Math.floor(seconds/60),sec=Math.round(seconds%60);return min+':'+String(sec).padStart(2,'0');}
function creatorSectionAtBar(bar){
  let start=0;
  for(let i=0;i<creatorState.sections.length;i++){
    const s=creatorState.sections[i],end=start+s.bars;
    if(bar<end)return {section:s,index:i,start,end};
    start=end;
  }
  return null;
}
function creatorMidi(note){
  const match=String(note).match(/^([A-G](?:#|b)?)([0-8])$/);
  if(!match)return 60;
  const map={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  return (Number(match[2])+1)*12+map[match[1]];
}
function creatorNote(midi){
  const note=CREATOR_ROOTS[((Math.round(midi)%12)+12)%12];
  return note+Math.floor(Math.round(midi)/12-1);
}
function creatorScalePitch(degree,octave){
  const steps=CREATOR_SCALES[creatorState.scale];
  const index=((degree%7)+7)%7,offset=Math.floor(degree/7)*12;
  return creatorNote(12*(octave+1)+CREATOR_ROOTS.indexOf(creatorState.root)+steps[index]+offset);
}
function creatorRandom(seed){
  let state=(seed>>>0)||1;
  return function(){
    state=(Math.imul(state^state>>>15,1|state) +0x6d2b79f5)|0;
    let t=state;t=Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function creatorRollingBass(note,time,velocity){
  if(!ctx||!chanGain.sub)return;
  const settings=creatorState.bass,freq=hz(note||'F2'),sixteenth=60/(bpm*4);
  // Fast 16th-note gate: no overlapping half-second sub tails.
  const duration=Math.min(sixteenth*.98,.065+(1-settings.tightness)*sixteenth*.33);
  const filter=ctx.createBiquadFilter();
  filter.type='lowpass';filter.frequency.value=Math.min(ctx.sampleRate*.40,180+settings.cutoff*1550);
  filter.Q.value=.6+settings.drive*1.7;
  const out=ctx.createGain();
  out.gain.setValueAtTime(.0001,time);
  out.gain.linearRampToValueAtTime(settings.level*creatorClamp(velocity,.1,1,.8)*.75,time+.003);
  out.gain.exponentialRampToValueAtTime(.0001,time+duration);
  filter.connect(out);out.connect(chanGain.sub);
  [['sawtooth',.17+settings.drive*.17],['sine',.7]].forEach(function(part){
    const osc=ctx.createOscillator(),level=ctx.createGain();
    osc.type=part[0];level.gain.value=part[1];
    osc.frequency.setValueAtTime(freq*1.07,time);
    osc.frequency.exponentialRampToValueAtTime(freq,time+.018);
    osc.connect(level);level.connect(filter);
    osc.start(time);osc.stop(time+duration+.012);
  });
}
function creatorGeneratePatterns(){
  // Four 16-step tonal patterns = 64 editable note slots per melodic voice.
  // Kick/Bass use K-B-B-B with a short psychoacoustically clean bass gate.
  const random=creatorRandom(creatorState.seed+creatorState.energy*7+CREATOR_STYLES.indexOf(creatorState.style)*999);
  const density=creatorState.energy/100;
  const chordDegrees=[0,5,3,6];  // i – VI – iv – VII in a minor scale
  const bank={};
  CREATOR_PATTERNS.forEach(function(letter,i){
    const p=patterns[letter]?JSON.parse(JSON.stringify(patterns[letter])):{};
    const isIntro=letter==='A',isBuild=letter==='B',isDrop=letter==='C',isBreak=letter==='D';
    const deg=chordDegrees[i],rootBass=creatorScalePitch(deg,2);
    p.kick=Array(16).fill(0);
    (isIntro?[0,8]:isBreak?[]:[0,4,8,12]).forEach(s=>p.kick[s]=1);
    p.snare=Array(16).fill(0);
    if(!isIntro&&!isBreak)[4,12].forEach(s=>p.snare[s]=1);
    p.hat=Array(16).fill(0);
    for(let s=0;s<16;s++){
      if(isDrop? s%2===1 : isBuild? [2,6,10,14].includes(s) : isBreak? s===12 : s===6){
        if(random() < (.38+density*.58))p.hat[s]=1;
      }
    }
    p.sub=Array(16).fill(null);
    if(!isBreak){
      for(let s=0;s<16;s++){
        if(s%4===0)continue;
        if(isIntro && (s%4===2||s>=8))continue;
        if(isBuild&&s%4===3&&random()>.5+density*.28)continue;
        p.sub[s]={note:rootBass,vel:.62+(s%4===1?.12:.01)};
      }
    }
    p.acid=Array(16).fill(null);
    if(!isIntro&&!isBreak){
      const active=isDrop?[0,2,3,6,8,10,11,14]:[2,6,8,10,14];
      active.forEach(function(s,j){
        if(random()>density*.40+.57)return;
        p.acid[s]={note:creatorScalePitch(deg+(j%3===1?2:0),3),vel:.62+(j%4===0?.27:.08)};
      });
    }
    p.fm=Array(16).fill(null);
    if(!isBreak){
      const steps=isDrop?[0,2,4,6,8,10,12,14]:isBuild?[0,4,6,8,12,14]:[0,8,12];
      const contour=[0,2,4,5,4,2,1,2];
      steps.forEach(function(s,j){
        if(random() > .56+density*.38)return;
        const degree=deg+contour[(j+i)%contour.length];
        p.fm[s]={note:creatorScalePitch(degree,4),vel:.57+(s%8===0?.22:.1)};
      });
    }
    // S1 MK2 analogue-inspired lead: sparse harmonic countermelody.
    p.s1=Array(16).fill(null);
    if(isBreak){
      p.s1[0]={note:creatorScalePitch(deg,3),vel:.55};
      p.s1[8]={note:creatorScalePitch(deg+2,3),vel:.58};
    }else{
      const leads=isDrop?[0,3,6,10,12,14]:isBuild?[0,6,10,14]:[0,8];
      const motif=[0,2,4,3,5,2,4,1];
      leads.forEach(function(step,j){
        if(random()>.56+density*.33)return;
        p.s1[step]={note:creatorScalePitch(deg+motif[(j+i)%motif.length],3),vel:.56+(j%3)*.09};
      });
    }
    // Taiga: restrained wavefold counter-melody, with rests to protect mobile audio.
    p.taiga=Array(16).fill(null);
    if(isBreak){
      p.taiga[0]={note:creatorScalePitch(deg,3),vel:.5};
      p.taiga[8]={note:creatorScalePitch(deg+2,3),vel:.56};
    }else{
      const positions=isDrop?[0,4,7,10,13]:isBuild?[0,6,12]:[0,8];
      positions.forEach(function(step,j){
        if(random() > .63+density*.26)return;
        const rise=[0,2,4,5,2][j%5];
        p.taiga[step]={note:creatorScalePitch(deg+rise,3),vel:.53+(j%3)*.11};
      });
    }
    p.theremin=Array(16).fill(null);
    if(isBreak){
      p.theremin[0]={note:creatorScalePitch(deg,4),vel:.7};
      p.theremin[8]={note:creatorScalePitch(deg+4,4),vel:.62};
    }else if(isDrop){
      [0,6,10].forEach((s,j)=>{if(random()<density*.6+.28)p.theremin[s]={note:creatorScalePitch(deg+[7,9,4][j],4),vel:.58};});
    }
    p.metal=Array(16).fill(0);
    if(isDrop)[3,7,11,15].forEach(s=>p.metal[s]=random()<.2+density*.42?1:0);
    p.speak=Array(16).fill(0);if(isDrop&&density>.6)p.speak[12]=1;
    p.auto=Array.from({length:16},(_,s)=>isBreak?.45:isDrop?.76+s/16*.21:isBuild?.5+s/16*.32:.7);
    p.biniou=Array(16).fill(null);
    bank[letter]=p;
  });
  return bank;
}
function creatorGenerate(){
  if(isPlaying||SEQ.playing){creatorNotice('Arrête PLAY avant de générer un nouveau morceau.');return;}
  pushUndo();
  const generated=creatorGeneratePatterns();
  CREATOR_PATTERNS.forEach(name=>{patterns[name]=generated[name];});
  bpm=creatorState.tempo;
  // Disable destructive chaos mutations for a repeatable arrangement.
  Object.keys(trackChaos).forEach(name=>{trackChaos[name]=0;});
  if(typeof isAiAuto!=='undefined')isAiAuto=false;
  creatorState.running=false;
  curPat='C';matrix=patterns.C;
  syncProjectUI();creatorRender();
  saveLiveState();
  creatorNotice('Morceau tonal généré : '+creatorState.root+' '+creatorState.scale+', '+bpm+' BPM · 64 pas de mélodies et rolling bass K-B-B-B.');
  setStatus('NOUVEAU TRACK PSY · '+bpm+' BPM','ok');
}
function creatorSelectSongBar(bar){
  const match=creatorSectionAtBar(bar);
  if(!match)return false;
  if(match.index!==creatorLastSongSection){
    creatorLastSongSection=match.index;
    curPat=match.section.pat;matrix=patterns[curPat];
    applyMorph(match.section.morph,false);
    document.querySelectorAll('.pt').forEach(b=>b.classList.toggle('active',b.dataset.pat===curPat));
    buildSeq();
    const title=document.getElementById('creator-playing');
    if(title)title.textContent='MESURE '+(bar+1)+' / '+creatorTotalBars()+' · '+match.section.name+' · PATTERN '+curPat;
    creatorHighlightSection(match.index);
    setStatus('SONG · '+match.section.name,'ok');
  }
  return true;
}
function creatorHighlightSection(index){
  document.querySelectorAll('.creator-section').forEach((el,i)=>{
    el.classList.toggle('playing',i===index&&creatorState.running);
  });
}
function creatorSongBoundary(bar){
  if(!creatorState.running)return true;
  if(bar>=creatorTotalBars()){
    stopSeq();isPlaying=false;creatorState.running=false;
    const play=document.getElementById('play-btn');
    if(play){play.textContent='▶ PLAY';play.disabled=false;}
    creatorNotice('Morceau terminé · '+creatorTotalBars()+' mesures.');
    creatorHighlightSection(-1);
    setStatus('MORCEAU TERMINÉ','ok');
    return false;
  }
  creatorSelectSongBar(bar);
  return true;
}
function creatorStartSong(){
  // Tempo requested in Track Creator is authoritative for song playback.
  bpm=creatorState.tempo;
  const bpmInput=document.getElementById('bpm-input');if(bpmInput)bpmInput.value=bpm;
  if(isPlaying||SEQ.playing){
    stopSeq();isPlaying=false;
    const btn=document.getElementById('play-btn');if(btn)btn.textContent='▶ PLAY';
  }
  creatorState.running=true;creatorLastSongSection=-1;
  startSeq();isPlaying=true;
  const btn=document.getElementById('play-btn');if(btn)btn.textContent='⏸ PAUSE';
  creatorNotice('Lecture du morceau · '+creatorTotalBars()+' mesures ('+creatorTimeLabel(creatorDurationSeconds())+').');
}
function creatorStopSong(){
  creatorState.running=false;creatorLastSongSection=-1;creatorHighlightSection(-1);
  const el=document.getElementById('creator-playing');if(el)el.textContent='MORCEAU PRÊT · '+creatorTotalBars()+' MESURES';
}
async function creatorPlaySong(){
  if(!await activateStudioAudio())return;
  creatorStartSong();
}
function creatorExportSong(){
  if(isPlaying||SEQ.playing){creatorNotice('Arrête la lecture avant de lancer un export.');return;}
  studioExportBars=-1;
  const select=document.getElementById('studio-bars');
  if(select)select.value='-1';
  saveLiveState();
  const tab=document.querySelector('.nt[data-panel="fx"]');
  if(tab)tab.click();
  const target=document.getElementById('studio-export-card');
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  creatorNotice('Dans FX, choisis EXPORT WAV ou EXPORT MP3 avec « MORCEAU ENTIER ».');
}
function creatorNotice(message){
  const el=document.getElementById('creator-notice');if(el)el.textContent=message;
}
function creatorNoteChoices(){
  const root=creatorState.root,scale=creatorState.scale;
  const options=['<option value="">SILENCE / EFFACER</option>'];
  for(let octave=2;octave<=5;octave++){
    for(let degree=0;degree<7;degree++){
      const note=creatorScalePitch(degree,octave);
      options.push('<option value="'+note+'">'+note+'</option>');
    }
  }
  return options.join('');
}
function creatorEditorValue(cell){
  if(cell===null||cell===0)return '·';
  const note=typeof cell==='object'?cell.note:cell;
  return typeof note==='string'?note:'·';
}
function creatorRenderTimeline(){
  const container=document.getElementById('creator-sections');if(!container)return;
  const total=creatorTotalBars();
  container.innerHTML=creatorState.sections.map((section,i)=>{
    const color={A:'#7fd8ff',B:'#ffc46c',C:'#ef73f5',D:'#91f9b1'}[section.pat];
    return '<div class="creator-section" data-section="'+i+'" style="--section-color:'+color+'">'+
      '<div class="creator-section-row"><span class="creator-sect-name">'+(i+1)+'. '+section.name+'</span>'+
      '<label>PATTERN <select data-section-pat="'+i+'">'+CREATOR_PATTERNS.map(p=>'<option value="'+p+'"'+(p===section.pat?' selected':'')+'>'+p+'</option>').join('')+'</select></label>'+
      '<label>MESURES <select data-section-bars="'+i+'">'+CREATOR_BAR_OPTIONS.map(n=>'<option value="'+n+'"'+(n===section.bars?' selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
      '<button type="button" class="mb" data-section-delete="'+i+'" aria-label="Supprimer la section '+section.name+'">×</button></div>'+
      '<div class="creator-timeline-bar" style="width:'+Math.max(12,section.bars/total*100)+'%">'+section.bars+' mesures</div></div>';
  }).join('');
  container.querySelectorAll('[data-section-pat]').forEach(function(select){
    select.addEventListener('change',function(){
      pushUndo();creatorState.sections[Number(this.dataset.sectionPat)].pat=this.value;
      creatorRefreshSong();saveLiveState();
    });
  });
  container.querySelectorAll('[data-section-bars]').forEach(function(select){
    select.addEventListener('change',function(){
      pushUndo();creatorState.sections[Number(this.dataset.sectionBars)].bars=Number(this.value);
      creatorRefreshSong();saveLiveState();
    });
  });
  container.querySelectorAll('[data-section-delete]').forEach(function(button){
    button.addEventListener('click',function(){
      if(creatorState.sections.length<=1)return;
      pushUndo();creatorState.sections.splice(Number(this.dataset.sectionDelete),1);
      creatorRefreshSong();saveLiveState();
    });
  });
  creatorHighlightSection(creatorLastSongSection);
}
function creatorRefreshSong(){
  const bars=creatorTotalBars(),duration=creatorDurationSeconds(bars,creatorState.tempo);
  const durationEl=document.getElementById('creator-duration');
  if(durationEl)durationEl.textContent=bars+' MESURES · ENVIRON '+creatorTimeLabel(duration)+' MIN · '+creatorState.tempo+' BPM (TEMPO CRÉATEUR)';
  const songInfo=document.getElementById('creator-playing');
  if(songInfo&&!creatorState.running)songInfo.textContent='MORCEAU PRÊT · '+bars+' MESURES';
  creatorRenderTimeline();
}
function creatorRenderPiano(){
  const root=document.getElementById('creator-piano');if(!root)return;
  const track=creatorEditTrack,selector=document.getElementById('creator-note-picker');
  if(selector) {
    selector.innerHTML=creatorNoteChoices();
    if(![...selector.options].some(o=>o.value===creatorEditNote))creatorEditNote=creatorScalePitch(0,4);
    selector.value=creatorEditNote;
  }
  const labels={A:'INTRO',B:'BUILD',C:'DROP',D:'BREAK'};
  root.innerHTML=CREATOR_PATTERNS.map(letter=>{
    const slots=patterns[letter][track];
    return '<div class="creator-piano-line"><div class="creator-piano-title">'+letter+' · '+labels[letter]+'</div>'+
      '<div class="creator-piano-grid">'+slots.map((cell,i)=>{
        const active=!!cell;
        const label=creatorEditorValue(cell);
        return '<button type="button" class="creator-note'+(active?' on':'')+'" data-piano-pattern="'+letter+'" data-piano-step="'+i+'" title="'+letter+' pas '+(i+1)+': '+label+'">'+
          '<small>'+(i+1)+'</small><strong>'+label+'</strong></button>';
      }).join('')+'</div></div>';
  }).join('');
  root.querySelectorAll('[data-piano-pattern]').forEach(button=>button.addEventListener('click',function(){
    if(isPlaying||SEQ.playing){creatorNotice('Arrête PLAY pour éditer les notes.');return;}
    const pat=this.dataset.pianoPattern,step=Number(this.dataset.pianoStep);
    pushUndo();
    patterns[pat][track][step]=creatorEditNote?{note:creatorEditNote,vel:.82}:null;
    matrix=patterns[curPat];
    creatorRenderPiano();if(curPat===pat)buildSeq();
    saveLiveState();
  }));
}
function creatorBuildUI(){
  const root=document.getElementById('panel-song');if(!root)return;
  root.innerHTML='<section class="creator-head"><div class="creator-eyebrow">COMPOSITION · V10</div><h2>PSY TRACK CREATOR</h2>'+
    '<p>Construit un morceau complet, avec transitions par mesure, groove kick/basse et mélodies accordées. Le résultat reste 100 % éditable.</p></section>'+
    '<section class="fxcard creator-card"><h3>01 / DIRECTION ARTISTIQUE</h3>'+
    '<div class="creator-form">'+
    '<label>STYLE <select id="creator-style"><option value="fullon">FULL-ON PSY</option><option value="dark">DARK PSY</option><option value="progressive">PROGRESSIVE</option><option value="forest">FOREST PSY</option></select></label>'+
    '<label>TEMPO (BPM) <input id="creator-tempo" type="number" min="125" max="165" step="1"></label>'+
    '<label>TONALITÉ <select id="creator-root">'+CREATOR_ROOTS.map(k=>'<option value="'+k+'">'+k+'</option>').join('')+'</select></label>'+
    '<label>GAMME <select id="creator-scale"><option value="minor">MINEUR NATUREL</option><option value="phrygian">PHRYGIEN</option><option value="harmonic">MINEUR HARMONIQUE</option></select></label>'+
    '<label>ÉNERGIE <div class="creator-range"><input id="creator-energy" type="range" min="0" max="100" step="5"><output id="creator-energy-value"></output></div></label>'+
    '</div><button id="creator-generate" type="button" class="creator-primary">GÉNÉRER LES 4 PATTERNS / 64 PAS</button>'+
    '<div id="creator-notice" class="creator-notice" role="status">Prêt — la génération remplace les 4 patterns après sauvegarde Undo.</div></section>'+
    '<section class="fxcard creator-card"><h3>02 / KICK + ROLLING BASS</h3>'+
    '<p class="creator-help">Groove K-B-B-B : kick sur chaque noire, basse sur les trois doubles croches suivantes. Les notes courtes évitent les graves qui se chevauchent.</p>'+
    '<div class="creator-kbbb"><span>K</span><span>B</span><span>B</span><span>B</span><span>K</span><span>B</span><span>B</span><span>B</span><span>K</span><span>B</span><span>B</span><span>B</span><span>K</span><span>B</span><span>B</span><span>B</span></div>'+
    [['tightness','BASS TIGHT'],['cutoff','BASS CUTOFF'],['drive','BASS DRIVE'],['level','BASS LEVEL']].map(([key,label])=>'<label class="creator-bass-param"><span>'+label+'</span><input type="range" min="0" max="1" step=".01" data-creator-bass="'+key+'"><output></output></label>').join('')+
    '<button id="creator-audition-bass" type="button" class="mb creator-audition">TEST KICK + BASS</button></section>'+
    '<section class="fxcard creator-card"><h3>03 / SONG MODE · TIMELINE</h3>'+
    '<p class="creator-help">L’ordre et la durée sont modifiables. Le séquenceur change réellement de pattern à chaque nouvelle section.</p>'+
    '<div id="creator-duration" class="creator-duration"></div><div id="creator-playing" class="creator-playing">MORCEAU PRÊT</div>'+
    '<div id="creator-sections" class="creator-sections"></div>'+
    '<div class="creator-actions"><button id="creator-add-section" class="mb" type="button">+ SECTION</button>'+
    '<button id="creator-song-play" class="creator-primary" type="button">▶ LIRE LE MORCEAU</button>'+
    '<button id="creator-song-export" class="mb" type="button">EXPORT MORCEAU WAV / MP3</button></div></section>'+
    '<section class="fxcard creator-card"><h3>04 / MELODY LAB · 64 PAS</h3>'+
    '<p class="creator-help">Sélectionne FM, ACID, S1 MK2, TAÏGA ou THEREMIN. Choisis une note de la gamme, puis touche un pas pour écrire la mélodie (4 patterns × 16 pas).</p>'+
    '<div class="creator-piano-tools"><label>PISTE <select id="creator-edit-track"><option value="fm">FM2</option><option value="acid">TD-3 ACID</option><option value="theremin">THEREMIN</option><option value="s1">S1 MK2 · ANALOG</option><option value="taiga">TAÏGA · MODULAR</option></select></label>'+
    '<label>NOTE <select id="creator-note-picker"></select></label></div>'+
    '<div id="creator-piano" class="creator-piano"></div></section>';
  [['style','style'],['tempo','tempo'],['root','root'],['scale','scale'],['energy','energy']].forEach(function(entry){
    const input=document.getElementById('creator-'+entry[0]);
    input.value=creatorState[entry[1]];
    input.addEventListener('change',function(){
      const key=entry[1];
      pushUndo();
      creatorState[key]=key==='tempo'?Math.round(creatorClamp(Number(input.value),125,165,145))
        :key==='energy'?Math.round(creatorClamp(Number(input.value),0,100,75)):input.value;
      if(key==='tempo'){
        bpm=creatorState.tempo;
        const bpmInput=document.getElementById('bpm-input');if(bpmInput)bpmInput.value=bpm;
      }
      if(key==='energy')document.getElementById('creator-energy-value').textContent=creatorState.energy+'%';
      if(key==='root'||key==='scale')creatorRenderPiano();
      creatorRefreshSong();saveLiveState();
    });
  });
  document.getElementById('creator-energy-value').textContent=creatorState.energy+'%';
  root.querySelectorAll('[data-creator-bass]').forEach(function(input){
    input.value=creatorState.bass[input.dataset.creatorBass];
    input.nextElementSibling.textContent=Math.round(Number(input.value)*100)+'%';
    input.addEventListener('pointerdown',pushUndo);
    input.addEventListener('input',function(){
      creatorState.bass[input.dataset.creatorBass]=Number(input.value);
      input.nextElementSibling.textContent=Math.round(Number(input.value)*100)+'%';saveLiveState();
    });
  });
  document.getElementById('creator-generate').addEventListener('click',creatorGenerate);
  document.getElementById('creator-add-section').addEventListener('click',function(){
    if(creatorState.sections.length>=24){creatorNotice('Maximum : 24 sections.');return;}
    pushUndo();creatorState.sections.push({name:'NOUVELLE SECTION',pat:'C',bars:16,morph:.32});
    creatorRefreshSong();saveLiveState();
  });
  document.getElementById('creator-song-play').addEventListener('click',creatorPlaySong);
  document.getElementById('creator-song-export').addEventListener('click',creatorExportSong);
  document.getElementById('creator-edit-track').addEventListener('change',function(){
    creatorEditTrack=this.value;creatorRenderPiano();
  });
  document.getElementById('creator-note-picker').addEventListener('change',function(){
    creatorEditNote=this.value;
  });
  document.getElementById('creator-audition-bass').addEventListener('click',async function(){
    if(!await activateStudioAudio())return;
    const start=ctx.currentTime+.05,sixteenth=60/(bpm*4),base=creatorScalePitch(0,2);
    for(let step=0;step<16;step++){
      const time=start+step*sixteenth;
      if(step%4===0)psyTriggerT8Kick(time);
      else creatorRollingBass(base,time,.75);
    }
    creatorNotice('Test kick et basse rolling sur une mesure à '+bpm+' BPM.');
  });
  creatorRefreshSong();creatorRenderPiano();
}
function creatorSyncUI(){
  const panel=document.getElementById('panel-song');
  if(!panel)return;
  [['style','style'],['tempo','tempo'],['root','root'],['scale','scale'],['energy','energy']].forEach(function(pair){
    const el=document.getElementById('creator-'+pair[0]);if(el)el.value=creatorState[pair[1]];
  });
  const energy=document.getElementById('creator-energy-value');if(energy)energy.textContent=creatorState.energy+'%';
  document.querySelectorAll('[data-creator-bass]').forEach(function(el){
    el.value=creatorState.bass[el.dataset.creatorBass];
    el.nextElementSibling.textContent=Math.round(Number(el.value)*100)+'%';
  });
  creatorRefreshSong();creatorRenderPiano();
}
