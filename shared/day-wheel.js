export function dayWheel(value){
 return `<div id="days-shown" class="day-wheel" role="listbox" tabindex="0" aria-label="Extended view days" aria-activedescendant="days-option-${value}">${Array.from({length:10},(_,i)=>`<div role="option" id="days-option-${i+1}" data-day-count="${i+1}" aria-selected="${i+1===value}">${i+1}</div>`).join('')}</div>`;
}
export function bindDayWheel(root,value,onChange){
 let timer,selected=value;
 function choose(next,{scroll=false}={}){
  if(!root.isConnected)return;
  next=Math.max(1,Math.min(10,next));const changed=selected!==next;selected=next;
  root.querySelectorAll('[data-day-count]').forEach(option=>option.setAttribute('aria-selected',String(Number(option.dataset.dayCount)===next)));
  root.setAttribute('aria-activedescendant','days-option-'+next);
  if(scroll)root.scrollTo({top:(next-1)*36,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  if(changed)onChange(next);
 }
 root.scrollTop=(value-1)*36;
 root.commitSelection=()=>{clearTimeout(timer);choose(Math.round(root.scrollTop/36)+1);};
 root.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(()=>choose(Math.round(root.scrollTop/36)+1),100);},{passive:true});
 root.addEventListener('click',event=>{const option=event.target.closest('[data-day-count]');if(option)choose(Number(option.dataset.dayCount),{scroll:true});});
 root.addEventListener('keydown',event=>{
  const delta={ArrowUp:-1,ArrowDown:1,PageUp:-3,PageDown:3}[event.key];
  if(delta||['Home','End'].includes(event.key)){event.preventDefault();choose(event.key==='Home'?1:event.key==='End'?10:selected+delta,{scroll:true});}
 });
}
