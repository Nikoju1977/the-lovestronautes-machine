/* GitHub Actions actual headless Chrome smoke: Web Audio, Taiga and keyboards.
   No external browser service or private files. Does not establish audible quality. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

function browserHarness(){
 const failures=[],passed=[];
 function check(condition,label){
  if(condition)passed.push(label);else failures.push(label);
 }
 window.addEventListener('error',e=>failures.push('JS: '+(e.message||'error')));
 window.addEventListener('unhandledrejection',e=>failures.push('Promise: '+String(e.reason).slice(0,100)));
 setTimeout(async function(){
  try{
   check(document.querySelector('.live-badge')?.textContent.includes('V19'),'V19 badge');
   check(typeof taigaTrigger==='function','Taiga synth engine');
   check(!!document.getElementById('taiga-rack'),'Taiga rack rendered');
   check(document.querySelectorAll('#panel-seq .tcard').length===18,'18 step sequencer lanes');
   check(document.querySelectorAll('#panel-mix .mxch').length===18,'18 channel strips');
   check(document.querySelectorAll('#taiga-rack [data-taiga-param]').length>20,'Taiga analog controls');
   check(document.querySelectorAll('#taiga-preset option').length===5,'Taiga presets');
   check(!!document.querySelector('#panel-loops #loops-play'),'Loop Studio transport');
   check(!!document.getElementById('fieldkit-rack'),'Field Kit electroacoustic rack rendered');
   check(!!document.getElementById('grandmother-rack'),'Grandmother semi-modular rack rendered');
   check(document.querySelectorAll('#grandmother-rack [data-grandmother-key]').length>=20,'Grandmother sound parameters are available');
   check(document.querySelectorAll('#grandmother-preset option').length===6,'Five Grandmother patches plus custom mode');
   check(!!document.querySelector('#panel-seq .tcard[data-studio-track="grandmother"]'),'Grandmother 18th sequencer track');
   check(!!document.querySelector('#panel-mix .mxch[data-studio-track="grandmother"]'),'Grandmother mixer channel');
   check(!!document.querySelector('#creator-edit-track option[value="grandmother"]'),'Grandmother editable Melody Lab');
   check(!!document.querySelector('#studio-key-instrument option[value="grandmother"]'),'Grandmother live keyboard and MIDI');
   check(patterns.C.grandmother.every(v=>v===null),'Grandmother starts silent in old projects');
   check(document.querySelectorAll('#fieldkit-rack .fieldkit-channel').length===4,'Field Kit 4 independent mixer inputs');
   check(document.querySelectorAll('#fieldkit-preset option').length===5,'Field Kit presets available');
   check(!!document.getElementById('fieldkit-record')&&!!document.getElementById('fieldkit-file'),'Field recording and import on mobile');
   check(!!document.getElementById('fieldkit-stream-play'),'100MB native stream audio button');
   check(!!document.getElementById('studio-stability-toggle'),'Eco stability control mounted');
   check(!!document.getElementById('fieldkit-import-status'),'Safe large-file feedback');
   check(typeof fieldkitImportLargeFile==='function'&&FIELDKIT_IMPORT_MAX===104857600,'100MB importer engine registered');
   check(!!document.getElementById('fieldkit-envelope'),'Microphone envelope follower UI');
   check(!!document.getElementById('mobile-studio-dock'),'Mobile touch navigation mounted');
   check(!!document.getElementById('eq-preset'),'Master EQ presets visible');
   check(!!document.querySelector('#panel-mix .studio-eq-details'),'Mobile collapsible channel EQ');
   check(document.querySelectorAll('#panel-mix .mxch[data-studio-track="fieldkit"]').length===1,'Field Kit mixer channel');
   check(document.querySelectorAll('#panel-seq .tcard[data-studio-track="fieldkit"]').length===1,'Field Kit sequencer track');
   check(!!document.querySelector('#creator-edit-track option[value="fieldkit"]'),'Field Kit melody editor');
   check(!!document.querySelector('#studio-key-instrument option[value="fieldkit"]'),'Field Kit live keyboard');

   check(document.querySelectorAll('#loops-bars option').length===6,'Loop bar durations');
   check(!!document.getElementById('loops-export-wav')&&!!document.getElementById('loops-export-mp3'),'Loop WAV/MP3 buttons');
   check(['mbase','solar','modfm','wing'].every(k=>!!document.getElementById('hardware-'+k)),'Four instrument racks');
   check(['mbase','solar','modfm','wing'].every(k=>!!document.getElementById('hardware-test-'+k)),'Four audition buttons');
   check(['mbase','solar','modfm','wing'].every(k=>!!document.querySelector('#panel-seq .tcard[data-studio-track="'+k+'"]')),'New instrument sequencer lanes');
   check(['mbase','solar','modfm','wing'].every(k=>!!document.querySelector('#panel-mix .mxch[data-studio-track="'+k+'"]')),'New instrument mixer channels');
   check(patterns.C.mbase.filter(Boolean).length===0,'Extra kick is silent by default');
   check(document.querySelectorAll('#studio-key-instrument option').length>=12,'Instrument selection on piano');
   check(!!document.querySelector('#creator-edit-track option[value="taiga"]'),'Taiga Melody Lab');
   check(document.querySelectorAll('#kbd .studio-piano-key.white').length===8,'Piano white keys');
   check(document.querySelectorAll('#kbd .studio-piano-key.black').length===5,'Piano black keys');
   check(!!document.getElementById('studio-key-instrument'),'Instrument selector');
   check(!!document.getElementById('studio-key-down'),'Octave controls');
   let ready=false;
   try{ready=await activateStudioAudio();}
   catch(error){failures.push('Audio unlock: '+error.message);}
   check(ready&&ctx.state==='running','AudioContext running');
   if(ready){
    // Numerical audio assertion: unlike a UI trigger, this proves that
    // a generated note reaches the real master audio bus.
    const audioProbe=ctx.createAnalyser();audioProbe.fftSize=512;
    masterOutput.connect(audioProbe);
    const audioSamples=new Float32Array(512);
    let observedPeak=0;
    const kickAt=ctx.currentTime+.025;
    psyTriggerT8Kick(kickAt);
    for(let i=0;i<12;i++){
      await new Promise(r=>setTimeout(r,35));
      audioProbe.getFloatTimeDomainData(audioSamples);
      const rms=Math.sqrt(audioSamples.reduce((sum,v)=>sum+v*v,0)/audioSamples.length);
      observedPeak=Math.max(observedPeak,rms);
    }
    masterOutput.disconnect(audioProbe);
    check(observedPeak>.0002,'Real synthesized kick reaches master PCM ('+observedPeak.toFixed(5)+')');
    check(!!chanGain.taiga,'Taiga bus connected');
    check(!!chanGain.fieldkit,'Field Kit connected to master audio');
    check(!!chanGain.grandmother,'Grandmother bus connected to master audio');
    check(grandmotherTrigger('C3',ctx.currentTime+.06,.78,true),'Grandmother real Web Audio oscillator runs');
    check(grandmotherVoice&&!grandmotherVoice.released,'Grandmother held note sustains');
    check(grandmotherRelease('C3'),'Grandmother note-off releases touch/MIDI voice');
    check(grandmotherTrigger('F3',ctx.currentTime+.08,.77,false),'Grandmother preset sequencer note triggers');
    grandmotherStop();
    check(fieldkitTrigger('F3',ctx.currentTime+.09,.68),'Field Kit starts four-channel audio');
    check(fieldkitVoices.length<=1,'Field Kit mobile voice limit');
    fieldkitStopVoices();
    check(studioNodes.fieldkit?.filters.length===4,'Field Kit four-band mixer EQ');
    check(studioApplyEqPreset('fieldkit','warmth'),'Instrument EQ preset works');
    check(studioChannels.fieldkit.eqPreset==='warmth','Channel EQ setting persists');
    check(masterEqPreset('field'),'Master EQ FIELD RECORDING preset works');
    check(eqState.preset==='field','Master EQ preset stored');

    check(['mbase','solar','modfm','wing'].every(k=>!!chanGain[k]),'Four new mix buses connected');
    for(const k of ['mbase','solar','modfm','wing'])
      check(hardwareTrigger(k,'F3',ctx.currentTime+.08,.55),'Web Audio plays '+k);
    check(hardwareVoices.solar.length<=2,'Solar voice cap');
    hardwareStop();
    check(taigaTrigger('F3',ctx.currentTime+.06,.82),'Taiga schedules audio');
    check(taigaVoices.length<=1,'Taiga one voice limit');
    taigaStopVoices();
    const key=document.querySelector('#kbd .studio-piano-key[data-note="C3"]');
    check(!!key,'C3 live key');
    if(key){
     key.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:42,pointerType:'touch'}));
     await new Promise(r=>setTimeout(r,60));
     check(key.classList.contains('pressed'),'Touch starts note');
     key.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:42,pointerType:'touch'}));
     await new Promise(r=>setTimeout(r,50));
     check(!key.classList.contains('pressed'),'Touch release clears note');
    }
    studioKeyboardMidiMessage([0x90,60,112]);
    await new Promise(r=>setTimeout(r,30));
    check(studioKeyMidi.size===1,'MIDI note-on');
    studioKeyboardMidiMessage([0x80,60,0]);
    check(studioKeyMidi.size===0,'MIDI note-off');
    const preset=document.getElementById('taiga-preset');
    preset.value='acid';preset.dispatchEvent(new Event('change',{bubbles:true}));
    check(taigaPreset==='acid','Taiga preset change');
    document.getElementById('taiga-test').click();
    await new Promise(r=>setTimeout(r,130));
    check(document.getElementById('taiga-status').textContent.includes('TAÏGA · F3'),'Taiga TEST button');
    const span=document.getElementById('studio-key-span');
    span.value='2';span.dispatchEvent(new Event('change',{bubbles:true}));
    check(document.querySelectorAll('#kbd .studio-piano-key.white').length===15,'Two-octave option');
   }
   check(loopsSaveClip('SMOKE TEST'),'Named loop clip saved');
   check(loopsState.clips.some(c=>c.name==='SMOKE TEST'),'Loop library persists clip');
   check(loopsLoadClip(),'Loop clip recalled to pattern');
   check(loopsDeleteClip(),'Temporary loop clip deleted');
   check(!!document.querySelector('.s1-mini-keys .s1-key'),'S1 mini piano remains');
   check(!!document.querySelector('.taiga-mini-keys .taiga-key'),'Taiga mini piano exists');
  }catch(e){failures.push('Exception: '+e.message);}
  const pre=document.createElement('pre');
  pre.id='browser-smoke-result';
  pre.textContent='V19_CHROME_SMOKE_RESULT_'+(failures.length?'FAIL':'PASS')+'|'+passed.length+'|'+failures.join(' ; ');
  document.body.appendChild(pre);
 },100);
}
const cwd=process.cwd(),index=fs.readFileSync('index.html','utf8');
assert.ok(index.includes('</body>'));
const injection='<script>('+browserHarness.toString()+')();</script>';
const page=index.replace('</body>',injection+'</body>');
const mime=p=>p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':
 p.endsWith('.html')?'text/html':p.endsWith('.json')?'application/json':
 p.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
const server=http.createServer((req,res)=>{
 const name=new URL(req.url||'/','http://localhost').pathname.slice(1)||'index.html';
 const file=path.resolve(cwd,decodeURIComponent(name));
 if(!file.startsWith(cwd+path.sep)){res.writeHead(403);res.end();return;}
 try{const data=name==='index.html'?page:fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':mime(name),'Cache-Control':'no-store'});res.end(data);
 }catch(e){res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const chrome=[process.env.CHROME_BIN,'google-chrome','chromium','chromium-browser']
 .filter(Boolean).find(cmd=>spawnSync('which',[cmd],{encoding:'utf8'}).status===0);
if(!chrome){server.close();throw Error('Chrome/Chromium missing on runner');}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'psy-v15-chrome-'));
let stdout='',stderr='';
try{
 const process=spawn(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--no-default-browser-check','--disable-extensions',
  '--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling',
  '--user-data-dir='+temp,'--window-size=430,900',
  '--virtual-time-budget=5200','--dump-dom',
  'http://127.0.0.1:'+server.address().port+'/'
 ],{stdio:['ignore','pipe','pipe']});
 process.stdout.on('data',v=>stdout+=v.toString());
 process.stderr.on('data',v=>stderr+=v.toString());
 const timeout=setTimeout(()=>process.kill('SIGKILL'),60000);
 const code=await new Promise(resolve=>process.on('close',resolve));
 clearTimeout(timeout);
 const result=stdout.match(/V19_CHROME_SMOKE_RESULT_(PASS|FAIL)\|(\d+)\|([^<]*)/);
 if(!result)throw Error('Browser test did not finish (code '+code+', DOM bytes '+stdout.length+'): '+stderr.slice(-1000)+' DOM tail '+stdout.slice(-600));
 console.log('Chromium UI assertions passed: '+result[2]);
 if(result[1]!=='PASS')throw Error('Browser errors: '+result[3]);
 console.log('✓ Live Chromium: 16-track studio, 4 synths, loops, keyboard, MIDI and audio OK');
}finally{server.close();fs.rmSync(temp,{recursive:true,force:true});}
