export function taskGestures({canSwipe,canMove,findTask,onDefer,onMove,onIdle,motion,context,swipeLabel,swipeDirection}){
 const host=document.querySelector('#task-list'),sortables=new Map();let active=false,dragging=false,chosen=false,swipe=null,suppressUntil=0;
 let flowFrame=0;const flowAnimations=new Map();
 function animateFlow(event){
  if(flowFrame||!motion.enabled('reorder'))return;
  // Sortable animates source/target rows; animate headings and other days as they reflow.
  const nodes=[...host.querySelectorAll('.day-heading,.task-row')].filter(node=>node.matches('.day-heading')||![event.from,event.to].includes(node.parentElement));
  const before=new Map(nodes.map(node=>[node,node.getBoundingClientRect().top+scrollY]));
  flowFrame=requestAnimationFrame(()=>{
   flowFrame=0;
   flowAnimations.forEach(animation=>animation.cancel());flowAnimations.clear();
   const deltas=[...before].filter(([node])=>node.isConnected).map(([node,top])=>[node,top-node.getBoundingClientRect().top-scrollY]);
   for(const [node,delta] of deltas){
    if(Math.abs(delta)>1){const animation=motion.animate('reorder',node,[{transform:`translateY(${delta}px)`},{transform:'none'}],{duration:180});if(animation)flowAnimations.set(node,animation);}
   }
  });
 }
 const idle=()=>{active=false;document.body.classList.remove('task-dragging');cancelAnimationFrame(flowFrame);flowFrame=0;flowAnimations.forEach(animation=>animation.cancel());flowAnimations.clear();onIdle();};
 function sync(){
  for(const [node,sortable] of sortables)if(!node.isConnected){sortable.destroy();sortables.delete(node);}
  host.querySelectorAll('.day-tasks').forEach(node=>{
   if(!sortables.has(node))sortables.set(node,new window.Sortable(node,{
    group:'list-tasks',draggable:'.task-row',filter:'.is-editing,.completed,button:not(.task-content),input,textarea,select,a',preventOnFilter:false,
    delay:150,delayOnTouchOnly:false,touchStartThreshold:6,
    animation:motion.enabled('reorder')?180:0,forceFallback:true,fallbackOnBody:true,fallbackTolerance:4,
    ghostClass:'task-drag-placeholder',chosenClass:'task-drag-chosen',fallbackClass:'task-drag-float',scrollSensitivity:70,scrollSpeed:12,
    onChoose(){chosen=true;swipe=null;active=true;sortables.forEach(sortable=>sortable.option('animation',motion.enabled('reorder')?180:0));},
    onMove:animateFlow,
    onUnchoose(){if(!chosen)return;chosen=false;suppressUntil=performance.now()+350;if(!dragging)idle();},
    onStart(event){dragging=true;active=true;event.item._movingTask=findTask(event.item.dataset.task);event.item._movingEpoch=context();document.body.classList.add('task-dragging');},
    async onEnd(event){
     suppressUntil=performance.now()+350;const task=event.item._movingTask,epoch=event.item._movingEpoch;delete event.item._movingTask;delete event.item._movingEpoch;
     // Sortable may leave in-flight neighbor transforms after pointer release.
     host.querySelectorAll('.task-row').forEach(row=>{row.getAnimations().forEach(animation=>animation.cancel());row.style.transition='none';row.style.transform='none';});
     try{if(task&&epoch===context()&&(event.from!==event.to||event.oldDraggableIndex!==event.newDraggableIndex))await onMove(task,[...event.to.querySelectorAll('.task-row')].map(row=>row.dataset.task),event.to.dataset.day||null);}finally{dragging=false;host.querySelectorAll('.task-row').forEach(row=>{row.style.removeProperty('transition');row.style.removeProperty('transform');});idle();}
    },
   }));
   sortables.get(node).option('disabled',!canMove());sortables.get(node).option('animation',motion.enabled('reorder')?180:0);
  });
 }
 function resetSwipe(){
  if(!swipe)return;const {row,summary,pointer}=swipe;
  if(summary.hasPointerCapture(pointer))summary.releasePointerCapture(pointer);
  row.classList.remove('is-swiping','swipe-ready');summary.style.removeProperty('transform');swipe=null;idle();
 }
 host.addEventListener('pointerdown',event=>{
  if(active||!canSwipe()||event.button!==0||event.target.closest('.task-check,.defer-task,.task-edit-form'))return;
  const row=event.target.closest('.task-row'),task=findTask(row?.dataset.task);if(!row||row.classList.contains('is-editing')||!task||task.completed)return;
  row.dataset.swipeLabel=swipeLabel();
  row.dataset.swipeDirection=swipeDirection();
  swipe={row,summary:row.querySelector('.task-summary'),pointer:event.pointerId,x:event.clientX,y:event.clientY,distance:0,direction:row.dataset.swipeDirection==='left'?-1:1,locked:false,task,epoch:context()};
 });
 host.addEventListener('pointermove',event=>{
  if(!swipe||event.pointerId!==swipe.pointer)return;
  const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;
  if(!swipe.locked){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){swipe=null;return;}if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.4)return;if(dx*swipe.direction<0){swipe=null;suppressUntil=performance.now()+350;return;}swipe.locked=true;active=true;swipe.summary.setPointerCapture(event.pointerId);swipe.row.classList.add('is-swiping');}
  event.preventDefault();swipe.distance=Math.max(0,dx*swipe.direction);swipe.summary.style.transform=`translateX(${swipe.distance*swipe.direction}px)`;swipe.row.classList.toggle('swipe-ready',swipe.distance>=threshold());
 },{passive:false});
 host.addEventListener('pointerup',async event=>{
  if(!swipe||event.pointerId!==swipe.pointer)return;
  if(!swipe.locked){swipe=null;return;}
  suppressUntil=performance.now()+350;const task=swipe.task,commit=swipe.distance>=threshold()&&swipe.epoch===context(),summary=swipe.summary;
  const animation=motion.animate('reorder',summary,[{transform:`translateX(${swipe.distance*swipe.direction}px)`},{transform:`translateX(${commit?Math.max(swipe.distance,swipe.row.clientWidth)*swipe.direction:0}px)`}],{duration:180,fill:'forwards'});
  try{if(commit)await onDefer(task);if(animation)await animation.finished.catch(()=>{});}finally{animation?.cancel();resetSwipe();suppressUntil=performance.now()+350;}
 });
 host.addEventListener('pointercancel',resetSwipe);
 host.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
 host.addEventListener('contextmenu',event=>{if(canMove()&&event.target.closest('.task-content')&&!event.target.closest('.is-editing'))event.preventDefault();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&swipe)resetSwipe();});
 function threshold(){return Math.min(120,Math.max(72,swipe.row.clientWidth*.28));}
 return {sync,isActive:()=>active,cancel:resetSwipe};
}
