import {config} from '../config.js?v=lists-95c4f';
import {dayKey,addDays,taskDraft,schedule,inView,shortDate,taskDay,taskOrder,insertionOrder,assignedTo,unassigned} from './core.js?v=sharing2';
import {isAdministrator} from './households.js?v=sharing2';
import {adminSection,bindAdmin} from './admin.js?v=playground1';
import {esc,avatar,descriptionHtml,fieldsMarkup,bindFields,fieldValues} from './task-fields.js?v=editor3';
import {labels as effectLabels,presets as animationPresets,restore as restoreAnimations,createMotion} from './motion.js?v=2';
import {taskGestures} from './gestures.js?v=2';
import {createNotices} from './notices.js?v=1';
import {PLAYGROUND_ID,isPlayground} from './playground.js?v=1';

const $=selector=>document.querySelector(selector),icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const icons=()=>window.lucide?.createIcons({attrs:{'stroke-width':1.8}});
const design=Number(document.body.dataset.design||1);
const preferenceKey='lists-preferences-v1',names={todo:'To-do',grocery:'Groceries',movies:'Movies',other:'Other lists'};
const glyphs={todo:'list-checks',grocery:'shopping-basket',movies:'clapperboard',other:'layers'};
let prefs={palette:'original',motion:'playful',quickWeek:true,swipeDefer:true,daysShown:1,lists:{}};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(preferenceKey)||'{}')};}catch{}
Object.assign(prefs,restoreAnimations(prefs));
prefs.daysShown=Math.max(1,Math.min(14,Number.parseInt(prefs.daysShown)||1));
const motion=createMotion(()=>prefs);
let user=null,signedInAccount=null,preview=null,members={},profiles={},tasks=[],store=null,category='todo',view='today',scope='mine',person='all';
let today=dayKey(Date.now(),config.timeZone),picks=[],picking=false,pickedDay='',busy=new Set(),ready=false,pendingCreation=null,spaceEpoch=0;
let households=[],currentSpace={id:config.space},inlineEditor=null,composerFields=null,installManifest=null;
let gestures=null,lastRealSpace='',editorTransition=false;
function listPrefs(){return {scope:'mine',person:'all',editor:'inline',...(prefs.lists?.[category]||{})};}
function persist(){try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch{notify('Settings could not be saved on this device.');}}
function appearance(){document.documentElement.dataset.palette=prefs.palette;document.documentElement.dataset.motion=Object.values(prefs.animations).some(Boolean)?'custom':'off';motion.sync();}
function saveListPrefs(patch){prefs.lists||={};prefs.lists[category]={...listPrefs(),...patch};persist();}
function restoreView(){({scope,person}=listPrefs());}
restoreView();appearance();

