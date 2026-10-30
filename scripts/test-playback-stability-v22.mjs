/* V22: faulty synth isolation, overload protection and recording CPU budget. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const stability=fs.readFileSync('studio-stability-v18.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
let now=10000;
const statuses=[],errors=[],warnings=[];
const sandbox={
 window:{matchMedia:()=>({matches:true})},
 document:{getElementById:()=>null},
 Date:{now:()=>now},
 console:{error:(...args)=>errors.push(args),warn:(...args)=>warnings.push(args)},
 setStatus:(text)=>statuses.push(text),
 setTimeout,clearTimeout
};
const api=vm.runInNewContext(stability+
 '\n({studioSafeTrigger,studioTrackFailureState,studioStabilityReportLateStep})',sandbox);
const {studioSafeTrigger,studioTrackFailureState,studioStabilityReportLateStep}=api;
let kick=0,taiga=0;
for(let i=0;i<3;i++){
 assert.equal(studioSafeTrigger('taiga',()=>{taiga++;throw Error('bad oscillator');}),false);
 assert.equal(studioSafeTrigger('kick',()=>{kick++;}),true);
}
assert.equal(kick,3,'Other instruments must keep producing notes while Taiga fails');
assert.equal(taiga,3);
assert.ok(studioTrackFailureState.taiga.muteUntil>=now+4000,'Failed track needs bounded cooldown');
assert.equal(studioSafeTrigger('taiga',()=>{taiga++;}),false,'Cooldown must skip failed notes');
assert.equal(studioSafeTrigger('kick',()=>{kick++;}),true,'Rhythm remains audible during synth cooldown');
assert.equal(taiga,3);
now+=4001;
assert.equal(studioSafeTrigger('taiga',()=>{taiga++;}),true,'Failed instrument retries after cooldown');
assert.equal(studioTrackFailureState.taiga.failures,0,'Successful retry resets fault counter');
assert.ok(statuses.some(s=>s.includes('PISTE TAIGA EN PROTECTION')));
assert.equal(errors.length,1,'Only threshold failure emits an error');
console.log('✓ A faulty synth is isolated; rhythm keeps playing; voice recovers after four seconds');

studioStabilityReportLateStep();
assert.equal(studioSafeTrigger('solar',()=>{}),true,'Single late step cannot abruptly mute optional textures');
studioStabilityReportLateStep();
const optionalResults=Array.from({length:6},()=>studioSafeTrigger('solar',()=>{}));
assert.deepEqual(optionalResults,[true,true,false,true,true,false],
 'Repeated scheduling delays shed only one third of optional notes');
assert.equal(studioSafeTrigger('kick',()=>{kick++;}),true,'Critical drums must not be skipped');
assert.equal(studioSafeTrigger('acid',()=>{}),true,'Bass and acid remain active');
now+=651;
assert.equal(studioSafeTrigger('solar',()=>{}),true,'Full instrument playback resumes after 650ms');
console.log('✓ Mobile pressure mode never silences all textures after a single timer hiccup');

const scheduled=index.slice(index.indexOf('function scheduleStep(time)'),index.indexOf('function stepInterval('));
for(const name of ['kick','snare','hat','sub','acid','fm','biniou','metal','theremin','speak','s1','taiga','fieldkit','grandmother']){
 assert.ok(scheduled.includes("studioSafeTrigger('"+name+"'"),'Missing voice protection for '+name);
}
assert.ok(scheduled.includes('studioSafeTrigger(machine,'),'Hardware instruments also isolated');
assert.ok(index.includes('studioStabilityReportLateStep()'),'Playback must report scheduling lag');
assert.ok(index.includes('studioEcoMode?400:170'),'Mobile sequence redraw should be throttled');
assert.ok(!index.includes('recordingDest = ctx.createMediaStreamDestination();\n        masterOutput.connect(recordingDest);\n    }'),'No permanent recording stream while only playing');
assert.ok(index.includes('recordingDest = ctx.createMediaStreamDestination();\n        masterOutput.connect(recordingDest);'),'REC retains a real capture bus');
assert.ok(index.includes('masterOutput.disconnect(recordingDest)'),'Recorder releases capture bus after STOP or error');
assert.ok(sw.includes('lovestronautes-v23-composition-pro'),'PWA cache must be refreshed for corrected audio');
console.log('✓ 18-track scheduling, lazy recording path and PWA cache integration');
