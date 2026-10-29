/* V17 MOBILE CONTROL SURFACE — ergonomic bottom dock for iOS/Android. */
'use strict';
let mobileDockBuilt=false;
function mobileUIBuild(){
 if(mobileDockBuilt||typeof document==='undefined')return;
 mobileDockBuilt=true;
 const dock=document.createElement('nav');dock.id='mobile-studio-dock';
 dock.className='mobile-studio-dock';dock.setAttribute('aria-label','Transport et navigation du studio sur téléphone');
 const buttons=[
  ['sound','SON','unlock'],['play','PLAY','play-btn'],
  ['seq','SEQ','seq'],['mix','MIX','mix'],['eq','EQ','fx'],['loops','BOUCLES','loops']
 ];
 dock.innerHTML=buttons.map(([key,label])=>
  '<button type="button" data-mobile-action="'+key+'" aria-label="'+label+'"'+
  ' aria-pressed="false">'+label+'</button>').join('');
 document.body.appendChild(dock);
 function goto(name){
  const tab=document.querySelector('.nt[data-panel="'+name+'"]');
  if(tab)tab.click();
  const panel=document.getElementById('panel-'+name);
  if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
 }
 dock.addEventListener('click',function(e){
  const button=e.target.closest('[data-mobile-action]');if(!button)return;
  const key=button.dataset.mobileAction;
  if(key==='sound'){const el=document.getElementById('unlock');if(el)el.click();}
  else if(key==='play'){const el=document.getElementById('play-btn');if(el)el.click();}
  else if(key==='eq'){
   goto('fx');
   requestAnimationFrame(function(){
    const card=document.querySelector('#panel-fx .eq-card');
    if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
   });
  }else goto(key);
  mobileUISyncDock();
 });
 document.querySelectorAll('.nt').forEach(tab=>tab.addEventListener('click',mobileUISyncDock));
 const play=document.getElementById('play-btn');
 if(play){
  const observer=new MutationObserver(mobileUISyncDock);
  observer.observe(play,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled']});
 }
 const unlock=document.getElementById('unlock');
 if(unlock){
  const observer=new MutationObserver(mobileUISyncDock);
  observer.observe(unlock,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 }
 mobileUISyncDock();
}
function mobileUISyncDock(){
 const dock=document.getElementById('mobile-studio-dock');if(!dock)return;
 const panel=document.querySelector('.nt.active')?.dataset.panel;
 dock.querySelectorAll('[data-mobile-action]').forEach(button=>{
  const action=button.dataset.mobileAction,selected=action==='eq'?panel==='fx':
   action==='sound'?document.getElementById('unlock')?.getAttribute('aria-pressed')==='true':
   action==='play'?document.getElementById('play-btn')?.textContent.includes('PAUSE'):
   action===panel;
  button.classList.toggle('active',!!selected);
  button.setAttribute('aria-pressed',String(!!selected));
  if(action==='play')button.textContent=selected?'PAUSE':'PLAY';
  if(action==='sound')button.textContent=selected?'SON ✓':'SON';
 });
}
