export function waitingOrder(a,b){
 return (a.followUp||'9999-12-31').localeCompare(b.followUp||'9999-12-31')||(a.sortOrder??a.createdAt)-(b.sortOrder??b.createdAt)||a.id.localeCompare(b.id);
}

export function waitingDrop(task,{lane,sourceLane,day,today,weekDate}){
 if(lane==='waiting')return sourceLane==='waiting'?{}:{waiting:true,followUp:null,dueDate:null,someday:false};
 if(sourceLane!=='waiting'||!lane&&!day)return null;
 return {waiting:false,followUp:null,someday:lane==='someday',dueDate:day||(lane==='today'?today:lane==='upcoming'?weekDate:null)};
}
