import {config} from '../config.js?v=lists-95c4f';
import {dayKey,addDays,taskDraft,schedule,inView,isToday,shortDate} from './core.js';
import {sandboxStore} from './store.js';
import {isAdministrator} from './households.js';
import {adminSection,bindAdmin} from './admin.js?v=viewas4';

const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name)=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const icons=()=>window.lucide?.createIcons({attrs:{'stroke-width':1.8}});
const design=Number(document.body.dataset.design||1), sandbox=new URLSearchParams(location.search).get('mode')!=='live';
const preferenceKey='lists-preferences-v1';
let prefs={palette:'original',motion:'playful',quickWeek:true,quickWaiting:true,sandboxUser:'tal'};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(preferenceKey)||'{}')};}catch{}
let user=null,members={},tasks=[],store=null,view='today',scope='mine',person='all',category='todo',today=dayKey(Date.now(),config.timeZone),picks=[],picking=false,pickedDay='',busy=new Set(),ready=false,pendingCreation=null,households=[],currentSpace={id:config.space},spaceEpoch=0;
let signedInAccount=null,preview=null;
function persist(){try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch{notify('Settings could not be saved on this device.');}}
function appearance(){document.documentElement.dataset.palette=prefs.palette;document.documentElement.dataset.motion=prefs.motion;}
appearance();
const names={todo:'To-do',grocery:'Groceries',movies:'Movies',other:'Other lists'};
const glyphs={todo:'list-checks',grocery:'shopping-basket',movies:'clapperboard',other:'layers'};
$('#app').innerHTML=`<div class="app-frame"><header class="topbar"><a class="brand" href="../../" aria-label="All design options"><img src="../../assets/icon-192.png" alt="" width="32" height="32"><span>Lists</span></a><button class="profile quiet" data-action="account">${icon('user-round')}<span id="profile-name">Account</span></button></header><div id="mode-status" class="mode-status"></div><section id="gate" hidden></section><main id="workspace" hidden><div class="page-heading"><div><p class="date-line" id="date-line"></p><h1 id="section-name">To-do</h1></div><span id="heading-symbol" aria-hidden="true">${icon('check-check')}</span></div><div class="scope-strip" id="scope-strip"><div class="segmented" role="group" aria-label="Task visibility"><button data-scope="mine" aria-pressed="true">Mine</button><button data-scope="shared" aria-pressed="false">Shared</button></div><label class="person-filter" hidden>Person <select id="person-filter"></select></label></div><form id="composer" class="composer"><div class="compose-line"><input id="new-title" name="title" aria-label="New task" placeholder="Add a to-do…" maxlength="200" autocomplete="off" required><button type="submit" class="primary icon-button" aria-label="Add task" title="Add task">${icon('plus')}</button></div><div class="compose-options"><label class="sr-only" for="new-when">When</label><select id="new-when"><option value="asap">ASAP</option><option value="week">Next 5 weekdays</option><option value="later">Sometime later</option><option value="date">Choose date…</option></select><input id="new-date" type="date" aria-label="Due date" hidden><label class="sr-only" for="new-person">Share or assign</label><select id="new-person"></select></div><p class="inline-error" id="compose-error" role="alert"></p></form><nav class="view-tabs" aria-label="Task schedule"><button data-view="today" aria-current="page">Today</button><button data-view="upcoming">Upcoming</button><button data-view="later">Later</button><button data-view="waiting">Waiting</button><button data-view="done" aria-label="Completed tasks" title="Completed tasks">${icon('check-check')}</button></nav><div class="list-heading"><h2 id="view-title">Today</h2><span id="task-count"></span><button class="simple-completed quiet" data-action="completed" hidden>Completed</button></div><div id="task-list" class="task-list"></div><p id="empty-state" class="empty-state" hidden></p><footer class="utilities"><button data-action="settings">${icon('settings-2')}<span>Settings</span></button><button data-action="share">${icon('share-2')}<span>Save / Share</span></button><a href="../../">${icon('layout-grid')}<span>Designs</span></a></footer><p class="connection" id="connection" role="status"></p></main><nav class="bottom-nav" aria-label="Lists">${Object.entries(names).map(([id,name])=>`<button data-category="${id}" ${id==='todo'?'aria-current="page"':''}>${icon(glyphs[id])}<span>${name}</span></button>`).join('')}</nav></div><dialog id="dialog"><div class="modal-header"><h2 id="dialog-title"></h2><button data-close class="icon-button quiet close-button" aria-label="Close">${icon('x')}</button></div><div id="dialog-body"></div></dialog><dialog id="confirmation"><form method="dialog"><h2 id="confirmation-title"></h2><p id="confirmation-text"></p><div class="modal-footer"><button value="cancel" class="secondary">Cancel</button><button value="confirm" class="danger">Remove</button></div></form></dialog><div id="toast" role="status" aria-live="polite"></div>`;
$('#mode-status').insertAdjacentHTML('afterend','<aside id="preview-banner" class="preview-banner" hidden><div><strong id="preview-name"></strong><span>Read-only · Personal and shared tasks</span></div><button class="secondary" id="exit-preview">Exit preview</button></aside>');
$('#exit-preview').addEventListener('click',()=>{store.exitPreview();const url=new URL(location.href);url.searchParams.set('household',currentSpace.id);history.replaceState(null,'',url);});
icons();
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function errorText(error){const code=error?.code||'';if(code.includes('permission-denied'))return 'Access is not set up yet. Check household membership and Firestore rules.';if(code.includes('popup-blocked'))return 'Allow the Google sign-in window, then try again.';if(code.includes('unauthorized-domain'))return 'Add this domain under Firebase Authentication → Settings → Authorized domains.';return error?.message||'Something went wrong. Please try again.';}
function status(message){$('#connection').textContent=message==='Live'?'Live · Changes sync between devices':message;}
function optionPeople(selected='private',allowPrivate=true){return `${allowPrivate?'<option value="private">Personal · not shared</option>':''}<option value="shared">Shared · anyone</option>${Object.entries(members).map(([id,name])=>`<option value="${esc(id)}">Assign to ${esc(name)}</option>`).join('')}`;}
function updatePeople(){const select=$('#new-person'),old=select.value;select.innerHTML=optionPeople();select.value=old||'private';if(!select.value)select.value='private';$('#person-filter').innerHTML=`<option value="all">Everyone</option><option value="unassigned">Unassigned</option>${Object.entries(members).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('')}`;$('#person-filter').value=person;$('#profile-name').textContent=members[user?.uid]||user?.displayName?.split(' ')[0]||'Account';}
function visibleTasks(){return tasks.filter(t=>t.category===category&&(t.visibility==='shared'||t.ownerUid===user?.uid));}
function mine(t){return t.visibility==='private'&&t.ownerUid===user?.uid||t.visibility==='shared'&&(!t.assigneeUid||t.assigneeUid===user?.uid);}
function render(){
  if(!user)return;
  $('#date-line').textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:config.timeZone}).format(new Date());
  $('#section-name').textContent=names[category];$('#heading-symbol').innerHTML=icon(glyphs[category]);
  const todo=category==='todo';$('#scope-strip').hidden=!todo;$('.view-tabs').hidden=!todo;$('.simple-completed').hidden=todo;$('.simple-completed').textContent=view==='done'?'Open items':'Completed';
  $('#new-when').hidden=!todo;$('#new-title').placeholder=todo?'Add a to-do…':'Add an item…';$('#new-title').setAttribute('aria-label',todo?'New task':'New item');
  $('#new-date').hidden=!todo||$('#new-when').value!=='date';
  $('.person-filter').hidden=scope!=='shared';
  const all=visibleTasks();let list=all.filter(t=>!todo?!t.completed:(scope==='mine'?mine(t):t.visibility==='shared'&&(person==='all'||(person==='unassigned'?!t.assigneeUid:t.assigneeUid===person)))&&inView(t,view,today,picks));
  if(!todo&&view==='done')list=all.filter(t=>t.completed);
  list.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.createdAt-b.createdAt||a.id.localeCompare(b.id));
  const captions={today:'Today',upcoming:'Coming up',later:'Sometime later',waiting:'Waiting for a response',done:'Completed'};
  $('#view-title').textContent=todo?captions[view]:view==='done'?'Completed':names[category];$('#task-count').textContent=String(list.length);
  $('#task-list').innerHTML=list.map(t=>{
    const suggestion=todo&&view==='today'&&!t.dueDate&&!t.waiting&&picks.includes(t.id);
    const date=t.waiting?`Follow up ${shortDate(t.followUp)}`:t.dueDate&&t.dueDate!==today?`${t.dueDate<today?'Since':'Due'} ${shortDate(t.dueDate)}`:'';
    const assigned=t.visibility==='shared'?(t.assigneeUid?members[t.assigneeUid]||'Shared':'Shared'):'',metadata=[suggestion?'A little nudge':null,date,assigned].filter(Boolean);
    return `<article class="task-row ${t.completed?'completed':''} ${suggestion?'suggestion':''}" data-task="${esc(t.id)}"><button class="task-check ${t.completed?'checked':''}" data-complete="${esc(t.id)}" aria-label="${t.completed?'Reopen':'Complete'} ${esc(t.title)}" ${busy.has(t.id)?'disabled':''}>${icon(t.completed?'check':'circle')}</button><button class="task-content" data-edit="${esc(t.id)}"><span class="task-title">${esc(t.title)}</span>${metadata.length?`<span class="task-meta">${metadata.map(esc).join(' · ')}</span>`:''}</button>${todo&&!t.completed?`<div class="quick-actions">${prefs.quickWeek?`<button data-quick="week" data-id="${esc(t.id)}" class="icon-button" aria-label="Move ${esc(t.title)} to next week" title="Next week">${icon('calendar-arrow-up')}</button>`:''}${prefs.quickWaiting?`<button data-quick="waiting" data-id="${esc(t.id)}" class="icon-button" aria-label="Waiting for a response: ${esc(t.title)}" title="Waiting for a response">${icon('hourglass')}</button>`:''}</div>`:''}</article>`;
  }).join('');
  $('#empty-state').hidden=list.length>0;$('#empty-state').innerHTML=`${icon(view==='done'?'check-check':'sparkles')}<strong>${view==='today'?'A little breathing room.':view==='waiting'?'Nothing waiting on anyone.':view==='done'?'Finished tasks will land here.':'Nothing here yet.'}</strong>${view==='today'?'<span>Add something above, or enjoy the clear list.</span>':''}`;
  document.querySelectorAll('[data-view]').forEach(b=>b.toggleAttribute('aria-current',b.dataset.view===view));
  document.querySelectorAll('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scope===scope)));
  document.querySelectorAll('[data-category]').forEach(b=>b.toggleAttribute('aria-current',b.dataset.category===category));
  $('#composer').querySelectorAll('input,select,button').forEach(control=>{if(preview){control.disabled=true;control.dataset.previewDisabled='true';}else if(control.dataset.previewDisabled){control.disabled=false;delete control.dataset.previewDisabled;}});
  $('#task-list').querySelectorAll('button').forEach(control=>{if(preview){control.disabled=true;control.title='Read-only preview';}});icons();
}
async function dailyPick(){
  const token=`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`;
  if(!ready||!user||picking===token||pickedDay===token)return;
  const uid=user.uid,day=today;picking=token;
  try{const id=await store.pick(day,uid);if(picking===token&&token===`${today}_${user?.uid}_${currentSpace.id}_${spaceEpoch}`){picks=id?[id]:[];pickedDay=token;render();}}catch(error){if(picking===token)status(errorText(error));}finally{if(picking===token)picking=false;}
}
function onTasks(value){tasks=value;render();if(ready)void dailyPick();}
function open(title,body){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;$('#dialog').classList.remove('settings-modal');icons();if(!$('#dialog').open)$('#dialog').showModal();$('#dialog').scrollTop=0;}
function close(){$('#dialog').close();}
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
document.addEventListener('click',e=>{if(e.target.closest('[data-close]'))close();});
function confirmRemove(title,text){const dialog=$('#confirmation');$('#confirmation-title').textContent=title;$('#confirmation-text').textContent=text;dialog.returnValue='cancel';dialog.showModal();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));}
async function mutate(task,patch,done){
  if(preview)return false;
  if(busy.has(task.id))return;const epoch=spaceEpoch;busy.add(task.id);render();
  try{await store.write(task.id,patch,task.rev);if(epoch===spaceEpoch)done?.();return true;}catch(error){if(epoch!==spaceEpoch)return false;const region=$('#dialog').open?$('#dialog .inline-error'):null;if(region)region.textContent=errorText(error);else notify(errorText(error));return false;}finally{busy.delete(task.id);render();}
}
$('#new-when').addEventListener('change',()=>{$('#new-date').hidden=$('#new-when').value!=='date';if(!$('#new-date').hidden){$('#new-date').value||=today;$('#new-date').focus();}});
$('#composer').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('#composer button[type=submit]');if(preview||button.disabled)return;$('#compose-error').textContent='';
  try{
    const assigned=$('#new-person').value;
    const raw={title:$('#new-title').value,category,ownerUid:user.uid,assigneeUid:['private','shared'].includes(assigned)?null:assigned,shared:assigned==='shared',mode:category==='todo'?$('#new-when').value:'later',exact:$('#new-date').value,day:today};
    const fingerprint=JSON.stringify(raw);
    if(pendingCreation?.fingerprint!==fingerprint)pendingCreation={fingerprint,id:crypto.randomUUID(),draft:taskDraft(raw)};
    const epoch=spaceEpoch;button.disabled=true;await store.write(pendingCreation.id,pendingCreation.draft);if(epoch!==spaceEpoch)return;pendingCreation=null;if($('#new-title').value===raw.title)$('#new-title').value='';if($('#composer').contains(document.activeElement))$('#new-title').focus();notify('Added');
  }catch(error){$('#compose-error').textContent=errorText(error);}finally{button.disabled=false;}
});
function taskEditor(task){
  if(preview)return;
  const otherOwner=task.ownerUid!==user.uid;
  open('Edit task',`<form id="edit-form"><label class="field">Task<input name="title" maxlength="200" required value="${esc(task.title)}"></label><div class="form-grid"><label class="field">When<select name="when"><option value="asap">ASAP</option><option value="week">Next 5 weekdays</option><option value="nextWeek">Next week (Mon–Fri)</option><option value="later">Sometime later</option><option value="date">Exact date</option><option value="waiting">Waiting for a response</option></select></label><label class="field">Visibility / person<select name="person">${optionPeople('',!otherOwner)}</select></label></div><label class="field" id="edit-date-wrap">Date<input name="date" type="date" value="${esc(task.followUp||task.dueDate||today)}"></label><p class="inline-error" role="alert"></p><div class="modal-footer"><button class="primary" type="submit">Save</button><button class="secondary" type="button" data-close>Cancel</button><button class="quiet danger" id="remove-task" type="button" title="Remove task" aria-label="Remove task">${icon('trash-2')}</button></div></form>`);
  const form=$('#edit-form');form.elements.when.value=task.waiting?'waiting':task.dueDate?'date':'later';form.elements.person.value=task.visibility==='private'?'private':task.assigneeUid||'shared';
  const showDate=()=>{$('#edit-date-wrap').hidden=!['date','waiting'].includes(form.elements.when.value);};showDate();form.elements.when.addEventListener('change',showDate);
  form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
    try{const mode=form.elements.when.value,assigned=form.elements.person.value;const draft=taskDraft({title:form.elements.title.value,category:task.category,ownerUid:task.ownerUid,mode:mode==='waiting'?'later':mode,exact:form.elements.date.value,assigneeUid:['private','shared'].includes(assigned)?null:assigned,shared:assigned==='shared',day:today});
      if(mode==='waiting'){if(!form.elements.date.value)throw new Error('Choose a follow-up date.');draft.waiting=true;draft.followUp=form.elements.date.value;}
      await mutate(task,draft,close);
    }catch(error){form.querySelector('.inline-error').textContent=errorText(error);}finally{button.disabled=false;}
  });
  $('#remove-task').addEventListener('click',async()=>{if(await confirmRemove('Remove this task?',task.title)){try{await store.remove(task.id,task.rev);close();notify('Removed');}catch(error){form.querySelector('.inline-error').textContent=errorText(error);}}});icons();
}
function waitingEditor(task){
  if(preview)return;
  open('Waiting for a response',`<form id="waiting-form"><p class="task-preview">${esc(task.title)}</p><fieldset class="followups"><legend>Follow up</legend>${[[3,'3 days'],[7,'1 week'],[14,'2 weeks'],[30,'1 month'],[90,'3 months']].map(([n,label])=>`<label><input type="radio" name="days" value="${n}" ${n===7?'checked':''}><span>${label}</span></label>`).join('')}<label><input type="radio" name="days" value="exact"><span>Exact date</span></label></fieldset><label class="field" id="followup-exact" hidden>Date<input name="exact" type="date" value="${addDays(today,7)}"></label><p class="inline-error" role="alert"></p><div class="modal-footer"><button class="primary" type="submit">Set follow-up</button><button class="secondary" type="button" data-close>Cancel</button></div></form>`);
  const form=$('#waiting-form');form.addEventListener('change',()=>$('#followup-exact').hidden=form.elements.days.value!=='exact');form.addEventListener('submit',async e=>{e.preventDefault();const value=form.elements.days.value,followUp=value==='exact'?form.elements.exact.value:addDays(today,Number(value));if(!followUp){form.querySelector('.inline-error').textContent='Choose a follow-up date.';return;}form.querySelector('[type=submit]').disabled=true;await mutate(task,{waiting:true,followUp,dueDate:null},()=>{close();notify('Follow-up set');});form.querySelector('[type=submit]').disabled=false;});
}
function householdPicker(){
  return `<label class="field">Household<select id="household-select"><option value="" disabled ${households.some(h=>h.id===currentSpace.id)?'':'selected'}>Choose household</option>${households.map(h=>`<option value="${esc(h.id)}" ${h.id===currentSpace.id?'selected':''}>${esc(h.title||h.id)}</option>`).join('')}</select></label>`;
}
function switchHousehold(id){
  if(!id||!store?.selectSpace)return;close();const url=new URL(location.href);url.searchParams.set('household',id);history.replaceState(null,'',url);store.selectSpace(id);
}
let installManifest=null;
function updateInstallManifest(){
  if(sandbox)return;const url=new URL(location.href);url.searchParams.set('mode','live');url.searchParams.set('household',currentSpace.id);
  const root=new URL('../../',url);const manifest={name:'Lists',short_name:'Lists',id:url.pathname+'?household='+encodeURIComponent(currentSpace.id),start_url:url.href,scope:new URL('./',url).pathname,display:'standalone',background_color:'#f1f6f2',theme_color:'#285e47',icons:[192,512].map(size=>({src:new URL('assets/icon-'+size+'.png',root).href,sizes:size+'x'+size,type:'image/png'}))};
  if(installManifest)URL.revokeObjectURL(installManifest);installManifest=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'}));document.querySelector('link[rel=manifest]').href=installManifest;
}
function settings(){
  open('Settings',`<details class="settings-group" open><summary>Appearance</summary><fieldset><legend>Color scheme</legend><div class="palette-choices">${[['original','Original'],['garden','Garden'],['cherry','Cherry'],['night','Night']].map(([id,label])=>`<button class="palette ${id}" data-palette="${id}" aria-label="${label}" title="${label}" aria-pressed="${prefs.palette===id}"><span></span><small>${label}</small></button>`).join('')}</div></fieldset><label class="field">Animations<select id="motion"><option value="off">Off</option><option value="gentle">Gentle</option><option value="playful">Playful</option></select></label></details><details class="settings-group"><summary>Quick actions</summary>${[['quickWeek','Move to next week'],['quickWaiting','Waiting for a response']].map(([id,label])=>`<label class="toggle-row">${label}<input type="checkbox" role="switch" data-preference="${id}" ${prefs[id]?'checked':''}></label>`).join('')}</details><details class="settings-group"><summary>Account &amp; privacy</summary>${sandbox?`<label class="field">Sandbox person<select id="sandbox-person"><option value="tal">Tal</option><option value="sophie">Sophie</option></select></label><p class="settings-note">Sample data stays in this browser. This switch is not real authentication.</p><button class="secondary" id="reset-sandbox">Reset sample tasks</button><a class="text-link" href="?mode=live">Open Google sign-in version</a>`:`<p class="account-email">${esc(signedInAccount?.email||user?.email)}</p>${householdPicker()}<p class="settings-note">Personal tasks are hidden from other household members. Tal, the administrator, can view all users' personal and shared tasks. Assigning or sharing makes a task visible to household members.</p><button class="secondary" id="sign-out">Sign out</button>`}</details><details class="settings-group"><summary>Scheduling</summary><p class="settings-note">Calendar: America/Los_Angeles. Next 5 weekdays includes today when it is a weekday. Next week means next Monday–Friday. Weekdays exclude Saturday and Sunday, not public holidays.</p><p class="settings-note">One daily nudge is drawn from your private later tasks, shared tasks assigned to you, and unassigned shared tasks. It is picked on your first visit each day, stays stable across your devices, and does not become overdue.</p></details>${preview?'':adminSection(signedInAccount||user,sandbox)}<div class="modal-footer"><button class="primary" data-close>Done</button></div>`);$('#dialog').classList.add('settings-modal');
  $('#motion').value=prefs.motion;$('#motion').addEventListener('change',e=>{prefs.motion=e.target.value;persist();appearance();});
  document.querySelectorAll('button[data-palette]').forEach(button=>button.addEventListener('click',()=>{prefs.palette=button.dataset.palette;persist();appearance();document.querySelectorAll('button[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  document.querySelectorAll('[data-preference]').forEach(input=>input.addEventListener('change',()=>{prefs[input.dataset.preference]=input.checked;persist();render();}));
  if(sandbox){$('#sandbox-person').value=user.uid;$('#sandbox-person').addEventListener('change',async e=>{prefs.sandboxUser=e.target.value;persist();user={uid:prefs.sandboxUser};picks=[];pickedDay='';updatePeople();render();await dailyPick();});$('#reset-sandbox').addEventListener('click',async()=>{if(await confirmRemove('Reset sample tasks?','Only the device sandbox will be reset.')){picks=[];pickedDay='';store.reset();close();notify('Sandbox reset');}});}
  else {$('#sign-out').addEventListener('click',async()=>{close();await store.logout();});$('#household-select')?.addEventListener('change',event=>switchHousehold(event.target.value));bindAdmin({account:signedInAccount,sandbox,store,onOpen:switchHousehold,onPreview:profile=>store.viewAs(profile),liveUrl:config.liveUrl});}
}
function share(){
  const url=new URL(`staging/${String(design).padStart(2,'0')}/`,config.liveUrl);if(!sandbox){url.searchParams.set('mode','live');url.searchParams.set('household',currentSpace.id);}const link=url.href;
  open('Save / Share',`<div class="install-heading"><img src="../../assets/icon-192.png" width="52" height="52" alt="Lists app icon"><div><h3>Save Lists to your phone</h3><span>${esc(names[category])}</span></div></div><details class="install-details"><summary>iPhone</summary><p>Open this page in Safari. Tap Share, then Add to Home Screen, then Add.</p></details><details class="install-details"><summary>Android</summary><p>Open this page in Chrome. Tap the menu, then Add to Home screen, then Create shortcut or Install.</p></details><div class="share-area"><h3>Share Lists</h3><div id="qr"></div><label class="field">Link<input id="share-link" readonly value="${esc(link)}"></label><button class="primary" id="copy-link">${icon('copy')} Copy link</button><p class="settings-note">${sandbox?'This link opens the device-only sandbox.':'An invited household Google account is still required.'}</p></div>`);
  if(window.QRCode)new window.QRCode($('#qr'),{text:link,width:140,height:140,colorDark:'#172d28',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});
  $('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link);notify('Link copied');}catch{$('#share-link').select();notify('Select and copy the link above.');}});icons();
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.view){view=button.dataset.view;render();}
  if(button.dataset.scope){scope=button.dataset.scope;$('#new-person').value=scope==='shared'?'shared':'private';render();}
  if(button.dataset.category){category=button.dataset.category;view=category==='todo'?'today':'later';$('#new-person').value=category==='todo'?'private':'shared';render();}
  if(button.dataset.edit){const task=tasks.find(t=>t.id===button.dataset.edit);if(task)taskEditor(task);}
  if(button.dataset.complete){const task=tasks.find(t=>t.id===button.dataset.complete);if(task)await mutate(task,{completed:!task.completed},()=>notify(task.completed?'Reopened':'Done. Nicely done.'));}
  if(button.dataset.quick){const task=tasks.find(t=>t.id===button.dataset.id);if(!task)return;if(button.dataset.quick==='waiting')waitingEditor(task);else await mutate(task,{dueDate:schedule('nextWeek',today),waiting:false,followUp:null},()=>notify('Moved to next week'));}
  if(button.dataset.action==='completed'){view=view==='done'?'later':'done';render();}
  if(button.dataset.action==='settings')settings();
  if(button.dataset.action==='share')share();
  if(button.dataset.action==='account'){if(user)settings();else if(store?.login){try{await store.login();}catch(error){notify(errorText(error));}}}
});
$('#person-filter').addEventListener('change',e=>{person=e.target.value;render();});
function gate(message,extra=''){$('#workspace').hidden=true;$('#gate').hidden=false;$('#gate').innerHTML=`<img src="../../assets/icon-192.png" width="64" height="64" alt=""><h1>Lists</h1><p>${esc(message)}</p>${extra}`;icons();}
function accessGate(message){
  gate(message,'<button class="secondary" data-action="settings">Settings</button><p id="access-error" class="inline-error" role="alert"></p>');
}
function showWorkspace(){$('#gate').hidden=true;$('#workspace').hidden=false;updatePeople();render();}
async function start(){
  if(sandbox){$('#mode-status').textContent='Sandbox · sample data · this device only';members={tal:'Tal',sophie:'Sophie'};user={uid:prefs.sandboxUser==='sophie'?'sophie':'tal'};store=sandboxStore(onTasks,status);ready=true;await store.ready();showWorkspace();status('Device sandbox · not connected to Firebase');await dailyPick();return;}
  $('#mode-status').textContent='Private household · Google sign-in';
  if(!config.firebase){gate('Google sign-in is not connected yet.',`<a class="primary" href="?">Explore the sandbox</a><a class="text-link" href="../../FIREBASE_SETUP.md">Firebase setup instructions</a>`);return;}
  gate('Connecting securely…');
  try{
    const {connectFirebase}=await import('./firebase.js?v=viewas4');
    store=await connectFirebase(config,{
      tasks:onTasks,status,
      preview(profile){preview=profile;user=profile||signedInAccount;document.documentElement.toggleAttribute('data-preview',!!profile);$('#preview-banner').hidden=!profile;$('#preview-name').textContent=profile?'Viewing as '+profile.name:'';close();},
      account(account){
        close();$('#confirmation').close();$('#new-title').value='';pendingCreation=null;signedInAccount=account;preview=null;user=account;ready=false;picks=[];picking=false;pickedDay='';tasks=[];members={};households=[];spaceEpoch++;
        if(account){updatePeople();accessGate('Checking household access…');}
        else gate('Personal lists stay hidden from other household members. Tal, the administrator, can view all users’ tasks.',`<button class="primary" id="google-login">${icon('log-in')} Continue with Google</button>`);
        $('#google-login')?.addEventListener('click',async()=>{try{await store.login();}catch(error){notify(errorText(error));}});
      },
      households(value){households=value;const select=$('#household-select');if(select){const parent=select.parentElement;parent.outerHTML=householdPicker();$('#household-select').addEventListener('change',event=>switchHousehold(event.target.value));}},
      space(value){currentSpace=value;updateInstallManifest();$('#mode-status').textContent='Private household · '+(value.title||value.id);},
      loading(){ready=false;picks=[];picking=false;pickedDay='';spaceEpoch++;tasks=[];members={};category='todo';view='today';scope='mine';person='all';$('#new-person').value='private';pendingCreation=null;$('#new-title').value='';close();accessGate('Loading household…');},
      unavailable(message){ready=false;picks=[];picking=false;pickedDay='';spaceEpoch++;tasks=[];members={};if(!$('#dialog').classList.contains('settings-modal'))close();accessGate(message);},
      members(value){members=value;updatePeople();render();},
      ready(){ready=true;showWorkspace();void dailyPick();},
      error(error){status(errorText(error));const region=$('#access-error');if(region)region.textContent=errorText(error)+(isAdministrator(signedInAccount)?' Open Settings → Admin after publishing the updated rules.':' Ask your household administrator to check your Google email invitation.');else notify(errorText(error));},
    });
  }catch(error){gate('Could not connect to Google sign-in. Check your connection and try again.',`<button class="primary" onclick="location.reload()">Try again</button>`);status(errorText(error));}
}
function checkDay(){const current=dayKey(Date.now(),config.timeZone);if(today!==current){today=current;pickedDay='';picks=[];render();void dailyPick();}}
let midnightTimer;
function watchDay(){clearTimeout(midnightTimer);checkDay();if(document.hidden)return;midnightTimer=setTimeout(watchDay,60000);}
document.addEventListener('visibilitychange',watchDay);window.addEventListener('online',()=>{if(ready)void dailyPick();});watchDay();void start();
