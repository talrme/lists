export async function setupUpdates({canReload}){
 if(!('serviceWorker' in navigator))return;
 const bar=document.createElement('aside');bar.className='app-update';bar.hidden=true;bar.setAttribute('aria-label','App update');
 bar.innerHTML='<span>Update available</span><button type="button" class="text-button">Reload</button><small role="status"></small>';
 document.body.append(bar);
 const button=bar.querySelector('button'),message=bar.querySelector('small');
 let registration,reloading=false,requested=false,checking=false,lastCheck=0;
 const show=()=>{bar.hidden=!registration?.waiting||!navigator.serviceWorker.controller;};
 // Only the tab that explicitly requested the update may reload.
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requested&&!reloading){reloading=true;location.reload();}else show();});
 button.addEventListener('click',async()=>{
  if(button.disabled)return;button.disabled=true;message.textContent='';
  try{
   const reason=await canReload();if(reason){message.textContent=reason;return;}
   if(!registration?.waiting){location.reload();return;}
   requested=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  }catch{requested=false;message.textContent='Could not update. Please try again.';}
  finally{if(!requested)button.disabled=false;}
 });
 const check=async()=>{
  if(!registration||document.hidden||!navigator.onLine||checking||Date.now()-lastCheck<60000)return;
  checking=true;lastCheck=Date.now();try{await registration.update();show();}catch{/* Offline or unavailable: keep the working app. */}finally{checking=false;}
 };
 try{
  registration=await navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname,updateViaCache:'none'});
  const watch=worker=>{worker?.addEventListener('statechange',show);show();};
  registration.addEventListener('updatefound',()=>watch(registration.installing));watch(registration.installing);
  document.addEventListener('visibilitychange',()=>void check());window.addEventListener('online',()=>void check());window.addEventListener('pageshow',()=>void check());
  void check();
 }catch{bar.remove();}
}
