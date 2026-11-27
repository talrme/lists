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

export function createCompletedToday({onToggle}){
 const section=document.createElement('section');section.id='completed-today';section.className='completed-today';section.hidden=true;section.setAttribute('aria-label','Completed today');
 section.innerHTML='<h3 class="completed-today-heading" hidden></h3><div id="completed-today-items" class="completed-today-items"></div><button type="button" class="completed-today-toggle" aria-controls="completed-today-items"></button>';
 const heading=section.querySelector('h3'),list=section.querySelector('.completed-today-items'),button=section.querySelector('button');heading.textContent="Today's completed tasks";button.onclick=onToggle;
 function render({tasks,parent,shown,expanded=false}){
  heading.hidden=!expanded;
  section.hidden=!parent||!tasks.length;
  if(!parent||!tasks.length){list.replaceChildren();section.remove();return 0;}
  if(section.parentNode!==parent)parent.append(section);
  button.textContent=(shown?'Hide':'Show')+' completed tasks';button.setAttribute('aria-expanded',String(shown));list.hidden=!shown;
  const rows=new Map([...list.children].map(row=>[row.dataset.completedTask,row])),ids=new Set(tasks.map(task=>task.id));
  for(const [id,row] of rows)if(!ids.has(id))row.remove();
  tasks.forEach((task,index)=>{let row=rows.get(task.id);if(!row){row=document.createElement('article');row.className='completed-today-row completed';row.dataset.completedTask=task.id;row.innerHTML='<button type="button" class="completed-today-name"><span class="task-title"><span class="task-name"></span></span></button>';row.querySelector('button').dataset.edit=task.id;}
   if(row._title!==task.title){row.querySelector('.task-name').textContent=task.title;row.querySelector('button').setAttribute('aria-label','Completed task: '+task.title);row._title=task.title;}if(list.children[index]!==row)list.insertBefore(row,list.children[index]||null);
  });return tasks.length;
 }
 function reset(){list.replaceChildren();section.remove();section.hidden=true;}
 return {render,reset,section};
}
