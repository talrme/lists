export function drawerSwipe(drawer,close,motion){
 let start=null,offset=0,dragging=false,suppressUntil=0;
 drawer.style.touchAction='pan-y';
 drawer.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||!drawer.open)return;
  start={x:event.clientX,y:event.clientY,id:event.pointerId};offset=0;dragging=false;
 });
 drawer.addEventListener('pointermove',event=>{
  if(!start||event.pointerId!==start.id)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(!dragging&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){start=null;return;}
  if(!dragging&&dx < -12&&Math.abs(dx)>Math.abs(dy)*1.3){dragging=true;drawer.setPointerCapture(event.pointerId);}
  if(dragging){offset=Math.min(0,dx);drawer.style.transform=`translateX(${offset}px)`;}
 });
 const finish=async event=>{
  if(!start||event.pointerId!==start.id)return;
  const moved=dragging,distance=offset;start=null;dragging=false;
  if(!moved)return;suppressUntil=Date.now()+400;
  if(event.type!=='pointercancel'&&distance < -Math.min(80,drawer.clientWidth*.25))await close(distance);
  else {const animation=motion.animate('navigation',drawer,[{transform:`translateX(${distance}px)`},{transform:'translateX(0)'}],{duration:150});await animation?.finished.catch(()=>{});}
  drawer.style.removeProperty('transform');
 };
 drawer.addEventListener('pointerup',event=>void finish(event));drawer.addEventListener('pointercancel',event=>void finish(event));
 drawer.addEventListener('click',event=>{if(Date.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
}

export function modalViewport(dialog){
 const viewport=window.visualViewport;
 let baseline=viewport?.height||innerHeight,width=innerWidth,keyboard=false,lastKeyboard=0;
 const update=()=>{
  if(Math.abs(innerWidth-width)>100){width=innerWidth;baseline=viewport?.height||innerHeight;}
  const height=viewport?.height||innerHeight;baseline=Math.max(baseline,height);
  keyboard=baseline-height>120;if(keyboard)lastKeyboard=Date.now();
  dialog.style.setProperty('--visible-height',`${height}px`);
  dialog.style.setProperty('--visible-top',`${viewport?.offsetTop||0}px`);
 };
 viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);update();
 return {hideKeyboard(){document.activeElement?.blur?.();},dismissKeyboard(){
  if(keyboard||Date.now()-lastKeyboard<650){document.activeElement?.blur?.();return true;}return false;
 }};
}
