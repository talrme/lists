import test from 'node:test';
import assert from 'node:assert/strict';
import {sectionDraft} from '../shared/section-add.js';
import {businessDays} from '../shared/core.js';

test('section quick add stays private and uses the section schedule',()=>{
 const context={today:'2026-11-26',uid:'synthetic'},tasks=[{category:'todo',sortOrder:-100}];
 const make=(lane,day)=>sectionDraft(' New task ',{...context,lane,day},tasks);
 for(const lane of ['today','upcoming','later','waiting','someday']){
  const draft=make(lane);assert.equal(draft.title,'New task');assert.equal(draft.ownerUid,'synthetic');assert.equal(draft.visibility,'private');assert.equal(draft.completed,false);assert(draft.sortOrder<-100);
  if(lane==='today')assert.equal(draft.dueDate,context.today);
  if(lane==='upcoming')assert(businessDays(context.today).includes(draft.dueDate));
  if(['later','waiting','someday'].includes(lane))assert.equal(draft.dueDate,null);
  assert.equal(draft.waiting,lane==='waiting');assert.equal(!!draft.someday,lane==='someday');assert.equal(draft.followUp,null);
 }
 assert.equal(make(null,'2026-11-28').dueDate,'2026-11-28','Weekend uses first day of group');
 assert.throws(()=>make('bad'),/Choose a date/);
 assert.throws(()=>sectionDraft('',{...context,lane:'today'},[]),/Add a task name/);
});
