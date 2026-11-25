import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8'),source=html.slice(html.indexOf('function restoreSnapshot(serialized)'),html.indexOf('function $id(id)'));
const encode=name=>JSON.stringify({pat:{valid:true},name});
let state=JSON.parse(encode('current')),writes=0,status='',fail=null,failSave=false,failSnapshot=false;
const undo=[encode('older')],redo=[];
const env={SEQ:{playing:false},isPlaying:false,studioExportBusy:false,studioRecoveryProtected:false,undoStack:undo,redoStack:redo,validPatternBank:p=>p?.valid,snapshotProject:()=>{if(failSnapshot)throw Error('snapshot');return JSON.stringify(state);},applyProjectState:(data,persist)=>{assert.equal(persist,false);state=JSON.parse(JSON.stringify(data));if(fail==='all'||fail===data.name)throw Error('module');},syncProjectUI:()=>{if(fail==='ui'&&state.name==='older')throw Error('ui');},trimHistoryStack:()=>{},updateHistoryUI:()=>{},saveLiveState:()=>{writes++;return !failSave;},setStatus:s=>status=s};
const api=vm.runInNewContext(source+'\n;({undoProject,redoProject})',env);
env.SEQ.playing=true;assert.equal(api.undoProject(),false);env.SEQ.playing=false;
failSnapshot=true;assert.equal(api.undoProject(),false);failSnapshot=false;
for(const kind of ['older','ui']){fail=kind;assert.equal(api.undoProject(),false);assert.equal(state.name,'current');assert.deepEqual(undo,[encode('older')]);assert.deepEqual(redo,[]);assert.equal(writes,0);}
fail=null;assert.equal(api.undoProject(),true);assert.equal(state.name,'older');assert.equal(writes,1);assert.deepEqual(undo,[]);assert.deepEqual(redo,[encode('current')]);
failSave=true;assert.equal(api.redoProject(),true);assert.equal(state.name,'current');assert.match(status,/EN MÉMOIRE/);assert.deepEqual(undo,[encode('older')]);assert.deepEqual(redo,[]);
fail='all';assert.equal(api.undoProject(),false);assert.equal(env.studioRecoveryProtected,true);assert.deepEqual(undo,[encode('older')]);assert.deepEqual(redo,[]);assert.equal(writes,2);assert.match(status,/INCOMPLÈTE/);
console.log('PASS history retained on failed apply or UI, rollback before persistence, undo/redo success, quota warning and rollback-failure protection');
