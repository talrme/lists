import test from 'node:test';
import assert from 'node:assert/strict';
import {completionPatch,completedOn,completedOrder} from '../shared/completed-today.js';
import {changedFields,projectTasks} from '../shared/device-store.js';
test('completion captures action time; reopen clears it; undo may restore the original time',()=>{
 assert.deepEqual(completionPatch({completed:false},{completed:true},123),{completed:true,completedAt:123});
 assert.deepEqual(completionPatch({completed:true,completedAt:10},{completed:false},123),{completed:false,completedAt:null});
 assert.deepEqual(completionPatch({completed:false},{completed:true,completedAt:10},123),{completed:true,completedAt:10});
 assert.deepEqual(completionPatch({completed:false},{completed:true,completedAt:null},123),{completed:true,completedAt:null},'Undo of legacy history must not invent a completion time');
 assert.deepEqual(completionPatch({completed:true,completedAt:10},{completed:true,title:'Edited'},123),{completed:true,title:'Edited'});
});
test('Completed today uses Pacific completion time, never the due date or latest edit time',()=>{
 const row={completed:true,completedAt:Date.parse('2026-11-26T07:59:00Z'),dueDate:'2026-12-01'};
 assert(completedOn(row,'2026-11-25'));assert(!completedOn(row,'2026-11-26'));
 assert(completedOn({...row,completedAt:Date.parse('2026-11-26T08:01:00Z')},'2026-11-26'));
 for(const extra of [{completed:false},{completedAt:null},{completedAt:undefined},{completedAt:NaN},{completedAt:1e20}])assert(!completedOn({...row,...extra},'2026-11-25'));
 assert(!completedOn({completed:true,updatedAt:Date.now()},'2026-11-26'));
});
test('completed checkbox/time replay together and retain the offline action date',()=>{
 const original={id:'a',completed:false,completedAt:null,rev:1};
 const patch=changedFields(original,completionPatch(original,{completed:true},123));assert.deepEqual(patch,{completed:true,completedAt:123});
 assert.deepEqual(projectTasks([original],[{items:[{id:'a',type:'update',patch}]}])[0],{id:'a',completed:true,completedAt:123,rev:2});
 assert.deepEqual(changedFields({completed:true,completedAt:123},{completed:false,completedAt:null}),{completed:false,completedAt:null});
});
test('recent accomplishments sort first with deterministic ties',()=>{
 const rows=[{id:'a',completedAt:1,createdAt:1},{id:'b',completedAt:2,createdAt:2}];assert.deepEqual(rows.sort(completedOrder).map(row=>row.id),['b','a']);
});
