import {parseAsana,validateReview,reviewIndex,suggestion,decide,destinations} from './asana-review-core.js?v=1';
import {dayKey} from './core.js?v=organizer1';
import {esc} from './task-fields.js?v=organizer1';

const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
export async function openAsanaReview({store,open,confirmAction}){
  const root=document.createElement('form');root.id='asana-review-form';root.className='asana-review';root.onsubmit=event=>event.preventDefault();
  open('Asana review',root,{focusTitle:false});
  let review=null,index=null,selected=new Set(),page=0,queue='pending',query='',saving=false,serial=Promise.resolve();
  const size=20,day=dayKey();
  const status=message=>{const region=root.querySelector('.review-status');if(region)region.textContent=message;};
  async function save(next,{paint=true}={}){
    if(saving)throw new Error('Wait for the current review change to save.');
    saving=true;root.dataset.saving='true';status('Saving on this device…');
    try{await store.saveAsanaReview(next);review=next;if(paint)render();status('Saved on this device');}
    finally{saving=false;delete root.dataset.saving;}
  }
  function list(){
    if(!index)return [];
    return index.items.filter(row=>{
      const decision=review.decisions[row.id],flags=index.flags(row);
      if(queue==='pending'&&decision&&decision.action!=='defer')return false;
      if(queue==='decided'&&(!decision||decision.action==='defer'))return false;
      if(['duplicate','important','idea','old','pastDue'].includes(queue)&&!flags[queue])return false;
      return !query||normalizeSearch(row).includes(query.toLowerCase());
    }).sort((a,b)=>Number(review.decisions[a.id]?.action==='defer')-Number(review.decisions[b.id]?.action==='defer'));
  }
  const normalizeSearch=row=>(row.title+' '+row.notes+' '+row.section).toLowerCase();
  function details(row){return `<details class="review-source"><summary>Original details</summary><dl><dt>Section</dt><dd>${esc(row.section||'None')}</dd><dt>Created</dt><dd>${esc(row.created||'Not provided')}</dd><dt>Original due date</dt><dd>${esc(row.due||'None')}</dd><dt>Assignee</dt><dd>${esc(row.assignee||'None')} ${esc(row.assigneeEmail)}</dd><dt>Asana ID</dt><dd>${esc(row.id)}</dd>${row.parent?`<dt>Parent name</dt><dd>${esc(row.parent)}</dd>`:''}</dl>${row.notes?`<div class="review-notes">${esc(row.notes)}</div>`:''}${row.tags?`<p>Original tags: ${esc(row.tags)}</p>`:''}</details>`;}
  function render(){
    if(!root.isConnected)return;
    if(!review){root.innerHTML=`<label class="field">Open Asana CSV or saved review<input id="asana-file" type="file" accept=".csv,.json,text/csv,application/json"></label><p class="settings-note">Private, on-device review. No tasks are imported. Progress stays in this browser; download a review file before signing out, clearing storage, or moving devices.</p><p class="review-status settings-note" role="status"></p><p class="inline-error" role="alert"></p>`;bindFile();return;}
    index=reviewIndex(review.rows,day);const rows=list(),pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages-1);
    const shown=rows.slice(page*size,(page+1)*size),decisions=Object.values(review.decisions),done=decisions.filter(decision=>decision.action!=='defer').length,kept=decisions.filter(decision=>decision.action==='keep').length;
    root.innerHTML=`<div class="review-summary"><strong>${index.items.length} tasks to review</strong><span>${done} reviewed · ${kept} kept · ${review.completed} completed rows excluded</span><progress max="${Math.max(1,index.items.length)}" value="${done}" aria-label="Review progress"></progress><small>Review only. Original dates are references, not new deadlines. ${review.rows.length-index.items.length} subtasks preserved.</small></div>
    <div class="review-controls"><label>Show<select id="review-queue">${[['pending','To review'],['duplicate','Possible duplicates'],['important','Money & paperwork'],['idea','Ideas & interests'],['old','Created before this year'],['pastDue','Past source dates'],['decided','Decided'],['all','All open tasks']].map(([id,label])=>`<option value="${id}" ${queue===id?'selected':''}>${label}</option>`).join('')}</select></label><label>Search<input id="review-search" type="search" value="${esc(query)}" autocomplete="off"></label></div>
    <div class="review-toolbar"><button type="button" class="text-button" id="select-review-page">Select page</button><button type="button" class="icon-button" id="review-undo" title="Undo last review decision" aria-label="Undo last review decision" ${review.history?.length?'':'disabled'}>${icon('undo-2')}</button><button type="button" class="secondary" id="save-review-file">${icon('download')}Save review file</button></div>
    <div class="review-selection" ${selected.size?'':'hidden'}><strong>${selected.size} selected</strong><details><summary>Selected tasks</summary><ul>${[...selected].map(id=>`<li>${esc(index.byId.get(id)?.title)}</li>`).join('')}</ul></details><label class="sr-only" for="bulk-destination">Destination for selected tasks</label><select id="bulk-destination">${Object.entries(destinations).map(([id,label])=>`<option value="${id}" ${id==='later'?'selected':''}>${label}</option>`).join('')}</select><div><button class="primary" type="button" data-bulk="keep">Keep selected</button><button class="secondary" type="button" data-bulk="combine" ${selected.size<2?'disabled':''}>Combine selected</button><button class="secondary" type="button" data-bulk="skip">Skip selected</button></div></div>
    <div class="review-items">${shown.map(row=>{
      const flags=index.flags(row),decision=review.decisions[row.id],related=[...(index.related.get(row.id)||[])],children=index.children.get(row.id)||[];
      return `<article class="review-item" data-review-id="${esc(row.id)}"><div class="review-item-heading"><input type="checkbox" data-review-select="${row.id}" aria-label="Select ${esc(row.title)}" ${selected.has(row.id)?'checked':''}><strong>${esc(row.title||'Untitled task')}</strong></div><div class="review-labels">${flags.duplicate?'<span>Possible duplicate</span>':''}${flags.pastDue?'<span>Past source date</span>':''}${flags.old?'<span>Older task</span>':''}</div><p class="settings-note">${decision?decision.action==='keep'?'Keep → '+esc(destinations[decision.destination]):decision.action==='merge'?'Combined with '+esc(index.byId.get(decision.into)?.title):decision.action==='skip'?'Skip import':'Decide later':esc(suggestion(row))}</p>
      ${related.length?`<details class="review-related"><summary>Compare ${related.length} similar task${related.length===1?'':'s'}</summary>${related.map(id=>{const other=index.byId.get(id);return `<div><strong>${esc(other.title)}</strong>${details(other)}</div>`;}).join('')}<button type="button" class="text-button" data-select-group="${row.id}">Select these for review</button></details>`:''}
      ${details(row)}${children.length?`<details><summary>${children.length} subtasks</summary>${children.map(child=>`<div class="review-child"><strong>${esc(child.title)}</strong>${details(child)}</div>`).join('')}</details>`:''}
      <details class="review-comment"><summary>Your comment</summary><textarea data-review-comment="${row.id}" aria-label="Review comment for ${esc(row.title)}" maxlength="2000" rows="2">${esc(review.feedback?.[row.id]||'')}</textarea></details>
      <div class="review-item-actions"><select aria-label="Destination for ${esc(row.title)}" data-review-destination="${row.id}">${Object.entries(destinations).map(([id,label])=>`<option value="${id}" ${(decision?.destination||(/maybe/i.test(row.section)?'someday':'later'))===id?'selected':''}>${label}</option>`).join('')}</select><button type="button" class="primary" data-decision="keep" data-review-task="${row.id}">Keep</button><button type="button" class="secondary" data-decision="skip" data-review-task="${row.id}">Skip</button><button type="button" class="icon-button" title="Decide later" aria-label="Decide later: ${esc(row.title)}" data-decision="defer" data-review-task="${row.id}">${icon('clock-3')}</button>${decision?`<button type="button" class="icon-button" title="Reset decision" aria-label="Reset decision for ${esc(row.title)}" data-decision="reset" data-review-task="${row.id}">${icon('rotate-ccw')}</button>`:''}</div></article>`;
    }).join('')||'<p class="settings-note">No tasks in this view.</p>'}</div>
    <div class="review-pagination"><button type="button" class="icon-button" id="review-prev" aria-label="Previous review page" ${page?'':'disabled'}>${icon('chevron-left')}</button><span>Page ${page+1} of ${pages} · ${rows.length} tasks</span><button type="button" class="icon-button" id="review-next" aria-label="Next review page" ${page+1<pages?'':'disabled'}>${icon('chevron-right')}</button></div>
    ${index.unlinked.length?`<details><summary>${index.unlinked.length} subtasks need parent matching</summary><p class="settings-note">The CSV names parents without IDs. These are preserved separately rather than attached by guesswork.</p>${index.unlinked.map(child=>`<div class="review-child"><strong>${esc(child.title)}</strong>${details(child)}</div>`).join('')}</details>`:''}
    <details><summary>Source and review storage</summary><p class="settings-note">${esc(review.filename)} · ${review.sourceCount} original rows. Decisions and source details are saved only in this browser, for this account and household. Save review file downloads a private backup you can attach in our chat. It does not import tasks. Signing out clears saved reviews.</p><label class="field">Replace CSV or restore review<input id="asana-file" type="file" accept=".csv,.json,text/csv,application/json"></label><button type="button" class="danger" id="clear-asana-review">Remove local review</button></details><p class="review-status settings-note" role="status">Saved on this device</p><p class="inline-error" role="alert"></p>`;
    window.lucide?.createIcons();bindFile();
    root.querySelector('#review-queue').onchange=event=>{queue=event.target.value;page=0;selected.clear();render();};
    root.querySelector('#review-search').oninput=event=>{query=event.target.value;page=0;selected.clear();const start=event.target.selectionStart;render();const input=root.querySelector('#review-search');input.focus({preventScroll:true});try{input.setSelectionRange(start,start);}catch{}};
    root.querySelector('#review-prev').onclick=()=>{page--;selected.clear();render();};root.querySelector('#review-next').onclick=()=>{page++;selected.clear();render();};
    root.querySelector('#select-review-page').onclick=()=>{const all=shown.every(row=>selected.has(row.id));for(const row of shown)all?selected.delete(row.id):selected.add(row.id);render();};
    root.querySelector('#review-undo').onclick=()=>run(async()=>{const history=[...(review.history||[])],decisions=history.pop();if(decisions)await save({...review,decisions,history});});
    root.querySelector('#save-review-file').onclick=()=>void run(()=>{
      const blob=new Blob([JSON.stringify({...review,history:[]},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='asana-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    root.querySelector('#clear-asana-review').onclick=()=>run(async()=>{if(await confirmAction('Remove local review?','This removes the CSV review and its decisions from this browser, not any Asana or Lists tasks. Download a backup first.','Remove review')){await save(null);selected.clear();render();}});
  }
  function run(action){serial=serial.then(action).catch(error=>{const region=root.querySelector('.inline-error');if(region)region.textContent=error.message;});return serial;}
  function bindFile(){root.querySelector('#asana-file').onchange=event=>void run(async()=>{
    const file=event.target.files[0];if(!file)return;if(file.size>10000000)throw new Error('Choose a file smaller than 10 MB.');
    const content=await file.text(),next=file.name.toLowerCase().endsWith('.json')?validateReview(JSON.parse(content)):parseAsana(content,window.Papa);
    if(review&&!await confirmAction('Replace this review?','Download your current review first if you want to keep its decisions. No tasks will be changed.','Replace review'))return;
    next.filename=next.filename||file.name;selected.clear();page=0;queue='pending';await save(next);
  });}
  root.addEventListener('change',event=>{
    if(event.target.matches('[data-review-select]')){event.target.checked?selected.add(event.target.dataset.reviewSelect):selected.delete(event.target.dataset.reviewSelect);render();}
    if(event.target.matches('[data-review-comment]'))void run(()=>save({...review,feedback:{...review.feedback,[event.target.dataset.reviewComment]:event.target.value}},{paint:false}));
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.selectGroup){selected=new Set([button.dataset.selectGroup,...index.related.get(button.dataset.selectGroup)||[]]);render();}
    const action=button.dataset.decision||button.dataset.bulk;if(!action)return;
    void run(async()=>{
      const ids=button.dataset.bulk?[...selected]:[button.dataset.reviewTask],destination=button.dataset.bulk?root.querySelector('#bulk-destination').value:root.querySelector(`[data-review-destination="${ids[0]}"]`).value;
      if(action==='combine'&&!await confirmAction('Combine these tasks?',ids.map(id=>index.byId.get(id).title).join(' · ')+'. The first becomes the primary task. Every original note and subtask stays in the review file.','Combine'))return;
      const next=decide(review,ids,{action,...(['keep','combine'].includes(action)?{destination}:{})});selected.clear();await save(next);
    });
  });
  render();await run(async()=>{const saved=await store.loadAsanaReview();if(!root.isConnected)return;if(saved){review={...validateReview(saved),history:saved.history||[]};}render();});
}
