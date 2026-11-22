import {dayKey} from './core.js?v=organizer1';
export const groceryDay=at=>dayKey(at,'America/Los_Angeles');
export const docId=(type,key)=>type+'--'+key;
export function quantity(value){const n=Number(value);if(!Number.isFinite(n)||n<=0||n>9999)throw new Error('Choose a quantity above 0 and at most 9,999.');return Math.round(n*1000)/1000;}
export function cleanItem(item){
 const name=String(item.name||'').trim().slice(0,120);if(!name)throw new Error('Add an item name.');
 return {name,category:String(item.category||'Other').slice(0,60),quantity:quantity(item.quantity??1),unit:String(item.unit||'each').slice(0,20),notes:String(item.notes||'').slice(0,2000),catalogId:item.catalogId||item.id,locations:item.locations||{}};
}
export function activeId(item){return docId('item',item.catalogId);}
export function refsFor(command){
 if(command.action==='purchase'||command.action==='undo')return [['groceries',command.itemId],['groceryPurchases',command.purchaseId]];
 return command.rows.map(row=>['groceries',row.id]);
}
// The same reducer powers durable offline previews and retry-safe server transactions.
export function reduceCommand(values,command,{reconcile=false}={}){
 const next=structuredClone(values),touched=new Set(),get=(collection,id)=>next.find(row=>row.collection===collection&&row.id===id),put=(collection,id,data)=>{touched.add(collection+'/'+id);const index=next.findIndex(row=>row.collection===collection&&row.id===id);const value={collection,id,...data};if(index<0)next.push(value);else next[index]=value;};
 const update=(collection,id,patch)=>{const old=get(collection,id);put(collection,id,{...old,...patch,rev:(old?.rev||0)+1});};
 if(command.action==='purchase'){
  const item=get('groceries',command.itemId);if(!item?.value.active){if(reconcile)return [];throw new Error('This item was already purchased or removed.');}
  update('groceries',item.id,{type:'item',key:item.key,value:{...item.value,active:false}});
  update('groceryPurchases',command.purchaseId,{type:'purchase',key:command.purchaseId,value:{...item.value,at:command.at,day:groceryDay(command.at),storeId:command.storeId||'',undone:false,itemId:item.id,itemRev:item.rev+1}});
 }else if(command.action==='undo'){
  const item=get('groceries',command.itemId),purchase=get('groceryPurchases',command.purchaseId);
  if(!purchase)throw new Error('That purchase is not available to undo. It may have been checked off on another phone.');
  if(purchase.value.undone)throw new Error('This purchase has already been undone.');
  if(!item||item.value.active||item.rev!==purchase.value.itemRev)throw new Error('This item changed since purchase. Add it again from the catalog instead.');
  update('groceries',item.id,{value:{...item.value,active:true}});update('groceryPurchases',purchase.id,{value:{...purchase.value,undone:true}});
 }else for(const row of command.rows){
  const old=get('groceries',row.id),value=old?.value||{};
  if(row.kind==='add'){
   if(value.active&&!row.increase){if(reconcile)continue;throw new Error(row.value.name+' is already on the list. Use its quantity control to increase it.');}
   if(value.active&&value.unit!==row.value.unit)throw new Error('Units differ. Edit the item before adding more.');
   update('groceries',row.id,{type:'item',key:row.key,value:{...row.value,active:true,quantity:value.active?quantity(value.quantity+row.value.quantity):row.value.quantity}});
  }else if(row.kind==='delta'){
   if(!old?.value.active){if(reconcile)continue;throw new Error('This item is no longer on the list.');}
   update('groceries',row.id,{value:{...value,quantity:quantity(value.quantity+row.delta)}});
  }else if(row.kind==='patch'){
   if(row.expectedRev!=null&&(old?.rev||0)!==row.expectedRev)throw new Error('This changed on another phone. Reopen it before saving.');
   update('groceries',row.id,{type:row.type,key:row.key,value:{...value,...row.value}});
  }
 }
 return refsFor(command).filter(([collection,id])=>touched.has(collection+'/'+id)).map(([collection,id])=>get(collection,id)).filter(Boolean);
}
export function projected(rows,operations=[]){let values=rows;for(const operation of operations){try{const changes=reduceCommand(values,operation.command),map=new Map(values.map(row=>[row.collection+'/'+row.id,row]));for(const row of changes)map.set(row.collection+'/'+row.id,row);values=[...map.values()];}catch{/* A stale operation remains reviewable, never resurrecting a remote purchase. */}}return values;}
export function groupedPurchases(purchases){const days=new Map();for(const row of purchases.filter(row=>!row.value.undone)){const day=row.value.day;if(!days.has(day))days.set(day,[]);days.get(day).push(row);}return [...days].sort(([a],[b])=>b.localeCompare(a));}
export function frequentItems(purchases){const runs=groupedPurchases(purchases).slice(0,10),counts=new Map(),items=new Map();for(const [,rows]of runs)for(const id of new Set(rows.map(row=>row.value.catalogId))){counts.set(id,(counts.get(id)||0)+1);items.set(id,rows.find(row=>row.value.catalogId===id).value);}return [...counts].filter(([,n])=>n>=3).map(([id])=>items.get(id));}
