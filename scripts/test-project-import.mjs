import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('function studioImportProject(data)'),html.indexOf('function buildDNA()'));
let state={pat:{valid:true},name:'original'},writes=0,failSave=false,failModule=false,failUI=false;
const undo=['older'],redo=['redo'];
const scope={SEQ:{playing:false},isPlaying:false,studioExportBusy:false,validPatternBank:p=>p?.valid===true,
 snapshotProject:()=>JSON.stringify(state),
 applyProjectState:(s,persist)=>{assert.equal(persist,false);state=JSON.parse(JSON.stringify(s));if(failModule&&s.name==='incoming')throw Error('module');},
 syncProjectUI:()=>{if(failUI&&state.name==='incoming')throw Error('UI');},
 undoStack:undo,redoStack:redo,trimHistoryStack:()=>{},updateHistoryUI:()=>{},
 saveLiveState:()=>{writes++;return !failSave;}};
const run=vm.runInNewContext(source+'\nstudioImportProject',scope);
const incoming={pat:{valid:true},name:'incoming'};
assert.throws(()=>run({pat:{}}));assert.equal(state.name,'original');assert.equal(writes,0);assert.deepEqual(undo,['older']);assert.deepEqual(redo,['redo']);
failModule=true;assert.throws(()=>run(incoming),/module/);failModule=false;assert.equal(state.name,'original');assert.equal(writes,0);assert.deepEqual(redo,['redo']);
failUI=true;assert.throws(()=>run(incoming),/UI/);failUI=false;assert.equal(state.name,'original');assert.equal(writes,0);
scope.SEQ.playing=true;assert.throws(()=>run(incoming),/lecture/);scope.SEQ.playing=false;
failSave=true;assert.equal(run(incoming),false);assert.equal(state.name,'incoming');assert.equal(writes,1);assert.equal(JSON.parse(undo.at(-1)).name,'original');assert.equal(redo.length,0);
assert.ok(html.includes("saved?'SAUVEGARDE FORCÉE':'STOCKAGE NON CONFIRMÉ"));
assert.ok(html.includes("studioImportProject.pending"));
console.log('PASS import rejection, module/UI rollback, unchanged undo/redo on failure, transport guard and truthful storage state');
