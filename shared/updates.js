export async function setupUpdates({canReload,idleMs=4000,retryMs=2000,activationTimeoutMs=8000}){
 if(!('serviceWorker' in navigator))return;
 const bar=document.createElement('aside');bar.className='app-update';bar.hidden=true;bar.setAttribute('role','status');bar.setAttribute('aria-label','App update');document.body.append(bar);
 const confirmationKey='lists-updated:'+new URL('../',import.meta.url).pathname;
 let registration,reloading=false,requested=false,checking=false,applying=false,lastCheck=0,autoTimer=0,activationTimer=0,feedbackTimer=0;
 let controlled=!!navigator.serviceWorker.controller,stale=false,lastActivity=performance.now(),requestedActivity=0;
 const available=()=>controlled&&(stale||!!registration?.waiting);
 function feedback(text,duration=0){
  clearTimeout(feedbackTimer);bar.textContent=text;bar.hidden=!text;
  if(duration)feedbackTimer=setTimeout(()=>{if(!requested&&!reloading&&!applying)bar.hidden=true;},duration);
 }
 const queue=(delay=0)=>{
  clearTimeout(autoTimer);autoTimer=0;
  if(!available()||document.hidden||!navigator.onLine||requested||reloading)return;
  autoTimer=setTimeout(()=>{autoTimer=0;void apply();},Math.max(delay,idleMs-(performance.now()-lastActivity),0));
 };
 async function safe(activity){
  const reason=await canReload();
  return !reason&&navigator.onLine&&!document.hidden&&activity===lastActivity&&performance.now()-lastActivity>=idleMs;
 }
 function reload(){
  reloading=true;clearTimeout(autoTimer);clearTimeout(activationTimer);feedback('Updating Lists...');
  try{sessionStorage.setItem(confirmationKey,String(Date.now()));}catch{/* Updates still work without a confirmation message. */}
  location.reload();
 }
 async function apply(){
  if(applying||requested||reloading||!available())return;
  applying=true;const activity=lastActivity;
  try{
   if(!await safe(activity))return;
   if(registration?.waiting){
    requested=true;requestedActivity=activity;feedback('Updating Lists...');
    // A stalled activation must not leave a permanent update banner or a hot retry loop.
    activationTimer=setTimeout(()=>{if(requested){requested=false;feedback('');queue(30000);}},activationTimeoutMs);
    registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
   }else if(stale)reload();
  }catch{requested=false;clearTimeout(activationTimer);feedback('');queue(30000);}
  finally{applying=false;if(!requested&&!reloading&&!autoTimer)queue(retryMs);}
 }
 // A tab stays quiet if another tab activates the worker while this one has unsaved work.
 navigator.serviceWorker.addEventListener('controllerchange',async()=>{
  const previous=controlled;controlled=true;if(!previous){queue();return;}
  stale=true;
  if(requested){
   requested=false;clearTimeout(activationTimer);
   try{if(await safe(requestedActivity)){reload();return;}}catch{/* Try again only after this tab is safe. */}
   feedback('');
  }
  queue();
 });
 const activity=()=>{lastActivity=performance.now();queue();void check();};
 for(const name of ['pointerdown','pointerup','keydown','input','change','focusin','focusout','scroll'])document.addEventListener(name,activity,{capture:true,passive:true});
 const check=async()=>{
  if(!registration||document.hidden||!navigator.onLine||checking||Date.now()-lastCheck<60000)return;
  checking=true;lastCheck=Date.now();try{await registration.update();queue();}catch{/* Keep using the current app when checking is unavailable. */}finally{checking=false;}
 };
 const resume=()=>{if(document.hidden){clearTimeout(autoTimer);autoTimer=0;}else{lastActivity=performance.now();void check();queue();}};
 try{
  const applied=Number(sessionStorage.getItem(confirmationKey));sessionStorage.removeItem(confirmationKey);
  if(applied>0&&Date.now()-applied>=0&&Date.now()-applied<30000)feedback('Lists updated',2500);
 }catch{/* Confirmation is optional when browser storage is unavailable. */}
 try{
  registration=await navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname,updateViaCache:'none'});
  const watch=worker=>{worker?.addEventListener('statechange',()=>queue());queue();};
  registration.addEventListener('updatefound',()=>watch(registration.installing));watch(registration.installing);
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);window.addEventListener('pageshow',resume);
  void check();
 }catch{clearTimeout(autoTimer);clearTimeout(feedbackTimer);bar.remove();}
}
