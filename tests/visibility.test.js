import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedTask,normalizeSelection} from '../shared/visibility.js';
test('visibility checkboxes default to own private/shared, with optional other owners/unassigned',()=>{
 const account={uid:'tal',email:'tal@test.invalid',selection:{private:true,tal:true}};
 assert(selectedTask({visibility:'private',ownerUid:'tal'},account));
 assert(!selectedTask({visibility:'private',ownerUid:'sophie'},account));
 assert(selectedTask({visibility:'shared',assigneeUid:'tal'},account));
 assert(!selectedTask({visibility:'shared',assigneeUid:'sophie'},account));
 assert(!selectedTask({visibility:'shared'},account));
 const expanded={...account,selection:{sophie:true,unassigned:true}};
 assert(!selectedTask({visibility:'private',ownerUid:'tal'},expanded));
 assert(selectedTask({visibility:'shared',assigneeUid:'sophie'},expanded));
 assert(selectedTask({visibility:'shared'},expanded));
 assert(!selectedTask({visibility:'private',ownerUid:'sophie'},expanded));
});
test('pending email assignments match both member IDs and invited emails, never unassigned',()=>{
 const task={visibility:'shared',assigneeEmail:'sophie@test.invalid'};
 assert(selectedTask(task,{uid:'tal',selection:{sophie:true},profiles:{sophie:{email:'sophie@test.invalid'}}}));
 assert(selectedTask(task,{uid:'tal',selection:{'email:sophie@test.invalid':true}}));
 assert(!selectedTask(task,{uid:'tal',selection:{unassigned:true}}));
});
test('owner selections survive a pending invite becoming a registered member without undoing explicit choices',()=>{
 const profiles={sophie:{email:'sophie@test.invalid'}},pending={'email:sophie@test.invalid':true};
 assert.deepEqual(normalizeSelection(pending,profiles),{sophie:true});
 assert.deepEqual(normalizeSelection({...pending,sophie:false},profiles),{sophie:false});
 assert.deepEqual(pending,{'email:sophie@test.invalid':true});
});
