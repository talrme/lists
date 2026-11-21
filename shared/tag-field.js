import {esc} from './task-fields.js?v=organizer1';
import {canonicalTag,tagName,tagKey} from './organizer.js?v=1';

export function bindTagField(form,{task={},getTags,saveTag,uid}){
  const host=document.createElement('div');host.className='tag-field';
  host.innerHTML='<label>Tags<input class="tag-input" type="text" aria-label="Find or create a tag" placeholder="Find or add a tag" maxlength="50" autocomplete="off"></label><input type="hidden" name="tagIds"><div class="selected-tags"></div><div class="tag-suggestions" role="group" aria-label="Tag suggestions"></div><p class="settings-note tag-hint"></p><p class="inline-error" role="alert"></p>';
  form.querySelector('.description-field').after(host);
  const input=host.querySelector('.tag-input'),hidden=host.querySelector('[name=tagIds]'),suggestions=host.querySelector('.tag-suggestions');
  let selected=[...(task.tagIds||[])],busy=false;
  const shared=()=>form.elements.person.value!=='private';
  const visibleTags=()=>getTags().filter(tag=>!tag.mergedInto&&(tag.visibility==='shared'||!shared()&&tag.ownerUid===uid));
  function update(){
    const catalog=getTags();selected=[...new Set(selected.map(id=>canonicalTag(id,catalog)?.id||id))];
    const removed=shared()&&selected.some(id=>canonicalTag(id,catalog)?.visibility==='private');
    if(shared())selected=selected.filter(id=>canonicalTag(id,catalog)?.visibility!=='private');
    hidden.value=JSON.stringify(selected);
    host.querySelector('.selected-tags').innerHTML=selected.map(id=>{const tag=canonicalTag(id,catalog);return tag?`<button type="button" class="tag-chip" data-remove-tag="${esc(id)}" aria-label="Remove tag ${esc(tag.name)}">${esc(tag.name)} <span aria-hidden="true">×</span></button>`:'';}).join('');
    const query=tagKey(input.value),available=visibleTags().filter(tag=>!tag.archived&&!selected.includes(tag.id)&&(!query||tagKey(tag.name).includes(query)));
    suggestions.hidden=document.activeElement!==input&&!query;
    suggestions.innerHTML=available.slice(0,20).map(tag=>`<button type="button" class="tag-chip" data-pick-tag="${esc(tag.id)}">${esc(tag.name)}${tag.visibility==='private'?' · Personal':''}</button>`).join('');
    if(query&&!visibleTags().some(tag=>tagKey(tag.name)===query&&!tag.archived))suggestions.insertAdjacentHTML('beforeend',`<button type="button" class="text-button" data-create-tag>Create “${esc(tagName(input.value))}” · ${shared()?'Household':'Personal'}</button>${!shared()?'<button type="button" class="text-button" data-create-tag="shared">Create for household instead</button>':''}`);
    host.querySelector('.tag-hint').textContent=removed?'Personal tags were removed from this shared draft.':shared()?'Household tags are visible to everyone in this household.':'New tags are personal unless you choose Household.';
    suggestions.querySelectorAll('button').forEach(button=>button.disabled=busy||selected.length>=20);
  }
  input.oninput=update;input.onfocus=update;
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();const first=suggestions.querySelector('button');if(!first?.disabled)first?.click();}});
  host.onclick=async event=>{
    const button=event.target.closest('button');if(!button||busy)return;
    if(button.hasAttribute('data-remove-tag'))selected=selected.filter(id=>id!==button.dataset.removeTag);
    if(button.dataset.pickTag){selected.push(button.dataset.pickTag);input.value='';}
    if(button.hasAttribute('data-create-tag')){
      const name=tagName(input.value);if(!name||selected.length>=20)return;
      const visibility=shared()||button.dataset.createTag==='shared'?'shared':'private';
      const existing=getTags().find(tag=>!tag.archived&&!tag.mergedInto&&tag.visibility===visibility&&tagKey(tag.name)===tagKey(name));
      if(existing)selected.push(existing.id);
      else{
        busy=true;update();try{const id=crypto.randomUUID();await saveTag(id,{name,visibility,ownerUid:uid,archived:false,mergedInto:null});selected.push(id);}catch(error){host.querySelector('.inline-error').textContent=error.message;}finally{busy=false;}
      }
      input.value='';
    }
    update();form.dispatchEvent(new Event('change',{bubbles:true}));
  };
  form.addEventListener('click',event=>{if(event.target.closest('[data-sharing],[data-assignee]'))update();});
  update();return {update,reset(){selected=[];input.value='';update();},setSomeday(value){host.dataset.someday=String(value);}};
}
