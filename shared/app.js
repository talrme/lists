import {config} from '../config.js?v=lists-95c4f';
import {dayKey,addDays,taskDraft,schedule,inView,shortDate,taskDay,taskOrder,insertionOrder,creationOrder,assignedTo,unassigned,candidateTasks,dateTiming} from './core.js?v=timing3';
import {isAdministrator} from './households.js?v=sharing2';
import {adminSection,bindAdmin} from './admin.js?v=production1';
import {esc,avatar,descriptionHtml,fieldsMarkup,bindFields,fieldValues,editorActions} from './task-fields.js?v=editor6';
import {labels as effectLabels,presets as animationPresets,restore as restoreAnimations,createMotion} from './motion.js?v=4';
import {taskGestures} from './gestures.js?v=7';
import {createNotices} from './notices.js?v=2';
import {guideMarkup} from './guide.js?v=2';
import {setupUpdates} from './updates.js?v=3';
import {drawerSwipe,modalViewport} from './mobile-ui.js?v=2';
import {selectedTask,normalizeSelection} from './visibility.js?v=1';
import {dayWheel,bindDayWheel} from './day-wheel.js?v=1';
import {searchTasks} from './search.js?v=1';
import {dayGroups,groupDay} from './day-groups.js?v=1';
import {PLAYGROUND_ID,isPlayground} from './playground.js?v=1';

const $=selector=>document.querySelector(selector),icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const icons=()=>window.lucide?.createIcons({attrs:{'stroke-width':1.8}});
const appRoot=new URL('../',import.meta.url);
const styles=[[1,'Clear Day'],[7,'Daybook'],[4,'The Edit'],[8,'Metro'],[9,'Block Party']];
const preferenceKey='lists-preferences-v1',names={todo:'To-do',grocery:'Groceries',movies:'Movies',other:'Other lists'};
const glyphs={todo:'list-checks',grocery:'shopping-basket',movies:'clapperboard',other:'layers'};
let prefs={style:1,palette:'original',motion:'playful',quickWeek:null,swipeDefer:true,daysShown:1,extendedDays:5,lists:{}};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(preferenceKey)||'{}')};}catch{}
if(prefs.editorVersion!==2){prefs.editorVersion=2;prefs.lists=Object.fromEntries(Object.entries(prefs.lists||{}).map(([key,value])=>[key,{...value,editor:'modal'}]));try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch{}}
if(prefs.quickActionVersion!==1){if(prefs.quickWeek!==false)prefs.quickWeek=null;prefs.quickActionVersion=1;}
function quickActionsVisible(){return typeof prefs.quickWeek==='boolean'?prefs.quickWeek:matchMedia('(min-width:768px)').matches;}
Object.assign(prefs,restoreAnimations(prefs));
prefs.daysShown=Math.max(1,Math.min(10,Number.parseInt(prefs.daysShown)||1));
const motion=createMotion(()=>prefs);
let user=null,signedInAccount=null,preview=null,members={},profiles={},tasks=[],store=null,category='todo',view='today';
let today=dayKey(Date.now(),config.timeZone),picks=[],picking=false,pickedDay='',pickedPool='',busy=new Set(),ready=false,pendingCreation=null,spaceEpoch=0;
let households=[],currentSpace={id:config.space},inlineEditor=null,composerFields=null,installManifest=null;
let gestures=null,lastRealSpace='',editorTransition=false,skipDropAnimation=false;
const dayControls=document.createElement('div');
function listPrefs(){return {editor:'modal',...(prefs.lists?.[category]||{})};}
function selection(){return normalizeSelection(listPrefs().audiences?.[user?.uid]||{private:true,[user?.uid]:true},profiles);}
function persist(){try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch{notify('Settings could not be saved on this device.');}}
function appearance(){if(!styles.some(([id])=>id===Number(prefs.style)))prefs.style=1;document.body.dataset.design=String(prefs.style);document.documentElement.dataset.palette=prefs.palette;document.documentElement.dataset.motion=Object.values(prefs.animations).some(Boolean)?'custom':'off';motion.sync();}
function saveListPrefs(patch){prefs.lists||={};prefs.lists[category]={...listPrefs(),...patch};persist();}
prefs.extendedDays=Math.max(1,Math.min(10,Number.parseInt(prefs.extendedDays)||5));
appearance();

