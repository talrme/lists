export const labels={confetti:'Completion confetti',travel:'Tasks flying to their next stop',arrival:'New task bounce',reorder:'Smooth completion & list rearrangement',navigation:'Staggered list entrances',dialogs:'Dialog entrances',taps:'Button pops',ambient:'Goofy idle wiggles'};
const all=value=>Object.fromEntries(Object.keys(labels).map(key=>[key,value]));
export const presets={off:all(false),light:{...all(false),reorder:true,dialogs:true},medium:{...all(true),ambient:false},wild:all(true)};
export function restore(value={}){
 const legacy={off:'off',gentle:'light',playful:'medium'};
 const level=Object.hasOwn(presets,value.animationLevel)||value.animationLevel==='custom'?value.animationLevel:legacy[value.motion]||'medium';
 const effects=level==='custom'?Object.fromEntries(Object.keys(labels).map(key=>[key,typeof value.animations?.[key]==='boolean'?value.animations[key]:presets.medium[key]])):{...presets[level]};
 return {animationLevel:level,animations:effects};
}
export function createMotion(getPrefs){
 const running=new Set(),media=matchMedia('(prefers-reduced-motion: reduce)');
 const enabled=key=>!!getPrefs().animations[key]&&!media.matches&&!document.hidden;
 function animate(key,node,frames,options={},remove=false){
  if(!node?.isConnected||!enabled(key)){if(remove)node?.remove();return;}
  const a=node.animate(frames,{duration:360,easing:'cubic-bezier(.2,.8,.2,1)',...options});a.id='lists-'+key;
  const stop=()=>{a.cancel();if(remove)node.remove();};running.add(stop);
  a.finished.catch(()=>{}).finally(()=>{running.delete(stop);if(remove)node.remove();});return a;
 }
 function clear(){for(const stop of running)stop();running.clear();}
 function sync(){
  clear();for(const key of Object.keys(labels))document.documentElement.toggleAttribute('data-fx-'+key,enabled(key));
  document.documentElement.dataset.animationLevel=getPrefs().animationLevel;
 }
 media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
 function pop(key,node){const wild=getPrefs().animationLevel==='wild',row=node?.classList.contains('task-row');return animate(key,node,[{transform:'scale(1)'},{transform:`scale(${row?1.025:wild?1.14:1.06}) rotate(${row?0:wild?-4:-1}deg)`,offset:.45},{transform:'scale(1)'}]);}
 function enter(nodes){nodes.slice(0,16).forEach((node,i)=>animate('navigation',node,[{opacity:0,transform:'translateY(12px) rotate(-.6deg)'},{opacity:1,transform:'none'}],{delay:i*24,fill:'backwards'}));}
 function snapshot(){if(!enabled('reorder')||document.querySelector('.task-edit-form'))return new Map();return new Map([...document.querySelectorAll('.task-row')].map(node=>[node.dataset.task,node.getBoundingClientRect()]));}
 function rearrange(before,delay=0){
  if(!enabled('reorder')||document.querySelector('.task-edit-form'))return;
  for(const node of document.querySelectorAll('.task-row')){
   const old=before.get(node.dataset.task);if(!old)continue;
   const next=node.getBoundingClientRect(),dy=old.top-next.top,dx=old.left-next.left;
   if(Math.abs(dy)+Math.abs(dx)>1)animate('reorder',node,[{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{delay,fill:'backwards'});
  }
 }
 function depart(node){
  if(!enabled('reorder')){node.remove();return;}
  const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
  if(rect.bottom<0||rect.top>innerHeight){node.remove();return;}
  // Keep the departing row visible, but remove it from layout so its neighbors can glide up.
  const look=Object.fromEntries(['background','color','borderTop','borderRight','borderBottom','borderLeft','borderRadius','boxShadow','padding','fontFamily'].map(key=>[key,style[key]]));
  node.classList.remove('task-row');node.classList.add('completion-exit');node.inert=true;node.setAttribute('aria-hidden','true');
  Object.assign(node.style,look,{position:'fixed',display:'block',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',minHeight:'0',margin:'0',pointerEvents:'none',zIndex:'6',transformOrigin:'center'});
  const check=node.querySelector('.task-check');if(check){check.classList.add('checked');check.innerHTML='<i data-lucide="check" aria-hidden="true"></i>';}
  return animate('reorder',node,[{opacity:1,transform:'none'},{opacity:.25,transform:'translateY(-3px) scale(.98)',offset:.35},{opacity:0,transform:'translateY(-8px) scale(.95)'}],{duration:220,easing:'cubic-bezier(.3,0,.3,1)',fill:'forwards'},true);
 }
 function burst(rect){
  if(!rect||!enabled('confetti'))return;
  const layer=document.createElement('div');layer.className='motion-confetti';layer.setAttribute('aria-hidden','true');document.body.append(layer);
  if(layer.showPopover){layer.popover='manual';layer.showPopover();}
  const wild=getPrefs().animationLevel==='wild',count=wild?64:28;
  for(let i=0;i<count;i++){
   const bit=document.createElement('b');bit.style.cssText=`left:${Math.max(16,Math.min(innerWidth-16,rect.left+22))}px;top:${Math.max(16,Math.min(innerHeight-16,rect.top+22))}px;background:${['#ed6382','#29bda1','#f0c541','#7195f5','#d481ed'][i%5]}`;layer.append(bit);
   const x=(Math.random()-.5)*(wild?570:300),y=-50-Math.random()*180;
   animate('confetti',bit,[{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${x*.6}px,${y}px) rotate(200deg)`,opacity:1,offset:.5},{transform:`translate(${x}px,${160+Math.random()*120}px) rotate(${500+Math.random()*500}deg)`,opacity:0}],{duration:950+Math.random()*600},true);
  }
  // A layer-level animation owns cleanup even when individual particles are canceled.
  animate('confetti',layer,[{opacity:1},{opacity:1}],{duration:1650},true);
 }
 function travel(rect,target){
  if(!rect||!target||!enabled('travel'))return;
  const end=target.getBoundingClientRect(),chip=document.createElement('span'),colors=getComputedStyle(target);chip.className='motion-traveler';chip.textContent='✓';chip.setAttribute('aria-hidden','true');
  chip.style.background=colors.getPropertyValue('--accent');chip.style.color=colors.getPropertyValue('--accent-text');chip.style.left=rect.left+'px';chip.style.top=rect.top+'px';document.body.append(chip);
  const x=end.left+end.width/2-rect.left-18,y=end.top+end.height/2-rect.top-18;
  animate('travel',chip,[{transform:'scale(1)',opacity:1},{transform:`translate(${x*.45}px,${y*.45-45}px) scale(1.2) rotate(-20deg)`,offset:.45,opacity:1},{transform:`translate(${x}px,${y}px) scale(.3) rotate(12deg)`,opacity:0}],{duration:650},true);
  pop('travel',target);
 }
 function dialog(node){animate('dialogs',node,[{opacity:0,transform:'translateY(18px) scale(.92) rotate(-1deg)'},{opacity:1,transform:'translateY(-3px) scale(1.01)',offset:.75},{opacity:1,transform:'none'}],{duration:360});}
 function arrival(id,target){const node=[...document.querySelectorAll('.task-row')].find(row=>row.dataset.task===id);pop('arrival',node||target);}
 document.addEventListener('click',event=>{const button=event.target.closest('button');if(button&&!button.disabled)pop('taps',button);});
 function punt(rect,target,title){
  if(!rect||!target||!enabled('travel'))return;
  const end=target.getBoundingClientRect(),chip=document.createElement('span');chip.className='motion-traveler punt-traveler';chip.textContent=title;chip.style.width=rect.width+'px';chip.style.height=rect.height+'px';chip.setAttribute('aria-hidden','true');chip.style.left=rect.left+'px';chip.style.top=rect.top+'px';document.body.append(chip);
  const x=end.left+end.width/2-rect.left-rect.width/2,y=end.top+end.height/2-rect.top-rect.height/2;
  animate('travel',chip,[{transform:'scale(1) rotate(0)',opacity:1},{transform:`translate(${x*.5}px,${y*.5-65}px) scale(1.3) rotate(360deg)`,offset:.5,opacity:1},{transform:`translate(${x}px,${y}px) scale(.25) rotate(720deg)`,opacity:0}],{duration:650},true);pop('travel',target);
 }
 return {enabled,animate,pop,enter,snapshot,rearrange,depart,burst,travel,punt,dialog,arrival,sync,clear};
}
