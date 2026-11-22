import {projected,refsFor,reduceCommand} from './grocery-core.js?v=1';
export function groceryStore({sdk,db,device,project,events}){
 let scope=null,key='',record=null,epoch=0,stops=[],started=false,flushing=false,retry=null,error='',historyCursor=null,historyPaged=false,hasOlder=false,buffer=[];
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('lists-groceries-'+project):null;
 const root=(collection,id)=>sdk.doc(db,'listSpaces',scope.space,'environments',scope.environment,collection,id);
 const collection=name=>sdk.collection(db,'listSpaces',scope.space,'environments',scope.environment,name);
 function state(){events.status?.({pending:record?.operations?.length||0,syncing:flushing,error});}
 function emit(){events.change?.({rows:projected(record?.rows||[],record?.operations),hasOlder,loading:started&&!record?.loaded,error});state();}
 async function refresh(){const current=key,run=epoch;if(device&&current&&!scope.preview){const next=await device.read(current);if(current===key&&run===epoch&&next){if(record?.operations?.length&&!next.operations?.length)error='';record=next;emit();void flush();}}}
 channel?.addEventListener('message',event=>{if(event.data===key)void refresh();});
 function stop(){epoch++;stops.forEach(stop=>stop());stops=[];clearTimeout(retry);started=false;key='';scope=null;record=null;error='';historyCursor=null;historyPaged=false;hasOlder=false;buffer=[];emit();}
 async function bind(account,space,environment,preview=false){
  if(scope?.uid===account.uid&&scope.space===space&&scope.environment===environment&&scope.preview===preview)return;
  stop();scope={uid:account.uid,space,environment,preview};key=JSON.stringify([account.uid,space,environment,'groceries']);const run=epoch;
  if(device&&!preview){const saved=await device.read(key);if(run!==epoch)return;record=saved;}
  record||={key,rows:[],operations:[]};emit();if(record.operations.length)activate();
 }
 async function save(update){const run=epoch,current=key;if(scope?.preview){record=update(record);emit();return;}
  if(!device)throw new Error('Device storage is unavailable. Groceries needs offline storage enabled.');
  const next=await device.change(current,update);if(current!==key||run!==epoch)return;record=next;emit();channel?.postMessage(current);
 }
 function activate(){
  if(!scope||started)return;started=true;const run=epoch;
  const fail=failure=>{if(run!==epoch)return;error=failure.code==='permission-denied'?'Groceries needs the updated Firestore rules published. Your to-dos are unaffected.':failure.message;emit();};
  stops.push(sdk.onSnapshot(collection('groceries'),snapshot=>{
   if(run!==epoch)return;error='';const rows=snapshot.docs.map(doc=>({id:doc.id,collection:'groceries',...doc.data()}));
   if(flushing){buffer.push(...rows);return;}
   void save(old=>({...old,rows:merge(old.rows||[],rows),loaded:true})).then(()=>flush()).catch(fail);
  },fail));
  const query=sdk.query(collection('groceryPurchases'),sdk.orderBy('value.at','desc'),sdk.limit(300));
  stops.push(sdk.onSnapshot(query,snapshot=>{
   if(run!==epoch)return;const rows=snapshot.docs.map(doc=>({id:doc.id,collection:'groceryPurchases',...doc.data()}));if(!historyPaged){historyCursor=snapshot.docs.at(-1)||null;hasOlder=snapshot.size===300;}
   if(flushing){buffer.push(...rows);return;}
   void save(old=>({...old,rows:merge(old.rows||[],rows)})).catch(fail);
  },fail));emit();
 }
 async function commit(command){
  const run=epoch,original=scope,refs=refsFor(command).map(([name,id])=>root(name,id)),receipt=root('groceryCommands',command.id);
  return sdk.runTransaction(db,async tx=>{
   if(run!==epoch||original!==scope||scope.preview)throw new Error('Household changed before saving.');
   const [received,...snapshots]=await Promise.all([tx.get(receipt),...refs.map(ref=>tx.get(ref))]);
   if(run!==epoch||original!==scope||scope.preview)throw new Error('Household changed before saving.');
   const values=snapshots.flatMap((snap,index)=>snap.exists()?[{collection:refsFor(command)[index][0],id:snap.id,...snap.data()}]:[]);
   if(received.exists())return values;
   const results=reduceCommand(values,command,{reconcile:true});
   for(const result of results){const {collection:name,id,...data}=result;tx.set(root(name,id),{...data,updatedAt:sdk.serverTimestamp()});}
   tx.set(receipt,{actor:original.uid,createdAt:sdk.serverTimestamp()});return merge(values,results);
  });
 }
 async function flush(){
  if(!scope||scope.preview||!navigator.onLine||!record?.operations.length||flushing)return;
  const run=epoch,current=key;
  const upload=async()=>{
   if(run!==epoch||flushing)return;flushing=true;error='';state();
   try{while(run===epoch&&navigator.onLine){const saved=await device.read(current),op=saved?.operations?.[0];if(!op)break;
    const results=await commit(op.command);
    const next=await device.change(current,old=>{const map=new Map((old.rows||[]).map(row=>[row.collection+'/'+row.id,row]));for(const row of results)if((map.get(row.collection+'/'+row.id)?.rev||0)<=row.rev)map.set(row.collection+'/'+row.id,row);return {...old,rows:[...map.values()],operations:old.operations.filter(row=>row.id!==op.id)};});
    if(run===epoch){record=next;emit();}channel?.postMessage(current);
   }}catch(failure){if(run===epoch){error=failure.code==='permission-denied'?'Groceries needs the latest Firebase rules. Changes remain saved on this device.':failure.message;emit();if(['unavailable','deadline-exceeded','aborted','resource-exhausted'].includes(failure.code))retry=setTimeout(()=>void flush(),20000);}}
   finally{flushing=false;if(run===epoch&&buffer.length&&!record?.operations?.length){const rows=buffer;buffer=[];await save(old=>({...old,rows:merge(old.rows||[],rows),loaded:true}));}state();if(run!==epoch)void flush();}
  };
    if(navigator.locks)await navigator.locks.request('lists-grocery-outbox:'+project+current,()=>upload());else await upload();
 }
 window.addEventListener('online',()=>void flush());
 function merge(old,rows){const map=new Map(old.map(row=>[row.collection+'/'+row.id,row]));for(const row of rows)if((map.get(row.collection+'/'+row.id)?.rev||0)<=row.rev)map.set(row.collection+'/'+row.id,row);return [...map.values()];}
 return {bind,stop,activate,refresh,retry:()=>{error='';stops.forEach(stop=>stop());stops=[];started=false;activate();return flush();},async command(draft){
  if(!scope||scope.preview)throw new Error('Read-only view. Return to your household to edit.');
  if(!device||!key)throw new Error('Offline storage is not ready. Reopen this household online.');
  const command={...draft,id:crypto.randomUUID(),at:Date.now()},operation={id:command.id,kind:'groceries',command,items:[{patch:{title:'Grocery '+command.action}}],at:command.at};
  const run=epoch,current=key;
  await device.change(current,old=>{reduceCommand(projected(old.rows||[],old.operations),command);return {...old,operations:[...(old.operations||[]),operation]};});
  if(run===epoch){await refresh();activate();void flush();}channel?.postMessage(current);void navigator.storage?.persist?.().catch(()=>{});return command;
 },async older(){
  if(!scope||!hasOlder||!historyCursor||!navigator.onLine)return;const run=epoch;
  const snapshot=await sdk.getDocs(sdk.query(collection('groceryPurchases'),sdk.orderBy('value.at','desc'),sdk.startAfter(historyCursor),sdk.limit(300)));
  if(run!==epoch)return;historyCursor=snapshot.docs.at(-1)||null;historyPaged=true;hasOlder=snapshot.size===300;
  await save(old=>{const map=new Map((old.rows||[]).map(row=>[row.collection+'/'+row.id,row]));for(const doc of snapshot.docs){const row={id:doc.id,collection:'groceryPurchases',...doc.data()};map.set(row.collection+'/'+row.id,row);}return {...old,rows:[...map.values()]};});
 }};
}
