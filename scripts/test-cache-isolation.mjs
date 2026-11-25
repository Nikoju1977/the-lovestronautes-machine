import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('sw.js','utf8');
const scope='https://nikoju1977.github.io/the-lovestronautes-machine/';
const declaration=source.match(/const CACHE_NAME\s*=\s*['"](lovestronautes-v[0-9]+[-\w]*)['"]\s*;/);
assert.ok(declaration,'Expected a versioned Lovestronautes cache name');
const current=declaration[1],old='lovestronautes-obsolete-test-fixture';
assert.notEqual(current,old);
const other=['oracle-du-jardinier-shell-v19','neural-art-v22-5-isolated-shell','studio-niko-hub-v21'];
const handlers={},deleted=[],stored=new Map(),keys=[current,old,...other];
let offline=false,quota=false,unavailable=false,claims=0,network=0;
const response={ok:true,redirected:false,clone:()=> 'new'};
const own={addAll:async assets=>{for(const url of assets)stored.set(url,'cached:'+url);},match:async req=>stored.get(typeof req==='string'?req:req.url),put:async(req,v)=>{if(quota)throw Error('quota');stored.set(req.url,v);}};
vm.runInNewContext(source,{URL,Set,Promise,Response:{error:()=> 'network-error'},self:{registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>claims++}},caches:{keys:async()=>keys,delete:async k=>deleted.push(k),open:async k=>{assert.equal(k,current);if(unavailable)throw Error('cache unavailable');return own;},match:()=>{throw Error('global cache lookup forbidden');}},fetch:async()=>{network++;if(offline)throw Error('offline');return response;}});
for(const name of ['install','activate']){let task;handlers[name]({waitUntil:p=>task=p});await task;}
assert.deepEqual(deleted,[old]);assert.equal(claims,1);
function request(url,mode='cors',method='GET',cache='default'){let result,task;handlers.fetch({request:{url,mode,method,cache},respondWith:p=>result=p,waitUntil:p=>task=p});return {result,task};}
for(const url of ['https://example.com/index.html','https://nikoju1977.github.io/oracle-du-jardinier/index.html',scope+'api?key=example',scope+'index.html?secret=example',scope+'unlisted.js'])assert.equal(request(url).result,undefined);
assert.equal(request(scope+'index.html','cors','POST').result,undefined);assert.equal(network,0);
let r=request(scope+'vendor/lame.min.js');assert.equal(await r.result,response);await r.task;
r=request(scope+'pcm-capture-processor.js');assert.equal(await r.result,response);await r.task;
offline=true;
for(const asset of ['vendor/lame.min.js','pcm-capture-processor.js']){r=request(scope+asset);assert.equal(await r.result,'new');await r.task;}
r=request(scope+'icon.svg');assert.equal(await r.result,'cached:'+scope+'icon.svg');await r.task;
stored.delete(scope+'update.html');r=request(scope+'update.html','navigate');assert.equal(await r.result,'network-error');await r.task;
offline=false;quota=true;r=request(scope+'index.html','navigate');assert.equal(await r.result,response);await r.task;
unavailable=true;r=request(scope+'composition-pro.js');assert.equal(await r.result,response);await r.task;
console.log('PASS exact scoped audio shell, sibling caches preserved, MP3/PCM offline fallback, quota and cache failure preserve network');
