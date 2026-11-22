// Keep native button activation/keyboard semantics, but cancel pointer clicks
// after scrolling or leaving the original target (including touch capture).
export function completionPress(host,{context,onIdle}){
 let active=null,timer=null;const recent=new WeakMap();
 const buttonFor=event=>event.target.closest?.('[data-complete]');
 function inside(button,event){const r=button.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;}
 function clear(){
  if(!active)return;const old=active;active=null;clearTimeout(timer);old.button.classList.remove('completion-tracking','completion-pressed');
  try{if(old.button.hasPointerCapture(old.pointer))old.button.releasePointerCapture(old.pointer);}catch{}
  queueMicrotask(onIdle);
 }
 function cancel(){if(!active)return;active.cancelled=true;active.button.classList.remove('completion-pressed');active.button.classList.add('completion-cancelled');recent.set(active.button,{cancelled:true,epoch:active.epoch});clear();}
 host.addEventListener('pointerdown',event=>{
  const button=buttonFor(event);if(!button||button.disabled||event.button!==0||event.isPrimary===false)return;
  cancel();recent.delete(button);active={button,pointer:event.pointerId,epoch:context(),cancelled:false,released:false};
  button.classList.remove('completion-cancelled');button.classList.add('completion-tracking','completion-pressed');
  try{button.setPointerCapture(event.pointerId);}catch{}
 });
 window.addEventListener('pointerdown',event=>{if(active&&active.pointer!==event.pointerId)cancel();},true);
 window.addEventListener('pointermove',event=>{
  if(!active||event.pointerId!==active.pointer||active.released)return;
  if(!inside(active.button,event)||context()!==active.epoch){active.cancelled=true;active.button.classList.remove('completion-pressed');active.button.classList.add('completion-cancelled');}
 },{capture:true,passive:true});
 window.addEventListener('pointerup',event=>{
  if(!active||event.pointerId!==active.pointer)return;
  active.cancelled||=context()!==active.epoch||!inside(active.button,event)||active.button.disabled||!active.button.isConnected;
  active.released=true;active.button.classList.remove('completion-pressed');
  recent.set(active.button,{cancelled:active.cancelled,epoch:active.epoch});
  // Usually click follows immediately; release the render guard if the browser
  // suppresses it, so a cancelled/long-press interaction cannot freeze updates.
  clearTimeout(timer);timer=setTimeout(clear,250);
 },true);
 window.addEventListener('pointercancel',event=>{if(event.pointerId===active?.pointer)cancel();},true);
 host.addEventListener('lostpointercapture',event=>{if(active&&!active.released&&event.pointerId===active.pointer)cancel();});
 host.addEventListener('click',event=>{
  const button=buttonFor(event);if(!button)return;
  const pointer=event.detail>0||!!event.pointerType,record=recent.get(button);
  const blocked=pointer&&record&&(record.cancelled||record.epoch!==context());
  recent.delete(button);clear();
  if(blocked){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 window.addEventListener('scroll',()=>{if(active&&!active.released)cancel();},{capture:true,passive:true});
 window.addEventListener('blur',cancel);
 host.addEventListener('contextmenu',event=>{if(buttonFor(event))cancel();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
 host.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key))buttonFor(event)?.classList.remove('completion-cancelled');});
 return {isActive:()=>!!active,cancel};
}
