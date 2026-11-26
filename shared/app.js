import {config} from '../config.js?v=lists-95c4f';
import {dayKey,addDays,taskDraft,schedule,inView,shortDate,taskDay,taskOrder,insertionOrder,creationOrder,assignedTo,unassigned,candidateTasks,dateTiming} from './core.js?v=organizer1';
import {createGroceries} from './groceries.js?v=1';
import {openAsanaReview} from './asana-review.js?v=1';
import {openAsanaImport} from './asana-import.js?v=1';
import {isAdministrator} from './households.js?v=sharing2';
import {adminSection,bindAdmin} from './admin.js?v=import1';
import {esc,avatar,descriptionHtml,fieldsMarkup,bindFields,fieldValues,editorActions,waitingIcon} from './task-fields.js?v=waiting3';
import {labels as effectLabels,presets as animationPresets,restore as restoreAnimations,createMotion} from './motion.js?v=7';
import {taskGestures} from './gestures.js?v=9';
import {completionPress as bindCompletionPress} from './completion-press.js?v=1';
import {createNotices} from './notices.js?v=3';
import {guideMarkup} from './guide.js?v=14';
import {setupUpdates} from './updates.js?v=6';
import {drawerSwipe,modalViewport} from './mobile-ui.js?v=2';
import {selectedTask,normalizeSelection} from './visibility.js?v=1';
import {dayWheel,bindDayWheel} from './day-wheel.js?v=1';
import {searchTasks} from './search.js?v=1';
import {dayGroups,desktopDayGroups,groupDay} from './day-groups.js?v=2';
import {desktopSearch} from './desktop-search.js?v=1';
import {waitingOrder,waitingDrop} from './waiting-board.js?v=1';
import {normalizeColumnOrder,visibleColumnOrder} from './column-order.js?v=1';
import {accountDefaults,taskTags,matchingTags,tagName,tagKey,canonicalTag,bucket} from './organizer.js?v=2';
import {bindTagField} from './tag-field.js?v=2';
import {PLAYGROUND_ID,isPlayground} from './playground.js?v=1';

