import {addDays} from './core.js?v=timing3';

export function dayGroups(today,count){
 const length=Math.max(1,Math.min(14,Number.parseInt(count)||1));
 if(length===1)return [{start:today,end:today,weekend:false}];
 let end=addDays(today,length-1);
 if(new Date(end+'T12:00:00Z').getUTCDay()===6)end=addDays(end,1);
 const groups=[];
 for(let day=today;day<=end;day=addDays(day,1)){
  const weekday=new Date(day+'T12:00:00Z').getUTCDay();
  if(weekday===6){groups.push({start:day,end:addDays(day,1),weekend:true});day=addDays(day,1);}
  else groups.push({start:day,end:day,weekend:weekday===0});
 }
 return groups;
}

export function groupDay(day,groups){
 return groups.find(group=>day>=group.start&&day<=group.end)?.start||day;
}
