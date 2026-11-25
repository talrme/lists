import {addDays,businessDays,creationOrder,taskDraft,validDay} from './core.js?v=organizer1';

export function validateImport(value){
 if(value?.kind!=='lists-asana-import'||value.version!==1||!Array.isArray(value.tasks)||!value.tasks.length||value.tasks.length>400)throw new Error('Choose a prepared Lists import with 1–400 tasks.');
 const ids=new Set();
 const tasks=value.tasks.map(row=>{
  if(!row||typeof row.sourceId!=='string'||!/^\d{1,30}$/.test(row.sourceId)||ids.has(row.sourceId))throw new Error('The import has missing or duplicate source IDs.');
  ids.add(row.sourceId);
  if(typeof row.title!=='string'||!row.title.trim()||row.title.length>200||typeof row.description!=='string'||row.description.length>10000||!['today','week','later','someday'].includes(row.destination)||typeof row.waiting!=='boolean'||row.waiting&&row.destination!=='later')throw new Error('The import contains an invalid task.');
  return {sourceId:row.sourceId,title:row.title.trim(),description:row.description,destination:row.destination,waiting:row.waiting};
 });
 return {kind:'lists-asana-import',version:1,tasks};
}

export function importDrafts(value,{uid,day,existing=[],now=Date.now()}){
 const plan=validateImport(value);
 if(!uid||!validDay(day))throw new Error('A signed-in account and valid import day are required.');
 const weekdays=businessDays(addDays(day,1)),first=creationOrder(existing,'todo',now)-1024*plan.tasks.length;
 let weekIndex=0;
 return plan.tasks.map((row,index)=>{
  const draft=taskDraft({title:row.title,description:row.description,ownerUid:uid,mode:row.destination==='today'?'asap':row.destination==='someday'?'someday':'later',day});
  if(row.destination==='week')draft.dueDate=weekdays[weekIndex++%weekdays.length];
  if(row.waiting){draft.waiting=true;draft.followUp=null;draft.dueDate=null;}
  return {id:'asana-'+row.sourceId,...draft,sortOrder:first+index*1024,createdAt:now+index,rev:1};
 });
}
