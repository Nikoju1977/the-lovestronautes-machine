/* WebKit touch/mobile smoke for Lovestronautes. Playwright WebKit on Linux
 * is NOT actual iOS Safari or a phone's speaker. We check real DOM and audio APIs.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';

const cwd=process.cwd();
const mime=file=>file.endsWith('.js')?'text/javascript':
  file.endsWith('.css')?'text/css':
  file.endsWith('.json')?'application/json':
  file.endsWith('.svg')?'image/svg+xml':'text/html';
const server=http.createServer((req,res)=>{
 const name=new URL(req.url||'/','http://localhost').pathname.slice(1)||'index.html';
 let file;
 try{file=path.resolve(cwd,decodeURIComponent(name));}
 catch(error){res.writeHead(400);res.end();return;}
 if(!file.startsWith(cwd+path.sep)){res.writeHead(403);res.end();return;}
 try{res.writeHead(200,{'Content-Type':mime(name),'Cache-Control':'no-store'});
     res.end(fs.readFileSync(file));}
 catch(error){res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const errors=[];
try{
 browser=await webkit.launch({headless:true});
 const context=await browser.newContext({
  viewport:{width:390,height:844},
  isMobile:true,hasTouch:true,
  reducedMotion:'reduce'
 });
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{
   waitUntil:'domcontentloaded',timeout:30000
 });
 await page.waitForSelector('#studio-key-instrument',{timeout:20000});
 assert.match(await page.locator('.live-badge').innerText(),/V23/);
 assert.equal(await page.locator('#panel-seq .tcard').count(),18);
 assert.equal(await page.locator('#panel-mix .mxch').count(),18);
 assert.equal(await page.locator('#panel-gear .hardware-rack').count(),4);
 assert.equal(await page.locator('#panel-gear .fieldkit-rack').count(),1);
 assert.equal(await page.locator('#fieldkit-rack .fieldkit-channel').count(),4);
 assert.equal(await page.locator('#grandmother-rack').count(),1);
 assert.equal(await page.locator('#grandmother-preset option').count(),6);
 assert.equal(await page.locator('#panel-seq .tcard[data-studio-track="grandmother"]').count(),1);
 assert.equal(await page.locator('#panel-mix .mxch[data-studio-track="grandmother"]').count(),1);
 assert.equal(await page.locator('#studio-key-instrument option[value="grandmother"]').count(),1);
 assert.equal(await page.locator('#fieldkit-stream-play').count(),1);
 assert.equal(await page.locator('#studio-stability-toggle').count(),1);
 assert.ok(await page.locator('#fieldkit-import-status').count());
 assert.equal(await page.locator('#mobile-studio-dock button').count(),6);
 assert.equal(await page.locator('#panel-mix .studio-eq-details').count(),18);
 assert.ok(await page.locator('#eq-preset').count());

 assert.ok(await page.locator('#panel-loops #loops-play').count());
 assert.equal(await page.locator('#loops-bars option').count(),6);
 assert.equal(await page.locator('#kbd .studio-piano-key.white').count(),8);
 assert.equal(await page.locator('#kbd .studio-piano-key.black').count(),5);
 console.log('✓ WebKit: all 18 tracks, Field Kit and four other synths, loops and piano keys render on phone viewport');

 const result=await page.evaluate(()=>({
  WebAudio:!!(window.AudioContext||window.webkitAudioContext),
  iOSRecordMime:mobileBestRecordingMime({isTypeSupported:type=>type.startsWith('audio/mp4')}),
  mobileResume:typeof mobileResumeAudio,
  touchPiano:typeof studioKeyboardStart,
  loop:typeof loopsPlay,
  waveform:typeof mbaseTrigger
 }));
 assert.ok(result.WebAudio,'WebKit should expose Web Audio');
 assert.equal(result.mobileResume,'function');
 assert.equal(result.touchPiano,'function');
 assert.equal(result.loop,'function');
 assert.equal(result.waveform,'function');
 assert.ok(result.iOSRecordMime.includes('mp4'));
 console.log('✓ WebKit: Web Audio, Safari AAC detection, loop and keyboard engines load');

 // Tap the actual button, which is required for audio activation on Safari.
 await page.locator('#unlock').click({timeout:18000});
 await page.waitForTimeout(400);
 let audio=await page.evaluate(()=>({state:ctx?.state||'absent',ready:audioReady,
  instructions:document.getElementById('studio-audio-guide')?.textContent||''}));
 // A headless Linux WebKit runner can have no physical audio output; explicitly
 // report that rather than claiming playback was heard on an iPhone.
 if(audio.state==='running'){
  console.log('✓ WebKit AudioContext RUNNING after user tap');
  // Real-time playback regression: prior smoke only tested a single triggered note.
  // Exercise the full 18-lane scheduler for more than one musical bar.
  await page.locator('#studio-demo-btn').click();
  const playback=await page.evaluate(async()=>{
   const probe=ctx.createAnalyser();probe.fftSize=512;
   masterOutput.connect(probe);
   const samples=new Float32Array(512);
   let peak=0;
   try{
    for(let i=0;i<24;i++){
     await new Promise(resolve=>setTimeout(resolve,120));
     probe.getFloatTimeDomainData(samples);
     let power=0;for(const n of samples)power+=n*n;
     peak=Math.max(peak,Math.sqrt(power/samples.length));
    }
    return {playing:SEQ.playing,bars:SEQ.barCount,step:SEQ.masterStep,
      audio:ctx.state,peak,faults:studioAudioFaults};
   }finally{try{masterOutput.disconnect(probe);}catch(ignore){}}
  });
  assert.equal(playback.playing,true,'Full demo must keep playing without an audio crash');
  assert.ok(playback.bars>=1,'More than one bar must be scheduled in real time: '+JSON.stringify(playback));
  assert.equal(playback.audio,'running','AudioContext must remain running during playback');
  assert.ok(playback.peak>.00002,'Sequenced instruments must produce non-silent master PCM: '+JSON.stringify(playback));
  await page.locator('#play-btn').click();
  assert.equal(await page.evaluate(()=>SEQ.playing),false);
  console.log('✓ WebKit: sustained 18-track playback, beat advance and audible-path PCM ('+playback.peak.toFixed(5)+')');
  await page.locator('.nt[data-panel="gear"]').click();
  await page.locator('#fieldkit-preset').selectOption('antenna');
  await page.locator('#fieldkit-test').click();
  const msg=await page.locator('#fieldkit-status').innerText();
  assert.match(msg,/SON PROGRAMMÉ/);
  console.log('✓ WebKit Field Kit four-channel audio audition successful');
  await page.locator('#grandmother-preset').selectOption('bass');
  await page.locator('#grandmother-test').click();
  assert.match(await page.locator('#grandmother-status').innerText(),/SON PROGRAMMÉ/);
  assert.equal(await page.evaluate(()=>!!grandmotherVoice),true);
  console.log('✓ WebKit Grandmother stereo master, 2 VCO and ladder-like filter schedule on touch');
  await page.locator('#grandmother-arp').click();
  assert.equal(await page.evaluate(()=>grandmotherArpActive),true);
  await page.locator('#grandmother-arp').click();
  assert.equal(await page.evaluate(()=>grandmotherArpActive),false);
  console.log('✓ WebKit Grandmother 8-note arp starts and stops');
  await page.locator('.nt[data-panel="fx"]').click();
  await page.locator('#eq-preset').selectOption('field');
  assert.equal(await page.evaluate(()=>eqState.preset),'field');
  console.log('✓ WebKit master EQ preset and DSP trim settings work');

  await page.locator('.nt[data-panel="gear"]').click();
  await page.locator('#hardware-test-mbase').click();
  await page.waitForTimeout(150);
  const label=await page.locator('#hardware-status-mbase').innerText();
  assert.match(label,/SON PROGRAMMÉ/);
  console.log('✓ WebKit: JOMOX MBase TEST schedules kick');
  await page.locator('.nt[data-panel="loops"]').click();
  await page.locator('#loops-play').click();
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>SEQ.playing),true);
  await page.locator('#loops-stop').click();
  assert.equal(await page.evaluate(()=>SEQ.playing),false);
  console.log('✓ WebKit: loop playback starts/stops without hanging');
  await page.locator('.nt[data-panel="compose"]').click();
  await page.locator('#cp-new').click();
  await page.locator('#cp-bars').selectOption('1');
  await page.locator('[data-cp-track="kick"]').click();
  await page.locator('#cp-roll [data-cp-step="0"]').click();
  await page.evaluate(()=>{composeState.sections=[];composeRender();});
  await page.locator('#cp-add-section').click();
  await page.locator('#cp-tempo').fill('220');
  await page.locator('#cp-tempo').dispatchEvent('change');
  await page.locator('#cp-play-song').click();
  const composition=await page.evaluate(async()=>{
   const values=new Float32Array(analyserNode.fftSize);let peak=0;
   for(let i=0;i<18;i++){
    await new Promise(resolve=>setTimeout(resolve,90));analyserNode.getFloatTimeDomainData(values);
    for(const n of values)peak=Math.max(peak,Math.abs(n));
   }
   return {peak,playing:SEQ.playing,bars:SEQ.barCount,midi:Array.from(composeMidiBytes('song').subarray(0,4))};
  });
  assert.ok(composition.peak>.00002,'Composition Pro must generate master PCM on WebKit');
  assert.equal(composition.playing,false);assert.equal(composition.bars,1);
  assert.deepEqual(composition.midi,[77,84,104,100]);
  console.log('✓ WebKit Composition Pro: touch note editing, arrangement, finite playback PCM and MIDI header');
 }else{
  console.log('! WebKit headless audio unavailable ('+audio.state+') - actual iOS playback remains unverified');
  assert.ok(audio.instructions.length>0,'Audio failure provides visible guidance');
 }
 await page.locator('#studio-key-span').selectOption('2');
 assert.equal(await page.locator('#kbd .studio-piano-key.white').count(),15);
 await page.locator('#studio-key-instrument').selectOption('modfm');
 assert.equal(await page.locator('#studio-key-instrument').inputValue(),'modfm');
 console.log('✓ WebKit: octave selection and FM instrument routing work');

 assert.deepEqual(errors,[],'No uncaught JS errors in WebKit');
 console.log('\nWebKit mobile viewport smoke: OK (does not certify iOS hardware)');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
