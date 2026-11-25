import {validateImport} from './asana-import-core.js?v=1';
import {esc} from './task-fields.js?v=waiting2';

export function openAsanaImport({store,open,account,household,onBusy=()=>{}}){
 const root=document.createElement('form');root.className='asana-review';root.id='asana-import-form';
 let plan=null,saving=false;
 const labels={today:'Today',week:'Week',later:'Later',someday:'Someday / Maybe'};
 open('Import prepared tasks',root,{focusTitle:false});
 function render(){
  root.innerHTML=`<p class="settings-note">${esc(account.email)} · ${esc(household.title||household.id)} · Private tasks</p><label class="field">Prepared import file<input id="prepared-import-file" type="file" accept=".json,application/json"></label><div id="prepared-import-preview"></div><p class="review-status" role="status"></p><p class="inline-error" role="alert"></p><div class="modal-footer"><button type="submit" class="primary" id="confirm-prepared-import" disabled><i data-lucide="upload" aria-hidden="true"></i>Import tasks</button><button type="button" class="secondary" data-close>Close</button></div>`;
  root.querySelector('#prepared-import-file').onchange=async event=>{
   if(saving)return;plan=null;
   const button=root.querySelector('[type=submit]');button.disabled=true;
   root.querySelector('#prepared-import-preview').replaceChildren();root.querySelector('.inline-error').textContent='';
   try{
    const file=event.target.files[0];if(!file)return;
    if(file.size>10000000)throw new Error('Choose a file smaller than 10 MB.');
    plan=validateImport(JSON.parse(await file.text()));
    if(!root.isConnected||saving)return;
    const counts=Object.entries(labels).map(([id,label])=>`${plan.tasks.filter(row=>row.destination===id).length} ${label}`).join(' · ');
    root.querySelector('#prepared-import-preview').innerHTML=`<p><strong>${plan.tasks.length} tasks</strong> · ${plan.tasks.filter(row=>row.description).length} with details</p><p class="settings-note">${counts}</p><p class="settings-note">Today gets today’s date. Week uses the next five business days. Later, Waiting and Someday have no date. Existing tasks stay unchanged.</p><details><summary>Review task names and details</summary><div class="review-items">${plan.tasks.map((row,index)=>`<article class="review-item"><strong>${index+1}. ${esc(row.title)}</strong><p class="settings-note">${labels[row.destination]}${row.waiting?' · Waiting for a response':''}</p>${row.description?`<details><summary>Details</summary><div class="review-notes">${esc(row.description)}</div></details>`:''}</article>`).join('')}</div></details>`;
    button.textContent='Import '+plan.tasks.length+' tasks';button.disabled=false;
   }catch(error){plan=null;root.querySelector('.inline-error').textContent=error.message;}
  };
  window.lucide?.createIcons();
 }
 root.onsubmit=async event=>{
  event.preventDefault();if(saving||!plan)return;
  saving=true;onBusy(true);root.dataset.saving='true';
  root.querySelectorAll('button,input').forEach(node=>node.disabled=true);
  const status=root.querySelector('.review-status');status.textContent='Importing and verifying…';root.querySelector('.inline-error').textContent='';
  try{
   const result=await store.importAsanaTasks(plan);
   if(!root.isConnected)return;
   status.textContent=`Imported ${result.created} tasks · ${result.skipped} already present. Details verified.`;
   plan=null;root.querySelector('#prepared-import-preview').replaceChildren();root.querySelector('#confirm-prepared-import').textContent='Import finished';
  }catch(error){
   if(root.isConnected){status.textContent='';root.querySelector('.inline-error').textContent=(error.code==='permission-denied'?'Publish the latest Firestore rules, then try again. Undated Waiting tasks need the updated rules.':error.message)+' Retrying skips tasks already imported.';}
  }finally{
   saving=false;onBusy(false);delete root.dataset.saving;
   if(root.isConnected){root.querySelector('#prepared-import-file').disabled=false;root.querySelector('[data-close]').disabled=false;root.querySelector('[type=submit]').disabled=!plan;}
  }
 };
 render();return root;
}
