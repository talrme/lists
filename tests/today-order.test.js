import test from 'node:test';
import assert from 'node:assert/strict';
import {carriedOver,todayOrder,savedTodayOrder,mergeTodayOrder} from '../shared/today-order.js';
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
test('a saved current-day order permits every overdue/today interleaving',()=>{
 const rows=[task('old','2026-11-25',0),task('new','2026-11-26',500),task('waiting',null,1000,{waiting:true,followUp:'2026-11-24'})];
 const saved=savedTodayOrder({scope:'home',day:'2026-11-26',ids:['new','waiting','old']},'home','2026-11-26');
 assert.deepEqual(rows.sort((a,b)=>todayOrder(a,b,'2026-11-26',saved)).map(row=>row.id),['new','waiting','old']);
 assert.equal(rows[2].dueDate,'2026-11-25');
});
test('rollover concatenates yesterday manual order with tomorrow saved task order',()=>{
 const rows=[task('old','2026-11-25',-50),task('today','2026-11-26',200),task('tomorrow-a','2026-11-27',100),task('tomorrow-b','2026-11-27',-100)];
 const snapshot={scope:'home',day:'2026-11-26',ids:['today','old']},saved=savedTodayOrder(snapshot,'home','2026-11-27');
 assert.deepEqual([...rows].sort((a,b)=>todayOrder(a,b,'2026-11-27',saved)).map(row=>row.id),['today','old','tomorrow-b','tomorrow-a']);
 const next={...snapshot,day:'2026-11-27',ids:['tomorrow-a','today','tomorrow-b','old']};
 assert.deepEqual([...rows].sort((a,b)=>todayOrder(a,b,'2026-11-27',savedTodayOrder(next,'home','2026-11-27'))).map(row=>row.id),next.ids);
 assert.deepEqual([...rows].sort((a,b)=>todayOrder(a,b,'2026-11-28',savedTodayOrder(next,'home','2026-11-28'))).map(row=>row.id),next.ids);
});
test('skipped days preserve the earlier queue before each incoming dated queue',()=>{
 const rows=[task('old','2026-11-24',0),task('day-one','2026-11-26',900),task('day-two','2026-11-27',-900),task('new-today','2026-11-28',-9999)];
 const saved=savedTodayOrder({scope:'home',day:'2026-11-25',ids:['old']},'home','2026-11-28');
 assert.deepEqual(rows.sort((a,b)=>todayOrder(a,b,'2026-11-28',saved)).map(row=>row.id),['old','day-one','day-two','new-today']);
});
test('saved order rejects future, malformed, duplicate or wrong-workspace records',()=>{
 const valid={scope:'home',day:'2026-11-26',ids:['one','two']};
 for(const value of [{...valid,scope:'other'},{...valid,day:'2026-11-27'},{...valid,day:'2026-02-31'},{...valid,ids:['one','one']},{...valid,ids:[null]},null])assert.equal(savedTodayOrder(value,'home','2026-11-26'),null);
});
test('reordering visible tasks retains hidden task slots without duplicates',()=>{
 assert.deepEqual(mergeTodayOrder(['a','hidden','b','removed'],['new','b','a'],['a','hidden','b','new']),['new','hidden','b','a']);
 assert.deepEqual(mergeTodayOrder([],['b','a','b'],['a','b']),['b','a']);
});
