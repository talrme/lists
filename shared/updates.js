export async function setupUpdates({canReload,idleMs=4000,retryMs=2000}){
 if(!('serviceWorker' in navigator))return;
 const bar=document.createElement('aside');bar.className='app-update';bar.hidden=true;bar.setAttribute('aria-label','App update');
 bar.innerHTML='<span>Update ready</span><button type="button" class="text-button">Reload</button><small role="status"></small>';
 document.body.append(bar);
 const button=bar.querySelector('button'),message=bar.querySelector('small');
 let registration,reloading=false,requested=false,checking=false,applying=false,lastCheck=0,autoTimer=0;
 let controlled=!!navigator.serviceWorker.controller,stale=false,lastActivity=performance.now(),requestedActivity=0,requestedManual=false;
 const available=()=>stale||!!registration?.waiting&&controlled;
 const queue=(delay=idleMs)=>{
  clearTimeout(autoTimer);
  if(!available()||document.hidden||!navigator.onLine||requested||reloading)return;
  autoTimer=setTimeout(()=>void apply(false),Math.max(delay,idleMs-(performance.now()-lastActivity)));
 };
 const show=()=>{bar.hidden=!available();queue();};
 async function safe(manual,activity){
  const reason=await canReload();
  if(reason){message.textContent=reason;return false;}
  const ready=navigator.onLine&&!document.hidden&&activity===lastActivity&&(manual||performance.now()-lastActivity>=idleMs);
  if(!ready)message.textContent=!navigator.onLine?'Reconnect to apply the update.':'Waiting for the page to settle. The update will retry automatically.';
  return ready;
 }
 async function apply(manual){
  if(applying||requested||reloading||!available())return;
  applying=true;button.disabled=true;button.textContent='Updating...';message.textContent='Checking that your changes are saved...';
  const activity=lastActivity;
  try{
   if(!await safe(manual,activity))return;
   if(registration?.waiting){requested=true;requestedActivity=activity;requestedManual=manual;message.textContent='Applying the downloaded update...';registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
   else {reloading=true;message.textContent='Reloading the updated app...';location.reload();}
  }catch{requested=false;if(manual)message.textContent='Could not update. Please try again.';}
  finally{applying=false;if(!requested&&!reloading){button.disabled=false;button.textContent='Reload';queue(retryMs);}}
 }
 // Every tab checks its own draft/sync safety, including when another tab activates a worker.
 navigator.serviceWorker.addEventListener('controllerchange',async()=>{
  const previous=controlled;controlled=true;if(!previous){show();return;}
  stale=true;bar.hidden=false;
  if(requested){
   requested=false;
   try{if(await safe(requestedManual,requestedActivity)){reloading=true;location.reload();return;}}catch{}
   button.disabled=false;button.textContent='Reload';
  }
  queue();
 });
 button.addEventListener('click',()=>void apply(true));
 const activity=()=>{lastActivity=performance.now();queue();void check();};
 for(const name of ['pointerdown','pointerup','keydown','input','change','focusin','focusout','scroll'])document.addEventListener(name,activity,{capture:true,passive:true});
 const check=async()=>{
  if(!registration||document.hidden||!navigator.onLine||checking||Date.now()-lastCheck<60000)return;
  checking=true;lastCheck=Date.now();try{await registration.update();show();}catch{/* Keep the working app offline or during network errors. */}finally{checking=false;}
 };
 const resume=()=>{if(document.hidden)clearTimeout(autoTimer);else{void check();queue();}};
 try{
  registration=await navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname,updateViaCache:'none'});
  const watch=worker=>{worker?.addEventListener('statechange',show);show();};
  registration.addEventListener('updatefound',()=>watch(registration.installing));watch(registration.installing);
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);window.addEventListener('pageshow',resume);
  void check();
 }catch{clearTimeout(autoTimer);bar.remove();}
}
