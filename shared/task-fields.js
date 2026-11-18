import {addDays,shortDate} from './core.js?v=nextweek1';

export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
export function editorActions({composer=false,top=false}={}){
  return `<div class="${top?'editor-top-actions':'modal-footer'} ${composer?'composer-actions':''}"><button class="${top?'text-button':'primary'}" type="submit">${top?icon('check'):''}Save</button><button class="${top?'text-button':'secondary'} ${composer?'cancel-new-task':'cancel-editor'}" type="button">Cancel</button>${!composer&&!top?`<button class="quiet danger icon-button" type="button" id="remove-task" title="Remove task" aria-label="Remove task">${icon('trash-2')}</button>`:''}</div>`;
}
export function photoUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'&&(url.hostname==='googleusercontent.com'||url.hostname.endsWith('.googleusercontent.com'))?url.href:'';}catch{return '';}
}
export function avatar(uid,members,profiles,{button=false,selected=false}={}){
  const match=uid?.startsWith('email:')?Object.keys(profiles).find(id=>profiles[id].email===uid.slice(6)):uid;
  const name=uid?(members[uid]||members[match]||uid.replace(/^email:/,'').split('@')[0]):'Unassigned',photo=photoUrl(profiles[match]?.photoURL),initials=uid?name.split(/\s+/).map(part=>part[0]).slice(0,2).join(''):'?';
  const content=`${photo?`<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer" loading="lazy">`:''}<span ${photo?'hidden':''}>${esc(initials)}</span>`;
  return button?`<button type="button" class="assignee-choice" data-assignee="${esc(uid||'shared')}" aria-label="Assign to ${esc(name)}" aria-pressed="${selected}" title="${esc(name)}"><span class="avatar">${content}</span><small>${esc(name)}</small></button>`:`<span class="avatar task-avatar" role="img" aria-label="${esc(name)}" title="${esc(name)}">${content}</span>`;
}
export function descriptionHtml(value){
  if(!value)return '';
  if(!window.marked||!window.DOMPurify)return `<p>${esc(value)}</p>`;
  const clean=window.DOMPurify.sanitize(window.marked.parse(value,{gfm:true,breaks:true}),{
    ALLOWED_TAGS:['p','br','strong','em','ul','ol','li','input','a','code','pre','blockquote','del'],
    ALLOWED_ATTR:['href','title','type','checked','disabled'],ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,
  });
  const template=document.createElement('template');template.innerHTML=clean;
  template.content.querySelectorAll('input').forEach(input=>{if(input.type!=='checkbox')input.remove();else input.disabled=true;});
  template.content.querySelectorAll('a').forEach(link=>{link.target='_blank';link.rel='noopener noreferrer';});
  return template.innerHTML;
}
export function fieldsMarkup({task={},today,composer=false,allowPrivate=true}){
  const prefix=composer?'new':'edit',mode=task.dueDate?(task.dueDate<=today?'asap':'date'):'later',when=composer?'asap':mode;
  task={...task,assigneeUid:task.assigneeUid||(task.assigneeEmail?'email:'+task.assigneeEmail:null)};
  return `${composer?'':`<label class="sr-only" for="edit-title">Task</label><input class="edit-title" id="edit-title" name="title" aria-label="Task" maxlength="200" required value="${esc(task.title)}">`}
    <div class="schedule-line">${composer?`<button class="icon-button options-toggle" type="button" aria-label="More task options" aria-expanded="false" aria-controls="new-options">${icon('chevron-down')}</button>`:''}<div class="choice-track timing-track" role="group" aria-label="${composer?'Task schedule':'When'}"><span class="choice-indicator" aria-hidden="true"></span>${[['asap','ASAP','today'],['week','~ Week','upcoming'],['later','Later','later']].map(([id,label,view])=>`<button type="button" data-timing="${id}" ${composer?`data-view="${view}"`:''} aria-pressed="${when===id}" ${id==='week'?'title="Next five weekdays; upcoming dated tasks"':''}>${label}</button>`).join('')}</div><input type="hidden" name="when" id="${prefix}-when" value="${when}"></div>
    <div class="task-options" id="${prefix}-options" ${composer?'hidden':''}>
      <div class="description-field"><label for="${prefix}-description">Description</label><textarea name="description" id="${prefix}-description" rows="3" maxlength="10000" aria-label="Description">${esc(task.description)}</textarea></div>
      <div class="sharing-line"><span>Task list</span><div class="choice-track sharing-track" role="group" aria-label="Task list"><span class="choice-indicator" aria-hidden="true"></span><button type="button" data-sharing="private" ${allowPrivate?'':'disabled'} aria-pressed="${task.visibility!=='shared'}">Private</button><button type="button" data-sharing="shared" aria-pressed="${task.visibility==='shared'}">Shared</button></div></div><input type="hidden" name="person" id="${prefix}-person" value="${esc(task.visibility==='shared'?task.assigneeUid||'shared':'private')}"><div class="ownership-field" data-private="${task.visibility!=='shared'}"><span id="${prefix}-owner-label">Task owner for shared items</span><div class="assignee-choices" role="group" aria-labelledby="${prefix}-owner-label"></div></div>
      <label class="toggle-row waiting-toggle"><span class="waiting-label">${icon('message-circle-more')}Waiting for a response</span><input name="waiting" type="checkbox" role="switch" ${task.waiting?'checked':''}></label>
      <div class="exact-date-row"><label class="compact-date" for="${prefix}-date">Date<input id="${prefix}-date" name="date" type="date" aria-label="Date" value="${esc(task.dueDate||'')}"></label></div>
      <div class="waiting-options" ${task.waiting?'':'hidden'}><div class="followup-heading">Follow-up date <small class="custom-date" hidden>Custom</small></div><div class="followup-choices" role="group" aria-label="Follow up in">${[[3,'3 days'],[7,'1 week'],[14,'2 weeks'],[30,'1 month'],[90,'3 months']].map(([days,label])=>`<button type="button" data-followup="${days}" aria-pressed="false">${label}</button>`).join('')}</div><label class="compact-date"><span class="sr-only">Follow-up date</span><input name="followUp" type="date" aria-label="Follow-up date" value="${esc(task.followUp||'')}"></label></div>
      ${composer?editorActions({composer:true}):''}
    </div>`;
}
export function bindFields(form,{uid,members,profiles,today,onOptionsToggle,onTimingSelect,onScheduleChange}){
  const $=selector=>form.querySelector(selector),timing=$('.timing-track'),sharing=$('.sharing-track'),options=$('.task-options'),person=form.elements.person;
  let activeView=null;
  function people(){
    if(person.value.startsWith('email:')){const id=Object.keys(profiles).find(id=>!id.startsWith('email:')&&profiles[id].email===person.value.slice(6));if(id)person.value=id;}
    const labels=uid&&!members[uid]?{...members,[uid]:'Me'}:members;
    $('.assignee-choices').innerHTML=Object.keys(labels).map(id=>avatar(id,labels,profiles,{button:true,selected:person.value===id})).join('')+avatar(null,labels,profiles,{button:true,selected:person.value==='shared'});
    window.lucide?.createIcons();
  }
  function sync(){
    const active=['asap','week','later'].indexOf(form.elements.when.value);timing.style.setProperty('--choice',Math.max(0,active));timing.toggleAttribute('data-exact',active<0||form.elements.waiting.checked);
    timing.querySelectorAll('[data-timing]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.timing===form.elements.when.value&&!form.elements.waiting.checked)));
    const shared=person.value!=='private';sharing.style.setProperty('--choice',shared?1:0);sharing.querySelectorAll('[data-sharing]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.sharing==='shared')===shared)));
    $('.ownership-field').dataset.private=String(!shared);$('.exact-date-row').hidden=form.elements.waiting.checked;
    $('.waiting-options').hidden=!form.elements.waiting.checked;
    if(activeView!==null)showView(activeView);
    people();
  }
  function updatePeople(nextMembers,nextProfiles,nextUid=uid){members=nextMembers;profiles=nextProfiles;uid=nextUid;people();}
  form.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||!form.contains(button))return;
    if(button.dataset.timing){if(onTimingSelect)void onTimingSelect(button.dataset.timing);else setTiming(button.dataset.timing);}
    if(button.dataset.sharing){person.value=button.dataset.sharing==='private'?'private':person.value==='private'?(uid||'shared'):person.value;sync();}
    if(button.dataset.assignee){person.value=button.dataset.assignee;sync();}
    if(button.dataset.followup){form.elements.followUp.value=addDays(today,Number(button.dataset.followup));followupSelection(button.dataset.followup);}
    if(button.classList.contains('options-toggle')){if(onOptionsToggle)void onOptionsToggle();else setExpanded(options.hidden);}
  });
  function followupSelection(days){
    $('.followup-choices').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.followup===String(days))));
    $('.custom-date').hidden=!form.elements.followUp.value||!!days;
  }
  form.querySelectorAll('input[type=date]').forEach(input=>input.addEventListener('click',()=>{try{input.showPicker?.();}catch{/* Leave the native input usable when showPicker is unavailable. */}}));
  form.addEventListener('change',event=>{
    if(event.target===form.elements.date){form.elements.when.value=event.target.value?'date':'later';sync();onScheduleChange?.();}
    if(event.target===form.elements.followUp)followupSelection(null);
    if(event.target===form.elements.waiting){if(event.target.checked&&!form.elements.followUp.value){form.elements.followUp.value=addDays(today,7);followupSelection(7);}sync();onScheduleChange?.();}
    if(event.target===person)sync();
  });
  form.addEventListener('error',event=>{if(event.target.tagName==='IMG'){event.target.hidden=true;if(event.target.nextElementSibling)event.target.nextElementSibling.hidden=false;}},true);
  function setExpanded(expanded){options.hidden=!expanded;const toggle=$('.options-toggle');if(expanded){activeView=null;sync();}if(toggle){toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',expanded?'Collapse task details':'More task options');toggle.title=expanded?'Collapse task details':'More task options';}}
  function setTiming(mode){form.elements.when.value=mode;form.elements.date.value='';form.elements.waiting.checked=false;sync();}
  function showView(view){activeView=view;const active=['today','upcoming','later'].indexOf(view);timing.style.setProperty('--choice',Math.max(0,active));timing.toggleAttribute('data-exact',active<0);timing.querySelectorAll('[data-view]').forEach(button=>{button.toggleAttribute('aria-current',button.dataset.view===view);button.setAttribute('aria-pressed',String(button.dataset.view===view));});}
  followupSelection(null);sync();return {updatePeople,setExpanded,setTiming,showView,setDay(day){today=day;},reset(when='asap'){form.elements.when.value=when;form.elements.date.value='';form.elements.followUp.value='';form.elements.waiting.checked=false;form.elements.description.value='';person.value='private';setExpanded(false);followupSelection(null);sync();},summary(){return form.elements.waiting.checked?`Follow up ${shortDate(form.elements.followUp.value)}`:'';}};
}
export function fieldValues(form){
  const person=form.elements.person.value,email=person.startsWith('email:')?person.slice(6):null;
  return {description:form.elements.description.value,assigneeUid:['private','shared'].includes(person)||email?null:person,assigneeEmail:email,shared:person!=='private',mode:form.elements.waiting.checked?'later':form.elements.when.value,exact:form.elements.date.value,waiting:form.elements.waiting.checked,followUp:form.elements.followUp.value};
}
