import test from 'node:test';
import assert from 'node:assert/strict';
import {carriedOver,todayOrder} from '../shared/today-order.js';
const task=(id,dueDate,sortOrder,extra={})=>({id,category:'todo',dueDate,sortOrder,createdAt:1,completed:false,...extra});
test('unfinished carryovers precede today regardless of saved/creation rank',()=>{
 const rows=[task('new','2026-11-26',-9000),task('old-b','2026-11-25',200),task('old-a','2026-11-24',100),task('daily',null,-10000)];
 assert.deepEqual(rows.sort((a,b)=>todayOrder(a,b,'2026-11-26')).map(task=>task.id),['old-a','old-b','daily','new']);
 assert.equal(rows.find(task=>task.id==='old-b').dueDate,'2026-11-25');
});
test('each priority group retains manual order, not a forced due-date order',()=>{
 const rows=[task('older','2026-11-20',500),task('yesterday','2026-11-25',100),task('today-b','2026-11-26',20),task('today-a','2026-11-26',10)];
 assert.deepEqual(rows.sort((a,b)=>todayOrder(a,b,'2026-11-26')).map(task=>task.id),['yesterday','older','today-a','today-b']);
});
test('Waiting uses its follow-up; completed/Someday/undated/future items are not carryovers',()=>{
 assert(carriedOver(task('waiting',null,0,{waiting:true,followUp:'2026-11-25'}),'2026-11-26'));
 for(const row of [task('done','2026-11-25',0,{completed:true}),task('idea','2026-11-25',0,{someday:true}),task('undated',null,0),task('future','2026-11-27',0),task('today','2026-11-26',0),task('waiting-undated','2026-11-25',0,{waiting:true,followUp:null}),task('movie','2026-11-25',0,{category:'movies'})])assert.equal(carriedOver(row,'2026-11-26'),false,row.id);
});
test('Pacific date-only rollover promotes a due task without rewriting it',()=>{
 const row=task('yesterday','2026-11-25',100);assert.equal(carriedOver(row,'2026-11-25'),false);assert.equal(carriedOver(row,'2026-11-26'),true);assert.equal(row.dueDate,'2026-11-25');
});
