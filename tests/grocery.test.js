import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,catalogView,suggestions,initialStores} from '../shared/grocery-catalog.js';
import {activeId,cleanItem,reduceCommand,projected,groceryDay,groupedPurchases,frequentItems} from '../shared/grocery-core.js';
const item=cleanItem({id:'c-apples',catalogId:'c-apples',name:'Apples',category:'Produce',quantity:1,unit:'each'});
const add=(increase=false,quantity=1)=>({action:'write',rows:[{id:activeId(item),key:item.catalogId,kind:'add',increase,value:{...item,quantity}}]});
const purchase={action:'purchase',itemId:activeId(item),purchaseId:'purchase-1',at:Date.parse('2026-11-21T22:00:00Z'),storeId:'berkeley-bowl'};
function merge(values,changes){const map=new Map(values.map(row=>[row.collection+'/'+row.id,row]));for(const row of changes)map.set(row.collection+'/'+row.id,row);return [...map.values()];}
test('curated catalog has unique IDs, safe defaults, source labels and no old counts',()=>{
 assert.equal(catalog.length,412);assert.equal(new Set(catalog.map(item=>item.id)).size,catalog.length);
 assert(catalog.every(item=>item.quantity===1&&item.name&&!Object.keys(item.locations).length));assert.equal(catalog.filter(item=>item.source==='Added staple').length,13);
 assert.equal(suggestions(catalog,'cuke')[0].name,'Cucumbers');assert.equal(suggestions(catalog,'peppeorncini')[0].name,'Pepperoncini');
 assert(catalog.some(item=>item.name==='Frozen blueberries'));assert(catalog.some(item=>item.name==='Blueberries'));assert.equal(initialStores.length,2);assert(initialStores.every(store=>!store.locations.length));
});
test('catalog overrides do not rewrite shopping or purchase snapshots',()=>{
 const changed=catalogView([{type:'catalog',key:'c-apples',value:{name:'Our apples',quantity:3,locations:{'berkeley-bowl':'aisle-1'}}}]);
 assert.equal(changed.find(item=>item.id==='c-apples').quantity,3);assert.equal(item.quantity,1);
});
test('duplicate addition requires explicit increase, quantities and units are protected',()=>{
 const first=reduceCommand([],add());assert.equal(first[0].value.quantity,1);
 assert.throws(()=>reduceCommand(first,add()),/already/);const increased=reduceCommand(first,add(true,2));assert.equal(increased[0].value.quantity,3);
 const wrong=add(true);wrong.rows[0].value.unit='lb';assert.throws(()=>reduceCommand(first,wrong),/Units differ/);
 for(const quantity of [0,-1,NaN,10000])assert.throws(()=>cleanItem({...item,quantity}));
});
test('purchase checks all quantity, one immutable history snapshot, safe undo and no resurrection',()=>{
 const first=reduceCommand([],add(false,4)),bought=reduceCommand(first,purchase);assert.equal(bought.find(row=>row.type==='purchase').value.quantity,4);assert.equal(bought.find(row=>row.type==='item').value.active,false);
 assert.throws(()=>reduceCommand(bought,purchase),/already/);
 const undo={action:'undo',itemId:activeId(item),purchaseId:purchase.purchaseId};const restored=reduceCommand(bought,undo);assert.equal(restored.find(row=>row.type==='item').value.quantity,4);assert.equal(restored.find(row=>row.type==='purchase').value.undone,true);
 const readded=merge(bought,reduceCommand(bought,add()));assert.throws(()=>reduceCommand(readded,undo),/changed/);
});
test('offline commands preserve order and strict edits surface conflicts',()=>{
 const operations=[{command:add()},{command:{action:'write',rows:[{kind:'delta',id:activeId(item),delta:1}]}},{command:purchase}];
 const values=projected([],operations);assert.equal(values.find(row=>row.type==='purchase').value.quantity,2);
 assert.throws(()=>reduceCommand(values,{action:'write',rows:[{kind:'patch',id:activeId(item),key:item.catalogId,type:'item',expectedRev:1,value:{notes:'old'}}]}),/another phone/);
 assert.equal(reduceCommand([],{action:'write',rows:[{kind:'patch',id:'list--new',type:'list',key:'new',expectedRev:0,value:{name:'Staples',entries:[item],archived:false}}]})[0].rev,1);
});
test('shared-phone races consume duplicate commands without blocking or resurrecting purchases',()=>{
 const first=reduceCommand([],add()),bought=reduceCommand(first,purchase);
 assert.deepEqual(reduceCommand(first,add(),{reconcile:true}),[]);
 assert.deepEqual(reduceCommand(bought,purchase,{reconcile:true}),[]);
 assert.deepEqual(reduceCommand(bought,{action:'write',rows:[{kind:'delta',id:activeId(item),delta:1}]},{reconcile:true}),[]);
 const after=reduceCommand(bought,add(),{reconcile:true});assert.equal(after[0].value.active,true,'An explicit fresh add, unlike a stale delta, can request an item again');
});
test('all stores share a Pacific-day shop; undone purchases leave history and frequency',()=>{
 assert.equal(groceryDay(Date.parse('2026-11-22T07:59:00Z')),'2026-11-21');assert.equal(groceryDay(Date.parse('2026-11-22T08:00:00Z')),'2026-11-22');
 const rows=Array.from({length:4},(_,index)=>({collection:'groceryPurchases',id:String(index),value:{...item,day:'2026-11-'+(20+Math.floor(index/2)),storeId:index%2?'a':'b',undone:false}}));assert.equal(groupedPurchases(rows).length,2);assert.equal(frequentItems(rows).length,0);
 rows.push({value:{...item,day:'2026-11-22',undone:false}});assert.equal(frequentItems(rows).length,1);rows.at(-1).value.undone=true;assert.equal(frequentItems(rows).length,0);
});
