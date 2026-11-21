import test from 'node:test';
import assert from 'node:assert/strict';
import {taskDraft,inView,candidateTasks,taskDay} from '../shared/core.js';
import {canonicalTag,taskTags,matchingTags,tagName,tagKey} from '../shared/organizer.js';
import {changedFields} from '../shared/device-store.js';
const day='2026-11-20';
test('Someday never enters date lists, waiting or daily suggestions, even with a saved receipt',()=>{
 const task={id:'idea',...taskDraft({title:'Learn pottery',ownerUid:'tal',mode:'someday',day})};
 assert.equal(task.someday,true);assert.equal(task.dueDate,null);
 for(const view of ['today','upcoming','later','waiting'])assert.equal(inView(task,view,day,['idea']),false);
 assert.equal(inView(task,'someday',day),true);assert.equal(taskDay(task,day,['idea']),null);
 assert.deepEqual(candidateTasks([task],'tal',null,day),[]);
 assert.equal(inView({...task,completed:true},'someday',day),false);assert.equal(inView({...task,completed:true},'done',day),true);
});
test('Tags normalize, resolve rename/merge history and match all selected tags',()=>{
 const tags=[{id:'a',name:'Old',mergedInto:'b'},{id:'b',name:'Vacation',mergedInto:null},{id:'c',name:'Errands',archived:true}];
 assert.equal(tagName('  Big   Plan  '),'Big Plan');assert.equal(tagKey('VACATION'),'vacation');
 assert.equal(canonicalTag('a',tags).id,'b');assert.deepEqual(taskTags({tagIds:['a','b','c']},tags).map(tag=>tag.id),['b','c']);
 assert(matchingTags({tagIds:['a','c']},['b','c'],tags));assert(!matchingTags({tagIds:['a']},['b','c'],tags));
 assert.equal(canonicalTag('missing',tags),null);assert.equal(canonicalTag('a',[{id:'a',mergedInto:'b'},{id:'b',mergedInto:'a'}]),null);
});
test('Tag references are bounded and Someday is a coherent offline scheduling state',()=>{
 assert.throws(()=>taskDraft({title:'Bad',ownerUid:'tal',tagIds:Array(21).fill('tag'),day}));
 assert.throws(()=>taskDraft({title:'Bad',ownerUid:'tal',tagIds:['../private'],day}));
 const old={dueDate:day,waiting:false,followUp:null,someday:false};
 assert.deepEqual(changedFields(old,{someday:true,dueDate:null,waiting:false,followUp:null}),{someday:true,dueDate:null,waiting:false,followUp:null});
});
