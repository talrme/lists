import {dayKey,taskOrder} from './core.js?v=organizer1';

export function completionPatch(task,patch,now=Date.now()){
 if(typeof patch.completed!=='boolean'||patch.completed===task?.completed)return patch;
 return {...patch,completedAt:patch.completed?(Object.hasOwn(patch,'completedAt')?patch.completedAt:now):null};
}

export function completedOn(task,day,timeZone='America/Los_Angeles'){
 const at=task.completedAt;
 return task.completed&&Number.isFinite(at)&&at>=0&&at<8640000000000000&&dayKey(at,timeZone)===day;
}

export function completedOrder(a,b){return b.completedAt-a.completedAt||taskOrder(a,b);}

export function createCompletedToday({icon,markup,onToggle}){
 const section=document.createElement('section');section.id='completed-today';section.className='completed-today';section.hidden=true;section.setAttribute('aria-label','Completed today');
 section.innerHTML=`<div class="completed-today-heading"><h3></h3><button type="button" class="icon-button" aria-controls="completed-today-items"></button></div><div id="completed-today-items" class="completed-today-items"></div>`;
 const list=section.querySelector('.completed-today-items'),button=section.querySelector('button');button.onclick=onToggle;
 function render({tasks,parent,shown}){
  section.hidden=!parent||!tasks.length;
  if(!parent||!tasks.length){list.replaceChildren();section.remove();return 0;}
  if(section.parentNode!==parent)parent.append(section);
  section.querySelector('h3').textContent='Completed today · '+tasks.length;
  const label=(shown?'Hide':'Show')+' today’s completed tasks';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-expanded',String(shown));button.innerHTML=icon(shown?'eye':'eye-off');list.hidden=!shown;
  const rows=new Map([...list.children].map(row=>[row.dataset.completedTask,row])),ids=new Set(tasks.map(task=>task.id));
  for(const [id,row] of rows)if(!ids.has(id))row.remove();
  tasks.forEach((task,index)=>{let row=rows.get(task.id);if(!row){row=document.createElement('article');row.className='completed-today-row completed';row.dataset.completedTask=task.id;}
   const html=markup(task);if(row._summary!==html){row.innerHTML=html;row._summary=html;}if(list.children[index]!==row)list.insertBefore(row,list.children[index]||null);
  });return tasks.length;
 }
 function reset(){list.replaceChildren();section.remove();section.hidden=true;}
 return {render,reset,section};
}
