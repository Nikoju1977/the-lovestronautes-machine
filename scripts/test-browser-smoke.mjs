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
   check(document.querySelector('.live-badge')?.textContent.includes('V13'),'V13 badge');
   check(typeof taigaTrigger==='function','Taiga synth engine');
   check(!!document.getElementById('taiga-rack'),'Taiga rack rendered');
   check(document.querySelectorAll('#panel-seq .tcard').length===12,'12 step sequencer lanes');
   check(document.querySelectorAll('#panel-mix .mxch').length===12,'12 channel strips');
   check(document.querySelectorAll('#taiga-rack [data-taiga-param]').length>20,'Taiga analog controls');
   check(document.querySelectorAll('#taiga-preset option').length===5,'Taiga presets');
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
    check(!!chanGain.taiga,'Taiga bus connected');
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
   check(!!document.querySelector('.s1-mini-keys .s1-key'),'S1 mini piano remains');
   check(!!document.querySelector('.taiga-mini-keys .taiga-key'),'Taiga mini piano exists');
  }catch(e){failures.push('Exception: '+e.message);}
  const pre=document.createElement('pre');
  pre.id='browser-smoke-result';
  pre.textContent='V13_CHROME_SMOKE_RESULT_'+(failures.length?'FAIL':'PASS')+'|'+passed.length+'|'+failures.join(' ; ');
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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'psy-v13-chrome-'));
let stdout='',stderr='';
try{
 const process=spawn(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--no-default-browser-check','--disable-extensions',
  '--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling',
  '--user-data-dir='+temp,'--window-size=430,900',
  '--virtual-time-budget=6500','--dump-dom',
  'http://127.0.0.1:'+server.address().port+'/'
 ],{stdio:['ignore','pipe','pipe']});
 process.stdout.on('data',v=>stdout+=v.toString());
 process.stderr.on('data',v=>stderr+=v.toString());
 const timeout=setTimeout(()=>process.kill('SIGKILL'),25000);
 const code=await new Promise(resolve=>process.on('close',resolve));
 clearTimeout(timeout);
 const result=stdout.match(/V13_CHROME_SMOKE_RESULT_(PASS|FAIL)\|(\d+)\|([^<]*)/);
 if(!result)throw Error('Browser test did not finish (code '+code+'): '+stderr.slice(-750));
 console.log('Chromium UI assertions passed: '+result[2]);
 if(result[1]!=='PASS')throw Error('Browser errors: '+result[3]);
 console.log('✓ Live Chromium: Taiga + 12-track studio + keyboard + MIDI + Web Audio OK');
}finally{server.close();fs.rmSync(temp,{recursive:true,force:true});}