const $=selector=>document.querySelector(selector),icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const icons=()=>window.lucide?.createIcons({attrs:{'stroke-width':1.8}});
const appRoot=new URL('../',import.meta.url);
const styles=[[1,'Clear Day'],[7,'Daybook'],[4,'The Edit'],[8,'Metro'],[9,'Block Party']];
const preferenceKey='lists-preferences-v1',names={todo:'To-do',grocery:'Groceries',movies:'Movies',other:'Other lists'};
const glyphs={todo:'list-checks',grocery:'shopping-basket',movies:'clapperboard',other:'layers'};
let prefs={style:1,palette:'original',motion:'playful',quickWeek:null,completionSide:'auto',swipeDefer:true,daysShown:1,extendedDays:5,lists:{}};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(preferenceKey)||'{}')};}catch{}
if(prefs.editorVersion!==2){prefs.editorVersion=2;prefs.lists=Object.fromEntries(Object.entries(prefs.lists||{}).map(([key,value])=>[key,{...value,editor:'modal'}]));try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch{}}
if(prefs.quickActionVersion!==1){if(prefs.quickWeek!==false)prefs.quickWeek=null;prefs.quickActionVersion=1;}
const phoneMedia=matchMedia('(max-width:767px)');
function completionSide(){return ['left','right'].includes(prefs.completionSide)?prefs.completionSide:phoneMedia.matches?'right':'left';}
function completionSetting(){return ['left','right'].includes(prefs.completionSide)?prefs.completionSide:'auto';}
function quickActionsVisible(){return typeof prefs.quickWeek==='boolean'?prefs.quickWeek:matchMedia('(min-width:768px)').matches;}
Object.assign(prefs,restoreAnimations(prefs));
prefs.daysShown=Math.max(1,Math.min(10,Number.parseInt(prefs.daysShown)||1));
const motion=createMotion(()=>prefs);
let user=null,signedInAccount=null,preview=null,members={},profiles={},tasks=[],store=null,category='todo',view='today';
let today=dayKey(Date.now(),config.timeZone),picks=[],dailyState=null,picking=false,pickedDay='',pickedPool='',busy=new Set(),ready=false,pendingCreation=null,spaceEpoch=0,renderedLayout='';
let households=[],currentSpace={id:config.space},inlineEditor=null,composerFields=null,installManifest=null;
let grocery=null;
let completionPress=null,gestures=null,lastRealSpace='',editorTransition=false,skipDropAnimation=false;
let revealedTask=null,highlightedTask=null,highlightTimer=null;
let tags=[],accountSettings={...accountDefaults},metadataPending=false;
const boardMedia=matchMedia('(min-width:1100px)');
function boardVisible(){return category==='todo'&&boardMedia.matches&&prefs.desktopBoard!==false&&['today','upcoming','later','someday'].includes(view);}
function mergedBoard(){return boardVisible()&&prefs.daysShown>1;}
function visibleDays(){return mergedBoard()?desktopDayGroups(today,prefs.daysShown):dayGroups(today,prefs.daysShown);}
function desktopExtendedCount(){return Math.round((Date.parse(desktopDayGroups(today,prefs.extendedDays).at(-1).end)-Date.parse(today))/86400000);}
function laneOf(task){return bucket(task,today,dateTiming);}
function columnOrder(){return normalizeColumnOrder(prefs.desktopColumnOrder?.[user?.uid]);}
function columnCollapsed(lane){return ['waiting','later','someday'].includes(lane)&&prefs.desktopColumns?.[user?.uid]?.[lane]===true;}
function openColumn(lane){if(!columnCollapsed(lane))return;prefs.desktopColumns[user.uid][lane]=false;persist();}
let columnTimer=null;
async function toggleColumn(lane){
 if(!['waiting','later','someday'].includes(lane)||!boardVisible()||gestures?.isActive()||completionPress?.isActive()||!await leaveInline())return;
 const collapsed=!columnCollapsed(lane);prefs.desktopColumns||={};prefs.desktopColumns[user.uid]={...prefs.desktopColumns[user.uid],[lane]:collapsed};persist();
 const host=$('#task-list');clearTimeout(columnTimer);host.classList.toggle('column-transition',motion.enabled('navigation'));render();
 if(!collapsed)motion.animate('navigation',host.querySelector(`[data-lane="${lane}"]>.day-tasks`),[{opacity:0},{opacity:1}],{duration:220,delay:100,fill:'backwards'});
 host.querySelector(`[data-toggle-column="${lane}"]`)?.focus({preventScroll:true});columnTimer=setTimeout(()=>host.classList.remove('column-transition'),420);
}
function actionView(task){return boardVisible()?(inView(task,'today',today,picks)?'today':laneOf(task)):view;}
const laneLabels={today:'Today',upcoming:'Week',waiting:'Waiting for a response',later:'Later',someday:'Someday / Maybe'};
function syncSomedayControls(form){if(!form)return;const allowed=accountSettings.showSomeday||form.elements.when.value==='someday';form.querySelector('[data-timing=someday]').hidden=!allowed;form.querySelector('.timing-track').classList.toggle('four-timings',allowed);}
async function saveAccountPreferences(patch){
 if(preview)return;accountSettings={...accountSettings,...patch};applyAccountSettings(accountSettings);metadataPending=true;
 try{if(!store?.savePreferences)throw new Error('Account settings are not ready. Reopen Lists and try again.');await store.savePreferences(patch);}catch(error){notify(errorText(error));}finally{metadataPending=false;}
}
function applyAccountSettings(settings){
 accountSettings={...accountDefaults,...settings};prefs.style=accountSettings.style;prefs.palette=accountSettings.palette;
 if(user&&!preview){try{localStorage.setItem('lists-account-settings-'+user.uid,JSON.stringify(accountSettings));}catch{}}
 for(const [id,audiences] of Object.entries(accountSettings.audiences||{})){prefs.lists[id]={...prefs.lists[id],audiences:{...prefs.lists[id]?.audiences,[user?.uid]:audiences}};}
 if(!accountSettings.showSomeday&&view==='someday'&&!revealedTask&&!$('#new-title').value.trim()&&!composerHome&&!inlineEditor){view='today';composerFields.setTiming('asap');}appearance();
 syncSomedayControls($('#composer'));syncSomedayControls($('#edit-form'));
 $('#composer')._tagField?.update();$('#edit-form')?._tagField?.update();
 if(ready)render();
 document.querySelectorAll('[data-style]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.style)===prefs.style)));
 document.querySelectorAll('[data-palette]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.palette===prefs.palette)));
 if($('#show-someday'))$('#show-someday').checked=accountSettings.showSomeday;
}
function attachTags(form,task={}){if(form._tagField&&form._tagUid===user?.uid)return;form.querySelector('.tag-field')?.remove();form._tagUid=user?.uid;form._tagField=bindTagField(form,{task,uid:user?.uid,getTags:()=>tags,saveTag:(id,patch)=>store.saveTag(id,patch)});}
const pendingCompletions=new Map();
function displayTasks(){return !pendingCompletions.size?tasks:tasks.map(task=>pendingCompletions.has(task.id)?{...task,completed:pendingCompletions.get(task.id).completed}:task);}
const dayControls=document.createElement('div');
function listPrefs(){return {editor:'modal',...(prefs.lists?.[category]||{})};}
function selection(){return normalizeSelection(listPrefs().audiences?.[user?.uid]||{private:true,[user?.uid]:true},profiles);}
function persist(){try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch{notify('Settings could not be saved on this device.');}}
function appearance(){if(!styles.some(([id])=>id===Number(prefs.style)))prefs.style=1;document.body.dataset.design=String(prefs.style);document.body.dataset.completionSide=completionSide();document.body.dataset.completionTarget=phoneMedia.matches||completionSide()==='right'?'wide':'standard';document.documentElement.dataset.palette=prefs.palette;document.documentElement.dataset.motion=Object.values(prefs.animations).some(Boolean)?'custom':'off';motion.sync();}
function saveListPrefs(patch){prefs.lists||={};prefs.lists[category]={...listPrefs(),...patch};persist();if(patch.audiences&&user&&!preview)void saveAccountPreferences({audiences:{...accountSettings.audiences,[category]:patch.audiences[user.uid]}});}
prefs.extendedDays=Math.max(1,Math.min(10,Number.parseInt(prefs.extendedDays)||5));
appearance();

$('#app').innerHTML=`<div id="sync-progress" class="sync-progress" hidden aria-hidden="true"></div><div class="app-frame compact-workspace"><aside id="playground-banner" class="playground-banner" hidden><span><strong>Playground</strong><small>Test data only</small></span><button class="text-button" data-action="leave-playground">Exit Playground</button></aside><aside id="preview-banner" class="preview-banner" hidden><div><strong id="preview-name"></strong><span>Read-only · Personal and shared tasks</span></div><button class="secondary" id="exit-preview">Exit preview</button></aside><header class="navigation-bar"><button type="button" class="icon-button" id="open-menu" aria-label="Open menu" aria-controls="navigation-drawer" aria-expanded="false">${icon('menu')}</button><button type="button" class="back-asap text-button" id="back-asap" aria-label="Back to my Today tasks" hidden>${icon('arrow-left')}Back to my Today tasks</button></header><section id="gate" hidden></section><main id="workspace" hidden><form id="composer" class="composer"><div class="compose-line"><input id="new-title" name="title" aria-label="New task" placeholder="Add a to-do…" maxlength="200" autocomplete="off" required></div>${fieldsMarkup({today,composer:true})}<p class="inline-error" id="compose-error" role="alert"></p></form><div class="list-heading"><h1 id="view-title" class="sr-only">Today</h1></div><div id="task-list" class="task-list"></div><p id="empty-state" class="empty-state" hidden>Nothing here yet.</p></main><div id="mode-status" class="mode-status" hidden></div><p class="connection" id="connection" role="status"></p><nav class="bottom-nav" aria-label="Lists">${Object.entries(names).map(([id,name])=>`<button data-category="${id}" ${id==='todo'?'aria-current="page"':''}>${icon(glyphs[id])}<span>${name}</span></button>`).join('')}</nav></div><dialog id="dialog"><div class="modal-header"><h2 id="dialog-title"></h2><button data-close class="icon-button quiet close-button" aria-label="Close">${icon('x')}</button></div><div id="dialog-body"></div></dialog><dialog id="confirmation"><form method="dialog"><h2 id="confirmation-title"></h2><p id="confirmation-text"></p><div class="modal-footer"><button value="cancel" class="secondary">Cancel</button><button id="confirm-action" value="confirm" class="danger">Remove</button></div></form></dialog><dialog id="navigation-drawer" class="navigation-drawer" aria-label="Menu"><div class="drawer-heading"><div><strong>Lists</strong></div><button type="button" class="icon-button" id="close-menu" aria-label="Close menu">${icon('x')}</button></div><nav aria-label="Task views"><div id="drawer-task-filters" class="drawer-task-filters" role="group" aria-label="Tasks to show"></div><div class="drawer-group"><button data-menu-days="1">${icon('calendar-check')}Today only</button><button data-menu-days="extended">${icon('calendar-range')}<span id="extended-label">Next 5 days</span></button><button data-menu-view="waiting">${waitingIcon()}Waiting for a response</button><button data-menu-view="done">${icon('check-check')}Completed tasks</button></div><div class="drawer-group"><button data-menu-action="settings">${icon('settings-2')}Settings</button><button data-menu-action="share">${icon('share-2')}Save / Share</button></div></nav><footer class="drawer-account-footer"><div id="drawer-avatar"></div><span id="drawer-account">Not signed in</span><button type="button" data-menu-action="sign-out" id="drawer-sign-out" class="text-button">Sign out</button><p id="drawer-account-error" role="alert"></p></footer></dialog><div id="toast" role="status" aria-live="polite"></div>`;
const leaf=$('#composer .options-toggle');leaf.classList.add('leaf-options');leaf.innerHTML=icon('chevrons-right').replace('<i ','<i viewBox="3 3 18 18" ');$('.compose-line').append(leaf);
const quickEntry=document.createElement('div');quickEntry.className='quick-entry';$('#composer').before(quickEntry);quickEntry.append($('#composer'));
const desktopFinder=desktopSearch({mount:quickEntry,getTasks:()=>displayTasks().filter(task=>task.category==='todo'&&(task.visibility==='shared'||task.ownerUid===user?.uid)).map(task=>({...task,description:(task.description||'')+' '+taskTags(task,tags).map(tag=>tag.name).join(' ')})),label:task=>task.completed?'Completed':laneLabels[laneOf(task)],select:revealSearchTask,icon,esc,icons});
$('.list-heading').append($('#back-asap'));
const phoneModal=modalViewport($('#dialog'));
composerFields=bindFields($('#composer'),{uid:null,members,profiles,today,onTimingSelect:mode=>changeEditor(async()=>{
  if($('#composer').dataset.saving||!await leaveInline())return;
  if(mode==='someday'&&($('#composer').elements.date.value||$('#composer').elements.waiting.checked)&&!await confirmAction('Move to Someday / Maybe?','Its scheduled date and follow-up will be cleared. It will not appear in daily suggestions.','Move to Someday'))return;
  composerFields.setTiming(mode);if(!composerHome){if($('#new-title').value.trim())$('#composer').requestSubmit();else{view={asap:'today',week:'upcoming',later:'later',someday:'someday'}[mode];if(boardVisible())openColumn(view);render();}}
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
const groceryHost=document.createElement('section');groceryHost.id='grocery-workspace';groceryHost.hidden=true;$('#workspace').append(groceryHost);
grocery=createGroceries({host:groceryHost,getStore:()=>store,open,close,confirmAction,notify,motion,readOnly:()=>!!preview,context:()=>spaceEpoch,getPrefs:()=>prefs,persist});
$('#navigation-drawer nav').append(grocery.menu);
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
  if(user)attachTags($('#composer'));
  composerFields.updatePeople(members,profiles,user?.uid);$('#edit-form')?._controller?.updatePeople(members,profiles,user?.uid);
  if($('.visibility-choices'))bindViews();
}
function dailySuggestion(task){return category==='todo'&&!task.completed&&!task.someday&&!task.waiting&&dateTiming(task.dueDate,today)==='later'&&picks.includes(task.id);}
function dailyRank(){
 if(Number.isFinite(dailyState?.sortOrder))return dailyState.sortOrder;
 return tasks.filter(task=>task.category==='todo'&&!task.completed&&!task.someday&&(task.waiting?task.followUp:task.dueDate)&&taskDay(task,today,[])<=today).reduce((rank,task)=>Math.max(rank,task.sortOrder??task.createdAt),0)+1024;
}
function displayedOrder(task){return dailySuggestion(task)&&(boardVisible()||view==='today')?{...task,sortOrder:dailyRank()}:task;}
function currentTasks(targetView=view){
  const view=targetView;
  const chosen=selection(),lastDay=boardVisible()&&!mergedBoard()?today:visibleDays().at(-1).end;
  return displayTasks().filter(task=>task.category===category&&(task.visibility==='shared'||task.ownerUid===user?.uid))
    .filter(task=>task.id===revealedTask||selectedTask(task,{uid:user?.uid,email:user?.email,selection:chosen,profiles})||category==='todo'&&view==='today'&&picks.includes(task.id)&&candidateTasks([{...task,dueDate:null}],user?.uid,user?.email,today).length)
    .filter(task=>category==='todo'?view==='today'?!!taskDay(task,today,picks)&&taskDay(task,today,picks)<=lastDay:inView(task,view,today,picks):view==='done'?task.completed:!task.completed)
    .sort((a,b)=>taskOrder(displayedOrder(a),displayedOrder(b)));
}
async function revealSearchTask(id){
 if(!await leaveInline()||gestures?.isActive()||completionPress?.isActive())return;
 const task=displayTasks().find(task=>task.id===id&&task.category==='todo'&&(task.visibility==='shared'||task.ownerUid===user?.uid));
 if(!task){notify('That task is no longer available.');return;}
 revealedTask=id;highlightedTask=id;clearTimeout(highlightTimer);
 view=task.completed?'done':laneOf(task);if(boardVisible())openColumn(view);composerFields.showView(view);render();
 const row=[...$('#task-list').querySelectorAll('.task-row')].find(node=>node.dataset.task===id);
 if(row){row.querySelector('.task-content')?.focus({preventScroll:true});row.scrollIntoView({block:'center',behavior:motion.enabled('navigation')?'smooth':'instant'});}
 const epoch=spaceEpoch;highlightTimer=setTimeout(()=>{if(epoch!==spaceEpoch||highlightedTask!==id)return;highlightedTask=null;$('#task-list').querySelectorAll('[data-search-highlight]').forEach(node=>node.removeAttribute('data-search-highlight'));},5000);
}
async function changeDays(expand){
 if(gestures?.isActive()||completionPress?.isActive()||!await leaveInline())return;
 const old=new Map([...$('#task-list').children].map(node=>[node.dataset.lane,node.getBoundingClientRect()])),wasBoard=boardVisible();
 prefs.daysShown=expand?Math.max(boardVisible()?2:1,prefs.extendedDays):1;persist();render();
 if(!wasBoard||!boardVisible())return;
 for(const lane of $('#task-list').children){const before=old.get(lane.dataset.lane),after=lane.getBoundingClientRect();
  if(before&&lane.dataset.lane!=='today')motion.animate('navigation',lane,[{transform:`translateX(${before.left-after.left}px)`},{transform:'none'}],{duration:420});
  else if(!before)motion.animate('navigation',lane,[{opacity:0,transform:'translateX(-20px)'},{opacity:1,transform:'none'}],{duration:420});
  if(lane.dataset.lane==='today'&&before)motion.animate('navigation',lane,[{clipPath:`inset(0 ${Math.max(0,after.width-before.width)}px 0 0)`},{clipPath:'inset(0 0 0 0)'}],{duration:420});
 }
 if(mergedBoard())[...document.querySelectorAll('#task-list .board-merged .day-group')].slice(1).forEach((node,index)=>motion.animate('navigation',node,[{opacity:0,transform:'translateY(-10px)'},{opacity:1,transform:'none'}],{duration:320,delay:Math.min(index,5)*25,fill:'backwards'}));
}
function rowMarkup(task,waitingCopy=false,displayLane=view){
  const rowView=actionView(task),resolvedTags=taskTags(task,tags),right=completionSide()==='right',wide=phoneMedia.matches||right;
  task={...task,assigneeUid:task.assigneeUid||(task.assigneeEmail?'email:'+task.assigneeEmail:null)};
  const suggestion=category==='todo'&&rowView==='today'&&!task.waiting&&dateTiming(task.dueDate,today)==='later'&&picks.includes(task.id);
  const metadata=[suggestion?'From Later':null,(waitingCopy||displayLane==='later')&&(task.waiting?task.followUp:task.dueDate)?(waitingCopy?'Follow up · ':'')+shortDate(task.waiting?task.followUp:task.dueDate):null].filter(Boolean),hasDetails=!!task.description?.trim();
  const check=`<button type="button" class="task-check ${task.completed?'checked':''}" data-complete="${esc(task.id)}" aria-label="${task.completed?'Reopen':'Complete'} ${esc(task.title)}" ${busy.has(task.id)||preview?'disabled':''}>${icon(task.completed||wide?'check':'circle')}${!task.completed?`<span class="complete-preview" aria-hidden="true">${icon('check')}</span>`:''}</button>`;
  return `<div class="task-summary">${!right?check:''}<button ${pendingCompletions.has(task.id)?'disabled':''} class="task-content" aria-keyshortcuts="Alt+M" data-edit="${esc(task.id)}" aria-expanded="${inlineEditor?.id===task.id}"><span class="task-title"><span class="task-name">${esc(task.title)}</span>${task.waiting&&!waitingCopy&&view!=='waiting'?'<span class="waiting-badge" role="img" aria-label="Waiting for a response" title="Waiting for a response">'+waitingIcon()+'</span>':''}</span>${hasDetails?`<span class="task-excerpt">${esc(task.description.trim().replace(/\s+/g,' '))}</span>`:''}${metadata.length?`<span class="task-meta">${metadata.map(esc).join(' · ')}</span>`:''}</button>${resolvedTags.length?`<div class="row-tags">${resolvedTags.slice(0,2).map(tag=>`<button type="button" class="tag-chip" data-filter-tag="${esc(tag.id)}">${esc(tag.name)}</button>`).join('')}${resolvedTags.length>2?`<button type="button" class="tag-chip" data-edit="${esc(task.id)}" aria-label="See all tags for ${esc(task.title)}">+${resolvedTags.length-2}</button>`:''}</div>`:''}${suggestion?`<button type="button" class="text-button not-today" data-skip-later="${esc(task.id)}" aria-label="Not today: ${esc(task.title)}" title="Keep in Later and use today’s suggestion" ${preview||busy.has(task.id)?'disabled':''}>${icon('corner-down-left')}<span>Not today</span></button>`:''}${task.visibility==='shared'?avatar(task.assigneeUid,members,profiles):''}${category==='todo'&&!task.completed&&!task.someday&&quickActionsVisible()?`<button data-quick="week" data-id="${esc(task.id)}" class="icon-button defer-task" aria-label="${rowView==='upcoming'||rowView==='later'?'Move to Today':'Punt to Week'} ${esc(task.title)}" title="${rowView==='upcoming'||rowView==='later'?'Move to Today':'Punt to Week'}" ${preview||busy.has(task.id)?'disabled':''}>${icon(rowView==='upcoming'||rowView==='later'?'list-start':'corner-up-right')}</button>`:''}${right?check:''}</div>`;
}
function render(){
  const shopping=category==='grocery';grocery?.show(shopping);$('#composer').hidden=shopping;$('#task-list').hidden=shopping;$('.list-heading').hidden=shopping;if(shopping)dayControls.hidden=true;
  if(shopping){desktopFinder.setVisible(false);renderedLayout='';document.body.classList.remove('desktop-board','merged-board');$('#empty-state').hidden=true;updateNavigation();document.querySelectorAll('[data-category]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.category===category));return;}
  if(!user||gestures?.isActive()||completionPress?.isActive())return;
  document.body.dataset.completionSide=completionSide();document.body.dataset.completionTarget=phoneMedia.matches||completionSide()==='right'?'wide':'standard';
  if(!accountSettings.showSomeday&&view==='someday'&&!revealedTask&&!$('#new-title').value.trim()&&!composerHome&&!inlineEditor){view='today';composerFields.setTiming('asap');}
  updateNavigation();$('#expand-days-label').textContent='Show '+prefs.extendedDays+(prefs.extendedDays===1?' day':' days');
  const layout=JSON.stringify([spaceEpoch,category,view,boardVisible(),prefs.daysShown,prefs.style,selection(),columnOrder(),columnCollapsed('waiting'),columnCollapsed('later'),columnCollapsed('someday')]);
  const positions=!ready||renderedLayout!==layout||skipDropAnimation?new Map():motion.snapshot();skipDropAnimation=false;renderedLayout=ready?layout:'';
  const todo=category==='todo',board=boardVisible(),merged=mergedBoard();document.body.classList.toggle('desktop-board',board);document.body.classList.toggle('merged-board',merged);dayControls.hidden=!todo||(!board&&view!=='today');$('[data-days=today]').hidden=prefs.daysShown===1;$('[data-days=more]').hidden=prefs.daysShown>1;
  if(board)$('#expand-days-label').textContent='Show next '+desktopExtendedCount()+' days';
  $('#new-title').placeholder=composerHome?'Task name':todo?'Add a to-do…':category==='grocery'?'Add a grocery…':category==='movies'?'Add a movie…':'Add an item…';
  $('#new-title').setAttribute('aria-label',todo?'New task':'New item');$('#composer .schedule-line').classList.toggle('no-timing',!todo);
  $('#composer .timing-track').hidden=!todo;$('#composer .exact-date-row').classList.toggle('category-hidden',!todo);$('#composer .waiting-toggle').classList.toggle('category-hidden',!todo);
  syncSomedayControls($('#composer'));
  const captions={someday:'Someday / Maybe',today:'Today',upcoming:'Week',later:'Later',waiting:'Waiting for a response',done:'Completed'};$('#view-title').textContent=todo?captions[view]:names[category];$('#view-title').classList.toggle('sr-only',board||!todo||['today','upcoming','later'].includes(view));
  const boardViews=visibleColumnOrder(columnOrder(),{merged,someday:accountSettings.showSomeday||tasks.some(task=>task.id===revealedTask&&task.someday)});
  $('#task-list').style.setProperty('--board-columns',boardViews.map(lane=>columnCollapsed(lane)?'minmax(48px,0fr)':lane==='today'?merged?'minmax(420px,1.8fr)':'minmax(260px,1.4fr)':'minmax(170px,1fr)').join(' '));
  const list=board?[...new Map(boardViews.filter(lane=>lane!=='waiting').flatMap(currentTasks).map(task=>[task.id,task])).values()].sort((a,b)=>taskOrder(displayedOrder(a),displayedOrder(b))):currentTasks(),host=$('#task-list'),ids=new Set(list.map(t=>t.id)),rows=new Map([...host.querySelectorAll('.task-row:not([data-waiting-copy])')].map(row=>[row.dataset.task,row])),completedIds=new Set(displayTasks().filter(task=>task.completed).map(task=>task.id));
  const todayBoardIds=new Set(board?currentTasks('today').map(task=>task.id):[]);
  let completionExit=false;
  // Preserve an open form node: a live snapshot must not dismiss a phone keyboard or erase a draft.
  for(const row of rows.values())if(!ids.has(row.dataset.task)&&row.dataset.task!==inlineEditor?.id){
    if(!row.classList.contains('completed')&&completedIds.has(row.dataset.task))completionExit=!!motion.depart(row)||completionExit;else row.remove();
  }
  const grouped=todo&&view==='today'&&!board,buckets=board?boardViews.flatMap(lane=>lane==='today'&&merged?visibleDays():[{start:lane,end:'',lane,weekend:false}]):grouped?visibleDays():[{start:'',end:'',weekend:false}],days=buckets.map(bucket=>bucket.start);
  const groups=new Map([...host.querySelectorAll('.day-group')].map(group=>[group.dataset.day,group]));
  let combined=host.querySelector('.board-merged');
  if(merged&&!combined){combined=document.createElement('section');combined.className='board-merged board-lane';combined.dataset.lane='today';combined.innerHTML='<h2 class="merged-heading">Today & Week</h2>';host.append(combined);}
  for(const bucket of buckets){const day=bucket.start,parent=merged&&!bucket.lane?combined:host;let group=groups.get(day);if(!group){group=document.createElement('section');group.className='day-group';group.dataset.day=day;group.innerHTML='<h2 class="day-heading"></h2><div class="day-tasks"></div>';groups.set(day,group);}if(group.parentNode!==parent)parent.append(group);if(parent===combined){const index=buckets.filter(item=>!item.lane).indexOf(bucket)+1;if(parent.children[index]!==group)parent.insertBefore(group,parent.children[index]||null);}
   const target=group.querySelector('.day-tasks');target.dataset.day=bucket.lane?'':day;group.dataset.end=bucket.end;group.classList.toggle('weekend-group',bucket.weekend);group.classList.toggle('board-lane',!!bucket.lane);group.classList.toggle('selected-lane',view===bucket.lane);if(bucket.lane){group.dataset.lane=bucket.lane;target.dataset.lane=bucket.lane;}else{delete group.dataset.lane;delete target.dataset.lane;}
   const heading=group.querySelector('.day-heading');heading.hidden=!bucket.lane&&!merged&&(!grouped||prefs.daysShown===1);heading.textContent=bucket.lane?laneLabels[bucket.lane]:bucket.weekend?'Weekend · '+shortDate(day)+(bucket.end!==day?' – '+shortDate(bucket.end):''):(day===today?'Today':day===addDays(today,1)?'Tomorrow':day?new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')):'')+(day?' · '+shortDate(day):'');
   const collapsible=board&&['waiting','later','someday'].includes(bucket.lane),collapsed=collapsible&&columnCollapsed(bucket.lane);group.toggleAttribute('data-column-collapsed',collapsed);target.hidden=collapsed;
   if(collapsible){const label=laneLabels[bucket.lane],action=(collapsed?'Show ':'Hide ')+label;target.id='board-tasks-'+bucket.lane;heading.innerHTML=`<span class="lane-title">${esc(label)}</span><button type="button" class="icon-button column-eye" data-toggle-column="${bucket.lane}" aria-label="${esc(action)}" title="${esc(action)}" aria-expanded="${!collapsed}" aria-controls="${target.id}">${icon(collapsed?'eye-off':'eye')}</button>`;}
  }
  const cursors=new Map(days.map(day=>[day,groups.get(day).querySelector('.day-tasks').firstElementChild]));
  for(const task of list){
    let row=rows.get(task.id);
    if(!row){row=document.createElement('article');row.dataset.task=task.id;}row.dataset.instance=task.id;
    const suggestion=todo&&actionView(task)==='today'&&!task.waiting&&dateTiming(task.dueDate,today)==='later'&&picks.includes(task.id);
    row.className=`task-row ${task.completed?'completed':''} ${suggestion?'suggestion':''} ${inlineEditor?.id===task.id?'is-editing':''}`;row.dataset.daily=String(suggestion);
    row.toggleAttribute('data-search-highlight',task.id===highlightedTask);
    const summary=rowMarkup(task,false,board?(todayBoardIds.has(task.id)?'today':laneOf(task)):view),old=row.querySelector('.task-summary');
    if(inlineEditor?.id!==task.id)row.querySelector('.task-edit-form')?.remove();
    if(!old)row.innerHTML=summary;else if(row.dataset.summary!==summary)old.outerHTML=summary;row.dataset.summary=summary;
    const day=board?(todayBoardIds.has(task.id)?merged?groupDay(taskDay(task,today,picks),buckets):'today':laneOf(task)):grouped?groupDay(taskDay(task,today,picks),buckets):'',parent=groups.get(day).querySelector('.day-tasks'),cursor=cursors.get(day);
    if(row!==cursor)parent.insertBefore(row,cursor?.parentNode===parent?cursor:null);cursors.set(day,row.nextElementSibling);
    if(inlineEditor?.id===task.id&&!row.contains(inlineEditor.form))row.append(inlineEditor.form);
    if(inlineEditor?.id===task.id&&inlineEditor.rev!==task.rev)inlineEditor.form.querySelector('.editor-notice').textContent='Changed on another device. Your draft is safe; reopen before saving.';
  }
  const waitingTarget=board?groups.get('waiting').querySelector('.day-tasks'):null;
  const waitingTasks=waitingTarget?currentTasks('waiting').sort(waitingOrder):[],waitingIds=new Set(waitingTasks.map(task=>task.id)),copies=new Map([...host.querySelectorAll('[data-waiting-copy]')].map(row=>[row.dataset.task,row]));
  for(const row of copies.values())if(!waitingIds.has(row.dataset.task)){if(completedIds.has(row.dataset.task))motion.depart(row);else row.remove();}
  let waitingCursor=waitingTarget?.firstElementChild;
  for(const task of waitingTasks){
   let row=copies.get(task.id);if(!row){row=document.createElement('article');row.dataset.task=task.id;row.dataset.waitingCopy='true';row.dataset.instance='waiting:'+task.id;}
   row.className='task-row'+(inlineEditor?.id===task.id?' is-editing':'');row.toggleAttribute('data-search-highlight',task.id===highlightedTask);const summary=rowMarkup(task,true);
   if(row.dataset.summary!==summary){row.innerHTML=summary;row.dataset.summary=summary;row.querySelector('.defer-task')?.remove();row.querySelector('.task-content').setAttribute('aria-expanded','false');}
   if(row!==waitingCursor)waitingTarget.insertBefore(row,waitingCursor?.parentNode===waitingTarget?waitingCursor:null);waitingCursor=row.nextElementSibling;
  }
  for(const [day,group] of groups)if(!days.includes(day)){const orphan=group.querySelector('.is-editing');if(orphan)groups.get(days[0]).querySelector('.day-tasks').append(orphan);group.remove();}
  if(!merged)combined?.remove();
  const orderedGroups=board?boardViews.map(lane=>merged&&lane==='today'?combined:groups.get(lane)):days.map(day=>groups.get(day));
  orderedGroups.forEach((group,index)=>{if(host.children[index]!==group)host.insertBefore(group,host.children[index]||null);});
  const controlHome=board?(merged?combined:groups.get('today')):null;if(controlHome){if(dayControls.parentNode!==controlHome||dayControls!==controlHome.lastElementChild)controlHome.append(dayControls);}else $('#empty-state').after(dayControls);
  for(const day of days){const group=groups.get(day);group.classList.toggle('empty-day',!group.querySelector('.task-row'));group.classList.toggle('has-day-heading',board||grouped&&prefs.daysShown>1);}
  if(inlineEditor&&!tasks.some(task=>task.id===inlineEditor.id))inlineEditor.form.querySelector('.editor-notice').textContent='This task was removed on another device. Your unsaved draft is shown below.';
  $('#empty-state').hidden=list.length>0||!!inlineEditor||board;
  document.querySelectorAll('[data-view]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.view===view));
  if(todo&&$('#new-options').hidden)composerFields.showView(view);
  document.querySelectorAll('[data-category]').forEach(button=>button.toggleAttribute('aria-current',button.dataset.category===category));
  desktopFinder.setVisible(ready&&todo);desktopFinder.refresh();syncLinkedRows();
  $('#composer').querySelectorAll('input,textarea,button').forEach(control=>{if(preview&&!control.matches('[data-view]')){control.disabled=true;control.dataset.previewDisabled='true';}else if(control.dataset.previewDisabled){control.disabled=false;delete control.dataset.previewDisabled;}});icons();motion.rearrange(positions,completionExit?60:0);gestures?.sync();
}
function receiveDaily(state){
 if(state.day!==today||state.uid!==user?.uid)return;
 if(!dailyState||dailyState.day!==state.day)skipDropAnimation=true;
 dailyState=state;picks=state.taskId&&!state.dismissed?[state.taskId]:[];render();
}
async function skipLater(task){
 if(preview||busy.has(task.id)||!dailySuggestion(task))return;
 const epoch=spaceEpoch,day=today,uid=user.uid;busy.add(task.id);render();
 try{
  await store.updateDaily(day,uid,task.id,{dismissed:true});
  if(epoch!==spaceEpoch)return;
  receiveDaily({...(dailyState||{}),day,uid,taskId:task.id,dismissed:true});
  notify('Kept in Later for today',{id:task.id,label:task.title,run:()=>store.updateDaily(day,uid,task.id,{dismissed:false})});
 }catch(error){if(epoch===spaceEpoch)notify(errorText(error));}
 finally{busy.delete(task.id);if(epoch===spaceEpoch)render();}
}
async function dailyPick(){
  const token=`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`,pool=candidateTasks(tasks,user?.uid,user?.email,today).map(task=>task.id).join(',');if(!ready||!user||picking===token||pickedDay===token&&(picks.length||pickedPool===pool))return;
  const uid=user.uid,day=today,firstDraw=!pickedDay;picking=token;pickedPool=pool;
  try{const id=await store.pick(day,uid);if(picking===token&&token===`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`){if(firstDraw)skipDropAnimation=true;picks=id?[id]:[];pickedDay=token;render();}}catch(error){if(picking===token){pickedDay=token;status(error?.code?.includes('permission-denied')?'Daily From Later needs the updated Firestore rules published. Other task editing is unaffected.':errorText(error));}}finally{if(picking===token){picking=false;if(!picks.length&&pickedPool!==candidateTasks(tasks,user?.uid,user?.email,today).map(task=>task.id).join(','))void dailyPick();}}
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
 grocery?.menu&&(grocery.menu.hidden=category!=='grocery');
 $('#navigation-drawer [data-menu-action=search]').parentElement.hidden=category==='grocery';
 $('#drawer-task-filters').hidden=category==='grocery';
 const account=signedInAccount||user;$('#drawer-avatar').innerHTML=account?avatar(account.uid,{[account.uid]:account.displayName||members[account.uid]||'You'},{[account.uid]:account}):'';$('#drawer-sign-out').hidden=!account;const count=category==='todo'&&boardMedia.matches&&prefs.desktopBoard!==false?desktopExtendedCount():prefs.extendedDays;$('#extended-label').textContent='Next '+count+(count===1?' day':' days');
 const nav=$('.navigation-bar');nav.hidden=ready;if(ready)quickEntry.prepend($('#open-menu'));else nav.prepend($('#open-menu'));
 $('#drawer-account').textContent=account?'Signed in as '+(account.displayName||members[account.uid]||account.email||'you'):'Not signed in';
 $('#back-asap').hidden=!ready||category!=='todo'||(!revealedTask&&!['waiting','done'].includes(view)&&!(prefs.daysShown>1)&&defaultAudience());
 renderDrawerFilters();
 $('#navigation-drawer').querySelectorAll('[data-menu-view],[data-menu-days]').forEach(button=>button.disabled=!ready);
 $('#navigation-drawer').querySelectorAll('[data-menu-view]').forEach(button=>{button.setAttribute('aria-current',String(button.dataset.menuView===view));button.hidden=category==='grocery'||category!=='todo'&&button.dataset.menuView!=='done';});
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
 if(!await leaveInline())return;revealedTask=null;highlightedTask=null;view=category==='todo'?'today':'later';prefs.daysShown=1;saveListPrefs({audiences:{...listPrefs().audiences,[user.uid]:{private:true,[user.uid]:true}}});composerFields.setTiming(composerMode());render();bindViews();window.scrollTo({top:0,behavior:motion.enabled('navigation')?'smooth':'instant'});
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
 if(button.dataset.menuDays){if(!await leaveInline())return;view='today';await changeDays(button.dataset.menuDays==='extended');composerFields.setTiming('asap');render();}
 if(button.dataset.menuView){if(!await leaveInline())return;view=button.dataset.menuView;composerFields.setTiming(composerMode());render();}
 if(button.dataset.menuAction==='search')openSearch();
 if(button.dataset.groceryAction)grocery.action(button.dataset.groceryAction);
 if(button.dataset.menuAction==='settings')settings();
 if(button.dataset.menuAction==='guide')open('Quick guide',guideMarkup(category));
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
function composerMode(){return category==='todo'?{today:'asap',upcoming:'week',later:'later',someday:'someday'}[view]||'asap':'asap';}
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
  if(!raw.tagIds?.length&&!task?.tagIds)delete raw.tagIds;
  const draft=taskDraft(raw);
  if(task?.someday&&!draft.someday)draft.someday=false;
  if(task?.assigneeEmail&&!draft.assigneeEmail)draft.assigneeEmail=null;
  if(raw.waiting){if(raw.followUp&&!/^\d{4}-\d{2}-\d{2}$/.test(raw.followUp))throw new Error('Choose a valid follow-up date.');draft.waiting=true;draft.followUp=raw.followUp||null;}
  if(task)draft.completed=task.completed;
  return {raw,draft};
}
async function completeTask(task,rect){
 if(preview||busy.has(task.id)||pendingCompletions.has(task.id))return;
 const epoch=spaceEpoch,operation={completed:!task.completed};pendingCompletions.set(task.id,operation);busy.add(task.id);
 render();if(operation.completed){motion.burst(rect);motion.travel(rect,$('#open-menu'));}
 try{
  await store.write(task.id,{completed:operation.completed},task.rev);if(epoch!==spaceEpoch)return;
  tasks=tasks.map(item=>item.id===task.id&&item.rev<=task.rev?{...item,completed:operation.completed,rev:task.rev+1}:item);
  notify(operation.completed?'Task completed':'Task reopened',{id:task.id,label:task.title,rev:task.rev+1,patch:{completed:task.completed}});
 }catch(error){if(epoch===spaceEpoch)notify('Could not save “'+task.title+'”. Showing the latest saved state. '+errorText(error));}
 finally{
  if(pendingCompletions.get(task.id)===operation)pendingCompletions.delete(task.id);
  busy.delete(task.id);if(epoch===spaceEpoch)render();
 }
}
async function deferTask(task){
  const activeView=actionView(task),asap=activeView==='upcoming'||activeView==='later',rect=[...document.querySelectorAll('.task-row')].find(row=>row.dataset.task===task.id)?.getBoundingClientRect();
  const date=asap?today:schedule('defer',today),patch=task.waiting?{dueDate:task.dueDate,waiting:true,followUp:date}:{dueDate:date,waiting:false,followUp:null};
  if(await mutate(task,patch)){
    notify(asap?'Moved to Today':'Punted to Week · '+shortDate(date),{id:task.id,label:task.title,rev:task.rev+1,patch:{dueDate:task.dueDate,waiting:task.waiting,followUp:task.followUp}});
    const destination=asap?'today':inView({...task,...patch},'upcoming',today,picks)?'upcoming':'later';
    motion.punt(rect,$('#composer [data-view='+destination+']'),task.title);
    return true;
  }
  return false;
}
async function moveTask(task,ids,day,{exact=false,lane=null,sourceLane=null}={}){
  if(preview||busy.has(task.id))return;
  ids=[...new Set(ids)];
  const ordered=ids.map(id=>id===task.id?task:tasks.find(t=>t.id===id)).filter(Boolean).map(displayedOrder),rank=insertionOrder(ordered,task.id),patch={};
  if(day&&day!==(!exact&&category==='todo'&&(view==='today'||mergedBoard())?groupDay(taskDay(task,today,picks),visibleDays()):taskDay(task,today,picks))){if(task.waiting)patch.followUp=day;else patch.dueDate=day;}
  if(lane&&lane!==(sourceLane||actionView(task))){
    if(lane==='someday'&&(task.dueDate||task.waiting)&&!await confirmAction('Move to Someday / Maybe?','Its scheduled date and follow-up will be cleared.','Move to Someday'))return false;
    Object.assign(patch,{someday:lane==='someday',dueDate:lane==='someday'||lane==='later'?null:lane==='today'?today:schedule('defer',today),waiting:lane==='someday'?false:task.waiting,followUp:null});
    if(patch.waiting){patch.followUp=patch.dueDate||addDays(today,30);patch.dueDate=null;}
  }
  if(day&&task.someday)patch.someday=false;
  const statusPatch=waitingDrop(task,{lane,sourceLane,day,today,weekDate:lane==='upcoming'?schedule('defer',today):null});if(statusPatch)Object.assign(patch,statusPatch);
  const suggestion=(view==='today'||mergedBoard()||sourceLane==='today')?ordered.find(dailySuggestion):null;
  const receiptReorder=!!suggestion&&!Object.keys(patch).length;
  if(receiptReorder){
    const receiptEpoch=spaceEpoch;busy.add(task.id);
    try{
      if(rank===null)await store.updateDaily(today,user.uid,suggestion.id,{sortOrder:ordered.indexOf(suggestion)*1024});
      else if(dailySuggestion(task)){await store.updateDaily(today,user.uid,task.id,{sortOrder:rank});return true;}
      else if(!Number.isFinite(dailyState?.sortOrder)&&ordered.indexOf(suggestion)<ordered.findIndex(item=>item.id===task.id))await store.updateDaily(today,user.uid,suggestion.id,{sortOrder:dailyRank()});
    }catch(error){if(receiptEpoch===spaceEpoch)notify(errorText(error));return false;}
    finally{busy.delete(task.id);if(receiptEpoch===spaceEpoch)render();}
  }
  const changes=rank===null?ordered.map((item,index)=>({id:item.id,rev:item.rev,patch:{sortOrder:index*1024,...(item.id===task.id?patch:{})}})).filter(change=>!receiptReorder||change.id!==suggestion.id):[{id:task.id,rev:task.rev,patch:{...patch,sortOrder:rank}}];
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
function moveOptions(task,sourceRow=null){
  const row=sourceRow||[...document.querySelectorAll('.task-row')].find(row=>row.dataset.task===task.id),parent=row?.parentElement;if(!parent)return;
  open('Move task',`<p class="task-preview">${esc(task.title)}</p><div class="move-directions"><button class="secondary" data-move-direction="-1">${icon('arrow-up')} Move up</button><button class="secondary" data-move-direction="1">${icon('arrow-down')} Move down</button></div>${task.category==='todo'&&!task.completed?`<label class="field">Move to date<input id="move-date" type="date" value="${taskDay(task,today,picks)||today}"></label><button class="primary" id="move-date-save">Move to date</button>`:''}<div class="modal-footer"><button class="secondary" data-close>Close</button></div>`);
  document.querySelectorAll('[data-move-direction]').forEach(button=>button.onclick=async()=>{
    const ids=[...parent.querySelectorAll('.task-row')].map(row=>row.dataset.task),index=ids.indexOf(task.id),next=index+Number(button.dataset.moveDirection);if(next<0||next>=ids.length){notify('Already at the '+(next<0?'top':'bottom'));return;}[ids[index],ids[next]]=[ids[next],ids[index]];close();await moveTask(task,ids,parent.dataset.day||null,{lane:parent.dataset.lane||null,sourceLane:parent.dataset.lane||null});
  });
  $('#move-date-save')?.addEventListener('click',async()=>{const day=$('#move-date').value;if(!day)return;const ids=tasks.filter(item=>item.id!==task.id&&item.category===task.category&&!item.completed&&taskDay(item,today,picks)===(day<today?today:day)).sort(taskOrder).map(item=>item.id);ids.push(task.id);close();await moveTask(task,ids,day,{exact:true,sourceLane:parent.dataset.lane||null});});
}
function syncLinkedRows(){
 const host=$('#task-list'),row=host.querySelector('.task-row:hover')||document.activeElement?.closest('.task-row'),id=boardVisible()&&tasks.find(task=>task.id===row?.dataset.task&&task.waiting)?.id;
 host.querySelectorAll('.task-row').forEach(node=>node.toggleAttribute('data-linked-task',!!id&&node.dataset.task===id));
}
for(const name of ['pointerover','pointerout','focusin','focusout'])$('#task-list').addEventListener(name,()=>queueMicrotask(syncLinkedRows));
$('#composer').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;if(preview||form.dataset.saving)return;$('#compose-error').textContent='';
  form.dataset.saving='true';form.querySelectorAll('[type=submit],.cancel-new-task,.options-toggle').forEach(control=>control.disabled=true);
  try{
    const {raw,draft}=draftFrom(form),fingerprint=JSON.stringify(raw);
    if(pendingCreation?.fingerprint!==fingerprint)pendingCreation={fingerprint,id:crypto.randomUUID(),draft:{...draft,sortOrder:creationOrder(tasks,draft.category)}};
    const bucket=draft.someday?'someday':dateTiming(draft.waiting?draft.followUp:draft.dueDate,today),destinationView={asap:'today',week:'upcoming',later:'later',someday:'someday'}[bucket],origin=form.getBoundingClientRect(),destination=$(`#composer [data-view=${destinationView}]`);
    const epoch=spaceEpoch,before=formFingerprint(form),createdId=pendingCreation.id;motion.travel(origin,destination);await store.write(createdId,pendingCreation.draft);if(epoch!==spaceEpoch)return;
    pendingCreation=null;if(formFingerprint(form)===before){form.elements.title.value='';composerFields.reset(composerMode());if(category==='todo')composerFields.showView(view);if(composerHome)close();}
    notify('Task added');
    motion.arrival(createdId,$(`[data-view=${raw.waiting?'waiting':draft.dueDate&&draft.dueDate>today?'upcoming':!draft.dueDate?'later':'today'}]`)||$('#open-menu'));
  }catch(error){$('#compose-error').textContent=errorText(error);}finally{delete form.dataset.saving;form.querySelectorAll('[type=submit],.cancel-new-task,.options-toggle').forEach(control=>control.disabled=!!preview);}
});
async function taskEditor(task,{modal=false,existing=null}={}){
  if(preview){open('Task details',`<p class="task-preview">${esc(task.title)}</p>${task.description?`<div class="rich-description">${descriptionHtml(task.description)}</div>`:'<p class="settings-note">No description.</p>'}<p class="settings-note">${task.waiting?(task.followUp?'Follow up '+esc(shortDate(task.followUp)):'Waiting for a response · No follow-up date'):task.dueDate?'Due '+esc(shortDate(task.dueDate)):'Sometime later'}</p><div class="modal-footer"><button class="secondary" data-close>Close</button></div>`);return;}
  if(!existing&&(!await leaveComposer()||!await leaveInline()))return;
  const form=existing||document.createElement('form');form.id='edit-form';form.className='task-edit-form';
  if(!existing){
    form.innerHTML=`<div class="editor-heading"><span>Task details</span><div class="editor-tools"><button type="button" class="icon-button popout-editor" aria-label="Open in modal" title="Open in modal">${icon('maximize-2')}</button></div></div>${fieldsMarkup({task,today,allowPrivate:task.ownerUid===user.uid})}<p class="editor-notice settings-note" role="status"></p><p class="inline-error" role="alert"></p>${editorActions()}`;
    const controller=bindFields(form,{uid:user.uid,members,profiles,today,onTimingSelect:async mode=>{if(mode==='someday'&&(form.elements.date.value||form.elements.waiting.checked)&&!await confirmAction('Move to Someday / Maybe?','Its scheduled date and follow-up will be cleared.','Move to Someday'))return;controller.setTiming(mode);syncSomedayControls(form);}});attachTags(form,task);syncSomedayControls(form);const originalValues=fieldValues(form);
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
 const root=$('#drawer-task-filters');root.hidden=!ready||category==='grocery';if(!ready||category==='grocery')return;
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
 if($('#days-shown'))bindDayWheel($('#days-shown'),prefs.extendedDays,value=>{prefs.extendedDays=value;if(prefs.daysShown>1)prefs.daysShown=Math.max(boardVisible()?2:1,value);persist();render();});
}
function resetWorkspace(){clearTimeout(columnTimer);$('#task-list').classList.remove('column-transition');$('#empty-state').after(dayControls);revealedTask=null;highlightedTask=null;clearTimeout(highlightTimer);desktopFinder.reset();desktopFinder.setVisible(false);grocery?.reset();grocery?.show(false);completionPress?.cancel();tags=[];pendingCompletions.clear();notices.clear();inlineEditor?.form.remove();inlineEditor=null;ready=false;picks=[];dailyState=null;renderedLayout='';picking=false;pickedDay='';spaceEpoch++;tasks=[];members={};profiles={};category='todo';view='today';pendingCreation=null;$('#new-title').value='';composerFields.reset();$('#task-list').replaceChildren();updateNavigation();}
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
function openSearch(selectedTags=[]){
 open('Search tasks','<label class="field search-field"><span class="sr-only">Search tasks</span><input id="task-search" type="search" placeholder="Search tasks" autocomplete="off" maxlength="200" aria-label="Search tasks"></label><details class="search-tags"><summary>Filter by tags</summary><div id="search-tags" class="tag-suggestions"></div><small>Matches all selected tags.</small></details><label class="search-completed"><input id="include-completed" type="checkbox">Include completed tasks</label><div id="search-results" class="search-results" aria-live="polite"><p class="settings-note">Search names and descriptions across your lists.</p></div>');
 $('#dialog').classList.add('search-modal');const input=$('#task-search'),results=$('#search-results');input.focus({preventScroll:true});
 const updateResults=()=>{
  const readable=displayTasks().filter(task=>(task.visibility==='shared'||task.ownerUid===user?.uid)&&($('#include-completed').checked||!task.completed));
  const filtered=readable.filter(task=>matchingTags(task,selectedTags,tags)),searchable=filtered.map(task=>({...task,description:(task.description||'')+' '+taskTags(task,tags).map(tag=>tag.name).join(' ')}));
  const matches=(input.value.trim()?searchTasks(searchable,input.value):selectedTags.length?filtered:[]).sort((a,b)=>Number(a.completed)-Number(b.completed)).slice(0,100);
  let completedHeading=false;
  results.innerHTML=matches.length?matches.map(task=>{
   const heading=task.completed&&!completedHeading?'<h3 class="search-completed-heading">Completed</h3>':'';if(task.completed)completedHeading=true;
   return heading+`<button type="button" data-search-edit="${esc(task.id)}" class="${task.completed?'search-result-completed':''}"><span class="search-result-status" role="img" aria-label="${task.completed?'Completed':'Not completed'}">${icon(task.completed?'circle-check':'circle')}</span><span class="search-result-copy"><strong>${esc(task.title)}</strong><small>${esc(names[task.category])} · ${task.completed?'Completed':task.waiting?'Waiting for a response':task.someday?'Someday / Maybe':({asap:'Today',week:'Week',later:'Later'})[dateTiming(task.dueDate,today)]}</small></span></button>`;
  }).join(''):'<p class="settings-note">No matching tasks.</p>';icons();
 };
 const tagHost=$('#search-tags');
 const paintTags=()=>{tagHost.innerHTML=tags.filter(tag=>!tag.mergedInto).map(tag=>`<button type="button" class="tag-chip" data-search-tag="${esc(tag.id)}" aria-pressed="${selectedTags.includes(tag.id)}">${esc(tag.name)}${tag.archived?' · Archived':''}</button>`).join('')||'<p class="settings-note">No tags yet.</p>';};
 paintTags();tagHost.onclick=event=>{const button=event.target.closest('[data-search-tag]');if(!button)return;const id=button.dataset.searchTag;selectedTags=selectedTags.includes(id)?selectedTags.filter(tag=>tag!==id):[...selectedTags,id];paintTags();updateResults();};
 if(selectedTags.length){$('.search-tags').open=true;updateResults();input.blur();}
 input.oninput=updateResults;$('#include-completed').onchange=updateResults;
 results.onclick=event=>{const button=event.target.closest('[data-search-edit]'),task=tasks.find(task=>task.id===button?.dataset.searchEdit);if(task)void taskEditor(task,{modal:true});};
}
function manageTags(){
 open('Manage tags','<p class="settings-note">Household tags are shared. Personal tags stay yours. Renaming also updates completed entries; archiving hides suggestions, not history.</p><div id="tag-directory"></div><p class="inline-error" id="tag-manager-error" role="alert"></p><div class="modal-footer"><button class="secondary" data-action="settings">Back to settings</button><button class="primary" data-close>Done</button></div>');
 const paint=()=>{
  $('#tag-directory').innerHTML=tags.filter(tag=>!tag.mergedInto).map(tag=>{const count=tasks.filter(task=>taskTags(task,tags).some(item=>item.id===tag.id)).length;return `<div class="tag-directory-row"><div><strong>${esc(tag.name)}</strong><small>${tag.visibility==='private'?'Personal':'Household'} · ${count} visible task${count===1?'':'s'}${tag.archived?' · Archived':''}</small></div><button type="button" class="icon-button" data-rename-tag="${tag.id}" aria-label="Rename ${esc(tag.name)}" title="Rename">${icon('pencil')}</button><button type="button" class="icon-button" data-archive-tag="${tag.id}" aria-label="${tag.archived?'Restore':'Archive'} ${esc(tag.name)}" title="${tag.archived?'Restore':'Archive'}">${icon(tag.archived?'archive-restore':'archive')}</button><button type="button" class="icon-button" data-merge-tag="${tag.id}" aria-label="Merge ${esc(tag.name)}" title="Merge">${icon('merge')}</button></div>`;}).join('')||'<p class="settings-note">Add tags from any task’s details.</p>';icons();
  $('#tag-directory').querySelectorAll('button').forEach(button=>button.disabled=!!preview);
 };
 paint();$('#tag-directory').onclick=async event=>{
  const button=event.target.closest('button');if(!button||preview)return;const id=button.dataset.renameTag||button.dataset.archiveTag||button.dataset.mergeTag,tag=tags.find(tag=>tag.id===id);if(!tag)return;
  if(button.dataset.archiveTag){try{await store.saveTag(id,{archived:!tag.archived});paint();}catch(error){$('#tag-manager-error').textContent=errorText(error);}return;}
  const merge=!!button.dataset.mergeTag,targets=tags.filter(item=>item.id!==id&&!item.archived&&!item.mergedInto&&item.visibility===tag.visibility&&(tag.visibility==='shared'||item.ownerUid===tag.ownerUid));
  open(merge?'Merge tag':'Rename tag',`<form id="tag-edit"><label class="field">${merge?'Merge “'+esc(tag.name)+'” into':'Tag name'}${merge?`<select name="target" required><option value="">Choose tag</option>${targets.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select>`:`<input name="tagName" maxlength="50" required value="${esc(tag.name)}">`}</label><p class="settings-note">${merge?'Tasks using either tag will use the destination label, including completed tasks. This cannot be undone.':'Updates the label everywhere without changing task contents.'}</p><p class="inline-error" role="alert"></p><div class="modal-footer"><button class="primary" type="submit">Save</button><button class="secondary" type="button" id="cancel-tag-edit">Cancel</button></div></form>`);
  $('#cancel-tag-edit').onclick=manageTags;
  $('#tag-edit').onsubmit=async event=>{
   event.preventDefault();const form=event.currentTarget;form.querySelector('[type=submit]').disabled=true;
   try{
    const patch=merge?{mergedInto:form.elements.target.value,archived:true}:{name:tagName(form.elements.tagName.value)};
    if(merge&&!targets.some(item=>item.id===patch.mergedInto))throw new Error('Choose a destination tag.');
    if(!merge&&(!patch.name||tags.some(item=>item.id!==id&&!item.mergedInto&&item.visibility===tag.visibility&&tagKey(item.name)===tagKey(patch.name))))throw new Error('Use a nonempty, unique tag name.');
    await store.saveTag(id,patch);manageTags();
   }catch(error){form.querySelector('.inline-error').textContent=errorText(error);form.querySelector('[type=submit]').disabled=false;}
  };
 };
}
function settings(){
  open('Settings',`<details class="settings-group" open><summary>Appearance</summary><fieldset><legend>Style</legend><div class="style-choices">${styles.map(([id,name])=>`<button type="button" data-style="${id}" aria-pressed="${Number(prefs.style)===id}"><span class="style-sample style-${id}" aria-hidden="true"></span>${name}</button>`).join('')}</div></fieldset><fieldset><legend>Color schemes</legend><div class="palette-choices">${[['original','Original'],['garden','Garden'],['cherry','Cherry'],['night','Night']].map(([id,label])=>`<button class="palette ${id}" data-palette="${id}" aria-label="${label}" title="${label}" aria-pressed="${prefs.palette===id}"><span></span><small>${label}</small></button>`).join('')}</div></fieldset></details>${animationSettings()}${category==='grocery'?'':viewMarkup()}<details class="settings-group" id="list-settings"><summary>${esc(names[category])} settings</summary>${category==='grocery'?grocery.settings():''}${category==='todo'?`<label class="toggle-row">Show Someday / Maybe<input type="checkbox" role="switch" id="show-someday" ${accountSettings.showSomeday?'checked':''} ${preview?'disabled':''}></label><p class="settings-note">An optional list for ideas you have not committed to. Hiding it keeps every item saved. This choice syncs to your account.</p><label class="toggle-row">Desktop board<input type="checkbox" role="switch" id="desktop-board" ${prefs.desktopBoard!==false?'checked':''}></label><button class="secondary" type="button" id="manage-tags">${icon('tags')}Manage tags</button><div class="days-setting"><label>Extended view: number of days</label>${dayWheel(prefs.extendedDays)}</div>`:''}<fieldset class="completion-setting"><legend>Completion button</legend><div class="choice-track" role="group" aria-label="Completion button position" style="--choice:${['auto','left','right'].indexOf(completionSetting())}"><span class="choice-indicator" aria-hidden="true"></span>${[['auto','Auto'],['left','Left'],['right','Right']].map(([id,label])=>`<button type="button" data-completion-side="${id}" aria-pressed="${completionSetting()===id}">${label}</button>`).join('')}</div></fieldset><fieldset class="editor-mode"><legend>Open task details</legend><div class="choice-track two-choices" style="--choice:${listPrefs().editor==='modal'?1:0}" role="group" aria-label="Task editor"><span class="choice-indicator" aria-hidden="true"></span><button data-editor-mode="inline" aria-pressed="${listPrefs().editor==='inline'}">Inline</button><button data-editor-mode="modal" aria-pressed="${listPrefs().editor==='modal'}">Modal</button></div></fieldset>${category==='todo'?`<label class="toggle-row">Swipe for quick actions<input id="swipe-defer" type="checkbox" role="switch" ${prefs.swipeDefer?'checked':''}></label><label class="toggle-row">Show Quick Action button<input type="checkbox" role="switch" data-preference="quickWeek" ${quickActionsVisible()?'checked':''}></label>`:''}</details>${!preview?'<details class="settings-group"><summary>Offline &amp; sync</summary><p class="settings-note">Lists are saved on this device for offline use. Pending edits upload when you reconnect with the app open. Signing out clears saved lists and requires pending changes to finish first.</p><div class="offline-actions"><button class="secondary" id="review-pending">Pending changes</button><button class="secondary" id="retry-sync">Retry sync</button></div></details>':''}<details class="settings-group"><summary>Account &amp; privacy</summary><p class="account-email">${esc(signedInAccount?.email||user?.email)}</p>${householdPicker()}<p class="settings-note">Personal tasks are hidden from other household members. Tal, the administrator, can view all users' personal and shared tasks. Assigning or sharing makes a task visible to household members.</p><button class="secondary" id="sign-out">Sign out</button><p class="inline-error" id="sign-out-error" role="alert"></p></details><details class="settings-group"><summary>Scheduling</summary><p class="settings-note">Today shows today’s tasks. Week shows future dates within the next five business days; later dates and undated tasks appear in Later. Waiting is a flag across these lists, using its follow-up date. Adding with Week still chooses one of the next five weekdays, including today on weekdays. Punt chooses one of the next five business days, excluding today. Calendar: America/Los_Angeles; weekends are excluded, not public holidays.</p><p class="settings-note">One daily task marked From Later comes from your personal later tasks, shared tasks assigned to you, and unassigned shared tasks. It stays stable across devices and does not become overdue.</p></details>${preview?'':adminSection(signedInAccount||user)}<div class="modal-footer"><button class="primary" data-close>Done</button></div>`);$('#dialog').classList.add('settings-modal');const listSettings=$('#list-settings');listSettings.open=true;$('#dialog-body').firstElementChild.after(listSettings);if(category==='grocery'){$('.editor-mode')?.remove();for(const detail of $('#dialog-body').querySelectorAll('details.settings-group'))if(detail.querySelector(':scope>summary')?.textContent==='Scheduling')detail.remove();}addSettingHelp();bindViews();
  document.querySelectorAll('[data-style]').forEach(button=>button.onclick=()=>{void saveAccountPreferences({style:Number(button.dataset.style)});document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  bindDaysSetting();
  document.querySelectorAll('button[data-completion-side]').forEach(button=>button.onclick=()=>{prefs.completionSide=button.dataset.completionSide;persist();appearance();render();$('.completion-setting .choice-track').style.setProperty('--choice',['auto','left','right'].indexOf(completionSetting()));document.querySelectorAll('button[data-completion-side]').forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));});
  $('#show-someday')?.addEventListener('change',event=>void saveAccountPreferences({showSomeday:event.target.checked}));
  $('#desktop-board')?.addEventListener('change',event=>{prefs.desktopBoard=event.target.checked;persist();render();});
  $('#manage-tags')?.addEventListener('click',manageTags);
  bindAnimations();
  $('#review-pending')?.addEventListener('click',()=>void reviewPending());
  $('#retry-sync')?.addEventListener('click',async()=>{try{await store.retrySync?.();}catch(error){notify(errorText(error));}});
  $('#swipe-defer')?.addEventListener('change',event=>{prefs.swipeDefer=event.target.checked;persist();});
  document.querySelectorAll('button[data-palette]').forEach(button=>button.onclick=()=>{void saveAccountPreferences({palette:button.dataset.palette});document.querySelectorAll('button[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('[data-preference=quickWeek]')?.addEventListener('change',event=>{prefs.quickWeek=event.target.checked;persist();render();});
  document.querySelectorAll('[data-editor-mode]').forEach(button=>button.onclick=async()=>{if(!await leaveInline())return;saveListPrefs({editor:button.dataset.editorMode});$('.editor-mode .choice-track').style.setProperty('--choice',button.dataset.editorMode==='modal'?1:0);document.querySelectorAll('[data-editor-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('#sign-out').onclick=async()=>{try{await store.logout();close();}catch(error){const region=$('#sign-out-error');if(region)region.textContent=errorText(error);}};$('#household-select').onchange=event=>switchHousehold(event.target.value);bindAdmin({account:signedInAccount,store,onOpen:switchHousehold,onPreview:profile=>store.viewAs(profile),liveUrl:config.liveUrl,confirmAction,onAsanaReview:()=>void openAsanaReview({store,open,confirmAction}),onAsanaImport:preparedImport});
}
function bindColumnOrder(){
 if(category!=='todo'||$('#desktop-column-order'))return;
 const panel=document.createElement('details');panel.id='desktop-column-order';panel.innerHTML=`<summary>Desktop column order</summary><div class="column-order-rows"></div><button type="button" class="icon-button column-order-reset" aria-label="Reset column order" title="Reset column order">${icon('rotate-ccw')}</button><span class="sr-only" role="status" aria-live="polite"></span>`;$('#desktop-board').closest('.toggle-row').after(panel);
 const paint=()=>{panel.querySelector('.column-order-rows').innerHTML=columnOrder().map((lane,index,order)=>`<div class="column-order-row" data-column-order-row="${lane}" tabindex="-1"><span>${esc(laneLabels[lane])}</span><button type="button" class="icon-button" data-order-column="${lane}" data-order-step="-1" aria-label="Move ${esc(laneLabels[lane])} up" title="Move earlier" ${index===0?'disabled':''}>${icon('arrow-up')}</button><button type="button" class="icon-button" data-order-column="${lane}" data-order-step="1" aria-label="Move ${esc(laneLabels[lane])} down" title="Move later" ${index===order.length-1?'disabled':''}>${icon('arrow-down')}</button></div>`).join('');icons();};
 panel.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;let order=columnOrder(),lane=button.dataset.orderColumn;
  if(button.classList.contains('column-order-reset'))order=normalizeColumnOrder();
  else if(lane){const from=order.indexOf(lane),to=from+Number(button.dataset.orderStep);if(to<0||to>=order.length)return;[order[from],order[to]]=[order[to],order[from]];}else return;
  prefs.desktopColumnOrder={...prefs.desktopColumnOrder,[user.uid]:order};persist();render();paint();
  if(lane){const row=panel.querySelector(`[data-column-order-row="${lane}"]`),next=row.querySelector(`[data-order-step="${button.dataset.orderStep}"]:not(:disabled)`);(next||row).focus({preventScroll:true});panel.querySelector('[role=status]').textContent=laneLabels[lane]+' is column '+(order.indexOf(lane)+1)+' of '+order.length;}
 });paint();
}
function addSettingHelp(){
 bindColumnOrder();
 const help={
  'Style':'Changes layout and typography across devices signed into your account.',
  'Color schemes':'Changes colors, including Night, across devices signed into your account.',
  'Show Someday / Maybe':'Shows a separate optional list. Items are never scheduled or selected as the daily Later task. Hiding it does not delete them.',
  'Desktop board':'On wide screens, show Today, Week, Waiting, Later and optional Someday side by side. Phones keep a single list.',
  'Desktop column order':'Saved for your account on this device. In the expanded view, Today and Week merge at whichever of their positions comes first. Hidden Someday keeps its saved position. Reset restores Today, Week, Waiting, Later, Someday.',
  'Extended view: number of days':'Sets how many calendar days Show days opens in Today. Weekends are grouped together.',
  'Completion button':'Auto puts a wider completion check on the right below 768px, and keeps the circle on the left on larger screens. Override Left or Right for this device. Press, then release to complete; slide outside before releasing to cancel. Task text still opens editing.',
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
  if(button.dataset.days)await changeDays(button.dataset.days!=='today');
  if(button.dataset.toggleColumn)await toggleColumn(button.dataset.toggleColumn);
  if(button.dataset.view&&!button.closest('#composer')){if(!await leaveInline())return;view=button.dataset.view;composerFields.setTiming(composerMode());if(button.closest('#dialog'))close();render();}
  if(button.dataset.category){if(!await leaveInline())return;if(category==='grocery'&&grocery.hasDraft()&&!await confirmAction('Leave this grocery draft?','The item has not been added.','Discard'))return;if(($('#new-title').value||$('#new-description').value)&&!await confirmAction('Discard this new task?','The new item has not been added.','Discard'))return;if(category==='grocery')grocery.discardDraft();category=button.dataset.category;view=category==='todo'?'today':'later';composerFields.reset();$('#new-title').value='';render();}
  if(button.dataset.filterTag)openSearch([button.dataset.filterTag]);
  if(button.dataset.edit){const task=tasks.find(t=>t.id===button.dataset.edit);if(task)await changeEditor(async()=>{if(inlineEditor?.id===task.id)await leaveInline();else await taskEditor(task,{modal:!!button.closest('[data-waiting-copy]')});});}
  if(button.dataset.skipLater){const task=tasks.find(t=>t.id===button.dataset.skipLater);if(task)void skipLater(task);}
  if(button.dataset.complete){const task=tasks.find(t=>t.id===button.dataset.complete);if(task&&task.completed===button.classList.contains('checked'))void completeTask(task,button.getBoundingClientRect());else render();}
  if(button.dataset.quick){const task=tasks.find(t=>t.id===button.dataset.id);if(task)await deferTask(task);}
  if(button.dataset.move){const task=tasks.find(t=>t.id===button.dataset.move),form=$('#edit-form');if(task&&await leaveInline()){if(form?.isConnected&&formFingerprint(form)!==form._initial&&!await confirmAction('Discard unsaved changes?','Your task has not been changed.','Discard'))return;moveOptions(task);}}
  if(button.dataset.groceryAction&&button.closest('#dialog'))grocery.action(button.dataset.groceryAction);
  if(button.dataset.action==='settings')settings();
  if(button.dataset.action==='share')share();
  if(button.dataset.action==='leave-playground'&&await leaveInline()){
    const target=households.find(h=>h.id===lastRealSpace)?.id||households.find(h=>h.id!==PLAYGROUND_ID)?.id;
    if(target)switchHousehold(target);else open('Your households','<p class="settings-note">Playground is your only available household. You can stay here, or open Settings to sign out.</p><div class="modal-footer"><button class="secondary" data-close>Close</button><button class="primary" data-action="settings">Settings</button></div>');
  }
});
function gate(message,extra=''){$('#workspace').hidden=true;$('#gate').hidden=false;$('#gate').innerHTML=`<img src="assets/icon-192.png" width="64" height="64" alt=""><h1>Lists</h1><p>${esc(message)}</p>${extra}`;icons();}
$('#task-list').addEventListener('keydown',event=>{if(event.altKey&&event.key.toLowerCase()==='m'&&!preview){const row=event.target.closest('.task-row'),task=tasks.find(task=>task.id===row?.dataset.task);if(task){event.preventDefault();moveOptions(task,row);}}});
function accessGate(message){gate(message,'<button class="secondary" data-action="settings">Settings</button><p id="access-error" class="inline-error" role="alert"></p>');}
function showWorkspace(){$('#gate').hidden=true;$('#gate').replaceChildren();$('#workspace').hidden=false;updatePeople();render();}
let preparedImportRequested=new URL(location.href).searchParams.get('import')==='asana',preparedImportBusy=false;
function preparedImport(){
 if(!ready||preview||!isAdministrator(signedInAccount))return;
 openAsanaImport({store,open,account:signedInAccount,household:currentSpace,onBusy:value=>{preparedImportBusy=value;}});
}
function requestedImport(){
 if(!preparedImportRequested||preview||!isAdministrator(signedInAccount))return;
 preparedImportRequested=false;const url=new URL(location.href);url.searchParams.delete('import');history.replaceState(null,'',url);
 setTimeout(preparedImport,0);
}
async function start(){
  $('#mode-status').textContent='Private household · Google sign-in';
  if(!config.firebase){gate('Google sign-in is not connected yet.',`<a class="text-link" href="FIREBASE_SETUP.md">Firebase setup instructions</a>`);return;}
  gate('Connecting securely…');
  try{
    const {connectFirebase}=await import('./firebase.js?v=daily2');
    store=await connectFirebase(config,{
      tasks:onTasks,status,sync:syncStatus,daily:receiveDaily,groceries(value){grocery?.receive(value);},organizer(value){tags=value.tags;applyAccountSettings(value.settings);},
      refreshDaily(){pickedDay='';if(ready)void dailyPick();},
      preview(profile){preview=profile;user=profile||signedInAccount;document.documentElement.toggleAttribute('data-preview',!!profile);$('#preview-banner').hidden=!profile;$('#preview-name').textContent=profile?'Viewing as '+profile.name:'';close();},
      account(account){$('#playground-banner').hidden=true;lastRealSpace='';close();$('#confirmation').close();signedInAccount=account;preview=null;user=account;accountSettings={...accountDefaults};if(account){try{accountSettings={...accountDefaults,...JSON.parse(localStorage.getItem('lists-account-settings-'+account.uid)||'{}')};}catch{}}applyAccountSettings(accountSettings);updateNavigation();resetWorkspace();households=[];if(account){updatePeople();accessGate('Checking household access…');}else gate('Personal lists stay hidden from other household members. Tal, the administrator, can view all users’ tasks.',`<button class="primary" id="google-login">${icon('log-in')} Continue with Google</button>`);$('#google-login')?.addEventListener('click',async()=>{try{await store.login();}catch(error){notify(errorText(error));}});},
      households(value){households=value;const select=$('#household-select');if(select){select.parentElement.outerHTML=householdPicker();$('#household-select').onchange=event=>switchHousehold(event.target.value);}},
      space(value){currentSpace=value;$('#playground-banner').hidden=!isPlayground(value);if(value.id!==PLAYGROUND_ID&&value.schemaVersion)lastRealSpace=value.id;updateInstallManifest();$('#mode-status').textContent='Private household · '+(value.title||value.id);},
      loading(){resetWorkspace();close();accessGate('Loading household…');},
      unavailable(message){resetWorkspace();if(!$('#dialog').classList.contains('settings-modal'))close();accessGate(message);},
      members(value,details={}){members=value;profiles=details;updatePeople();render();},
      ready(){ready=true;showWorkspace();void dailyPick();requestedImport();},
      error(error){status(errorText(error));const region=$('#access-error');if(region)region.textContent=errorText(error)+(isAdministrator(signedInAccount)?' Open Settings → Admin after publishing the updated rules.':' Ask your household administrator to check your Google email invitation.');else notify(errorText(error));},
    });
  }catch(error){gate('Could not connect to Google sign-in. Check your connection and try again.',`<button class="primary" onclick="location.reload()">Try again</button>`);status(errorText(error));}
}
function checkDay(){const current=dayKey(Date.now(),config.timeZone);if(today!==current){today=current;composerFields.setDay(current);$('#edit-form')?._controller?.setDay(current);pickedDay='';picks=[];dailyState=null;renderedLayout='';render();void dailyPick();}}
completionPress=bindCompletionPress($('#task-list'),{context:()=>spaceEpoch,onIdle:()=>render()});
phoneMedia.addEventListener('change',()=>{completionPress.cancel();appearance();render();});
gestures=taskGestures({canSwipe:()=>ready&&prefs.swipeDefer&&category==='todo'&&view!=='someday'&&!preview,canMove:()=>ready&&category!=='grocery'&&!preview,findTask:id=>tasks.find(task=>task.id===id),onDefer:deferTask,onMove:moveTask,onIdle:()=>{skipDropAnimation=true;render();},motion,context:()=>spaceEpoch,swipeLabel:task=>actionView(task)==='today'?'Punt to Week':'Move to Today',swipeDirection:task=>actionView(task)==='upcoming'?'left':'right'});
let returnToToday=false;
function resumeToday(){
 if(category==='grocery'){returnToToday=false;return;}
 if(!returnToToday||document.hidden||!ready||document.querySelector('dialog[open]')||inlineEditor||editorTransition||gestures?.isActive()||busy.size||$('#composer').dataset.saving||$('#new-title').value.trim()||$('#new-description').value.trim())return;
 returnToToday=false;category='todo';view='today';composerFields.reset('asap');render();window.scrollTo({top:0,behavior:'instant'});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)returnToToday=true;else resumeToday();});window.addEventListener('pageshow',()=>resumeToday());
let midnightTimer;
function watchDay(){clearTimeout(midnightTimer);checkDay();if(!document.hidden)midnightTimer=setTimeout(watchDay,60000);}
document.addEventListener('visibilitychange',watchDay);window.addEventListener('online',()=>{if(ready)void dailyPick();});boardMedia.addEventListener('change',()=>render());matchMedia('(min-width:768px)').addEventListener('change',()=>{if(prefs.quickWeek===null){render();const input=$('[data-preference=quickWeek]');if(input)input.checked=quickActionsVisible();}});watchDay();void start();
void setupUpdates({canReload:async()=>{
 const reason=()=>!navigator.onLine?'Reconnect before updating.':
  grocery?.hasDraft()||preparedImportBusy||metadataPending||busy.size||picking||editorTransition||gestures?.isActive()||completionPress?.isActive()||document.querySelector('[data-saving]')?'Finishing your current action before updating.':
  $('#new-title').value.trim()||$('#new-description').value.trim()||$('#composer').elements.date.value||$('#composer').elements.followUp.value||$('#composer').elements.waiting.checked||$('#composer').elements.person.value!=='private'||JSON.parse($('#composer').elements.tagIds?.value||'[]').length||!$('#new-options').hidden||inlineEditor||[...document.querySelectorAll('dialog[open] form:not([method="dialog"])')].some(form=>form.getClientRects().length)?'Finish or cancel your draft before updating.':
  syncState?.pending||syncState?.syncing&&!syncState?.connecting?'Wait for your changes to sync before updating.':'';
 const blocked=reason();if(blocked)return blocked;
 const pending=await store?.pendingChanges?.();
 return reason()||(pending?.length?'Wait for your changes to sync before updating.':'');
}});
