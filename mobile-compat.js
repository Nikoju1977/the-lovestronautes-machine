/* Lovestronautes V16 · cross-platform audio helpers.
 * Keep AudioContext.resume() synchronously inside click / pointer gestures;
 * Safari Home Screen Web Apps can leave this promise unsettled after suspension.
 */
'use strict';
const MOBILE_AUDIO_RESUME_MS=4500;
const mobilePendingResumes=new WeakMap();
function mobileResumeAudio(context,deadline=MOBILE_AUDIO_RESUME_MS){
  if(!context) return Promise.reject(Error('Moteur Web Audio indisponible.'));
  if(context.state==='running')return Promise.resolve(true);
  if(context.state==='closed')return Promise.reject(Error('Le moteur audio est fermé. Recharge l’application.'));
  const pending=mobilePendingResumes.get(context);
  if(pending)return pending;
  let resume;
  try{
    // Important: direct invocation before yielding. WebKit requires a user gesture.
    resume=context.resume();
  }catch(error){return Promise.reject(error);}
  let timer;
  const limit=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Error(
      'Le navigateur n’a pas réactivé le son. Sur iPhone : relance dans Safari ou ferme et rouvre l’application. Sur Android : réactive le son.'
    )),Math.max(1500,Math.min(10000,deadline)));
  });
  const operation=Promise.race([Promise.resolve(resume),limit]).then(()=>{
    if(context.state!=='running')
      throw Error('Audio interrompu par iOS/Android. Appuie à nouveau sur ACTIVER LE SON.');
    return true;
  }).finally(()=>{
    clearTimeout(timer);
    mobilePendingResumes.delete(context);
  });
  mobilePendingResumes.set(context,operation);
  return operation;
}
function mobileBestRecordingMime(recorder){
  if(!recorder)return '';
  // Chrome / Android commonly records Opus WebM; Safari / iOS records AAC MP4.
  const options=[
    'audio/webm;codecs=opus','audio/ogg;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2','audio/mp4',
    'audio/webm','audio/ogg'
  ];
  if(typeof recorder.isTypeSupported!=='function')return '';
  return options.find(type=>{
    try{return recorder.isTypeSupported(type);}catch(e){return false;}
  })||'';
}
function mobileRecordingExtension(mime){
  const type=String(mime||'').toLowerCase();
  if(type.includes('mp4')||type.includes('aac'))return 'm4a';
  if(type.includes('ogg'))return 'ogg';
  if(type.includes('webm'))return 'webm';
  return 'audio';
}
