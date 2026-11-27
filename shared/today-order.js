import {taskOrder,validDay} from './core.js?v=organizer1';

export function carriedOver(task,today){
 const date=task.waiting?task.followUp:task.dueDate;
 return task.category==='todo'&&!task.completed&&!task.someday&&!!date&&date<today;
}

export function savedTodayOrder(value,scope,today){
 if(!value||value.scope!==scope||!validDay(value.day)||value.day>today||!Array.isArray(value.ids)||value.ids.length>2000||value.ids.some(id=>typeof id!=='string'||!id||id.length>128)||new Set(value.ids).size!==value.ids.length)return null;
 return {day:value.day,ranks:new Map(value.ids.map((id,index)=>[id,index]))};
}

export function todayOrder(a,b,today,saved=null){
 if(saved){
  // An older snapshot is yesterday's queue, followed by each incoming dated queue.
  if(saved.day<today){
   const ad=a.waiting?a.followUp:a.dueDate,bd=b.waiting?b.followUp:b.dueDate;
   const ag=ad&&ad<today?(ad<=saved.day?saved.day:ad):today,bg=bd&&bd<today?(bd<=saved.day?saved.day:bd):today;
   if(ag!==bg)return ag.localeCompare(bg);
   if(ag!==saved.day)return taskOrder(a,b);
  }
  const ai=saved.ranks.get(a.id),bi=saved.ranks.get(b.id);
  if(ai!==undefined&&bi!==undefined)return ai-bi;
  if(ai!==undefined||bi!==undefined)return ai===undefined?-1:1;
 }
 return Number(carriedOver(b,today))-Number(carriedOver(a,today))||taskOrder(a,b);
}

export function mergeTodayOrder(previous,visible,retain){
 const desired=[...new Set(visible)],shown=new Set(desired),keep=new Set(retain);let cursor=0;
 const ids=previous.filter(id=>keep.has(id)).map(id=>shown.has(id)?desired[cursor++]:id);
 ids.push(...desired.slice(cursor));
 if(ids.length>2000)throw new Error('Today supports up to 2,000 manually ordered tasks.');
 return ids;
}
