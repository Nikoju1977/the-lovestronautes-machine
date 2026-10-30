/* Real Chromium, real audio clock, actual pointer editing and downloaded files.
 * Headless PCM tests establish a signal, not subjective sound quality or a
 * physical Android/iPhone speaker test. Screenshots are retained by CI. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const cwd=process.cwd(),artifacts=path.join(cwd,'test-artifacts');fs.mkdirSync(artifacts,{recursive:true});
const server=http.createServer((req,res)=>{
 const name=new URL(req.url||'/','http://localhost').pathname.slice(1)||'index.html';
 const file=path.resolve(cwd,decodeURIComponent(name));
 if(!file.startsWith(cwd+path.sep)){res.writeHead(403).end();return;}
 try{
  const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.svg')?'image/svg+xml':'text/html';
  const data=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const executable=[process.env.CHROME_BIN,'google-chrome','chromium','chromium-browser'].filter(Boolean).find(cmd=>spawnSync('which',[cmd]).status===0);
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500,acceptDownloads:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
   await page.locator('#studio-compose-btn').click();
   await page.locator('#cp-new').click();
   await page.locator('#cp-clip-name').fill('Phrase test');await page.locator('#cp-clip-name').dispatchEvent('change');
   await page.locator('#cp-bars').selectOption('2');
   await page.locator('#cp-roll [data-cp-pitch="60"][data-cp-step="0"]').click();
   await page.locator('#cp-note-vel').evaluate(el=>{el.value='70';el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.locator('#cp-note-gate').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('change',{bubbles:true}));});
   const first=await page.evaluate(()=>composeSelected().tracks.fm[0]);
   assert.ok(first,'First piano click must write a note: '+JSON.stringify({errors,view:await page.evaluate(()=>composeView),message:await page.locator('#cp-notice').innerText()}));
   assert.equal(first.note,'C4');assert.equal(first.vel,.7);assert.equal(first.gate,2);
   await page.locator('[data-cp-bar="1"]').click();
   await page.locator('#cp-roll [data-cp-pitch="67"][data-cp-step="12"]').click();
   assert.equal(await page.evaluate(()=>composeSelected().tracks.fm[28].note),'G4');
   await page.locator('#cp-undo').click();
   assert.equal(await page.evaluate(()=>composeSelected().tracks.fm[28]),null);
   await page.locator('#cp-redo').click();
   assert.equal(await page.evaluate(()=>composeSelected().tracks.fm[28].note),'G4');
   await page.locator('#cp-copy-bar').click();
   await page.locator('[data-cp-bar="0"]').click();
   await page.locator('#cp-paste-bar').click();
   assert.equal(await page.evaluate(()=>composeSelected().tracks.fm[12].note),'G4');
   await page.locator('#cp-undo').click();
   assert.equal(await page.evaluate(()=>composeSelected().tracks.fm[0].note),'C4');
   // Restore a predictable, short arrangement without modifying the legacy bank.
   await page.evaluate(()=>{composeState.sections=[];composeRender();});
   await page.locator('#cp-add-section').click();
   await page.locator('#cp-tempo').fill('220');await page.locator('#cp-tempo').dispatchEvent('change');
   await page.locator('[data-cp-track="kick"]').click();
   await page.locator('#cp-roll [data-cp-step="0"]').click();
   await page.locator('[data-cp-bar="1"]').click();
   await page.locator('#cp-roll [data-cp-step="0"]').click();
   await page.locator('[data-cp-track="fm"]').click();
   const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
   assert.ok(overflow.width<=overflow.viewport+2,'No horizontal page overflow: '+JSON.stringify(overflow));
   await page.screenshot({path:path.join(artifacts,'composition-'+width+'.png'),fullPage:true});
   const midiDownload=page.waitForEvent('download');await page.locator('#cp-midi').click();
   const midi=fs.readFileSync(await (await midiDownload).path());assert.equal(midi.subarray(0,4).toString(),'MThd');assert.equal(midi.readUInt16BE(10),19);
   await page.locator('#cp-play-song').click();
   const signal=await page.evaluate(async()=>{
    const pcm=new Float32Array(analyserNode.fftSize);let peak=0,active=0;
    for(let i=0;i<36;i++){
     await new Promise(resolve=>setTimeout(resolve,80));
     analyserNode.getFloatTimeDomainData(pcm);
     let sum=0;for(const sample of pcm){if(!Number.isFinite(sample))throw Error('Nonfinite master PCM');sum+=sample*sample;}
     const rms=Math.sqrt(sum/pcm.length);peak=Math.max(peak,rms);if(rms>.00002)active++;
    }
    return {peak,active,playing:SEQ.playing,bar:SEQ.barCount,state:ctx.state};
   });
   assert.equal(signal.state,'running');assert.equal(signal.playing,false);assert.equal(signal.bar,2);
   assert.ok(signal.peak>.00002&&signal.active>=4,'Actual composition audio reaches the master: '+JSON.stringify(signal));
   await page.locator('#cp-export-source').selectOption('clip');
   await page.evaluate(()=>{
    const trim=studioTrimPCM;
    studioTrimPCM=function(chunks,rate,start,end,fallback){
     const output=trim(chunks,rate,start,end,fallback);
     window.__captureTrace={rate,start,end,fallback,input:chunks.map(c=>({frame:c.frame,frames:c.left.length})),output:output.reduce((n,c)=>n+c.left.length,0)};
     return output;
    };
   });
   const wavDownload=page.waitForEvent('download',{timeout:25000});await page.locator('#cp-wav').click();
   const wav=fs.readFileSync(await (await wavDownload).path());
   assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.readUInt16LE(34),24);assert.equal(wav.readUInt16LE(22),2);
   const sampleRate=wav.readUInt32LE(24),frames=wav.readUInt32LE(40)/6;
   const expected=Math.round((2*240/220+1.6)*sampleRate);
   if(Math.abs(frames-expected)>1){
    fs.writeFileSync(path.join(artifacts,'export-failure-'+width+'.wav'),wav);
    console.log('CAPTURE TRACE '+JSON.stringify(await page.evaluate(()=>window.__captureTrace)));
   }
   assert.ok(Math.abs(frames-expected)<=1,'Export has exact bar duration plus 1.6 s effect tail: '+JSON.stringify({frames,expected,sampleRate}));
   let peak=0;for(let i=44;i+2<wav.length;i+=6)peak=Math.max(peak,Math.abs(wav.readIntLE(i,3)));
   assert.ok(peak>100,'Downloaded 24-bit WAV contains actual composition audio');
   const beforeReload=await page.evaluate(()=>{
    const raw=localStorage.getItem('lovestronautes_state'),saved=raw?JSON.parse(raw):null;
    return {selected:composeState.selected,current:composeSelected()?.tracks.fm.slice(0,32),
      stored:!!raw,bytes:raw?.length,storedSelected:saved?.composition?.selected,
      storedClip:saved?.composition?.clips?.find(c=>c.id===saved?.composition?.selected)?.tracks.fm.slice(0,32),
      hint:document.getElementById('cp-save-status')?.textContent};
   });
   console.log('PERSIST BEFORE RELOAD '+JSON.stringify(beforeReload));
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#studio-compose-btn').click();
   const afterReload=await page.evaluate(()=>{
    const raw=localStorage.getItem('lovestronautes_state'),saved=raw?JSON.parse(raw):null;
    return {selected:composeState.selected,current:composeSelected()?.tracks.fm.slice(0,32),
      stored:!!raw,storedSelected:saved?.composition?.selected,
      storedClip:saved?.composition?.clips?.find(c=>c.id===saved?.composition?.selected)?.tracks.fm.slice(0,32),
      hint:document.getElementById('cp-save-status')?.textContent};
   });
   console.log('PERSIST AFTER RELOAD '+JSON.stringify(afterReload));
   assert.equal(await page.evaluate(()=>composeSelected().tracks.fm[0]?.note),'C4','Persistence mismatch: '+JSON.stringify({beforeReload,afterReload,errors}));
   assert.equal(await page.evaluate(()=>composeSelected().tracks.fm[28].note),'G4');
   assert.equal(await page.evaluate(()=>composeTotalBars()),2);
   assert.deepEqual(errors,[],'No uncaught JavaScript errors');
   console.log('✓ Chromium '+width+'px: note/velocity/gate editing, multi-bar phrases, Undo/Redo, copy/paste, finite playback PCM, MIDI and real WAV24 downloads, persistence and layout');
  }catch(error){await page.screenshot({path:path.join(artifacts,'failure-'+width+'.png'),fullPage:true}).catch(()=>{});throw error;}
  finally{await context.close();}
 }
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
