import test from 'node:test';
import assert from 'node:assert/strict';
import {waitingDrop,waitingOrder} from '../shared/waiting-board.js';
const context={today:'2026-11-25',weekDate:'2026-11-27'};
test('entering Waiting clears all scheduling; reorder preserves it',()=>{
 assert.deepEqual(waitingDrop({waiting:false,dueDate:context.today},{...context,lane:'waiting',sourceLane:'today'}),{waiting:true,followUp:null,dueDate:null,someday:false});
 assert.deepEqual(waitingDrop({waiting:true,followUp:'2026-12-01'},{...context,lane:'waiting',sourceLane:'waiting'}),{});
});
test('leaving Waiting clears the flag and uses the destination schedule',()=>{
 for(const [lane,dueDate] of [['today',context.today],['upcoming',context.weekDate],['later',null],['someday',null]])assert.deepEqual(waitingDrop({waiting:true},{...context,lane,sourceLane:'waiting'}),{waiting:false,followUp:null,dueDate,someday:lane==='someday'});
 assert.equal(waitingDrop({waiting:true},{...context,lane:'today',sourceLane:'later'}),null,'Moving the scheduled appearance does not implicitly end Waiting');
 assert.deepEqual(waitingDrop({waiting:true},{...context,day:'2026-11-29',sourceLane:'waiting'}),{waiting:false,followUp:null,dueDate:'2026-11-29',someday:false});
});
test('Waiting sorts dated follow-ups first, overdue first, then undated',()=>{
 const rows=[{id:'no',followUp:null,sortOrder:0},{id:'future',followUp:'2026-12-01',sortOrder:0},{id:'overdue',followUp:'2026-11-01',sortOrder:0}];assert.deepEqual(rows.sort(waitingOrder).map(row=>row.id),['overdue','future','no']);
});
