import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeKey,projectTasks,changedFields,mergeResults} from '../shared/device-store.js';
test('Device cache keys separate people, households and Playground runs',()=>{
 assert.notEqual(scopeKey('tal','home','staging'),scopeKey('sophie','home','staging'));
 assert.notEqual(scopeKey('tal','home','staging'),scopeKey('tal','friends','staging'));
 assert.notEqual(scopeKey('tal','playground','run1'),scopeKey('tal','playground','run2'));
});
test('Only actually edited fields are replayed, with coherent schedule and ownership groups',()=>{
 const old={title:'Task',description:'Old',completed:false,dueDate:null,waiting:false,followUp:null,visibility:'shared',assigneeUid:'tal'};
 assert.deepEqual(changedFields(old,{...old,completed:true}),{completed:true});
 assert.deepEqual(changedFields(old,{...old,description:'New'}),{description:'New'});
 assert.deepEqual(changedFields(old,{dueDate:'2026-11-20'}),{dueDate:'2026-11-20',waiting:false,followUp:null});
 assert.deepEqual(changedFields(old,{visibility:'private',assigneeUid:null}),{visibility:'private',assigneeUid:null});
});
test('Durable queue projection preserves order, local revisions and stable creation IDs',()=>{
 const operations=[{items:[{id:'a',type:'create',createdAt:123,patch:{title:'Task',completed:false}}]},{items:[{id:'a',type:'update',patch:{completed:true}}]}];
 assert.deepEqual(projectTasks([],operations),[{id:'a',title:'Task',completed:true,createdAt:123,rev:2}]);
 assert.equal(projectTasks([],operations.concat(operations.slice(0,1))).length,1);
 assert.deepEqual(projectTasks([],operations.concat({items:[{id:'a',type:'remove'}]})),[]);
});
test('Remote deletion is not undone by an offline edit, and unrelated remote fields survive',()=>{
 assert.deepEqual(projectTasks([],[{items:[{id:'gone',type:'update',patch:{description:'offline'}}]}]),[]);
 assert.deepEqual(projectTasks([{id:'a',title:'Remote title',rev:4}],[{items:[{id:'a',type:'update',patch:{description:'Offline note'}}]}]),[{id:'a',title:'Remote title',description:'Offline note',rev:5}]);
});
test('Server acknowledgments refresh the disk snapshot without overwriting newer revisions',()=>{
 assert.deepEqual(mergeResults([{id:'a',title:'Newest',rev:5},{id:'b',rev:1}],[{id:'a',title:'Older',rev:3},{id:'b',removed:true},{id:'c',rev:1}]),[{id:'a',title:'Newest',rev:5},{id:'c',rev:1}]);
});
