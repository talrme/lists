import {taskDraft,creationOrder} from './core.js?v=organizer1';

export function sectionDraft(title,{lane,day,today,uid},tasks){
 const mode=day?'date':({today:'asap',upcoming:'week',waiting:'later',later:'later',someday:'someday'})[lane];
 if(!mode)throw new Error('Choose a date or list.');
 const draft=taskDraft({title,ownerUid:uid,day:today,mode,exact:day||''});
 if(lane==='waiting')draft.waiting=true;
 return {...draft,sortOrder:creationOrder(tasks,'todo')};
}

export function createSectionAdd({icon,save,host}){
 const entries=new Map(),recovery=document.createElement('div');recovery.className='section-add-recovery';let generation=0,lastTargets=[];
 function render(targets){
  lastTargets=targets;
  const visible=new Set();
  for(const target of targets){
   visible.add(target.key);let entry=entries.get(target.key);
   if(!entry){
    const button=document.createElement('button');button.type='button';button.className='icon-button section-add-toggle';button.innerHTML=icon('plus');
    const form=document.createElement('form');form.className='section-add-form';form.hidden=true;
    form.id='section-add-'+target.key.replace(/[^a-zA-Z0-9-]/g,'-');button.setAttribute('aria-controls',form.id);
    form.innerHTML=`<div class="section-add-field"><input name="title" maxlength="200" autocomplete="off" required><button type="submit" class="icon-button" aria-label="Add task" title="Add task">${icon('corner-down-left')}</button></div><p class="inline-error" role="alert"></p>`;
    const input=form.elements.title,error=form.querySelector('.inline-error');
    entry={button,form,input,error,target,operation:null};entries.set(target.key,entry);
    button.onclick=()=>{form.hidden=!form.hidden;button.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)input.focus();};
    form.onkeydown=event=>{if(event.key==='Escape'&&!form.dataset.saving){event.preventDefault();event.stopPropagation();form.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}};
    form.onfocusout=()=>queueMicrotask(()=>{if(!form.contains(document.activeElement)&&!input.value&&!form.dataset.saving){form.hidden=true;button.setAttribute('aria-expanded','false');if(entry.recoveryRow?.isConnected)render(lastTargets);}});
    input.oninput=()=>button.classList.toggle('has-draft',!!input.value.trim());
    form.onsubmit=async event=>{
     event.preventDefault();const title=input.value.trim();if(!title||form.dataset.saving)return;
     if(entry.operation?.title!==title)entry.operation={title,id:crypto.randomUUID()};
     const epoch=generation;form.dataset.saving='true';input.readOnly=true;form.querySelector('[type=submit]').disabled=true;error.textContent='';
     try{await save(entry.operation,entry.target,form.getBoundingClientRect());if(epoch!==generation)return;input.value='';entry.operation=null;button.classList.remove('has-draft');if(form.contains(document.activeElement))input.focus();}
     catch(problem){if(epoch===generation)error.textContent=problem?.message||'Could not add task. Try again.';}
     finally{delete form.dataset.saving;input.readOnly=false;form.querySelector('[type=submit]').disabled=false;if(epoch===generation)render(lastTargets);}
    };
   }
   entry.target=target;entry.button.title=entry.button.ariaLabel='Add task to '+target.label;entry.input.placeholder='Add a task…';entry.input.setAttribute('aria-label','New task in '+target.label);entry.button.setAttribute('aria-expanded',String(!entry.form.hidden));
   if(entry.button.parentNode!==target.heading)target.heading.insertBefore(entry.button,target.heading.querySelector('.column-eye'));
   if(entry.form.parentNode!==target.parent)target.heading.after(entry.form);
   entry.recoveryRow?.remove();
   entry.button.hidden=!!target.collapsed;entry.form.hidden=!!target.collapsed||entry.form.hidden;entry.button.setAttribute('aria-expanded',String(!entry.form.hidden));
  }
  // Keep a draft reachable if merging days, hiding a list or midnight removes its heading.
  for(const [key,entry] of entries)if(!visible.has(key)){
   if(entry.input.value.trim()||entry.form.dataset.saving){
    if(!entry.recoveryRow){entry.recoveryRow=document.createElement('div');entry.recoveryRow.innerHTML='<div class="section-add-recovery-heading"><span></span></div>';}
    entry.recoveryRow.querySelector('span').textContent='To-do draft · '+entry.target.label;
    const heading=entry.recoveryRow.querySelector('.section-add-recovery-heading');if(entry.button.parentNode!==heading)heading.append(entry.button);if(entry.form.parentNode!==entry.recoveryRow)entry.recoveryRow.append(entry.form);if(entry.recoveryRow.parentNode!==recovery)recovery.append(entry.recoveryRow);entry.button.hidden=false;
   }else{entry.button.remove();entry.form.remove();entry.recoveryRow?.remove();entries.delete(key);}
  }
  if(recovery.children.length){if(!recovery.isConnected)host.before(recovery);}else recovery.remove();
 }
 function reset(){generation++;for(const entry of entries.values()){entry.button.remove();entry.form.remove();entry.input.value='';}entries.clear();recovery.replaceChildren();recovery.remove();lastTargets=[];}
 return {render,reset,hasDraft:()=>[...entries.values()].some(entry=>entry.input.value.trim()||entry.form.dataset.saving)};
}
