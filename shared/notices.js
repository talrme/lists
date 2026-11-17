export function createNotices({host,write,epoch,readOnly,errorText,motion}){
 const entries=[];host.hidden=true;
 function positions(){return new Map(entries.map(entry=>[entry.node,entry.node.getBoundingClientRect()]));}
 function arrange(before){for(const entry of entries){const old=before.get(entry.node);if(!old)continue;const dy=old.top-entry.node.getBoundingClientRect().top;if(Math.abs(dy)>1)motion.animate('reorder',entry.node,[{transform:`translateY(${dy}px)`},{transform:'none'}],{duration:180});}}
 function dismiss(entry){const before=positions(),index=entries.indexOf(entry);if(index<0)return;clearTimeout(entry.timer);entries.splice(index,1);entry.node.remove();host.hidden=!entries.length;arrange(before);}
 function clear(){for(const entry of [...entries])dismiss(entry);}
 function show(message,undo=null){
  // Keep independent actions undoable, but do not offer stale earlier actions for the same task.
  if(undo)for(const entry of [...entries])if(entry.undo?.id===undo.id)dismiss(entry);
  const previous=entries.at(-1);if(!undo&&previous&&!previous.undo&&previous.message===message)dismiss(previous);
  while(entries.length>=4)dismiss(entries[0]);
  const before=positions(),node=document.createElement('div'),text=document.createElement('span');
  node.className='task-notice';text.className='notice-text';const messageNode=document.createElement('span');messageNode.textContent=message;text.append(messageNode);
  if(undo?.label){const label=document.createElement('small');label.textContent=undo.label;text.append(label);}node.append(text);
  const entry={node,message,undo:undo?{...undo,epoch:epoch()}:null,timer:null,remaining:undo?6000:3500,started:0,paused:new Set(),pending:false};
  const pause=reason=>{if(!entry.paused.size){clearTimeout(entry.timer);entry.remaining=Math.max(0,entry.remaining-(performance.now()-entry.started));}entry.paused.add(reason);};
  const resume=reason=>{const paused=entry.paused.delete(reason);if(reason!=='initial'&&!paused)return;if(!entry.paused.size&&!entry.pending){clearTimeout(entry.timer);entry.started=performance.now();entry.timer=setTimeout(()=>dismiss(entry),entry.remaining);}};
  if(undo){const button=document.createElement('button');button.className='toast-undo';button.textContent='Undo';button.title=undo.label?'Undo: '+undo.label:'Undo';button.onclick=async()=>{
    const action=entry.undo;if(entry.pending||!action||action.epoch!==epoch()||readOnly())return;
    entry.pending=true;clearTimeout(entry.timer);button.disabled=true;
    try{await write(action.id,action.patch,action.rev);dismiss(entry);if(action.epoch===epoch())show('Undone');}
    catch(error){dismiss(entry);if(action.epoch===epoch())show(errorText(error));}
   };node.append(button);}
  const close=document.createElement('button');close.className='notice-close';close.type='button';close.setAttribute('aria-label','Dismiss notification');close.innerHTML='<i data-lucide="x" aria-hidden="true"></i>';close.onclick=()=>dismiss(entry);node.append(close);
  node.onpointerenter=event=>{if(event.pointerType!=='touch')pause('hover');};node.onpointerleave=()=>resume('hover');node.onfocusin=()=>pause('focus');node.onfocusout=()=>{if(!node.contains(document.activeElement))resume('focus');};
  entries.push(entry);host.hidden=false;host.inert=false;host.append(node);window.lucide?.createIcons();arrange(before);motion.animate('reorder',node,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:180});resume('initial');
 }
 return {show,clear};
}
