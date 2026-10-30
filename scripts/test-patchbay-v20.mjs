/* Patchbay V20 regression — executable audio-node routing tests without a device. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const files=['index.html','studio-features.js','studio-patchbay.js','studio-patchbay.css','mobile-v17.js','sw.js'];
const [html,studio,patch,css,mobile,sw]=files.map(file=>fs.readFileSync(file,'utf8'));
const tracks=['kick','snare','hat','sub','acid','fm','biniou','metal','theremin','speak','s1','taiga','mbase','solar','modfm','wing','fieldkit','grandmother'];
function node(id){return {id,edges:[],connect(dest,output=0,input=0){this.edges.push({dest,output,input});},disconnect(){this.edges=[];}};}
const outputs=Object.fromEntries(tracks.map(name=>[name,node('output-'+name)]));
const studioNodes=Object.fromEntries(tracks.map(name=>[name,{output:outputs[name]}]));
const distShaper=node('drive'),crusher=node('crush'),duckingGain=node('fx'),masterFilter=node('clean'),channelMerger=node('hardware');
const sandbox={
 STUDIO_TRACKS:tracks,ctx:{state:'running'},studioNodes,distShaper,duckingGain,masterFilter,
 isMultiOut:false,channelMerger:null,window:{sp1200Crusher:crusher},
 document:{getElementById:()=>null},saveLiveState(){sandbox.saves++;},
 setStatus(message){sandbox.message=message;},saves:0
};
const context=vm.createContext(sandbox);
vm.runInContext(patch,context,{filename:'studio-patchbay.js'});
const get=(expr)=>vm.runInContext(expr,context);
assert.equal(get('STUDIO_PATCH_TRACKS.length'),17);
assert.equal(sandbox.studioPatchReconnectAll(),17);
assert.equal(outputs.kick.edges[0].dest,distShaper);
assert.equal(outputs.snare.edges[0].dest,crusher);
assert.equal(outputs.taiga.edges[0].dest,duckingGain);
assert.equal(sandbox.studioPatchSet('kick','clean'),true);
assert.equal(outputs.kick.edges.length,1,'no duplicate connections on route switch');
assert.equal(outputs.kick.edges[0].dest,masterFilter);
assert.equal(sandbox.studioPatchSet('kick','off'),true);
assert.equal(outputs.kick.edges.length,0,'off removes output connection');
assert.equal(sandbox.studioPatchSet('kick','invalid'),false,'reject unsafe routing target');
assert.equal(outputs.kick.edges.length,0,'invalid route must keep prior state');
assert.equal(sandbox.studioPatchSet('kick','drive'),true);
assert.equal(outputs.kick.edges[0].dest,distShaper);
assert.equal(sandbox.studioPatchSet('taiga','clean'),true);
const saved=JSON.parse(JSON.stringify(get('studioPatchProjectState()')));
assert.equal(saved.taiga,'clean');
sandbox.studioPatchReset();
assert.equal(get('studioPatchRoutes.taiga'),'fx','restore factory routing');
sandbox.studioPatchRestore(saved);
assert.equal(get('studioPatchRoutes.taiga'),'clean','restore project connections');
assert.equal(outputs.taiga.edges[0].dest,masterFilter);
assert.equal(outputs.biniou.edges.length,0,'Biniou effects pipeline not tampered with');
sandbox.isMultiOut=true;
sandbox.channelMerger=channelMerger;
assert.equal(sandbox.studioPatchReconnectAll(),17);
assert.equal(outputs.kick.edges[0].dest,channelMerger);
assert.equal(outputs.kick.edges[0].input,0);
assert.equal(outputs.acid.edges[0].input,1);
assert.equal(outputs.fm.edges[0].input,2);
assert.equal(outputs.metal.edges[0].input,3);
sandbox.isMultiOut=false;sandbox.channelMerger=null;
sandbox.studioPatchReconnectAll();
assert.equal(outputs.acid.edges[0].dest,duckingGain,'stereo restored without reload');
assert.equal(outputs.kick.edges[0].dest,distShaper,'kick route restored');
assert(html.includes('studioPatchBuild();')&&html.includes('studioPatchReconnectAll();'));
assert(html.includes('studioPatchInstall();'));
assert(studio.includes('patchRoutes:studioPatchProjectState()'));
assert(studio.includes('output:destination'));
assert(sw.includes("studio-patchbay.js")&&sw.includes("studio-patchbay.css"));
assert(mobile.includes("['patch','CÂBLES'"));
assert(css.includes('.patchbay-row select')&&css.includes('focus-visible'));
console.log('PASS · V20 patchbay: 17 buses, 4 destinations + off, persistence, stereo/4CH, no double connection, mobile/offline.');
