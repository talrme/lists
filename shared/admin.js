import {belongsTo,HOME_EMAILS,isAdministrator} from './households.js';
import {testingSection,bindTesting} from './testing.js?v=production1';
import {isPlayground} from './playground.js?v=1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function adminSection(account){
  if(!isAdministrator(account))return '';
  return `<details class="settings-group" id="settings-admin"><summary>Admin</summary>${testingSection()}<details class="admin-users"><summary>View as user</summary><p class="settings-note">Read-only access to a user's personal and shared tasks. No sign-in changes or edits on their behalf.</p><button class="secondary" id="load-users">Show registered users</button><p id="admin-users-message" class="settings-note" role="status"></p><div id="admin-user-list"></div></details><details class="admin-households"><summary>Households</summary><p class="settings-note">Manage names and Google-account invitations. Tal can also view personal tasks through View as user.</p><div class="admin-toolbar"><button class="secondary" id="create-home">Create our household</button><button class="secondary" id="create-household">New household</button><button class="icon-button quiet" id="refresh-households" aria-label="Refresh households" title="Refresh households"><i data-lucide="refresh-cw" aria-hidden="true"></i></button></div><p id="admin-message" class="settings-note" role="status"></p><div id="admin-household-list"></div><form id="household-form" hidden><h3 id="household-form-title">Create household</h3><label class="field">Household name<input name="title" required maxlength="80" autocomplete="off"></label><label class="field">Household link name<input name="id" required pattern="[a-z0-9][a-z0-9-]{0,47}" maxlength="48" autocomplete="off" autocapitalize="none" spellcheck="false"></label><label class="field">Members' Google email addresses<textarea name="emails" required rows="3" autocapitalize="none" autocomplete="off" spellcheck="false"></textarea></label><p class="settings-note">One address per line. Only invited, verified Google accounts can enter. Members become assignable after their first visit. Removing an email revokes access; it does not delete tasks.</p><p class="inline-error" role="alert"></p><div class="modal-footer"><button class="primary" type="submit">Create household</button><button class="secondary" id="cancel-household" type="button">Cancel</button></div></form></details></details>`;
}
export function bindAdmin({account,store,onOpen,onPreview,showError,liveUrl,confirmAction}){
  const root=document.querySelector('#settings-admin');if(!root||!isAdministrator(account))return;
  bindTesting({root,store,onOpen,confirmAction,liveUrl});
  const list=root.querySelector('#admin-household-list'),message=root.querySelector('#admin-message'),form=root.querySelector('#household-form');
  let loaded=false,loading=false,households=[],editing=null;
  const usersButton=root.querySelector('#load-users'),usersMessage=root.querySelector('#admin-users-message'),usersList=root.querySelector('#admin-user-list');let profiles=[];
  usersButton.addEventListener('click',async()=>{
    usersButton.disabled=true;usersMessage.textContent='Loading users…';
    try{profiles=await store.listUsers();usersList.innerHTML=profiles.map(p=>`<div class="household-row"><div><strong>${esc(p.name)}</strong><span>${esc(p.email)}</span></div><button class="secondary" data-view-user="${esc(p.uid)}">View as</button></div>`).join('');usersMessage.textContent=profiles.length?'Users appear after visiting the app.':'No registered users yet.';usersButton.textContent='Refresh users';}
    catch(error){usersMessage.textContent='Publish the latest Firebase rules to enable user previews.';showError?.(error);}
    finally{usersButton.disabled=false;}
  });
  usersList.addEventListener('click',async event=>{const button=event.target.closest('[data-view-user]');if(!button)return;button.disabled=true;try{await onPreview(profiles.find(p=>p.uid===button.dataset.viewUser));}catch(error){usersMessage.textContent=error.message;}finally{button.disabled=false;}});
  function editor(household){
    editing=household?.existing?household:null;form.hidden=false;
    form.elements.id.value=household?.id||'';form.elements.id.readOnly=!!editing;
    form.elements.title.value=household?.title||'';
    form.elements.emails.value=(household?.memberEmails||[]).join('\n');
    form.querySelector('.inline-error').textContent='';
    form.querySelector('h3').textContent=editing?'Manage household':'Create household';
    form.querySelector('[type=submit]').textContent=editing?'Save household':'Create household';
    form.scrollIntoView({block:'nearest',behavior:'smooth'});form.elements.title.focus();
  }
  function render(){
    list.innerHTML=households.map(h=>`<div class="household-row"><div><strong>${esc(h.title||h.id)}</strong><span>${esc(h.id)} · ${h.memberEmails?.length??h.memberUids?.length??0} members</span></div><div>${isPlayground(h)?'<span class="settings-note">Manage in Testing</span>':`<button class="text-button" data-manage="${esc(h.id)}">Manage</button>`}${belongsTo(h,account)?`<button class="text-button" data-open-household="${esc(h.id)}">Open</button>`:''}<button class="icon-button quiet" data-link-household="${esc(h.id)}" aria-label="Copy link for ${esc(h.title||h.id)}" title="Copy household link"><i data-lucide="link" aria-hidden="true"></i></button></div></div>`).join('');
    root.querySelector('#create-home').hidden=households.some(h=>h.id==='home');window.lucide?.createIcons();
  }
  async function load(){
    if(loading)return;loading=true;list.setAttribute('aria-busy','true');message.textContent='Loading households…';
    try{households=await store.listHouseholds();loaded=true;render();message.textContent=households.length?'':'No households created yet.';}
    catch(error){message.textContent='Household management is not available yet. Publish the updated Firebase rules, then refresh here.';showError?.(error);}
    finally{loading=false;list.setAttribute('aria-busy','false');}
  }
  root.addEventListener('toggle',()=>{if(root.open&&!loaded)void load();});
  root.querySelector('#refresh-households').addEventListener('click',()=>void load());
  root.querySelector('#create-home').addEventListener('click',()=>editor({id:'home',title:'Tal & Sophie',memberEmails:HOME_EMAILS}));
  root.querySelector('#create-household').addEventListener('click',()=>editor());
  root.querySelector('#cancel-household').addEventListener('click',()=>{form.hidden=true;editing=null;});
  list.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.manage){const h=households.find(h=>h.id===button.dataset.manage);editor({...h,existing:true,memberEmails:h.memberEmails||(h.id==='home'?HOME_EMAILS:[])});}
    if(button.dataset.openHousehold)onOpen(button.dataset.openHousehold);
    if(button.dataset.linkHousehold){const link=new URL(liveUrl);link.searchParams.set('household',button.dataset.linkHousehold);try{await navigator.clipboard.writeText(link.href);message.textContent='Household link copied. Invitees must sign in with a listed Google email.';}catch{message.textContent=link.href;}}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(form.querySelector('[type=submit]').disabled)return;
    const button=form.querySelector('[type=submit]');button.disabled=true;form.querySelector('.inline-error').textContent='';
    try{await store.saveHousehold({id:form.elements.id.value,title:form.elements.title.value,emails:form.elements.emails.value},editing?(editing.rev||0):null);form.hidden=true;message.textContent=editing?'Household updated.':'Household created.';await load();}
    catch(error){form.querySelector('.inline-error').textContent=error.code==='permission-denied'?'Publish the updated Firebase rules first, then try again.':error.message;}
    finally{button.disabled=false;}
  });
}