$('#app').innerHTML=`<div id="sync-progress" class="sync-progress" hidden aria-hidden="true"></div><div class="app-frame compact-workspace"><aside id="playground-banner" class="playground-banner" hidden><span><strong>Playground</strong><small>Test data only</small></span><button class="text-button" data-action="leave-playground">Exit Playground</button></aside><aside id="preview-banner" class="preview-banner" hidden><div><strong id="preview-name"></strong><span>Read-only · Personal and shared tasks</span></div><button class="secondary" id="exit-preview">Exit preview</button></aside><header class="navigation-bar"><button type="button" class="icon-button" id="open-menu" aria-label="Open menu" aria-controls="navigation-drawer" aria-expanded="false">${icon('menu')}</button><button type="button" class="back-asap text-button" id="back-asap" aria-label="Back to my Today tasks" hidden>${icon('arrow-left')}Back to my Today tasks</button></header><section id="gate" hidden></section><main id="workspace" hidden><form id="composer" class="composer"><div class="compose-line"><input id="new-title" name="title" aria-label="New task" placeholder="Add a to-do…" maxlength="200" autocomplete="off" required></div>${fieldsMarkup({today,composer:true})}<p class="inline-error" id="compose-error" role="alert"></p></form><div class="list-heading"><h1 id="view-title" class="sr-only">Today</h1></div><div id="task-list" class="task-list"></div><p id="empty-state" class="empty-state" hidden>Nothing here yet.</p></main><div id="mode-status" class="mode-status" hidden></div><p class="connection" id="connection" role="status"></p><nav class="bottom-nav" aria-label="Lists">${Object.entries(names).map(([id,name])=>`<button data-category="${id}" ${id==='todo'?'aria-current="page"':''}>${icon(glyphs[id])}<span>${name}</span></button>`).join('')}</nav></div><dialog id="dialog"><div class="modal-header"><h2 id="dialog-title"></h2><button data-close class="icon-button quiet close-button" aria-label="Close">${icon('x')}</button></div><div id="dialog-body"></div></dialog><dialog id="confirmation"><form method="dialog"><h2 id="confirmation-title"></h2><p id="confirmation-text"></p><div class="modal-footer"><button value="cancel" class="secondary">Cancel</button><button id="confirm-action" value="confirm" class="danger">Remove</button></div></form></dialog><dialog id="navigation-drawer" class="navigation-drawer" aria-label="Menu"><div class="drawer-heading"><div><strong>Lists</strong></div><button type="button" class="icon-button" id="close-menu" aria-label="Close menu">${icon('x')}</button></div><nav aria-label="Task views"><div id="drawer-task-filters" class="drawer-task-filters" role="group" aria-label="Tasks to show"></div><div class="drawer-group"><button data-menu-days="1">${icon('calendar-check')}Today only</button><button data-menu-days="extended">${icon('calendar-range')}<span id="extended-label">Next 5 days</span></button><button data-menu-view="waiting">${icon('message-circle-more')}Waiting for a response</button><button data-menu-view="done">${icon('check-check')}Completed tasks</button></div><div class="drawer-group"><button data-menu-action="settings">${icon('settings-2')}Settings</button><button data-menu-action="share">${icon('share-2')}Save / Share</button></div></nav><footer class="drawer-account-footer"><div id="drawer-avatar"></div><span id="drawer-account">Not signed in</span><button type="button" data-menu-action="sign-out" id="drawer-sign-out" class="text-button">Sign out</button><p id="drawer-account-error" role="alert"></p></footer></dialog><div id="toast" role="status" aria-live="polite"></div>`;
const leaf=$('#composer .options-toggle');leaf.classList.add('leaf-options');leaf.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true" fill="currentColor" stroke="none"><defs><mask id="leaf-cut"><rect width="64" height="64" fill="white"/><path d="M9 47C21 32 35 23 44 20C40 28 27 41 17 50Z" fill="black"/></mask></defs><path mask="url(#leaf-cut)" d="M17 47C5 24 24 2 52 6Q59 6 58 13C58 43 39 58 19 49L11 59C7 64 0 59 4 53Z"/></svg>';$('.compose-line').append(leaf);
const quickEntry=document.createElement('div');quickEntry.className='quick-entry';$('#composer').before(quickEntry);quickEntry.append($('#composer'));
$('.list-heading').append($('#back-asap'));
const phoneModal=modalViewport($('#dialog'));
composerFields=bindFields($('#composer'),{uid:null,members,profiles,today,onTimingSelect:mode=>changeEditor(async()=>{
  if($('#composer').dataset.saving||!await leaveInline())return;
  composerFields.setTiming(mode);if(!composerHome){if($('#new-title').value.trim())$('#composer').requestSubmit();else{view={asap:'today',week:'upcoming',later:'later'}[mode];render();motion.enter([...$('#task-list').children]);}}
}),onOptionsToggle:()=>changeEditor(async()=>{
  if($('#composer').dataset.saving)return;
  if(!$('#new-options').hidden){if(composerHome)close();else{composerFields.setExpanded(false);if(category==='todo')composerFields.showView(view);}return;}
  if(await leaveInline()){composerFields.setExpanded(true);if(listPrefs().editor==='modal')openComposer();}
})});icons();
$('#composer').addEventListener('click',event=>{if(event.target.closest('.cancel-new-task')){cancelNewTask();if(composerHome)close();}});
let composerHome=null;
function restoreComposer(){
  if(!composerHome)return;const form=$('#composer'),heading=form.querySelector('.task-editor-heading');if(heading){form.querySelector('.compose-line').prepend(form.elements.title);form.elements.title.setAttribute('aria-label',category==='todo'?'New task':'New item');form.elements.title.placeholder=category==='todo'?'Add a to-do…':category==='grocery'?'Add a grocery…':category==='movies'?'Add a movie…':'Add an item…';heading.remove();}composerHome.replaceWith(form);composerHome=null;form.classList.remove('modal-composer');composerFields.setExpanded(false);if(category==='todo')composerFields.showView(view);
}
function openComposer(){
  phoneModal.hideKeyboard();
  const form=$('#composer');composerHome=document.createElement('div');composerHome.hidden=true;form.before(composerHome);if(!form.querySelector('.editor-top-actions'))form.insertAdjacentHTML('afterbegin',editorActions({composer:true,top:true}));taskHeading(form);open('Add task',form,{focusTitle:false});form.classList.add('modal-composer');
}
function taskHeading(form){
 if(form.querySelector('.task-editor-heading'))return;
 const heading=document.createElement('div'),label=document.createElement('label');heading.className='task-editor-heading';label.htmlFor=form.elements.title.id;label.className='task-name-label';label.textContent='Task name';
 form.elements.title.setAttribute('aria-label','Task name');form.elements.title.placeholder='Task name';heading.append(label,form.querySelector('.editor-top-actions'),form.elements.title);form.prepend(heading);
}
dayControls.className='day-controls';dayControls.innerHTML=`<button type="button" data-days="more" aria-expanded="false" aria-controls="task-list">${icon('calendar-range')}<span id="expand-days-label">Show 5 days</span>${icon('chevron-down')}</button><button type="button" data-days="today" aria-expanded="true" aria-controls="task-list" hidden>${icon('calendar-check')}<span>Show today only</span>${icon('chevron-up')}</button>`;$('#empty-state').after(dayControls);
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
let syncState=null;
function syncStatus(state){
  syncState=state;const pending=state.pending?` · ${state.pending} pending`:'';
  $('#sync-progress').hidden=!(state.syncing&&(state.connecting||state.pending>0));document.documentElement.toggleAttribute('data-syncing',state.syncing);
  $('#connection').hidden=!state.error&&!state.offline&&!state.pending;
  $('#connection').textContent=state.error||(state.connecting?`Connecting · Showing saved data${pending}`:state.offline?`Offline · Saved on this device${pending}`:state.syncing?`Syncing${pending}…`:state.pending?`Saved on this device${pending}`:'All synced');
}
function status(message){$('#connection').hidden=message==='Live';if(message==='Live'&&syncState)syncStatus(syncState);else $('#connection').textContent=message==='Live'?'Live · Changes sync between devices':message;}
function updatePeople(){
  composerFields.updatePeople(members,profiles,user?.uid);$('#edit-form')?._controller?.updatePeople(members,profiles,user?.uid);
  if($('.visibility-choices'))bindViews();
}
function currentTasks(){
  const chosen=selection(),lastDay=dayGroups(today,prefs.daysShown).at(-1).end;
  return tasks.filter(task=>task.category===category&&(task.visibility==='shared'||task.ownerUid===user?.uid))
    .filter(task=>selectedTask(task,{uid:user?.uid,email:user?.email,selection:chosen,profiles})||category==='todo'&&view==='today'&&picks.includes(task.id)&&candidateTasks([{...task,dueDate:null}],user?.uid,user?.email,today).length)
    .filter(task=>category==='todo'?view==='today'?!!taskDay(task,today,picks)&&taskDay(task,today,picks)<=lastDay:inView(task,view,today,picks):view==='done'?task.completed:!task.completed)
    .sort(taskOrder);
}
function rowMarkup(task){
  task={...task,assigneeUid:task.assigneeUid||(task.assigneeEmail?'email:'+task.assigneeEmail:null)};
  const suggestion=category==='todo'&&view==='today'&&!task.waiting&&dateTiming(task.dueDate,today)==='later'&&picks.includes(task.id);
  const metadata=[suggestion?'From Later':null,view==='later'&&(task.waiting?task.followUp:task.dueDate)?shortDate(task.waiting?task.followUp:task.dueDate):null].filter(Boolean),hasDetails=!!task.description?.trim();
  return `<div class="task-summary"><button class="task-check ${task.completed?'checked':''}" data-complete="${esc(task.id)}" aria-label="${task.completed?'Reopen':'Complete'} ${esc(task.title)}" ${busy.has(task.id)||preview?'disabled':''}>${icon(task.completed?'check':'circle')}</button><button class="task-content" aria-keyshortcuts="Alt+M" data-edit="${esc(task.id)}" aria-expanded="${inlineEditor?.id===task.id}"><span class="task-title"><span class="task-name">${esc(task.title)}</span>${task.waiting?'<span class="waiting-badge" role="img" aria-label="Waiting for a response" title="Waiting for a response">'+icon('message-circle-more')+'</span>':''}</span>${hasDetails?`<span class="task-excerpt">${esc(task.description.trim().replace(/\s+/g,' '))}</span>`:''}${metadata.length?`<span class="task-meta">${metadata.map(esc).join(' · ')}</span>`:''}</button>${task.visibility==='shared'?avatar(task.assigneeUid,members,profiles):''}${category==='todo'&&!task.completed&&quickActionsVisible()?`<button data-quick="week" data-id="${esc(task.id)}" class="icon-button defer-task" aria-label="${view==='upcoming'||view==='later'?'Move to Today':'Punt to Week'} ${esc(task.title)}" title="${view==='upcoming'||view==='later'?'Move to Today':'Punt to Week'}" ${preview?'disabled':''}>${icon(view==='upcoming'||view==='later'?'list-start':'corner-up-right')}</button>`:''}</div>`;
}
function render(){
  if(!user||gestures?.isActive())return;
  updateNavigation();$('#expand-days-label').textContent='Show '+prefs.extendedDays+(prefs.extendedDays===1?' day':' days');
  const positions=skipDropAnimation?new Map():motion.snapshot();skipDropAnimation=false;
  const todo=category==='todo';dayControls.hidden=!todo||view!=='today';$('[data-days=today]').hidden=prefs.daysShown===1;$('[data-days=more]').hidden=prefs.daysShown>1;
  $('#new-title').placeholder=composerHome?'Task name':todo?'Add a to-do…':category==='grocery'?'Add a grocery…':category==='movies'?'Add a movie…':'Add an item…';
  $('#new-title').setAttribute('aria-label',todo?'New task':'New item');$('#composer .schedule-line').classList.toggle('no-timing',!todo);
  $('#composer .timing-track').hidden=!todo;$('#composer .exact-date-row').classList.toggle('category-hidden',!todo);$('#composer .waiting-toggle').classList.toggle('category-hidden',!todo);
  const captions={today:'Today',upcoming:'Week',later:'Later',waiting:'Waiting for a response',done:'Completed'};$('#view-title').textContent=todo?captions[view]:names[category];$('#view-title').classList.toggle('sr-only',!todo||['today','upcoming','later'].includes(view));
  const list=currentTasks(),host=$('#task-list'),ids=new Set(list.map(t=>t.id)),rows=new Map([...host.querySelectorAll('.task-row')].map(row=>[row.dataset.task,row]));
  let completionExit=false;
  // Preserve an open form node: a live snapshot must not dismiss a phone keyboard or erase a draft.
  for(const row of rows.values())if(!ids.has(row.dataset.task)&&row.dataset.task!==inlineEditor?.id){
    if(!row.classList.contains('completed')&&tasks.some(task=>task.id===row.dataset.task&&task.completed))completionExit=!!motion.depart(row)||completionExit;else row.remove();
  }
  const grouped=todo&&view==='today',buckets=grouped?dayGroups(today,prefs.daysShown):[{start:'',end:'',weekend:false}],days=buckets.map(bucket=>bucket.start);
  const groups=new Map([...host.children].map(group=>[group.dataset.day,group]));
  for(const [index,bucket] of buckets.entries()){const day=bucket.start;let group=groups.get(day);if(!group){group=document.createElement('section');group.className='day-group';group.dataset.day=day;group.innerHTML='<h2 class="day-heading"></h2><div class="day-tasks"></div>';groups.set(day,group);}if(host.children[index]!==group)host.insertBefore(group,host.children[index]||null);group.querySelector('.day-tasks').dataset.day=day;group.dataset.end=bucket.end;group.classList.toggle('weekend-group',bucket.weekend);const heading=group.querySelector('.day-heading');heading.hidden=!grouped||prefs.daysShown===1;heading.textContent=bucket.weekend?'Weekend · '+shortDate(day)+(bucket.end!==day?' – '+shortDate(bucket.end):''):(day===today?'Today':day===addDays(today,1)?'Tomorrow':day?new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')):'')+(day?' · '+shortDate(day):'');}
  const cursors=new Map(days.map(day=>[day,groups.get(day).querySelector('.day-tasks').firstElementChild]));
  for(const task of list){
    let row=rows.get(task.id);
    if(!row){row=document.createElement('article');row.dataset.task=task.id;}
    const suggestion=todo&&view==='today'&&!task.waiting&&dateTiming(task.dueDate,today)==='later'&&picks.includes(task.id);
    row.className=`task-row ${task.completed?'completed':''} ${suggestion?'suggestion':''} ${inlineEditor?.id===task.id?'is-editing':''}`;
    const summary=rowMarkup(task),old=row.querySelector('.task-summary');
    if(inlineEditor?.id!==task.id)row.querySelector('.task-edit-form')?.remove();
    if(!old)row.innerHTML=summary;else if(row.dataset.summary!==summary)old.outerHTML=summary;row.dataset.summary=summary;
    const day=grouped?groupDay(taskDay(task,today,picks),buckets):'',parent=groups.get(day).querySelector('.day-tasks'),cursor=cursors.get(day);
    if(row!==cursor)parent.insertBefore(row,cursor?.parentNode===parent?cursor:null);cursors.set(day,row.nextElementSibling);
    if(inlineEditor?.id===task.id&&!row.contains(inlineEditor.form))row.append(inlineEditor.form);
    if(inlineEditor?.id===task.id&&inlineEditor.rev!==task.rev)inlineEditor.form.querySelector('.editor-notice').textContent='Changed on another device. Your draft is safe; reopen before saving.';
  }
  for(const [day,group] of groups)if(!days.includes(day)){const orphan=group.querySelector('.is-editing');if(orphan)groups.get(days[0]).querySelector('.day-tasks').append(orphan);group.remove();}
  for(const day of days){const group=groups.get(day);group.classList.toggle('empty-day',!group.querySelector('.task-row'));group.classList.toggle('has-day-heading',grouped&&prefs.daysShown>1);}
  if(inlineEditor&&!tasks.some(task=>task.id===inlineEditor.id))inlineEditor.form.querySelector('.editor-notice').textContent='This task was removed on another device. Your unsaved draft is shown below.';
  $('#empty-state').hidden=list.length>0||!!inlineEditor;
  document.querySelectorAll('[data-view]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.view===view));
  if(todo&&$('#new-options').hidden)composerFields.showView(view);
  document.querySelectorAll('[data-category]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.category===category));
  $('#composer').querySelectorAll('input,textarea,button').forEach(control=>{if(preview&&!control.matches('[data-view]')){control.disabled=true;control.dataset.previewDisabled='true';}else if(control.dataset.previewDisabled){control.disabled=false;delete control.dataset.previewDisabled;}});icons();motion.rearrange(positions,completionExit?60:0);gestures?.sync();
}
async function dailyPick(){
  const token=`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`,pool=candidateTasks(tasks,user?.uid,user?.email,today).map(task=>task.id).join(',');if(!ready||!user||picking===token||pickedDay===token&&(picks.length||pickedPool===pool))return;
  const uid=user.uid,day=today;picking=token;pickedPool=pool;
  try{const id=await store.pick(day,uid);if(picking===token&&token===`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`){picks=id?[id]:[];pickedDay=token;render();}}catch(error){if(picking===token){pickedDay=token;status(error?.code?.includes('permission-denied')?'Daily From Later needs the updated Firestore rules published. Other task editing is unaffected.':errorText(error));}}finally{if(picking===token){picking=false;if(!picks.length&&pickedPool!==candidateTasks(tasks,user?.uid,user?.email,today).map(task=>task.id).join(','))void dailyPick();}}
}
function onTasks(value){tasks=value;render();if(ready)void dailyPick();}
function open(title,body,{focusTitle=true}={}){if(composerHome&&body!==$('#composer'))restoreComposer();$('#dialog-title').textContent=title;$('#dialog-body').replaceChildren();if(typeof body==='string')$('#dialog-body').innerHTML=body;else $('#dialog-body').append(body);$('#dialog').classList.remove('settings-modal','search-modal');icons();if(!$('#dialog').open){$('#dialog').showModal();motion.dialog($('#dialog'));}$('#dialog').scrollTop=0;if(typeof body!=='string'&&body.querySelector('.task-editor-heading')){if(focusTitle)body.elements.title.focus({preventScroll:true});else {phoneModal.hideKeyboard();body.querySelector('.editor-top-actions button')?.focus({preventScroll:true});}}}
function close(){$('#days-shown')?.commitSelection?.();restoreComposer();$('#dialog').close();$('#dialog-body').replaceChildren();}
$('#dialog').addEventListener('cancel',event=>{event.preventDefault();if(!phoneModal.dismissKeyboard())close();});
$('#dialog').addEventListener('close',()=>{if(!$('#dialog').open){restoreComposer();$('#dialog-body').replaceChildren();queueMicrotask(resumeToday);}});
for(const dialog of document.querySelectorAll('dialog')){
 let outside=false;const isOutside=event=>{const r=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);};
 dialog.addEventListener('pointerdown',event=>{outside=isOutside(event);});
 dialog.addEventListener('click',event=>{if(dialog.id==='navigation-drawer')return;if(outside&&isOutside(event)){if(dialog.id==='dialog'){if(!phoneModal.dismissKeyboard())close();}else dialog.close();}outside=false;});
}
function confirmAction(title,text,label='Remove'){
  const dialog=$('#confirmation');$('#confirmation-title').textContent=title;$('#confirmation-text').textContent=text;$('#confirm-action').textContent=label;dialog.returnValue='cancel';dialog.showModal();motion.dialog(dialog);
  return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));
}
function formFingerprint(form){return JSON.stringify([...new FormData(form)]);}
let drawerClosing=false;
function updateNavigation(){
 const account=signedInAccount||user;$('#drawer-avatar').innerHTML=account?avatar(account.uid,{[account.uid]:account.displayName||members[account.uid]||'You'},{[account.uid]:account}):'';$('#drawer-sign-out').hidden=!account;$('#extended-label').textContent='Next '+prefs.extendedDays+(prefs.extendedDays===1?' day':' days');
 const nav=$('.navigation-bar');nav.hidden=ready;if(ready)quickEntry.prepend($('#open-menu'));else nav.prepend($('#open-menu'));
 $('#drawer-account').textContent=account?'Signed in as '+(account.displayName||members[account.uid]||account.email||'you'):'Not signed in';
 $('#back-asap').hidden=!ready||category!=='todo'||(!['waiting','done'].includes(view)&&!(view==='today'&&prefs.daysShown>1)&&defaultAudience());
 renderDrawerFilters();
 $('#navigation-drawer').querySelectorAll('[data-menu-view],[data-menu-days]').forEach(button=>button.disabled=!ready);
 $('#navigation-drawer').querySelectorAll('[data-menu-view]').forEach(button=>{button.setAttribute('aria-current',String(button.dataset.menuView===view));button.hidden=category!=='todo'&&button.dataset.menuView!=='done';});
 $('#navigation-drawer').querySelectorAll('[data-menu-days],.drawer-option').forEach(node=>node.hidden=category!=='todo');
}
function openDrawer(){
 if(drawerClosing)return;updateNavigation();const drawer=$('#navigation-drawer');if(drawer.open)return;delete drawer.dataset.closing;drawer.showModal();$('#open-menu').setAttribute('aria-expanded','true');motion.animate('navigation',drawer,[{transform:'translateX(-100%)'},{transform:'translateX(0)'}],{duration:250});
}
async function closeDrawer(from=0){
 if(drawerClosing)return false;const drawer=$('#navigation-drawer');if(!drawer.open)return true;drawerClosing=true;
 try{drawer.dataset.closing='true';const animation=motion.animate('navigation',drawer,[{transform:`translateX(${from}px)`},{transform:'translateX(-100%)'}],{duration:210,fill:'forwards'});await animation?.finished.catch(()=>{});drawer.close();animation?.cancel();$('#open-menu').setAttribute('aria-expanded','false');delete drawer.dataset.closing;}finally{drawerClosing=false;}return true;
}
async function normalToday(){
 if(!await leaveInline())return;view=category==='todo'?'today':'later';prefs.daysShown=1;saveListPrefs({audiences:{...listPrefs().audiences,[user.uid]:{private:true,[user.uid]:true}}});composerFields.setTiming(composerMode());render();bindViews();window.scrollTo({top:0,behavior:motion.enabled('navigation')?'smooth':'instant'});
}
drawerSwipe($('#navigation-drawer'),closeDrawer,motion);
$('#open-menu').addEventListener('click',openDrawer);$('#close-menu').addEventListener('click',()=>void closeDrawer());
$('#navigation-drawer').addEventListener('cancel',event=>{event.preventDefault();void closeDrawer();});
$('#navigation-drawer nav').insertAdjacentHTML('beforeend',`<div class="drawer-group"><button data-menu-action="guide">${icon('circle-help')}Quick guide</button></div>`);
$('#navigation-drawer nav').lastElementChild.before($('#drawer-task-filters'));
$('#navigation-drawer nav').insertAdjacentHTML('afterbegin',`<div class="drawer-group"><button data-menu-action="search">${icon('search')}Search tasks</button></div>`);
icons();
$('#navigation-drawer').addEventListener('click',async event=>{
 const drawer=event.currentTarget,button=event.target.closest('button');if(event.target===drawer){const rect=drawer.getBoundingClientRect();if(event.clientX>rect.right||event.clientX<rect.left||event.clientY<rect.top||event.clientY>rect.bottom)void closeDrawer();return;}
 if(!button||button.hasAttribute('data-menu-audience')||!await closeDrawer())return;
 if(button.dataset.menuDays){if(!await leaveInline())return;view='today';prefs.daysShown=button.dataset.menuDays==='extended'?prefs.extendedDays:1;persist();composerFields.setTiming('asap');render();}
 if(button.dataset.menuView){if(!await leaveInline())return;view=button.dataset.menuView;composerFields.setTiming(composerMode());render();}
 if(button.dataset.menuAction==='search')openSearch();
 if(button.dataset.menuAction==='settings')settings();
 if(button.dataset.menuAction==='guide')open('Quick guide',guideMarkup());
 if(button.dataset.menuAction==='share')share();
 if(button.dataset.menuAction==='sign-out'){try{await store.logout();}catch(error){notify(errorText(error));}}

});
$('#back-asap').addEventListener('click',()=>void normalToday());
async function changeEditor(action){
  if(editorTransition)return;editorTransition=true;
  try{await action();}finally{editorTransition=false;}
}
function cancelNewTask(){
  if($('#composer').dataset.saving)return;
  pendingCreation=null;$('#new-title').value='';$('#compose-error').textContent='';composerFields.reset(composerMode());if(category==='todo')composerFields.showView(view);
}
function composerMode(){return category==='todo'?{today:'asap',upcoming:'week',later:'later'}[view]||'asap':'asap';}
async function leaveComposer(){
  const form=$('#composer');if(form.dataset.saving)return false;
  composerFields.setExpanded(false);return true;
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
  const asap=view==='upcoming'||view==='later',rect=[...document.querySelectorAll('.task-row')].find(row=>row.dataset.task===task.id)?.getBoundingClientRect();
  const date=asap?today:schedule('defer',today),patch=task.waiting?{dueDate:task.dueDate,waiting:true,followUp:date}:{dueDate:date,waiting:false,followUp:null};
  if(await mutate(task,patch)){
    notify(asap?'Moved to Today':'Punted to Week · '+shortDate(date),{id:task.id,label:task.title,rev:task.rev+1,patch:{dueDate:task.dueDate,waiting:task.waiting,followUp:task.followUp}});
    const destination=asap?'today':inView({...task,...patch},'upcoming',today,picks)?'upcoming':'later';
    motion.punt(rect,$('#composer [data-view='+destination+']'),task.title);
    return true;
  }
  return false;
}
async function moveTask(task,ids,day,{exact=false}={}){
  if(preview||busy.has(task.id))return;
  const ordered=ids.map(id=>id===task.id?task:tasks.find(t=>t.id===id)).filter(Boolean),rank=insertionOrder(ordered,task.id),patch={};
  if(day&&day!==(!exact&&category==='todo'&&view==='today'?groupDay(taskDay(task,today,picks),dayGroups(today,prefs.daysShown)):taskDay(task,today,picks))){if(task.waiting)patch.followUp=day;else patch.dueDate=day;}
  const changes=rank===null?ordered.map((item,index)=>({id:item.id,rev:item.rev,patch:{sortOrder:index*1024,...(item.id===task.id?patch:{})}})):[{id:task.id,rev:task.rev,patch:{...patch,sortOrder:rank}}];
  const epoch=spaceEpoch;changes.forEach(change=>busy.add(change.id));
  try{
    if(changes.length===1)await store.write(changes[0].id,changes[0].patch,changes[0].rev);else await store.writeMany(changes);
    if(epoch===spaceEpoch){
      // Keep the acknowledged drop in place even if the listener arrives after the write.
      tasks=tasks.map(item=>{const change=changes.find(change=>change.id===item.id);return change&&item.rev<=change.rev?{...item,...change.patch,rev:change.rev+1}:item;});

    }
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
  $('#move-date-save')?.addEventListener('click',async()=>{const day=$('#move-date').value;if(!day)return;const ids=tasks.filter(item=>item.id!==task.id&&item.category===task.category&&!item.completed&&taskDay(item,today,picks)===(day<today?today:day)).sort(taskOrder).map(item=>item.id);ids.push(task.id);close();await moveTask(task,ids,day,{exact:true});});
}
$('#composer').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;if(preview||form.dataset.saving)return;$('#compose-error').textContent='';
  form.dataset.saving='true';form.querySelectorAll('[type=submit],.cancel-new-task,.options-toggle').forEach(control=>control.disabled=true);
  try{
    const {raw,draft}=draftFrom(form),fingerprint=JSON.stringify(raw);
    if(pendingCreation?.fingerprint!==fingerprint)pendingCreation={fingerprint,id:crypto.randomUUID(),draft:{...draft,sortOrder:creationOrder(tasks,draft.category)}};
    const bucket=dateTiming(draft.waiting?draft.followUp:draft.dueDate,today),destinationView={asap:'today',week:'upcoming',later:'later'}[bucket],origin=form.getBoundingClientRect(),destination=$(`#composer [data-view=${destinationView}]`);
    const epoch=spaceEpoch,before=formFingerprint(form),createdId=pendingCreation.id;motion.travel(origin,destination);await store.write(createdId,pendingCreation.draft);if(epoch!==spaceEpoch)return;
    pendingCreation=null;if(formFingerprint(form)===before){form.elements.title.value='';composerFields.reset(composerMode());if(category==='todo')composerFields.showView(view);if(composerHome)close();}
    notify('Task added');
    motion.arrival(createdId,$(`[data-view=${raw.waiting?'waiting':draft.dueDate&&draft.dueDate>today?'upcoming':!draft.dueDate?'later':'today'}]`)||$('#open-menu'));
  }catch(error){$('#compose-error').textContent=errorText(error);}finally{delete form.dataset.saving;form.querySelectorAll('[type=submit],.cancel-new-task,.options-toggle').forEach(control=>control.disabled=!!preview);}
});
async function taskEditor(task,{modal=false,existing=null}={}){
  if(preview){open('Task details',`<p class="task-preview">${esc(task.title)}</p>${task.description?`<div class="rich-description">${descriptionHtml(task.description)}</div>`:'<p class="settings-note">No description.</p>'}<p class="settings-note">${task.waiting?'Follow up '+esc(shortDate(task.followUp)):task.dueDate?'Due '+esc(shortDate(task.dueDate)):'Sometime later'}</p><div class="modal-footer"><button class="secondary" data-close>Close</button></div>`);return;}
  if(!existing&&(!await leaveComposer()||!await leaveInline()))return;
  const form=existing||document.createElement('form');form.id='edit-form';form.className='task-edit-form';
  if(!existing){
    form.innerHTML=`<div class="editor-heading"><span>Task details</span><div class="editor-tools"><button type="button" class="icon-button popout-editor" aria-label="Open in modal" title="Open in modal">${icon('maximize-2')}</button></div></div>${fieldsMarkup({task,today,allowPrivate:task.ownerUid===user.uid})}<p class="editor-notice settings-note" role="status"></p><p class="inline-error" role="alert"></p>${editorActions()}`;
    const controller=bindFields(form,{uid:user.uid,members,profiles,today}),originalValues=fieldValues(form);
    form._controller=controller;form._initial=formFingerprint(form);
    form.querySelector('.popout-editor').addEventListener('click',()=>{if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}void taskEditor(task,{modal:true,existing:form});});
    form.addEventListener('click',event=>{if(event.target.closest('.cancel-editor')){if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}else close();}});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(form.dataset.saving)return;form.dataset.saving='true';form.querySelectorAll('[type=submit],.cancel-editor,#remove-task').forEach(button=>button.disabled=true);const region=form.querySelector('.inline-error');region.textContent='';
      try{
        const {draft}=draftFrom(form,task),next=fieldValues(form);
        if(next.mode===originalValues.mode&&next.exact===originalValues.exact&&next.waiting===originalValues.waiting&&next.followUp===originalValues.followUp){draft.dueDate=task.dueDate;draft.waiting=task.waiting;draft.followUp=task.followUp;}
        if(await mutate(task,draft,region)){if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}else close();notify('Saved');}
      }catch(error){region.textContent=errorText(error);}finally{delete form.dataset.saving;form.querySelectorAll('[type=submit],.cancel-editor,#remove-task').forEach(button=>button.disabled=false);}
    });
    form.querySelector('#remove-task').addEventListener('click',async()=>{if(!await confirmAction('Remove this task?',task.title))return;try{await store.remove(task.id,task.rev);if(inlineEditor?.form===form){inlineEditor=null;form.remove();render();}else close();notify('Removed');}catch(error){form.querySelector('.inline-error').textContent=errorText(error);}});
  }
  const inModal=modal||listPrefs().editor==='modal';form.querySelector('.popout-editor').hidden=inModal;form.classList.toggle('modal-task-editor',inModal);if(inModal&&!form.querySelector('.editor-top-actions'))form.insertAdjacentHTML('afterbegin',editorActions({top:true}));
  if(inModal){taskHeading(form);open('Edit task',form,{focusTitle:false});}else{inlineEditor={id:task.id,rev:task.rev,form,controller:form._controller,initial:form._initial};render();motion.enter([form]);form.scrollIntoView({block:'nearest',behavior:motion.enabled('navigation')?'smooth':'instant'});}icons();
}
function defaultAudience(){
 const chosen=selection();return !!chosen.private&&!!chosen[user?.uid]&&!Object.entries(chosen).some(([key,on])=>on&&!['private',user?.uid].includes(key));
}
function setAudience(id,on){
 saveListPrefs({audiences:{...listPrefs().audiences,[user.uid]:{...selection(),[id]:on}}});render();bindViews();
}
function renderDrawerFilters(){
 const root=$('#drawer-task-filters');root.hidden=!ready;if(!ready)return;
 const chosen=selection(),people=Object.keys(members).sort((a,b)=>Number(b===user.uid)-Number(a===user.uid));
 const circle=(id,label,content)=>`<button type="button" data-menu-audience="${esc(id)}" aria-label="Show ${esc(label)}" aria-pressed="${!!chosen[id]}" title="${esc(label)}"><span class="filter-circle">${content}</span><small>${esc(label)}</small></button>`;
 root.innerHTML='<span class="drawer-filter-label">View tasks in</span>'+circle('private','Private',icon('list-checks'))+`<div class="drawer-shared-filters"><div>${people.map(id=>circle(id,(members[id]||'Member').split(' ')[0],avatar(id,members,profiles))).join('')}${circle('unassigned','Unassigned',icon('circle-help'))}</div><small>Shared</small></div>`;icons();
}
$('#drawer-task-filters').addEventListener('click',event=>{
 const button=event.target.closest('[data-menu-audience]');if(!button||!ready)return;
 setAudience(button.dataset.menuAudience,button.getAttribute('aria-pressed')!=='true');
});
function viewMarkup(){return '<details class="settings-group" id="task-visibility"><summary>Tasks to show</summary><div class="visibility-choices"></div></details>';}
function bindViews(){
 const root=$('.visibility-choices');if(!root)return;if(!user){root.innerHTML='<p class="settings-note">Sign in to choose which tasks appear.</p>';return;}const chosen=selection(),label=id=>(members[id]||profiles[id]?.displayName||id.replace(/^email:/,'').split('@')[0]).split(' ')[0];
 const choices=[['private','My private tasks'],...Object.keys(members).sort((a,b)=>Number(b===user?.uid)-Number(a===user?.uid)).map(id=>[id,label(id)+"'s shared tasks"]),['unassigned','Unassigned shared tasks']];
 root.innerHTML=choices.map(([id,name])=>`<label class="visibility-option"><input type="checkbox" data-audience="${esc(id)}" ${chosen[id]?'checked':''}><span>${esc(name)}</span></label>`).join('');
 root.querySelectorAll('[data-audience]').forEach(input=>input.onchange=()=>{setAudience(input.dataset.audience,input.checked);});
}
function householdPicker(){return `<label class="field">Household<select id="household-select"><option value="" disabled ${households.some(h=>h.id===currentSpace.id)?'':'selected'}>Choose household</option>${households.map(h=>`<option value="${esc(h.id)}" ${h.id===currentSpace.id?'selected':''}>${esc(h.title||h.id)}</option>`).join('')}</select></label>`;}
function bindDaysSetting(){
 if($('#days-shown'))bindDayWheel($('#days-shown'),prefs.extendedDays,value=>{prefs.extendedDays=value;if(prefs.daysShown>1)prefs.daysShown=value;persist();render();});
}
function resetWorkspace(){notices.clear();inlineEditor?.form.remove();inlineEditor=null;ready=false;picks=[];picking=false;pickedDay='';spaceEpoch++;tasks=[];members={};profiles={};category='todo';view='today';pendingCreation=null;$('#new-title').value='';composerFields.reset();$('#task-list').replaceChildren();updateNavigation();}
function switchHousehold(id){if(!id||!store?.selectSpace)return;close();const url=new URL(location.href);url.searchParams.set('household',id);history.replaceState(null,'',url);store.selectSpace(id);}
function updateInstallManifest(){
  const url=new URL(location.href);url.searchParams.delete('mode');url.searchParams.set('household',currentSpace.id);const root=appRoot;
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
function openSearch(){
 open('Search tasks','<label class="field search-field"><span class="sr-only">Search tasks</span><input id="task-search" type="search" placeholder="Search tasks" autocomplete="off" maxlength="200" aria-label="Search tasks"></label><div id="search-results" class="search-results" aria-live="polite"><p class="settings-note">Search names and descriptions across your lists.</p></div>');
 $('#dialog').classList.add('search-modal');const input=$('#task-search'),results=$('#search-results');input.focus({preventScroll:true});
 input.oninput=()=>{
  const readable=tasks.filter(task=>task.visibility==='shared'||task.ownerUid===user?.uid),matches=searchTasks(readable,input.value);
  results.innerHTML=matches.length?matches.slice(0,100).map(task=>`<button type="button" data-search-edit="${esc(task.id)}"><strong>${esc(task.title)}</strong><small>${esc(names[task.category])} · ${task.completed?'Completed':task.waiting?'Waiting for a response':({asap:'Today',week:'Week',later:'Later'})[dateTiming(task.dueDate,today)]}</small></button>`).join(''):'<p class="settings-note">No matching tasks.</p>';
 };
 results.onclick=event=>{const button=event.target.closest('[data-search-edit]'),task=tasks.find(task=>task.id===button?.dataset.searchEdit);if(task)void taskEditor(task,{modal:true});};
}
function settings(){
  open('Settings',`<details class="settings-group" open><summary>Appearance</summary><fieldset><legend>Style</legend><div class="style-choices">${styles.map(([id,name])=>`<button type="button" data-style="${id}" aria-pressed="${Number(prefs.style)===id}"><span class="style-sample style-${id}" aria-hidden="true"></span>${name}</button>`).join('')}</div></fieldset><fieldset><legend>Color schemes</legend><div class="palette-choices">${[['original','Original'],['garden','Garden'],['cherry','Cherry'],['night','Night']].map(([id,label])=>`<button class="palette ${id}" data-palette="${id}" aria-label="${label}" title="${label}" aria-pressed="${prefs.palette===id}"><span></span><small>${label}</small></button>`).join('')}</div></fieldset></details>${animationSettings()}${viewMarkup()}<details class="settings-group" id="list-settings"><summary>${esc(names[category])} settings</summary>${category==='todo'?`<div class="days-setting"><label>Extended view: number of days</label>${dayWheel(prefs.extendedDays)}</div>`:''}<fieldset class="editor-mode"><legend>Open task details</legend><div class="choice-track two-choices" style="--choice:${listPrefs().editor==='modal'?1:0}" role="group" aria-label="Task editor"><span class="choice-indicator" aria-hidden="true"></span><button data-editor-mode="inline" aria-pressed="${listPrefs().editor==='inline'}">Inline</button><button data-editor-mode="modal" aria-pressed="${listPrefs().editor==='modal'}">Modal</button></div></fieldset>${category==='todo'?`<label class="toggle-row">Swipe for quick actions<input id="swipe-defer" type="checkbox" role="switch" ${prefs.swipeDefer?'checked':''}></label><label class="toggle-row">Show Quick Action button<input type="checkbox" role="switch" data-preference="quickWeek" ${quickActionsVisible()?'checked':''}></label>`:''}</details>${!preview?'<details class="settings-group"><summary>Offline &amp; sync</summary><p class="settings-note">Lists are saved on this device for offline use. Pending edits upload when you reconnect with the app open. Signing out clears saved lists and requires pending changes to finish first.</p><div class="offline-actions"><button class="secondary" id="review-pending">Pending changes</button><button class="secondary" id="retry-sync">Retry sync</button></div></details>':''}<details class="settings-group"><summary>Account &amp; privacy</summary><p class="account-email">${esc(signedInAccount?.email||user?.email)}</p>${householdPicker()}<p class="settings-note">Personal tasks are hidden from other household members. Tal, the administrator, can view all users' personal and shared tasks. Assigning or sharing makes a task visible to household members.</p><button class="secondary" id="sign-out">Sign out</button><p class="inline-error" id="sign-out-error" role="alert"></p></details><details class="settings-group"><summary>Scheduling</summary><p class="settings-note">Today shows today’s tasks. Week shows future dates within the next five business days; later dates and undated tasks appear in Later. Waiting is a flag across these lists, using its follow-up date. Adding with Week still chooses one of the next five weekdays, including today on weekdays. Punt chooses one of the next five business days, excluding today. Calendar: America/Los_Angeles; weekends are excluded, not public holidays.</p><p class="settings-note">One daily task marked From Later comes from your personal later tasks, shared tasks assigned to you, and unassigned shared tasks. It stays stable across devices and does not become overdue.</p></details>${preview?'':adminSection(signedInAccount||user)}<div class="modal-footer"><button class="primary" data-close>Done</button></div>`);$('#dialog').classList.add('settings-modal');const listSettings=$('#list-settings');listSettings.open=true;$('#dialog-body').firstElementChild.after(listSettings);addSettingHelp();bindViews();
  document.querySelectorAll('[data-style]').forEach(button=>button.onclick=()=>{prefs.style=Number(button.dataset.style);persist();appearance();document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  bindDaysSetting();
  bindAnimations();
  $('#review-pending')?.addEventListener('click',()=>void reviewPending());
  $('#retry-sync')?.addEventListener('click',async()=>{try{await store.retrySync?.();}catch(error){notify(errorText(error));}});
  $('#swipe-defer')?.addEventListener('change',event=>{prefs.swipeDefer=event.target.checked;persist();});
  document.querySelectorAll('button[data-palette]').forEach(button=>button.onclick=()=>{prefs.palette=button.dataset.palette;persist();appearance();document.querySelectorAll('button[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('[data-preference=quickWeek]')?.addEventListener('change',event=>{prefs.quickWeek=event.target.checked;persist();render();});
  document.querySelectorAll('[data-editor-mode]').forEach(button=>button.onclick=async()=>{if(!await leaveInline())return;saveListPrefs({editor:button.dataset.editorMode});$('.editor-mode .choice-track').style.setProperty('--choice',button.dataset.editorMode==='modal'?1:0);document.querySelectorAll('[data-editor-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('#sign-out').onclick=async()=>{try{await store.logout();close();}catch(error){const region=$('#sign-out-error');if(region)region.textContent=errorText(error);}};$('#household-select').onchange=event=>switchHousehold(event.target.value);bindAdmin({account:signedInAccount,store,onOpen:switchHousehold,onPreview:profile=>store.viewAs(profile),liveUrl:config.liveUrl,confirmAction});
}
function addSettingHelp(){
 const help={
  'Style':'Changes the layout and typography on this device.',
  'Color schemes':'Changes colors, including the Night palette, on this device.',
  'Extended view: number of days':'Sets how many calendar days Show days opens in Today. Weekends are grouped together.',
  'Open task details':'Choose a pop-up modal or expand details within the task list.',
  'Swipe for quick actions':'Swipe right in Today to punt to one of the next five business days, excluding today. Swipe right in Later or left in Week to move it to Today. Undo is available.',
  'Show Quick Action button':'Shows an action icon on each task: punt from Today, or move to Today from Week/Later. Hidden by default on phones and shown on larger screens; your choice overrides that default.',
  'Tasks to show':'Choose private tasks and which shared owners appear. The daily From Later pick can also appear.',
  'Animation settings':'Choose a preset or customize individual effects. Reduced-motion device settings are respected.',
  'Offline & sync':'After an online visit, lists are saved on this device. Pending changes upload when you reconnect.',
  'Account & privacy':'Manage sign-in and household. Private tasks stay private except for the authorized administrator.',
  'Scheduling':'How Today, Week, Later and the daily pick are scheduled.',
  'Animation level':'Off, Light, Medium and All out are presets. Changing an individual effect switches the preset to Custom.',
  'Customize effects':'Turn individual animations on or off on this device.',
  ...Object.fromEntries(Object.entries(effectLabels).map(([key,label])=>[label,({confetti:'Colorful confetti after completing a task.',travel:'A task flies toward the list it was added or moved to.',arrival:'A small bounce when a task is added.',reorder:'Tasks glide into place after completion or reordering.',navigation:'Tasks animate into view when switching lists.',dialogs:'Adds a short entrance animation to dialogs.',taps:'Buttons pop slightly when tapped.',ambient:'Small playful icon wiggles when the app is idle.'})[key]]))
 };
 for(const [text,message] of Object.entries(help)){
  const target=[...$('#dialog-body').querySelectorAll('legend,summary,label')].find(node=>node.textContent.trim()===text||node.matches('label')&&node.firstChild?.textContent.trim()===text);
  if(!target)continue;const button=document.createElement('button');button.type='button';button.className='setting-info';button.setAttribute('aria-label','About '+text);button.title='About '+text;button.innerHTML=icon('circle-help');
  const note=document.createElement('p');note.className='settings-note setting-help';note.hidden=true;note.id='setting-help-'+crypto.randomUUID();note.textContent=message;button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',note.id);
  button.onclick=event=>{event.preventDefault();event.stopPropagation();note.hidden=!note.hidden;button.setAttribute('aria-expanded',String(!note.hidden));};
  if(target.matches('label')){target.insertAdjacentElement('afterend',note);target.append(button);}else{target.append(button);target.insertAdjacentElement('afterend',note);}
 }icons();
}
async function reviewPending(){
  try{
    const changes=await store.pendingChanges?.()||[];
    open('Pending changes',changes.length?`<div class="pending-changes">${changes.map(change=>`<div><span><strong>${esc(change.title)}</strong><small>${esc(change.household)}${change.count>1?' · '+change.count+' tasks':''}</small></span><button class="icon-button danger" data-discard-pending="${esc(change.id)}" aria-label="Discard pending change" title="Discard pending change">${icon('trash-2')}</button></div>`).join('')}</div>`:'<p class="settings-note">No pending changes on this device.</p>');
    document.querySelectorAll('[data-discard-pending]').forEach(button=>button.onclick=async()=>{if(!await confirmAction('Discard this pending change?','Only this unsent change on this device will be removed. Saved server tasks will not be deleted.','Discard'))return;try{await store.discardPending(button.dataset.discardPending);await reviewPending();}catch(error){notify(errorText(error));}});
  }catch(error){notify(errorText(error));}
}
function share(){
  const url=new URL(config.liveUrl);url.searchParams.set('household',currentSpace.id);const link=url.href;
  open('Save / Share',`<div class="install-heading"><img src="assets/icon-192.png" width="52" height="52" alt="Lists app icon"><div><h3>Save Lists to your phone</h3><span>${esc(names[category])}</span></div></div><details class="install-details"><summary>iPhone</summary><p>Open in Safari. Tap Share, then Add to Home Screen. If shown, leave Open as Web App on, then tap Add.</p></details><details class="install-details"><summary>Android</summary><p>Open in Chrome. Tap the menu, then Add to Home screen or Install app, and confirm.</p></details><div class="share-area"><h3>Share Lists</h3><div id="qr"></div><label class="field">Link<input id="share-link" readonly value="${esc(link)}"></label><button class="primary" id="copy-link">${icon('copy')} Copy link</button><p class="settings-note">An invited household Google account and internet connection are required.</p></div>`);
  if(window.QRCode)new window.QRCode($('#qr'),{text:link,width:140,height:140,colorDark:'#172d28',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});
  $('#copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(link);notify('Link copied');}catch{$('#share-link').select();notify('Select and copy the link above.');}};icons();
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-close'))close();
  if(button.id==='exit-preview'){store.exitPreview();const url=new URL(location.href);url.searchParams.set('household',currentSpace.id);history.replaceState(null,'',url);}
  if(button.dataset.days){prefs.daysShown=button.dataset.days==='today'?1:prefs.extendedDays;persist();render();}
  if(button.dataset.view&&!button.closest('#composer')){if(!await leaveInline())return;view=button.dataset.view;composerFields.setTiming(composerMode());if(button.closest('#dialog'))close();render();motion.enter([...$('#task-list').children]);}
  if(button.dataset.category){if(!await leaveInline())return;if(($('#new-title').value||$('#new-description').value)&&!await confirmAction('Discard this new task?','The new item has not been added.','Discard'))return;category=button.dataset.category;view=category==='todo'?'today':'later';composerFields.reset();$('#new-title').value='';render();motion.enter([...$('#task-list').children]);}
  if(button.dataset.edit){const task=tasks.find(t=>t.id===button.dataset.edit);if(task)await changeEditor(async()=>{if(inlineEditor?.id===task.id)await leaveInline();else await taskEditor(task);});}
  if(button.dataset.complete){const task=tasks.find(t=>t.id===button.dataset.complete),rect=button.getBoundingClientRect();if(task&&await mutate(task,{completed:!task.completed})){notify(task.completed?'Task reopened':'Task completed',{id:task.id,label:task.title,rev:task.rev+1,patch:{completed:task.completed}});if(!task.completed){motion.burst(rect);motion.travel(rect,$('#open-menu'));}}}
  if(button.dataset.quick){const task=tasks.find(t=>t.id===button.dataset.id);if(task)await deferTask(task);}
  if(button.dataset.move){const task=tasks.find(t=>t.id===button.dataset.move),form=$('#edit-form');if(task&&await leaveInline()){if(form?.isConnected&&formFingerprint(form)!==form._initial&&!await confirmAction('Discard unsaved changes?','Your task has not been changed.','Discard'))return;moveOptions(task);}}
  if(button.dataset.action==='settings')settings();
  if(button.dataset.action==='share')share();
  if(button.dataset.action==='leave-playground'&&await leaveInline()){
    const target=households.find(h=>h.id===lastRealSpace)?.id||households.find(h=>h.id!==PLAYGROUND_ID)?.id;
    if(target)switchHousehold(target);else open('Your households','<p class="settings-note">Playground is your only available household. You can stay here, or open Settings to sign out.</p><div class="modal-footer"><button class="secondary" data-close>Close</button><button class="primary" data-action="settings">Settings</button></div>');
  }
});
function gate(message,extra=''){$('#workspace').hidden=true;$('#gate').hidden=false;$('#gate').innerHTML=`<img src="assets/icon-192.png" width="64" height="64" alt=""><h1>Lists</h1><p>${esc(message)}</p>${extra}`;icons();}
$('#task-list').addEventListener('keydown',event=>{if(event.altKey&&event.key.toLowerCase()==='m'&&!preview){const row=event.target.closest('.task-row'),task=tasks.find(task=>task.id===row?.dataset.task);if(task){event.preventDefault();moveOptions(task);}}});
function accessGate(message){gate(message,'<button class="secondary" data-action="settings">Settings</button><p id="access-error" class="inline-error" role="alert"></p>');}
function showWorkspace(){$('#gate').hidden=true;$('#gate').replaceChildren();$('#workspace').hidden=false;updatePeople();render();}
async function start(){
  $('#mode-status').textContent='Private household · Google sign-in';
  if(!config.firebase){gate('Google sign-in is not connected yet.',`<a class="text-link" href="FIREBASE_SETUP.md">Firebase setup instructions</a>`);return;}
  gate('Connecting securely…');
  try{
    const {connectFirebase}=await import('./firebase.js?v=offline2');
    store=await connectFirebase(config,{
      tasks:onTasks,status,sync:syncStatus,refreshDaily(){pickedDay='';if(ready)void dailyPick();},
      preview(profile){preview=profile;user=profile||signedInAccount;document.documentElement.toggleAttribute('data-preview',!!profile);$('#preview-banner').hidden=!profile;$('#preview-name').textContent=profile?'Viewing as '+profile.name:'';close();},
      account(account){$('#playground-banner').hidden=true;lastRealSpace='';close();$('#confirmation').close();signedInAccount=account;preview=null;user=account;updateNavigation();resetWorkspace();households=[];if(account){updatePeople();accessGate('Checking household access…');}else gate('Personal lists stay hidden from other household members. Tal, the administrator, can view all users’ tasks.',`<button class="primary" id="google-login">${icon('log-in')} Continue with Google</button>`);$('#google-login')?.addEventListener('click',async()=>{try{await store.login();}catch(error){notify(errorText(error));}});},
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
function checkDay(){const current=dayKey(Date.now(),config.timeZone);if(today!==current){today=current;composerFields.setDay(current);$('#edit-form')?._controller?.setDay(current);pickedDay='';picks=[];render();void dailyPick();}}
gestures=taskGestures({canSwipe:()=>ready&&prefs.swipeDefer&&category==='todo'&&!preview,canMove:()=>ready&&!preview,findTask:id=>tasks.find(task=>task.id===id),onDefer:deferTask,onMove:moveTask,onIdle:()=>{skipDropAnimation=true;render();},motion,context:()=>spaceEpoch,swipeLabel:()=>view==='upcoming'||view==='later'?'Move to Today':'Punt to Week',swipeDirection:()=>view==='upcoming'?'left':'right'});
let returnToToday=false;
function resumeToday(){
 if(!returnToToday||document.hidden||!ready||document.querySelector('dialog[open]')||inlineEditor||editorTransition||gestures?.isActive()||busy.size||$('#composer').dataset.saving||$('#new-title').value.trim()||$('#new-description').value.trim())return;
 returnToToday=false;category='todo';view='today';composerFields.reset('asap');render();window.scrollTo({top:0,behavior:'instant'});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)returnToToday=true;else resumeToday();});window.addEventListener('pageshow',()=>resumeToday());
let midnightTimer;
function watchDay(){clearTimeout(midnightTimer);checkDay();if(!document.hidden)midnightTimer=setTimeout(watchDay,60000);}
document.addEventListener('visibilitychange',watchDay);window.addEventListener('online',()=>{if(ready)void dailyPick();});matchMedia('(min-width:768px)').addEventListener('change',()=>{if(prefs.quickWeek===null){render();const input=$('[data-preference=quickWeek]');if(input)input.checked=quickActionsVisible();}});watchDay();void start();
void setupUpdates({canReload:async()=>{
 const reason=()=>!navigator.onLine?'Reconnect before updating.':
  busy.size||picking||editorTransition||gestures?.isActive()||document.querySelector('[data-saving]')?'Finishing your current action before updating.':
  document.querySelector('.toast-undo')?'Keeping Undo available for a few seconds. The update will follow automatically.':
  $('#new-title').value.trim()||$('#new-description').value.trim()||!$('#new-options').hidden||inlineEditor||document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,select,[contenteditable=true]')?'Finish or cancel your draft and close any open dialog first.':
  preview?'Exit preview before updating.':
  syncState?.pending||syncState?.syncing||syncState?.error||signedInAccount&&!ready?'Wait for your changes to sync before updating.':'';
 const blocked=reason();if(blocked)return blocked;
 const pending=await store?.pendingChanges?.();
 return reason()||(pending?.length?'Wait for your changes to sync before updating.':'');
}});
