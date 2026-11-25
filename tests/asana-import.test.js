import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImport,importDrafts} from '../shared/asana-import-core.js';
const row=patch=>({sourceId:'1',title:'Sample',description:'Line one\n\nhttps://example.com/details',destination:'later',waiting:false,...patch});
const plan=tasks=>({kind:'lists-asana-import',version:1,tasks});
test('Prepared imports preserve complete descriptions and derive privacy and owner from the signed-in account',()=>{
 const source=row({ownerUid:'forged',visibility:'shared',completed:true,dueDate:'2001-01-01'});
 const result=importDrafts(plan([source]),{uid:'test-real',day:'2026-11-24',now:100})[0];
 assert.equal(result.description,source.description);assert.equal(result.ownerUid,'test-real');assert.equal(result.visibility,'private');assert.equal(result.completed,false);assert.equal(result.dueDate,null);assert.equal(result.assigneeUid,null);assert.equal(result.id,'asana-1');
});
test('Only Today and Week receive dates; Week stays future; Waiting and Someday remain undated',()=>{
 const rows=[row({destination:'today'}),...Array.from({length:6},(_,i)=>row({sourceId:String(i+2),destination:'week'})),row({sourceId:'8',waiting:true}),row({sourceId:'9',destination:'someday'})];
 const drafts=importDrafts(plan(rows),{uid:'test-tal',day:'2026-11-24',now:100});
 assert.equal(drafts[0].dueDate,'2026-11-24');
 assert.deepEqual(drafts.slice(1,7).map(t=>t.dueDate),['2026-11-25','2026-11-26','2026-11-27','2026-11-30','2026-12-01','2026-11-25']);
 assert.equal(drafts[7].waiting,true);assert.equal(drafts[7].dueDate,null);assert.equal(drafts[7].followUp,null);
 assert.equal(drafts[8].someday,true);assert.equal(drafts[8].dueDate,null);
});
test('Reject malformed/oversize imports, duplicate IDs, invalid timing, and implicit waiting dates',()=>{
 for(const value of [{},plan([]),plan([row(),row()]),plan([row({sourceId:'x'})]),plan([row({title:'x'.repeat(201)})]),plan([row({description:'x'.repeat(10001)})]),plan([row({waiting:true,destination:'week'})]),plan(Array.from({length:401},(_,i)=>row({sourceId:String(i+1)})))]){
  assert.throws(()=>validateImport(value));
 }
});
test('Imported tasks keep source order ahead of existing tasks and never execute source text',()=>{
 const description='<script>throw new Error("not executable")</script>';
 const drafts=importDrafts(plan([row({description}),row({sourceId:'2'})]),{uid:'test-tal',day:'2026-11-24',existing:[{id:'old',category:'todo',completed:false,createdAt:-1000}],now:100});
 assert.equal(drafts[0].description,description);assert(drafts[0].sortOrder<drafts[1].sortOrder);assert(drafts[1].sortOrder< -1000);
});
