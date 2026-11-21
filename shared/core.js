export const TIME_ZONE = 'America/Los_Angeles';
export function dayKey(now = Date.now(), timeZone = TIME_ZONE) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now).map(p => [p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function validDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
}
export function addDays(day, amount) {
  const date = new Date(day+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+amount); return date.toISOString().slice(0,10);
}
export function businessDays(day, nextWeek = false) {
  let start = day;
  if (nextWeek) {
    const weekday = new Date(day+'T12:00:00Z').getUTCDay();
    start = addDays(day, weekday === 0 ? 1 : 8-weekday);
  }
  const days = [];
  for (let i=0; days.length<5; i++) {
    const date = addDays(start,i), weekday = new Date(date+'T12:00:00Z').getUTCDay();
    if (weekday>0 && weekday<6) days.push(date);
  }
  return days;
}
export function choose(items, random = Math.random) {
  return items.length ? items[Math.min(items.length-1,Math.floor(random()*items.length))] : null;
}
export function laterDate(day,period,random=Math.random){
  if(!validDay(day)||!['fortnight','month','two-months'].includes(period))throw new Error('Choose a valid date shortcut.');
  let target=addDays(day,14);
  if(period!=='fortnight'){
    const date=new Date(day+'T12:00:00Z'),original=date.getUTCDate();
    date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+(period==='month'?1:2));
    const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
    date.setUTCDate(Math.min(original,last));target=date.toISOString().slice(0,10);
  }
  while([0,6].includes(new Date(target+'T12:00:00Z').getUTCDay()))target=addDays(target,1);
  const before=[];let date=target;
  while(before.length<2){date=addDays(date,-1);if(![0,6].includes(new Date(date+'T12:00:00Z').getUTCDay()))before.unshift(date);}
  return choose([...before,...businessDays(target).slice(0,3)],random);
}
export function schedule(mode, day, exact = '', random = Math.random) {
  if (!validDay(day)) throw new Error('Choose a valid day.');
  if (mode === 'later' || mode === 'someday') return null;
  if (mode === 'asap') return day;
  if (mode === 'defer') return choose(businessDays(addDays(day,1)),random);
  if (mode === 'week' || mode === 'nextWeek') return choose(businessDays(day,mode === 'nextWeek'),random);
  if (mode === 'date' && validDay(exact)) return exact;
  throw new Error('Choose a date.');
}
export function taskDraft({title, description, tagIds, category='todo', ownerUid, assigneeUid=null, assigneeEmail=null, shared=false, mode='asap', exact='', day, random}) {
  title = String(title||'').trim();
  if (!title) throw new Error('Add a task name.');
  if (title.length>200) throw new Error('Keep the name under 200 characters.');
  if (!ownerUid) throw new Error('Sign in first.');
  if(description!==undefined&&(typeof description!=='string'||description.length>10000))throw new Error('Keep the description under 10,000 characters.');
  if(tagIds!==undefined&&(!Array.isArray(tagIds)||tagIds.length>20||tagIds.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id))))throw new Error('Choose up to 20 valid tags.');
  return {title, ...(tagIds!==undefined?{tagIds:[...new Set(tagIds)]}:{}), ...(mode==='someday'?{someday:true}:{}), ...(description!==undefined?{description}:{}), ...(assigneeEmail?{assigneeEmail}:{}), category, ownerUid, assigneeUid, visibility:shared||assigneeUid||assigneeEmail?'shared':'private', dueDate:schedule(mode,day,exact,random), waiting:false, followUp:null, completed:false};
}
export const unassigned=task=>!task.assigneeUid&&!task.assigneeEmail;
export const assignedTo=(task,uid,email)=>!!uid&&task.assigneeUid===uid||!!email&&task.assigneeEmail===email;
export function candidateTasks(tasks, uid, email, day=dayKey()) {
  return tasks.filter(t => t.category==='todo' && !t.someday && !t.completed && !t.waiting && dateTiming(t.dueDate,day)==='later' && ((t.visibility==='private'&&t.ownerUid===uid)||(t.visibility==='shared'&&(unassigned(t)||assignedTo(t,uid,email))))).sort((a,b)=>a.id.localeCompare(b.id));
}
export function isToday(task, day, picks = []) {
  if (task.completed || task.someday) return false;
  if (task.waiting) return !!task.followUp && task.followUp<=day;
  return !!task.dueDate && task.dueDate<=day || dateTiming(task.dueDate,day)==='later' && picks.includes(task.id);
}
export function inView(task, view, day, picks=[]) {
  if (view==='done') return task.completed;
  if (task.completed) return false;
  if (view==='someday') return !!task.someday;
  if(task.someday)return false;
  if (view==='today') return isToday(task,day,picks);
  const date=task.waiting?task.followUp:task.dueDate;
  if (view==='upcoming') return dateTiming(date,day)==='week';
  if (view==='waiting') return task.waiting;
  return dateTiming(date,day)==='later';
}
export function dateTiming(date,day){
  if(!date)return 'later';
  return date<=day?'asap':date<=weekHorizon(day)?'week':'later';
}
export function weekHorizon(day) {
  return businessDays(addDays(day,1)).at(-1);
}
export function shortDate(day) {
  if (!day) return '';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
}
export function taskDay(task,today,picks=[]){
  if(isToday(task,today,picks))return today;
  if(task.completed||task.someday)return null;
  return task.waiting?task.followUp:task.dueDate;
}
export function taskOrder(a,b){return (a.sortOrder??a.createdAt)-(b.sortOrder??b.createdAt)||a.createdAt-b.createdAt||a.id.localeCompare(b.id);}
export function creationOrder(tasks,category,now=Date.now()){
  const first=tasks.filter(task=>task.category===category&&!task.completed).reduce((rank,task)=>Math.min(rank,task.sortOrder??task.createdAt),-now);
  const rank=first-1024;
  if(!Number.isFinite(rank)||Math.abs(rank)>1e15||rank>=first)throw new Error('Unable to place this task first. Refresh and try again.');
  return rank;
}
export function insertionOrder(ordered,id){
  const index=ordered.findIndex(task=>task.id===id),previous=ordered[index-1],next=ordered[index+1];
  const low=previous?(previous.sortOrder??previous.createdAt):null,high=next?(next.sortOrder??next.createdAt):null;
  const rank=low===null?(high===null?0:high-1024):high===null?low+1024:low+(high-low)/2;
  return Number.isFinite(rank)&&Math.abs(rank)<=1e15&&(low===null||rank>low)&&(high===null||rank<high)?rank:null;
}
export function seededTasks(day) {
  const values = [
    ['Book the dentist','tal','asap',null],['Send the family photos','tal','asap',null],['Pick a weekend adventure','tal','later',null],
    ['Order a new bike helmet','sophie','asap',null],['Choose a book for Miri','sophie','later',null],
    ['Book the car service','tal','asap','sophie'],['Plan Friday dinner','sophie','asap','tal'],
    ['Sort the hallway cupboard','tal','later','both'],['Try a new walking route','tal','later','tal'],
  ];
  return values.map(([title,ownerUid,mode,assigned],i)=>({id:`sample-${i}`, ...taskDraft({title,ownerUid,mode,day,shared:assigned==='both',assigneeUid:assigned==='both'?null:assigned}), rev:1, createdAt:i})).concat([
    {id:'sample-upcoming',...taskDraft({title:'Pick up the library books',ownerUid:'tal',mode:'date',exact:addDays(day,3),day}),rev:1,createdAt:10},
    {id:'sample-waiting',...taskDraft({title:'Hear back from the electrician',ownerUid:'tal',mode:'later',day}),waiting:true,followUp:addDays(day,7),rev:1,createdAt:11},
    ...[['grocery','Oat milk'],['grocery','Strawberries'],['movies','The Grand Budapest Hotel'],['other','Places for a long weekend']].map(([category,title],i)=>({id:`sample-list-${i}`,...taskDraft({title,category,ownerUid:'tal',assigneeUid:'tal',mode:'later',day}),rev:1,createdAt:20+i})),
  ]);
}