$('#app').innerHTML=`<div class="app-frame compact-workspace"><aside id="playground-banner" class="playground-banner" hidden><span><strong>Playground</strong><small>Test data only</small></span><button class="text-button" data-action="leave-playground">Exit Playground</button></aside><aside id="preview-banner" class="preview-banner" hidden><div><strong id="preview-name"></strong><span>Read-only · Personal and shared tasks</span></div><button class="secondary" id="exit-preview">Exit preview</button></aside><section id="gate" hidden></section><main id="workspace" hidden><form id="composer" class="composer"><div class="compose-line"><input id="new-title" name="title" aria-label="New task" placeholder="Add a to-do…" maxlength="200" autocomplete="off" required><button type="submit" class="primary icon-button" aria-label="Add task" title="Add task">${icon('plus')}</button></div>${fieldsMarkup({today,composer:true})}<p class="inline-error" id="compose-error" role="alert"></p></form><nav class="view-tabs" aria-label="Task schedule"><button data-view="today" aria-current="page">Today</button><button data-view="upcoming">Upcoming</button><button data-view="later">Later</button><button data-view="waiting">Waiting</button><button data-view="done" aria-label="Completed tasks" title="Completed tasks">${icon('check-check')}</button></nav><div class="list-heading"><h1 id="view-title" class="sr-only">Today</h1><button class="simple-completed quiet" data-action="completed" hidden>Completed</button></div><div id="task-list" class="task-list"></div><p id="empty-state" class="empty-state" hidden>Nothing here yet.</p><footer class="utilities"><button data-action="views">${icon('sliders-horizontal')}<span>View</span></button><button data-action="settings">${icon('settings-2')}<span>Settings</span></button><button data-action="share">${icon('share-2')}<span>Save / Share</span></button><a href="../../">${icon('layout-grid')}<span>Designs</span></a></footer></main><div id="mode-status" class="mode-status"></div><p class="connection" id="connection" role="status"></p><nav class="bottom-nav" aria-label="Lists">${Object.entries(names).map(([id,name])=>`<button data-category="${id}" ${id==='todo'?'aria-current="page"':''}>${icon(glyphs[id])}<span>${name}</span></button>`).join('')}</nav></div><dialog id="dialog"><div class="modal-header"><h2 id="dialog-title"></h2><button data-close class="icon-button quiet close-button" aria-label="Close">${icon('x')}</button></div><div id="dialog-body"></div></dialog><dialog id="confirmation"><form method="dialog"><h2 id="confirmation-title"></h2><p id="confirmation-text"></p><div class="modal-footer"><button value="cancel" class="secondary">Cancel</button><button id="confirm-action" value="confirm" class="danger">Remove</button></div></form></dialog><div id="toast" role="status" aria-live="polite"></div>`;
composerFields=bindFields($('#composer'),{uid:null,members,profiles,today,onOptionsToggle:()=>changeEditor(async()=>{
  if($('#composer').dataset.saving)return;
  if(!$('#new-options').hidden){cancelNewTask();return;}
  if(await leaveInline())composerFields.setExpanded(true);
})});icons();
$('#composer .cancel-new-task').addEventListener('click',cancelNewTask);
const notices=createNotices({host:$('#toast'),write:(...args)=>store.write(...args),epoch:()=>spaceEpoch,readOnly:()=>!!preview,errorText,motion});
document.addEventListener('error',event=>{const image=event.target;if(image.tagName==='IMG'&&image.closest('.avatar')){image.hidden=true;image.nextElementSibling?.removeAttribute('hidden');}},true);
function notify(message,undo=null){
  notices.show(message,undo);
}
function errorText(error){
  const code=error?.code||'';
  if(code.includes('permission-denied'))return 'Access denied. Publish the latest Firebase rules for sharing, descriptions and task ordering; check household invitations too.';
  if(code.includes('popup-blocked'))return 'Allow the Google sign-in window, then try again.';
  if(code.includes('unauthorized-domain'))return 'Add this domain under Firebase Authentication → Settings → Authorized domains.';
  return error?.message||'Something went wrong. Please try again.';
}
function status(message){$('#connection').textContent=message==='Live'?'Live · Changes sync between devices':message;}
function updatePeople(){
  composerFields.updatePeople(members,profiles,user?.uid);$('#edit-form')?._controller?.updatePeople(members,profiles,user?.uid);
  if(person.startsWith('email:')){const id=Object.keys(profiles).find(id=>!id.startsWith('email:')&&profiles[id].email===person.slice(6));if(id){person=id;saveListPrefs({person});}}
  if($('.view-choice-track'))bindViews();
}
function mine(task){return task.visibility==='private'&&task.ownerUid===user?.uid||task.visibility==='shared'&&(unassigned(task)||assignedTo(task,user?.uid,user?.email));}
function matchesPerson(task,key){return key==='all'||(key==='unassigned'?unassigned(task):assignedTo(task,key,key.startsWith('email:')?key.slice(6):profiles[key]?.email));}
function currentTasks(){
  return tasks.filter(task=>task.category===category&&(task.visibility==='shared'||task.ownerUid===user?.uid))
    .filter(task=>scope==='mine'?mine(task):scope==='shared'?task.visibility==='shared'&&matchesPerson(task,person):true)
    .filter(task=>category==='todo'?view==='today'?!!taskDay(task,today,picks)&&taskDay(task,today,picks)<=addDays(today,prefs.daysShown-1):inView(task,view,today,picks):view==='done'?task.completed:!task.completed)
    .sort(taskOrder);
}
function rowMarkup(task){
  task={...task,assigneeUid:task.assigneeUid||(task.assigneeEmail?'email:'+task.assigneeEmail:null)};
  const suggestion=category==='todo'&&view==='today'&&!task.dueDate&&!task.waiting&&picks.includes(task.id);
  const date=task.waiting?`Follow up ${shortDate(task.followUp)}`:task.dueDate&&task.dueDate!==today?`${task.dueDate<today?'Since':'Due'} ${shortDate(task.dueDate)}`:'';
  const metadata=[suggestion?'A little nudge':null,date].filter(Boolean),hasDetails=!!task.description?.trim();
  return `<div class="task-summary"><button class="task-check ${task.completed?'checked':''}" data-complete="${esc(task.id)}" aria-label="${task.completed?'Reopen':'Complete'} ${esc(task.title)}" ${busy.has(task.id)||preview?'disabled':''}>${icon(task.completed?'check':'circle')}</button><button class="task-content" data-edit="${esc(task.id)}" aria-expanded="${inlineEditor?.id===task.id}"><span class="task-title"><span class="task-name">${esc(task.title)}</span>${hasDetails?'<span class="details-hint" aria-label="Has description" title="Has description"> ···</span>':''}</span>${metadata.length?`<span class="task-meta">${metadata.map(esc).join(' · ')}</span>`:''}</button>${task.visibility==='shared'?avatar(task.assigneeUid,members,profiles):''}${category==='todo'&&!task.completed&&prefs.quickWeek?`<button data-quick="week" data-id="${esc(task.id)}" class="icon-button defer-task" aria-label="Defer ${esc(task.title)}" title="Defer" ${preview?'disabled':''}>${icon('corner-up-right')}</button>`:''}</div>`;
}
function render(){
  if(!user||gestures?.isActive())return;
  const positions=motion.snapshot();
  const todo=category==='todo';$('.view-tabs').hidden=!todo;$('.simple-completed').hidden=todo;$('.simple-completed').textContent=view==='done'?'Open items':'Completed';
  $('#new-title').placeholder=todo?'Add a to-do…':category==='grocery'?'Add a grocery…':category==='movies'?'Add a movie…':'Add an item…';
  $('#new-title').setAttribute('aria-label',todo?'New task':'New item');$('#composer .schedule-line').classList.toggle('no-timing',!todo);
  $('#composer .timing-track').hidden=!todo;$('#composer .exact-date-row').classList.toggle('category-hidden',!todo);$('#composer .waiting-toggle').classList.toggle('category-hidden',!todo);
  const captions={today:'Today',upcoming:'Coming up',later:'Sometime later',waiting:'Waiting for a response',done:'Completed'};$('#view-title').textContent=todo?captions[view]:names[category];
  const list=currentTasks(),host=$('#task-list'),ids=new Set(list.map(t=>t.id)),rows=new Map([...host.querySelectorAll('.task-row')].map(row=>[row.dataset.task,row]));
  let completionExit=false;
  // Preserve an open form node: a live snapshot must not dismiss a phone keyboard or erase a draft.
  for(const row of rows.values())if(!ids.has(row.dataset.task)&&row.dataset.task!==inlineEditor?.id){
    if(!row.classList.contains('completed')&&tasks.some(task=>task.id===row.dataset.task&&task.completed))completionExit=!!motion.depart(row)||completionExit;else row.remove();
  }
  const grouped=todo&&view==='today',days=grouped?Array.from({length:prefs.daysShown},(_,i)=>addDays(today,i)):[''];
  const groups=new Map([...host.children].map(group=>[group.dataset.day,group]));
  for(const day of days){let group=groups.get(day);if(!group){group=document.createElement('section');group.className='day-group';group.dataset.day=day;group.innerHTML='<h2 class="day-heading"></h2><div class="day-tasks"></div>';host.append(group);groups.set(day,group);}group.querySelector('.day-tasks').dataset.day=day;const heading=group.querySelector('.day-heading');heading.hidden=!grouped||prefs.daysShown===1;heading.textContent=(day===today?'Today':day===addDays(today,1)?'Tomorrow':day?new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')):'')+(day?' · '+shortDate(day):'');}
  const cursors=new Map(days.map(day=>[day,groups.get(day).querySelector('.day-tasks').firstElementChild]));
  for(const task of list){
    let row=rows.get(task.id);
    if(!row){row=document.createElement('article');row.dataset.task=task.id;}
    const suggestion=todo&&view==='today'&&!task.dueDate&&!task.waiting&&picks.includes(task.id);
    row.className=`task-row ${task.completed?'completed':''} ${suggestion?'suggestion':''} ${inlineEditor?.id===task.id?'is-editing':''}`;
    const summary=rowMarkup(task),old=row.querySelector('.task-summary');
    if(inlineEditor?.id!==task.id)row.querySelector('.task-edit-form')?.remove();
    if(!old)row.innerHTML=summary;else if(row.dataset.summary!==summary)old.outerHTML=summary;row.dataset.summary=summary;
    const day=grouped?taskDay(task,today,picks):'',parent=groups.get(day).querySelector('.day-tasks'),cursor=cursors.get(day);
    if(row!==cursor)parent.insertBefore(row,cursor?.parentNode===parent?cursor:null);cursors.set(day,row.nextElementSibling);
    if(inlineEditor?.id===task.id&&!row.contains(inlineEditor.form))row.append(inlineEditor.form);
    if(inlineEditor?.id===task.id&&inlineEditor.rev!==task.rev)inlineEditor.form.querySelector('.editor-notice').textContent='Changed on another device. Your draft is safe; reopen before saving.';
  }
  for(const [day,group] of groups)if(!days.includes(day)){const orphan=group.querySelector('.is-editing');if(orphan)groups.get(days[0]).querySelector('.day-tasks').append(orphan);group.remove();}
  for(const day of days){const group=groups.get(day);group.classList.toggle('empty-day',!group.querySelector('.task-row'));group.classList.toggle('has-day-heading',grouped&&prefs.daysShown>1);}
  if(inlineEditor&&!tasks.some(task=>task.id===inlineEditor.id))inlineEditor.form.querySelector('.editor-notice').textContent='This task was removed on another device. Your unsaved draft is shown below.';
  $('#empty-state').hidden=list.length>0||!!inlineEditor;
  document.querySelectorAll('[data-view]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.view===view));
  document.querySelectorAll('[data-category]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.category===category));
  $('#composer').querySelectorAll('input,textarea,button').forEach(control=>{if(preview){control.disabled=true;control.dataset.previewDisabled='true';}else if(control.dataset.previewDisabled){control.disabled=false;delete control.dataset.previewDisabled;}});icons();motion.rearrange(positions,completionExit?60:0);gestures?.sync();
}
async function dailyPick(){
  const token=`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`;if(!ready||!user||picking===token||pickedDay===token)return;
  const uid=user.uid,day=today;picking=token;
  try{const id=await store.pick(day,uid);if(picking===token&&token===`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`){picks=id?[id]:[];pickedDay=token;render();}}catch(error){if(picking===token)status(errorText(error));}finally{if(picking===token)picking=false;}
}
function onTasks(value){tasks=value;render();if(ready)void dailyPick();}
function open(title,body){$('#dialog-title').textContent=title;$('#dialog-body').replaceChildren();if(typeof body==='string')$('#dialog-body').innerHTML=body;else $('#dialog-body').append(body);$('#dialog').classList.remove('settings-modal');icons();if(!$('#dialog').open){$('#dialog').showModal();motion.dialog($('#dialog'));}$('#dialog').scrollTop=0;}
function close(){$('#dialog').close();$('#dialog-body').replaceChildren();}
$('#dialog').addEventListener('close',()=>{if(!$('#dialog').open)$('#dialog-body').replaceChildren();});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
function confirmAction(title,text,label='Remove'){
  const dialog=$('#confirmation');$('#confirmation-title').textContent=title;$('#confirmation-text').textContent=text;$('#confirm-action').textContent=label;dialog.returnValue='cancel';dialog.showModal();motion.dialog(dialog);
  return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));
}
function formFingerprint(form){return JSON.stringify([...new FormData(form)]);}
async function changeEditor(action){
  if(editorTransition)return;editorTransition=true;
  try{await action();}finally{editorTransition=false;}
}
function cancelNewTask(){
  if($('#composer').dataset.saving)return;
  pendingCreation=null;$('#new-title').value='';$('#compose-error').textContent='';composerFields.reset();
}
async function leaveComposer(){
  const form=$('#composer');if(form.dataset.saving)return false;
  if($('#new-options').hidden)return true;
  const dirty=form.elements.title.value||form.elements.description.value||form.elements.when.value!=='asap'||form.elements.person.value!=='private'||form.elements.waiting.checked||form.elements.date.value||form.elements.followUp.value;
  if(dirty&&!await confirmAction('Discard this new task?','The new item has not been added.','Discard'))return false;
  cancelNewTask();return true;
}
async function leaveInline(){
  if(!inlineEditor)return true;
  if(inlineEditor.form.querySelector('[type=submit]').disabled)return false;
  if(formFingerprint(inlineEditor.form)!==inlineEditor.initial&&!await confirmAction('Discard unsaved changes?','Your task has not been changed.','Discard'))return false;
  inlineEditor.form.closest('.task-row')?.classList.remove('is-editing');inlineEditor.form.remove();inlineEditor=null;render();return true;
}
async function mutate(task,patch,region){
  if(preview||busy.has(task.id))return false;const epoch=spaceEpoch;busy.add(task.id);render();
  try{await store.write(task.id,patch,task.rev);return epoch===spaceEpoch;}
  catch(error){if(epoch===spaceEpoch){if(region)region.textContent=errorText(error);else notify(errorText(error));}return false;}
  finally{busy.delete(task.id);render();}
}
function draftFrom(form,task=null){
  const fields=fieldValues(form),raw={title:form.elements.title.value,category:task?.category||category,ownerUid:task?.ownerUid||user.uid,...fields,day:today};
  if(raw.category!=='todo'){raw.mode='later';raw.waiting=false;}
  if(!raw.description&&!task?.description)delete raw.description;
  const draft=taskDraft(raw);
  if(task?.assigneeEmail&&!draft.assigneeEmail)draft.assigneeEmail=null;
  if(raw.waiting){if(!raw.followUp||!/^\d{4}-\d{2}-\d{2}$/.test(raw.followUp))throw new Error('Choose a follow-up date.');draft.waiting=true;draft.followUp=raw.followUp;}
  if(task)draft.completed=task.completed;
  return {raw,draft};
}
async function deferTask(task){
  const patch={dueDate:schedule('defer',today),waiting:false,followUp:null};
  if(await mutate(task,patch)){
    notify('Task deferred · '+shortDate(patch.dueDate),{id:task.id,label:task.title,rev:task.rev+1,patch:{dueDate:task.dueDate,waiting:task.waiting,followUp:task.followUp}});
    motion.pop('travel',$('[data-view=upcoming]'));
    return true;
  }
  return false;
}
async function moveTask(task,ids,day){
  if(preview||busy.has(task.id))return;
  const ordered=ids.map(id=>id===task.id?task:tasks.find(t=>t.id===id)).filter(Boolean),rank=insertionOrder(ordered,task.id),patch={};
  if(day&&day!==taskDay(task,today,picks)){if(task.waiting)patch.followUp=day;else patch.dueDate=day;}
  const changes=rank===null?ordered.map((item,index)=>({id:item.id,rev:item.rev,patch:{sortOrder:index*1024,...(item.id===task.id?patch:{})}})):[{id:task.id,rev:task.rev,patch:{...patch,sortOrder:rank}}];
  const epoch=spaceEpoch;changes.forEach(change=>busy.add(change.id));
  try{
    if(changes.length===1)await store.write(changes[0].id,changes[0].patch,changes[0].rev);else await store.writeMany(changes);
    if(epoch===spaceEpoch)notify(day?'Moved to '+shortDate(day):'Order updated',{id:task.id,label:task.title,rev:task.rev+1,patch:{sortOrder:task.sortOrder??task.createdAt,dueDate:task.dueDate,followUp:task.followUp}});
    return true;
  }catch(error){if(epoch===spaceEpoch)notify(errorText(error));return false;}
  finally{changes.forEach(change=>busy.delete(change.id));render();}
}
function moveOptions(task){
  const row=[...document.querySelectorAll('.task-row')].find(row=>row.dataset.task===task.id),parent=row?.parentElement;if(!parent)return;
  open('Move task',`<p class="task-preview">${esc(task.title)}</p><div class="move-directions"><button class="secondary" data-move-direction="-1">${icon('arrow-up')} Move up</button><button class="secondary" data-move-direction="1">${icon('arrow-down')} Move down</button></div>${task.category==='todo'&&!task.completed?`<label class="field">Move to date<input id="move-date" type="date" value="${taskDay(task,today,picks)||today}"></label><button class="primary" id="move-date-save">Move to date</button>`:''}<div class="modal-footer"><button class="secondary" data-close>Close</button></div>`);
  document.querySelectorAll('[data-move-direction]').forEach(button=>button.onclick=async()=>{
    const ids=[...parent.querySelectorAll('.task-row')].map(row=>row.dataset.task),index=ids.indexOf(task.id),next=index+Number(button.dataset.moveDirection);if(next<0||next>=ids.length){notify('Already at the '+(next<0?'top':'bottom'));return;}[ids[index],ids[next]]=[ids[next],ids[index]];close();await moveTask(task,ids,parent.dataset.day||null);
  });
  $('#move-date-save')?.addEventListener('click',async()=>{const day=$('#move-date').value;if(!day)return;const ids=tasks.filter(item=>item.id!==task.id&&item.category===task.category&&!item.completed&&taskDay(item,today,picks)===(day<today?today:day)).sort(taskOrder).map(item=>item.id);ids.push(task.id);close();await moveTask(task,ids,day);});
}
$('#composer').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;if(preview||form.dataset.saving)return;$('#compose-error').textContent='';
  form.dataset.saving='true';form.querySelectorAll('[type=submit],.cancel-new-task,.options-toggle').forEach(control=>control.disabled=true);
  try{
    const {raw,draft}=draftFrom(form),fingerprint=JSON.stringify(raw);
    if(pendingCreation?.fingerprint!==fingerprint)pendingCreation={fingerprint,id:crypto.randomUUID(),draft};
    const epoch=spaceEpoch,before=formFingerprint(form),createdId=pendingCreation.id;await store.write(createdId,pendingCreation.draft);if(epoch!==spaceEpoch)return;
    pendingCreation=null;if(formFingerprint(form)===before){form.elements.title.value='';composerFields.reset();}
    notify(raw.waiting?'Added to Waiting':draft.dueDate&&draft.dueDate>today?'Added to Upcoming':!draft.dueDate?'Added to Later':'Added');
    motion.arrival(createdId,$(`[data-view=${raw.waiting?'waiting':draft.dueDate&&draft.dueDate>today?'upcoming':!draft.dueDate?'later':'today'}]`));
  }catch(error){$('#compose-error').textContent=errorText(error);}finally{delete form.dataset.saving;form.querySelectorAll('[type=submit],.cancel-new-task,.options-toggle').forEach(control=>control.disabled=!!preview);}
});
async function taskEditor(task,{modal=false,existing=null}={}){
  if(preview){open('Task details',`<p class="task-preview">${esc(task.title)}</p>${task.description?`<div class="rich-description">${descriptionHtml(task.description)}</div>`:'<p class="settings-note">No description.</p>'}<p class="settings-note">${task.waiting?'Follow up '+esc(shortDate(task.followUp)):task.dueDate?'Due '+esc(shortDate(task.dueDate)):'Sometime later'}</p><div class="modal-footer"><button class="secondary" data-close>Close</button></div>`);return;}
  if(!existing&&(!await leaveComposer()||!await leaveInline()))return;
  const form=existing||document.createElement('form');form.id='edit-form';form.className='task-edit-form';
  if(!existing){
    form.innerHTML=`<div class="editor-heading"><span>Task details</span><div class="editor-tools"><button type="button" class="icon-button move-editor" data-move="${esc(task.id)}" aria-label="Move task" title="Move task">${icon('arrow-up-down')}</button><button type="button" class="icon-button popout-editor" aria-label="Open in modal" title="Open in modal">${icon('maximize-2')}</button></div></div>${fieldsMarkup({task,today,allowPrivate:task.ownerUid===user.uid})}<p class="editor-notice settings-note" role="status"></p><p class="inline-error" role="alert"></p><div class="modal-footer"><button class="primary" type="submit">Save</button><button class="secondary cancel-editor" type="button">Cancel</button><button class="quiet danger icon-button" type="button" id="remove-task" title="Remove task" aria-label="Remove task">${icon('trash-2')}</button></div>`;
    const controller=bindFields(form,{uid:user.uid,members,profiles,today}),originalValues=fieldValues(form);
    form._controller=controller;form._initial=formFingerprint(form);
    form.querySelector('.popout-editor').addEventListener('click',()=>{if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}void taskEditor(task,{modal:true,existing:form});});
    form.querySelector('.cancel-editor').addEventListener('click',()=>{if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}else close();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();const button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;const region=form.querySelector('.inline-error');region.textContent='';
      try{
        const {draft}=draftFrom(form,task),next=fieldValues(form);
        if(next.mode===originalValues.mode&&next.exact===originalValues.exact&&next.waiting===originalValues.waiting&&next.followUp===originalValues.followUp){draft.dueDate=task.dueDate;draft.waiting=task.waiting;draft.followUp=task.followUp;}
        if(await mutate(task,draft,region)){if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}else close();notify('Saved');}
      }catch(error){region.textContent=errorText(error);}finally{button.disabled=false;}
    });
    form.querySelector('#remove-task').addEventListener('click',async()=>{if(!await confirmAction('Remove this task?',task.title))return;try{await store.remove(task.id,task.rev);if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}else close();notify('Removed');}catch(error){form.querySelector('.inline-error').textContent=errorText(error);}});
  }
  const inModal=modal||listPrefs().editor==='modal';form.querySelector('.popout-editor').hidden=inModal;
  if(inModal)open('Edit task',form);else{inlineEditor={id:task.id,rev:task.rev,form,controller:form._controller,initial:form._initial};render();motion.enter([form]);form.scrollIntoView({block:'nearest',behavior:motion.enabled('navigation')?'smooth':'instant'});}icons();
}
function viewMarkup(){
  return `<fieldset class="view-options"><legend>Show</legend><div class="choice-track view-choice-track" role="group" aria-label="List view"><span class="choice-indicator" aria-hidden="true"></span>${[['mine','For me'],['shared','Shared'],['all','Both views']].map(([id,label])=>`<button data-scope="${id}" aria-pressed="${scope===id}">${label}</button>`).join('')}</div><p class="view-explanation"></p></fieldset><div class="view-people" ${scope==='shared'?'':'hidden'}><span class="view-label">Assigned to</span><div class="view-person-choices" role="group" aria-label="Filter by person"></div></div>`;
}
function bindViews(){const root=$('.view-choice-track');if(!root)return;root.style.setProperty('--choice',['mine','shared','all'].indexOf(scope));root.querySelectorAll('[data-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scope===scope)));$('.view-people').hidden=scope!=='shared';$('.view-explanation').textContent=scope==='mine'?'Your private tasks, shared tasks assigned to you, and unassigned shared tasks.':scope==='shared'?'Household shared tasks only.':'Your private tasks and all household shared tasks.';$('.view-person-choices').innerHTML=`<button data-person="all" aria-pressed="${person==='all'}">Everyone</button>`+Object.keys(members).concat('unassigned').map(id=>`<button data-person="${esc(id)}" aria-pressed="${person===id}">${avatar(id==='unassigned'?null:id,members,profiles)}<span>${esc(id==='unassigned'?'Unassigned':members[id])}</span></button>`).join('');}
function views(){open('View · '+names[category],viewMarkup()+'<div class="modal-footer"><button class="primary" data-close>Done</button></div>');bindViews();}
function householdPicker(){return `<label class="field">Household<select id="household-select"><option value="" disabled ${households.some(h=>h.id===currentSpace.id)?'':'selected'}>Choose household</option>${households.map(h=>`<option value="${esc(h.id)}" ${h.id===currentSpace.id?'selected':''}>${esc(h.title||h.id)}</option>`).join('')}</select></label>`;}
function resetWorkspace(){notices.clear();inlineEditor?.form.remove();inlineEditor=null;ready=false;picks=[];picking=false;pickedDay='';spaceEpoch++;tasks=[];members={};profiles={};category='todo';view='today';restoreView();pendingCreation=null;$('#new-title').value='';composerFields.reset();$('#task-list').replaceChildren();}
function switchHousehold(id){if(!id||!store?.selectSpace)return;close();const url=new URL(location.href);url.searchParams.set('household',id);history.replaceState(null,'',url);store.selectSpace(id);}
function updateInstallManifest(){
  const url=new URL(location.href);url.searchParams.delete('mode');url.searchParams.set('household',currentSpace.id);const root=new URL('../../',url);
  const manifest={name:'Lists',short_name:'Lists',id:new URL(url.pathname+'?household='+encodeURIComponent(currentSpace.id),url).href,start_url:url.href,scope:new URL('./',url).href,display:'standalone',background_color:'#f1f6f2',theme_color:'#285e47',icons:[192,512].map(size=>({src:new URL('assets/icon-'+size+'.png',root).href,sizes:size+'x'+size,type:'image/png'}))};
  if(installManifest)URL.revokeObjectURL(installManifest);installManifest=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'}));document.querySelector('link[rel=manifest]').href=installManifest;
}
function animationSettings(){
  const levels=['off','light','medium','wild'],names=['Off','Light','Medium','All out'],index=levels.indexOf(prefs.animationLevel);
  return `<details class="settings-group" id="animation-settings"><summary>Animation settings</summary><div class="animation-heading"><label for="animation-level">Animation level</label><strong id="animation-level-name">${index<0?'Custom':names[index]}</strong></div><input id="animation-level" type="range" min="0" max="3" step="1" value="${Math.max(0,index)}" aria-valuetext="${index<0?'Custom':names[index]}"><div class="animation-labels" aria-hidden="true">${names.map(name=>`<span>${name}</span>`).join('')}</div><details class="custom-effects"><summary>Customize effects</summary>${Object.entries(effectLabels).map(([key,label])=>`<label class="toggle-row">${label}<input type="checkbox" role="switch" data-effect="${key}" ${prefs.animations[key]?'checked':''}></label>`).join('')}</details><button class="secondary" id="preview-animations">${icon('party-popper')} Try it out</button><p class="settings-note" id="reduced-motion-note" ${matchMedia('(prefers-reduced-motion: reduce)').matches?'':'hidden'}>Your device's reduced-motion setting takes priority.</p></details>`;
}
function bindAnimations(){
  const slider=$('#animation-level'),name=$('#animation-level-name');
  slider.oninput=()=>{const key=['off','light','medium','wild'][Number(slider.value)];prefs.animationLevel=key;prefs.animations={...animationPresets[key]};name.textContent=['Off','Light','Medium','All out'][Number(slider.value)];slider.setAttribute('aria-valuetext',name.textContent);document.querySelectorAll('[data-effect]').forEach(input=>input.checked=prefs.animations[input.dataset.effect]);persist();appearance();};
  document.querySelectorAll('[data-effect]').forEach(input=>input.onchange=()=>{prefs.animations[input.dataset.effect]=input.checked;prefs.animationLevel='custom';name.textContent='Custom';slider.setAttribute('aria-valuetext','Custom');persist();appearance();});
  $('#preview-animations').onclick=()=>{const button=$('#preview-animations');motion.pop('arrival',button);motion.dialog($('#dialog'));motion.burst(button.getBoundingClientRect());};
}
function settings(){
  open('Settings',`${category==='todo'?`<details class="settings-group" open><summary>Today view</summary><label class="days-setting">Days to show<input id="days-shown" type="number" inputmode="numeric" min="1" max="14" value="${prefs.daysShown}"></label><label class="toggle-row">Swipe right to defer<input id="swipe-defer" type="checkbox" role="switch" ${prefs.swipeDefer?'checked':''}></label></details>`:''}<details class="settings-group" open><summary>Appearance</summary><fieldset><legend>Color scheme</legend><div class="palette-choices">${[['original','Original'],['garden','Garden'],['cherry','Cherry'],['night','Night']].map(([id,label])=>`<button class="palette ${id}" data-palette="${id}" aria-label="${label}" title="${label}" aria-pressed="${prefs.palette===id}"><span></span><small>${label}</small></button>`).join('')}</div></fieldset></details>${animationSettings()}<details class="settings-group" id="list-settings"><summary>${esc(names[category])} settings</summary>${viewMarkup()}<fieldset class="editor-mode"><legend>Open task details</legend><div class="choice-track two-choices" style="--choice:${listPrefs().editor==='modal'?1:0}" role="group" aria-label="Task editor"><span class="choice-indicator" aria-hidden="true"></span><button data-editor-mode="inline" aria-pressed="${listPrefs().editor==='inline'}">Inline</button><button data-editor-mode="modal" aria-pressed="${listPrefs().editor==='modal'}">Modal</button></div></fieldset>${category==='todo'?`<label class="toggle-row">Show defer button<input type="checkbox" role="switch" data-preference="quickWeek" ${prefs.quickWeek?'checked':''}></label>`:''}</details><details class="settings-group"><summary>Account &amp; privacy</summary><p class="account-email">${esc(signedInAccount?.email||user?.email)}</p>${householdPicker()}<p class="settings-note">Personal tasks are hidden from other household members. Tal, the administrator, can view all users' personal and shared tasks. Assigning or sharing makes a task visible to household members.</p><button class="secondary" id="sign-out">Sign out</button></details><details class="settings-group"><summary>Scheduling</summary><p class="settings-note">ASAP stays in Today. Soon chooses one of the next five weekdays, including today on weekdays. Defer chooses one of the next five weekdays after today. Calendar: America/Los_Angeles; weekends are excluded, not public holidays.</p><p class="settings-note">One daily nudge comes from your personal later tasks, shared tasks assigned to you, and unassigned shared tasks. It stays stable across devices and does not become overdue.</p></details>${preview?'':adminSection(signedInAccount||user)}<div class="modal-footer"><button class="primary" data-close>Done</button></div>`);$('#dialog').classList.add('settings-modal');bindViews();
  bindAnimations();
  $('#days-shown')?.addEventListener('change',async event=>{if(!await leaveInline()){event.target.value=prefs.daysShown;return;}prefs.daysShown=Math.max(1,Math.min(14,Number.parseInt(event.target.value)||1));event.target.value=prefs.daysShown;persist();render();});
  $('#swipe-defer')?.addEventListener('change',event=>{prefs.swipeDefer=event.target.checked;persist();});
  document.querySelectorAll('button[data-palette]').forEach(button=>button.onclick=()=>{prefs.palette=button.dataset.palette;persist();appearance();document.querySelectorAll('button[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('[data-preference=quickWeek]')?.addEventListener('change',event=>{prefs.quickWeek=event.target.checked;persist();render();});
  document.querySelectorAll('[data-editor-mode]').forEach(button=>button.onclick=async()=>{if(!await leaveInline())return;saveListPrefs({editor:button.dataset.editorMode});$('.editor-mode .choice-track').style.setProperty('--choice',button.dataset.editorMode==='modal'?1:0);document.querySelectorAll('[data-editor-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('#sign-out').onclick=async()=>{close();await store.logout();};$('#household-select').onchange=event=>switchHousehold(event.target.value);bindAdmin({account:signedInAccount,store,onOpen:switchHousehold,onPreview:profile=>store.viewAs(profile),liveUrl:config.liveUrl,confirmAction});
}
function share(){
  const url=new URL(`staging/${String(design).padStart(2,'0')}/`,config.liveUrl);url.searchParams.set('household',currentSpace.id);const link=url.href;
  open('Save / Share',`<div class="install-heading"><img src="../../assets/icon-192.png" width="52" height="52" alt="Lists app icon"><div><h3>Save Lists to your phone</h3><span>${esc(names[category])}</span></div></div><details class="install-details"><summary>iPhone</summary><p>Open in Safari. Tap Share, then Add to Home Screen. If shown, leave Open as Web App on, then tap Add.</p></details><details class="install-details"><summary>Android</summary><p>Open in Chrome. Tap the menu, then Add to Home screen or Install app, and confirm.</p></details><div class="share-area"><h3>Share Lists</h3><div id="qr"></div><label class="field">Link<input id="share-link" readonly value="${esc(link)}"></label><button class="primary" id="copy-link">${icon('copy')} Copy link</button><p class="settings-note">An invited household Google account and internet connection are required.</p></div>`);
  if(window.QRCode)new window.QRCode($('#qr'),{text:link,width:140,height:140,colorDark:'#172d28',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});
  $('#copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(link);notify('Link copied');}catch{$('#share-link').select();notify('Select and copy the link above.');}};icons();
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-close'))close();
  if(button.id==='exit-preview'){store.exitPreview();const url=new URL(location.href);url.searchParams.set('household',currentSpace.id);history.replaceState(null,'',url);}
  if(button.dataset.view){if(!await leaveInline())return;view=button.dataset.view;render();motion.enter([...$('#task-list').children]);}
  if(button.dataset.scope){if(!await leaveInline())return;scope=button.dataset.scope;person='all';saveListPrefs({scope,person});bindViews();render();}
  if(button.dataset.person){if(!await leaveInline())return;person=button.dataset.person;saveListPrefs({person});bindViews();render();}
  if(button.dataset.category){if(!await leaveInline())return;if(($('#new-title').value||$('#new-description').value)&&!await confirmAction('Discard this new task?','The new item has not been added.','Discard'))return;category=button.dataset.category;view=category==='todo'?'today':'later';restoreView();composerFields.reset();$('#new-title').value='';render();motion.enter([...$('#task-list').children]);}
  if(button.dataset.edit){const task=tasks.find(t=>t.id===button.dataset.edit);if(task)await changeEditor(async()=>{if(inlineEditor?.id===task.id)await leaveInline();else await taskEditor(task);});}
  if(button.dataset.complete){const task=tasks.find(t=>t.id===button.dataset.complete),rect=button.getBoundingClientRect();if(task&&await mutate(task,{completed:!task.completed})){notify(task.completed?'Task reopened':'Task completed',{id:task.id,label:task.title,rev:task.rev+1,patch:{completed:task.completed}});if(!task.completed){motion.burst(rect);motion.travel(rect,category==='todo'?$('[data-view=done]'):$('.simple-completed'));}}}
  if(button.dataset.quick){const task=tasks.find(t=>t.id===button.dataset.id),rect=button.getBoundingClientRect();if(task&&await deferTask(task))motion.travel(rect,$('[data-view=upcoming]'));}
  if(button.dataset.move){const task=tasks.find(t=>t.id===button.dataset.move),form=$('#edit-form');if(task&&await leaveInline()){if(form?.isConnected&&formFingerprint(form)!==form._initial&&!await confirmAction('Discard unsaved changes?','Your task has not been changed.','Discard'))return;moveOptions(task);}}
  if(button.dataset.action==='completed'){if(!await leaveInline())return;view=view==='done'?'later':'done';render();}
  if(button.dataset.action==='views')views();
  if(button.dataset.action==='settings')settings();
  if(button.dataset.action==='share')share();
  if(button.dataset.action==='leave-playground'&&await leaveInline()){
    const target=households.find(h=>h.id===lastRealSpace)?.id||households.find(h=>h.id!==PLAYGROUND_ID)?.id;
    if(target)switchHousehold(target);else open('Your households','<p class="settings-note">Playground is your only available household. You can stay here, or open Settings to sign out.</p><div class="modal-footer"><button class="secondary" data-close>Close</button><button class="primary" data-action="settings">Settings</button></div>');
  }
});
function gate(message,extra=''){$('#workspace').hidden=true;$('#gate').hidden=false;$('#gate').innerHTML=`<img src="../../assets/icon-192.png" width="64" height="64" alt=""><h1>Lists</h1><p>${esc(message)}</p>${extra}`;icons();}
function accessGate(message){gate(message,'<button class="secondary" data-action="settings">Settings</button><p id="access-error" class="inline-error" role="alert"></p>');}
function showWorkspace(){$('#gate').hidden=true;$('#gate').replaceChildren();$('#workspace').hidden=false;updatePeople();render();}
async function start(){
  $('#mode-status').textContent='Private household · Google sign-in';
  if(!config.firebase){gate('Google sign-in is not connected yet.',`<a class="text-link" href="../../FIREBASE_SETUP.md">Firebase setup instructions</a>`);return;}
  gate('Connecting securely…');
  try{
    const {connectFirebase}=await import('./firebase.js?v=editor3');
    store=await connectFirebase(config,{
      tasks:onTasks,status,
      preview(profile){preview=profile;user=profile||signedInAccount;document.documentElement.toggleAttribute('data-preview',!!profile);$('#preview-banner').hidden=!profile;$('#preview-name').textContent=profile?'Viewing as '+profile.name:'';close();},
      account(account){$('#playground-banner').hidden=true;lastRealSpace='';close();$('#confirmation').close();signedInAccount=account;preview=null;user=account;resetWorkspace();households=[];if(account){updatePeople();accessGate('Checking household access…');}else gate('Personal lists stay hidden from other household members. Tal, the administrator, can view all users’ tasks.',`<button class="primary" id="google-login">${icon('log-in')} Continue with Google</button>`);$('#google-login')?.addEventListener('click',async()=>{try{await store.login();}catch(error){notify(errorText(error));}});},
      households(value){households=value;const select=$('#household-select');if(select){select.parentElement.outerHTML=householdPicker();$('#household-select').onchange=event=>switchHousehold(event.target.value);}},
      space(value){currentSpace=value;$('#playground-banner').hidden=!isPlayground(value);if(value.id!==PLAYGROUND_ID&&value.schemaVersion)lastRealSpace=value.id;updateInstallManifest();$('#mode-status').textContent='Private household · '+(value.title||value.id);},
      loading(){resetWorkspace();close();accessGate('Loading household…');},
      unavailable(message){resetWorkspace();if(!$('#dialog').classList.contains('settings-modal'))close();accessGate(message);},
      members(value,details={}){members=value;profiles=details;updatePeople();render();},
      ready(){ready=true;showWorkspace();void dailyPick();},
      error(error){status(errorText(error));const region=$('#access-error');if(region)region.textContent=errorText(error)+(isAdministrator(signedInAccount)?' Open Settings → Admin after publishing the updated rules.':' Ask your household administrator to check your Google email invitation.');else notify(errorText(error));},
    });
  }catch(error){gate('Could not connect to Google sign-in. Check your connection and try again.',`<button class="primary" onclick="location.reload()">Try again</button>`);status(errorText(error));}
}
function checkDay(){const current=dayKey(Date.now(),config.timeZone);if(today!==current){today=current;composerFields.setDay(current);inlineEditor?.controller.setDay?.(current);pickedDay='';picks=[];render();void dailyPick();}}
gestures=taskGestures({canSwipe:()=>ready&&prefs.swipeDefer&&category==='todo'&&!preview,canMove:()=>ready&&!preview,findTask:id=>tasks.find(task=>task.id===id),onDefer:deferTask,onMove:moveTask,onIdle:render,motion,context:()=>spaceEpoch});
let midnightTimer;
function watchDay(){clearTimeout(midnightTimer);checkDay();if(!document.hidden)midnightTimer=setTimeout(watchDay,60000);}
document.addEventListener('visibilitychange',watchDay);window.addEventListener('online',()=>{if(ready)void dailyPick();});watchDay();void start();
