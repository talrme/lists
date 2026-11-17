import {addDays,shortDate} from './core.js';

export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
export function photoUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'&&(url.hostname==='googleusercontent.com'||url.hostname.endsWith('.googleusercontent.com'))?url.href:'';}catch{return '';}
}
export function avatar(uid,members,profiles,{button=false,selected=false}={}){
  const name=uid?(members[uid]||'Former member'):'Anyone',photo=photoUrl(profiles[uid]?.photoURL),initials=uid?name.split(/\s+/).map(part=>part[0]).slice(0,2).join(''):'?';
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
  return `${composer?'':`<label class="sr-only" for="edit-title">Task</label><input class="edit-title" id="edit-title" name="title" aria-label="Task" maxlength="200" required value="${esc(task.title)}">`}
    <div class="schedule-line"><div class="choice-track timing-track" role="group" aria-label="When"><span class="choice-indicator" aria-hidden="true"></span>${[['asap','ASAP'],['week','Soon'],['later','Later']].map(([id,label])=>`<button type="button" data-timing="${id}" aria-pressed="${when===id}">${label}</button>`).join('')}</div><input type="hidden" name="when" id="${prefix}-when" value="${when}">${composer?`<button class="icon-button options-toggle" type="button" aria-label="More task options" aria-expanded="false" aria-controls="new-options">${icon('chevron-down')}</button>`:''}</div>
    <div class="task-options" id="${prefix}-options" ${composer?'hidden':''}>
      <div class="description-field"><label for="${prefix}-description">Description</label><div class="format-tools" role="group" aria-label="Description formatting">${[['bold','bold','Bold'],['italic','italic','Italic'],['bullet','list','Bullets'],['check','list-checks','Checklist']].map(([id,glyph,label])=>`<button type="button" class="icon-button" data-format="${id}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`).join('')}<button type="button" class="icon-button description-preview-toggle" title="Preview description" aria-label="Preview description" aria-pressed="false">${icon('eye')}</button></div><textarea name="description" id="${prefix}-description" rows="3" maxlength="10000" aria-label="Description">${esc(task.description)}</textarea><div class="description-preview rich-description" hidden></div></div>
      <div class="sharing-line"><span>Visibility</span><div class="choice-track sharing-track" role="group" aria-label="Visibility"><span class="choice-indicator" aria-hidden="true"></span><button type="button" data-sharing="private" ${allowPrivate?'':'disabled'} aria-pressed="${task.visibility!=='shared'}">Private</button><button type="button" data-sharing="shared" aria-pressed="${task.visibility==='shared'}">Shared</button></div></div><input type="hidden" name="person" id="${prefix}-person" value="${esc(task.visibility==='shared'?task.assigneeUid||'shared':'private')}"><div class="assignee-choices" role="group" aria-label="Assign task" ${task.visibility==='shared'?'':'hidden'}></div>
      <div class="exact-date-row"><label class="toggle-row">Choose a date<input type="checkbox" name="useDate" role="switch" ${when==='date'?'checked':''}></label><input id="${prefix}-date" name="date" type="date" aria-label="Due date" value="${esc(task.dueDate||today)}" ${when==='date'?'':'hidden'}></div>
      <label class="toggle-row waiting-toggle">Waiting for a response<input name="waiting" type="checkbox" role="switch" ${task.waiting?'checked':''}></label><div class="waiting-options" ${task.waiting?'':'hidden'}><div class="followup-choices" role="group" aria-label="Follow up in">${[[3,'3 days'],[7,'1 week'],[14,'2 weeks'],[30,'1 month'],[90,'3 months']].map(([days,label])=>`<button type="button" data-followup="${days}" aria-pressed="false">${label}</button>`).join('')}</div><label class="field">Follow-up date<input name="followUp" type="date" value="${esc(task.followUp||addDays(today,7))}"></label></div>
    </div>`;
}
export function bindFields(form,{uid,members,profiles,today}){
  const $=selector=>form.querySelector(selector),timing=$('.timing-track'),sharing=$('.sharing-track'),options=$('.task-options'),person=form.elements.person;
  function people(){
    const labels=uid&&!members[uid]?{...members,[uid]:'Me'}:members;
    $('.assignee-choices').innerHTML=Object.keys(labels).map(id=>avatar(id,labels,profiles,{button:true,selected:person.value===id})).join('')+avatar(null,labels,profiles,{button:true,selected:person.value==='shared'});
    window.lucide?.createIcons();
  }
  function sync(){
    const active=['asap','week','later'].indexOf(form.elements.when.value);timing.style.setProperty('--choice',Math.max(0,active));timing.toggleAttribute('data-exact',active<0||form.elements.waiting.checked);
    timing.querySelectorAll('[data-timing]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.timing===form.elements.when.value&&!form.elements.waiting.checked)));
    const shared=person.value!=='private';sharing.style.setProperty('--choice',shared?1:0);sharing.querySelectorAll('[data-sharing]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.sharing==='shared')===shared)));
    $('.assignee-choices').hidden=!shared;$('.exact-date-row').hidden=form.elements.waiting.checked;form.elements.date.hidden=!form.elements.useDate.checked;
    $('.waiting-options').hidden=!form.elements.waiting.checked;
    people();
  }
  function updatePeople(nextMembers,nextProfiles,nextUid=uid){members=nextMembers;profiles=nextProfiles;uid=nextUid;people();}
  form.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||!form.contains(button))return;
    if(button.dataset.timing){form.elements.when.value=button.dataset.timing;form.elements.useDate.checked=false;form.elements.waiting.checked=false;sync();}
    if(button.dataset.sharing){person.value=button.dataset.sharing==='private'?'private':person.value==='private'?(uid||'shared'):person.value;sync();}
    if(button.dataset.assignee){person.value=button.dataset.assignee;sync();}
    if(button.dataset.followup){form.elements.followUp.value=addDays(today,Number(button.dataset.followup));$('.followup-choices').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}
    if(button.classList.contains('options-toggle')){options.hidden=!options.hidden;button.setAttribute('aria-expanded',String(!options.hidden));}
    if(button.dataset.format){
      const area=form.elements.description,start=area.selectionStart,end=area.selectionEnd,selection=area.value.slice(start,end);
      const insertion=button.dataset.format==='bold'?`**${selection||'text'}**`:button.dataset.format==='italic'?`*${selection||'text'}*`:(start&&area.value[start-1]!=='\n'?'\n':'')+(selection||'').split('\n').map(line=>(button.dataset.format==='check'?'- [ ] ':'- ')+line).join('\n');
      area.setRangeText(insertion,start,end,'select');area.focus();area.dispatchEvent(new Event('input',{bubbles:true}));
    }
    if(button.classList.contains('description-preview-toggle')){const display=$('.description-preview'),show=display.hidden;display.hidden=!show;form.elements.description.hidden=show;button.setAttribute('aria-pressed',String(show));display.innerHTML=descriptionHtml(form.elements.description.value);}
  });
  form.addEventListener('change',event=>{
    if(event.target===form.elements.useDate){form.elements.when.value=event.target.checked?'date':'asap';sync();}
    if(event.target===form.elements.waiting)sync();
    if(event.target===person)sync();
  });
  form.addEventListener('input',event=>{if(event.target===form.elements.description&&!$('.description-preview').hidden)$('.description-preview').innerHTML=descriptionHtml(event.target.value);});
  form.addEventListener('error',event=>{if(event.target.tagName==='IMG'){event.target.hidden=true;if(event.target.nextElementSibling)event.target.nextElementSibling.hidden=false;}},true);
  sync();return {updatePeople,setDay(day){today=day;if(form.id==='composer'){if(!form.elements.useDate.checked)form.elements.date.value=day;if(!form.elements.waiting.checked)form.elements.followUp.value=addDays(day,7);}},reset(){form.elements.when.value='asap';form.elements.useDate.checked=false;form.elements.waiting.checked=false;form.elements.description.value='';person.value='private';options.hidden=true;const toggle=$('.options-toggle');if(toggle)toggle.setAttribute('aria-expanded','false');sync();},summary(){return form.elements.waiting.checked?`Follow up ${shortDate(form.elements.followUp.value)}`:'';}};
}
export function fieldValues(form){
  return {description:form.elements.description.value,assigneeUid:['private','shared'].includes(form.elements.person.value)?null:form.elements.person.value,shared:form.elements.person.value==='shared',mode:form.elements.waiting.checked?'later':form.elements.when.value,exact:form.elements.date.value,waiting:form.elements.waiting.checked,followUp:form.elements.followUp.value};
}
