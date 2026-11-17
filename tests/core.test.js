import test from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,validDay,addDays,businessDays,schedule,taskDraft,candidateTasks,isToday,inView,seededTasks,taskDay,taskOrder,insertionOrder,unassigned,assignedTo} from '../shared/core.js';
import {householdPeople} from '../shared/households.js';

test('Invited people remain assignable before their first visit without duplicate profiles',()=>{
 const household={schemaVersion:2,memberEmails:['talrme@gmail.com','sophiegreen2@gmail.com']};
 const pending=householdPeople(household,[{uid:'tal',email:'talrme@gmail.com',name:'Tal'}]);
 assert.equal(pending.names['email:sophiegreen2@gmail.com'],'Sophie');assert.equal(Object.keys(pending.names).length,2);
 const joined=householdPeople(household,[{uid:'tal',email:'talrme@gmail.com',name:'Tal'},{uid:'sophie',email:'sophiegreen2@gmail.com',name:'Sophie Green'},{uid:'outsider',email:'outsider@example.com',name:'No'}]);
 assert.deepEqual(joined.names,{tal:'Tal',sophie:'Sophie'});
 const task={id:'email-task',...taskDraft({title:'For Sophie',ownerUid:'tal',assigneeEmail:'sophiegreen2@gmail.com',mode:'later',day:'2026-11-16'})};
 assert.equal(task.visibility,'shared');assert(!unassigned(task));assert(assignedTo(task,'sophie','sophiegreen2@gmail.com'));
 assert.deepEqual(candidateTasks([task],'tal','talrme@gmail.com'),[]);assert.deepEqual(candidateTasks([task],'sophie','sophiegreen2@gmail.com'),[task]);
});
test('Household uses Pacific dates, including DST boundaries',()=>{
 assert.equal(dayKey(Date.parse('2026-11-17T07:30:00Z')),'2026-11-16');
 assert.equal(dayKey(Date.parse('2026-03-08T10:30:00Z')),'2026-03-08');
 assert.equal(addDays('2026-03-08',1),'2026-03-09');assert.equal(validDay('2026-02-30'),false);
});
test('Next five weekdays includes weekday today, skips weekends, no fake holiday knowledge',()=>{
 assert.deepEqual(businessDays('2026-11-16'),['2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20']);
 assert.deepEqual(businessDays('2026-11-20'),['2026-11-20','2026-11-23','2026-11-24','2026-11-25','2026-11-26']);
 assert.equal(businessDays('2026-11-21')[0],'2026-11-23');
 assert.equal(businessDays('2026-11-22')[0],'2026-11-23');
});
test('Legacy explicit nextWeek mode still means following Monday-Friday',()=>{
 assert.equal(businessDays('2026-11-16',true)[0],'2026-11-23');
 assert.equal(businessDays('2026-11-20',true)[0],'2026-11-23');
 assert.equal(businessDays('2026-11-22',true)[0],'2026-11-23');
 assert.equal(schedule('nextWeek','2026-11-16','',()=>.999),'2026-11-27');
});
test('Defer picks Monday-Friday of the following week, unlike Soon',()=>{
 const days=['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27'];
 for(let offset=0;offset<7;offset++)for(let index=0;index<5;index++)assert.equal(schedule('defer',addDays('2026-11-16',offset),'',()=>index/5),days[index]);
 assert.equal(schedule('defer','2026-11-23','',()=>0),'2026-11-30');
 assert.equal(schedule('defer','2026-12-31','',()=>0),'2027-01-04');
 assert.equal(schedule('defer','2026-12-31','',()=>.999),'2027-01-08');
 assert.equal(schedule('week','2026-11-16','',()=>0),'2026-11-16');
});
test('Scheduling chooses once; ASAP and exact dates remain date-only',()=>{
 assert.equal(schedule('week','2026-11-16','',()=>0),'2026-11-16');
 assert.equal(schedule('week','2026-11-16','',()=>.999),'2026-11-20');
 assert.equal(schedule('asap','2026-11-16'),'2026-11-16');assert.equal(schedule('later','2026-11-16'),null);
 assert.throws(()=>schedule('date','2026-11-16','not-a-date'));
});
const task=overrides=>({id:'test',category:'todo',ownerUid:'tal',assigneeUid:null,visibility:'private',completed:false,waiting:false,followUp:null,dueDate:null,...overrides});
test('Multi-day view buckets overdue, follow-ups and the daily nudge without duplicating them',()=>{
 assert.equal(taskDay(task({dueDate:'2026-11-15'}),'2026-11-16'),'2026-11-16');
 assert.equal(taskDay(task({dueDate:'2026-11-17'}),'2026-11-16'),'2026-11-17');
 assert.equal(taskDay(task({waiting:true,followUp:'2026-11-18'}),'2026-11-16'),'2026-11-18');
 assert.equal(taskDay(task({}),'2026-11-16',['test']),'2026-11-16');
 assert.equal(taskDay(task({}),'2026-11-17',[]),null);
 assert.equal(taskDay(task({completed:true,dueDate:'2026-11-17'}),'2026-11-16'),null);
});
test('Synced ordering supports beginning, middle, end, legacy ties and precision exhaustion',()=>{
 const a={id:'a',createdAt:10},b={id:'b',createdAt:20},c={id:'c',createdAt:30};
 assert.equal(insertionOrder([c,a,b],'c'),-1014);assert.equal(insertionOrder([a,c,b],'c'),15);assert.equal(insertionOrder([a,b,c],'c'),1044);
 assert.equal(insertionOrder([c],'c'),0);
 assert.equal(insertionOrder([a,c,{...b,createdAt:10}],'c'),null);
 assert.equal(insertionOrder([{...a,sortOrder:1},c,{...b,sortOrder:1+Number.EPSILON}],'c'),null);
 assert.deepEqual([{...a,sortOrder:100},b].sort(taskOrder).map(t=>t.id),['b','a']);
});
test('Ordinary due tasks roll over; later nudges do not acquire a due date',()=>{
 assert(isToday(task({dueDate:'2026-11-15'}),'2026-11-16'));
 assert(!isToday(task({dueDate:'2026-11-17'}),'2026-11-16'));
 assert(isToday(task({}),'2026-11-16',['test']));assert(!isToday(task({}),'2026-11-17',[]));
 assert(!isToday(task({completed:true}),'2026-11-16',['test']));
});
test('One personal candidate pool includes private, assigned shared, and unassigned shared only',()=>{
 const tasks=[task({id:'private'}),task({id:'assigned',visibility:'shared',assigneeUid:'tal'}),task({id:'unassigned',visibility:'shared'}),task({id:'other-private',ownerUid:'sophie'}),task({id:'other-assigned',visibility:'shared',assigneeUid:'sophie'}),task({id:'done',completed:true}),task({id:'waiting',waiting:true}),task({id:'dated',dueDate:'2027-01-01'}),task({id:'milk',category:'grocery'})];
 assert.deepEqual(candidateTasks(tasks,'tal').map(t=>t.id),['assigned','private','unassigned']);
});
test('Waiting leaves today until follow-up, then stays overdue until handled',()=>{
 const waiting=task({waiting:true,followUp:'2026-11-19'});
 assert(!isToday(waiting,'2026-11-18',['test']));assert(isToday(waiting,'2026-11-19'));assert(isToday(waiting,'2026-11-20'));
 assert(inView(waiting,'waiting','2026-11-18'));assert(!inView(waiting,'later','2026-11-18'));
});
test('Private by default, assignment shares, unassigned sharing is explicit',()=>{
 const data={title:'  A task  ',ownerUid:'tal',day:'2026-11-16'};
 assert.equal(taskDraft(data).visibility,'private');assert.equal(taskDraft(data).title,'A task');
 assert.equal(taskDraft({...data,assigneeUid:'sophie'}).visibility,'shared');
 assert.equal(taskDraft({...data,shared:true}).visibility,'shared');
 assert.throws(()=>taskDraft({...data,title:' '}));assert.throws(()=>taskDraft({...data,title:'x'.repeat(201)}));
});
test('Sample seed is explicit, creates no fake completed history, and includes both people',()=>{
 const tasks=seededTasks('2026-11-16');assert(tasks.every(t=>t.id.startsWith('sample-')&&!t.completed));
 assert(tasks.some(t=>t.ownerUid==='sophie'));assert(tasks.some(t=>t.visibility==='shared'&&!t.assigneeUid));
});
test('Descriptions accept bounded plain Markdown and allow clearing',()=>{
 const base={title:'Read notes',ownerUid:'tal',day:'2026-11-16'};
 assert.equal(taskDraft({...base,description:'**Bold**\n- [ ] Item'}).description,'**Bold**\n- [ ] Item');
 assert.equal(taskDraft({...base,description:''}).description,'');
 assert.equal(taskDraft({...base,description:'x'.repeat(10000)}).description.length,10000);
 assert.throws(()=>taskDraft({...base,description:'x'.repeat(10001)}));
 assert.throws(()=>taskDraft({...base,description:{html:'no'}}));
 assert(!('description' in taskDraft(base)),'Older tasks can omit descriptions');
});
