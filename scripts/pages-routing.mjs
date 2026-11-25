import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function choosePagesRoute(config,ref){
  if(config?.build_type==='legacy'&&config.source?.branch==='main'&&config.source?.path==='/'&&ref==='main')
    return {custom:false,reason:'legacy-main-root-confirmed'};
  if(config?.build_type==='workflow')return {custom:true,reason:'workflow-confirmed'};
  return {custom:true,reason:'unknown-or-other-source-preserve-custom'};
}
export async function waitForArtifact(read,delay,{attempts=6}={}){
  for(let i=0;i<attempts;i++){
    let rows=null;
    try{rows=await read();}catch{}
    if(Array.isArray(rows)){
      const valid=rows.filter(a=>a.name==='github-pages'&&a.expired===false);
      if(valid.length===1)return valid[0].id;
      if(valid.length>1)throw Error('Multiple live github-pages artifacts; refusing ambiguous deployment');
    }
    if(i+1<attempts)await delay(5000);
  }
  throw Error('github-pages artifact not visible within bounded retry window');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const cmd=process.argv[2];
  if(cmd==='route'){
    let config=null;try{config=JSON.parse(readFileSync(0,'utf8'));}catch{}
    const route=choosePagesRoute(config,process.env.GITHUB_REF_NAME);
    console.log('custom='+route.custom);console.log('reason='+route.reason);
  }else if(cmd==='artifact'){
    const {GITHUB_REPOSITORY:repo,GITHUB_RUN_ID:run,GITHUB_API_URL:api,GH_TOKEN:token}=process.env;
    if(!repo||!run||!api||!token)throw Error('Missing Actions context');
    const id=await waitForArtifact(async()=>{
      const r=await fetch(api+'/repos/'+repo+'/actions/runs/'+run+'/artifacts?name=github-pages&per_page=100',{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(5000)});
      if(!r.ok)throw Error('Artifact metadata unavailable');
      return (await r.json()).artifacts;
    },ms=>new Promise(resolve=>setTimeout(resolve,ms)));
    console.log('Verified visible github-pages artifact '+id);
  }else throw Error('Unknown command');
}
