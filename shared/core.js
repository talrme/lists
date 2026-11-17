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
export function schedule(mode, day, exact = '', random = Math.random) {
  if (!validDay(day)) throw new Error('Choose a valid day.');
  if (mode === 'later') return null;
  if (mode === 'asap') return day;
  if (mode === 'week' || mode === 'nextWeek') return choose(businessDays(day,mode === 'nextWeek'),random);
  if (mode === 'date' && validDay(exact)) return exact;
  throw new Error('Choose a date.');
}
export function taskDraft({title, description, category='todo', ownerUid, assigneeUid=null, shared=false, mode='asap', exact='', day, random}) {
  title = String(title||'').trim();
  if (!title) throw new Error('Add a task name.');
  if (title.length>200) throw new Error('Keep the name under 200 characters.');
  if (!ownerUid) throw new Error('Sign in first.');
  if(description!==undefined&&(typeof description!=='string'||description.length>10000))throw new Error('Keep the description under 10,000 characters.');
  return {title, ...(description!==undefined?{description}:{}), category, ownerUid, assigneeUid, visibility:shared||assigneeUid?'shared':'private', dueDate:schedule(mode,day,exact,random), waiting:false, followUp:null, completed:false};
}
export function candidateTasks(tasks, uid) {
  return tasks.filter(t => t.category==='todo' && !t.completed && !t.waiting && !t.dueDate && ((t.visibility==='private'&&t.ownerUid===uid)||(t.visibility==='shared'&&(!t.assigneeUid||t.assigneeUid===uid)))).sort((a,b)=>a.id.localeCompare(b.id));
}
export function isToday(task, day, picks = []) {
  if (task.completed) return false;
  if (task.waiting) return !!task.followUp && task.followUp<=day;
  return !!task.dueDate && task.dueDate<=day || !task.dueDate && picks.includes(task.id);
}
export function inView(task, view, day, picks=[]) {
  if (view==='done') return task.completed;
  if (task.completed) return false;
  if (view==='today') return isToday(task,day,picks);
  if (view==='upcoming') return !task.waiting && !!task.dueDate && task.dueDate>day;
  if (view==='waiting') return task.waiting;
  return !task.dueDate && !task.waiting;
}
export function shortDate(day) {
  if (!day) return '';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
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
