import {searchTasks} from './search.js?v=1';

export function desktopSearch({mount,getTasks,label,select,icon,esc,icons}){
 const root=document.createElement('section');root.className='desktop-search';root.hidden=true;
 root.innerHTML=`<label class="desktop-search-field">${icon('search')}<input type="search" id="desktop-task-search" placeholder="Search tasks" aria-label="Search tasks" autocomplete="off" maxlength="200" aria-controls="desktop-search-results" aria-expanded="false"></label><div class="desktop-search-popover" hidden><label class="search-completed"><input type="checkbox">Include completed tasks</label><div id="desktop-search-results" class="search-results"></div><p class="desktop-search-count" role="status" aria-live="polite"></p></div>`;
 mount.append(root);
 const input=root.querySelector('input[type=search]'),completed=root.querySelector('input[type=checkbox]'),panel=root.querySelector('.desktop-search-popover'),results=root.querySelector('.search-results'),count=root.querySelector('[role=status]');
 let open=false,signature='';
 function close(){open=false;panel.hidden=true;input.setAttribute('aria-expanded','false');}
 function refresh(){
  if(!open)return;
  const query=input.value.trim();if(!query){close();return;}
  const matches=searchTasks(getTasks().filter(task=>completed.checked||!task.completed),query).sort((a,b)=>Number(a.completed)-Number(b.completed)),shown=matches.slice(0,100);
  const html=shown.map(task=>`<button type="button" data-reveal-task="${esc(task.id)}" class="${task.completed?'search-result-completed':''}"><span class="search-result-status" aria-label="${task.completed?'Completed':'Not completed'}">${icon(task.completed?'circle-check':'circle')}</span><span class="search-result-copy"><strong>${esc(task.title)}</strong><small>${esc(label(task))}</small></span></button>`).join('');
  if(html!==signature){const scroll=results.scrollTop;results.innerHTML=html;results.scrollTop=scroll;signature=html;icons();}
  count.textContent=matches.length?matches.length>100?'Showing first 100 of '+matches.length+' results':matches.length+' matching task'+(matches.length===1?'':'s'):'No matching tasks';
  panel.hidden=false;input.setAttribute('aria-expanded','true');
 }
 function show(){open=true;refresh();}
 input.addEventListener('input',show);input.addEventListener('focus',show);completed.addEventListener('change',show);
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();input.focus();close();return;}
  if(!['ArrowDown','ArrowUp'].includes(event.key))return;
  event.preventDefault();if(!open)show();const buttons=[...results.querySelectorAll('button')];if(!buttons.length)return;
  const current=buttons.indexOf(document.activeElement),next=event.key==='ArrowDown'?Math.min(current+1,buttons.length-1):current<0?buttons.length-1:Math.max(current-1,0);buttons[next].focus({preventScroll:true});buttons[next].scrollIntoView({block:'nearest'});
 });
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(open&&input.value.trim())results.querySelector('button')?.click();}});
 results.addEventListener('click',async event=>{const button=event.target.closest('[data-reveal-task]');if(!button)return;close();await select(button.dataset.revealTask);});
 document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close();});
 document.addEventListener('focusin',event=>{if(!root.contains(event.target))close();});
 return {refresh,close,setVisible(visible){root.hidden=!visible;if(!visible)close();},reset(){input.value='';completed.checked=false;signature='';results.replaceChildren();close();}};
}
