import {assignedTo,unassigned} from './core.js?v=timing3';

export function normalizeSelection(selection,profiles={}){
 const result={...selection};
 for(const key of Object.keys(result))if(key.startsWith('email:')){
  const uid=Object.keys(profiles).find(id=>!id.startsWith('email:')&&profiles[id].email===key.slice(6));
  if(uid){if(!(uid in result))result[uid]=result[key];delete result[key];}
 }
 return result;
}

export function selectedTask(task,{uid,email,selection,profiles={}}){
 if(task.visibility==='private')return task.ownerUid===uid&&!!selection.private;
 if(task.visibility!=='shared')return false;
 if(unassigned(task))return !!selection.unassigned;
 return Object.entries(selection).some(([key,on])=>on&&!['private','unassigned'].includes(key)&&assignedTo(task,key,key===uid?email:key.startsWith('email:')?key.slice(6):profiles[key]?.email));
}
