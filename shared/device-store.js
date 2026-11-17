export const scopeKey=(uid,space,environment)=>JSON.stringify([uid,space,environment]);
export const pointerKey=(uid,space)=>JSON.stringify([uid,space]);

export function mergeResults(tasks,results){
 const merged=new Map(tasks.map(task=>[task.id,task]));
 for(const task of results){if(task.removed)merged.delete(task.id);else{const cached=merged.get(task.id);if(!cached||cached.rev<=task.rev)merged.set(task.id,task);}}
 return [...merged.values()];
}

export function projectTasks(tasks,operations=[]){
 const result=new Map(tasks.map(task=>[task.id,{...task}]));
 for(const operation of operations)for(const item of operation.items){
  const old=result.get(item.id);
  if(item.type==='remove')result.delete(item.id);
  else if(item.type==='create'){if(!old)result.set(item.id,{id:item.id,...item.patch,createdAt:item.createdAt,rev:1});}
  else if(old)result.set(item.id,{...old,...item.patch,rev:old.rev+1});
 }
 return [...result.values()];
}

export function changedFields(task,patch){
 const changed=Object.fromEntries(Object.entries(patch).filter(([key,value])=>value!==task[key]&&!(value===null&&task[key]===undefined)));
 // Scheduling and assignment each form a single valid state, even across concurrent edits.
 for(const group of [['dueDate','waiting','followUp'],['visibility','assigneeUid','assigneeEmail']])if(group.some(key=>key in changed)){
  for(const key of group)if(key in patch||key in task)changed[key]=key in patch?patch[key]:task[key];
 }
 return changed;
}

export async function openDeviceStore(project){
 const db=await new Promise((resolve,reject)=>{
  const request=indexedDB.open('lists-device-v1-'+project,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('workspaces',{keyPath:'key'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error('Close other Lists tabs to enable offline storage.'));
 });
 db.onversionchange=()=>db.close();
 function change(key,update){return new Promise((resolve,reject)=>{
  const transaction=db.transaction('workspaces','readwrite'),store=transaction.objectStore('workspaces'),request=store.get(key);let value;
  request.onsuccess=()=>{try{value=update(request.result||{key,operations:[],tasks:[],picks:{}});store.put({...value,key});}catch(error){reject(error);transaction.abort();}};
  transaction.oncomplete=()=>resolve(value);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('Could not save changes on this device.'));
 });}
 function read(key){return new Promise((resolve,reject)=>{const request=db.transaction('workspaces').objectStore('workspaces').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 async function clearUser(uid){return new Promise((resolve,reject)=>{
  const transaction=db.transaction('workspaces','readwrite'),request=transaction.objectStore('workspaces').openCursor();
  request.onsuccess=()=>{const cursor=request.result;if(cursor){if(JSON.parse(cursor.key)[0]===uid)cursor.delete();cursor.continue();}};
  transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);
 });}
 async function recordsForUser(uid){return new Promise((resolve,reject)=>{const request=db.transaction('workspaces').objectStore('workspaces').getAll();request.onsuccess=()=>resolve(request.result.filter(record=>JSON.parse(record.key)[0]===uid));request.onerror=()=>reject(request.error);});}
 async function userPending(uid){return (await recordsForUser(uid)).reduce((count,record)=>count+(record.operations?.length||0),0);}
 return {read,change,clearUser,userPending,recordsForUser};
}
