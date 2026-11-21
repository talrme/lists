export const accountDefaults={style:1,palette:'original',showSomeday:false,audiences:{}};
export const tagName=value=>String(value||'').trim().replace(/\s+/g,' ').normalize('NFC');
export const tagKey=value=>tagName(value).toLocaleLowerCase('en-US');
export function canonicalTag(id,tags){
  const seen=new Set();let tag=tags.find(tag=>tag.id===id);
  while(tag?.mergedInto){if(seen.has(tag.id))return null;seen.add(tag.id);tag=tags.find(item=>item.id===tag.mergedInto);}
  return tag||null;
}
export function taskTags(task,tags){return [...new Map((task.tagIds||[]).map(id=>canonicalTag(id,tags)).filter(Boolean).map(tag=>[tag.id,tag])).values()];}
export function matchingTags(task,ids,tags){const assigned=new Set(taskTags(task,tags).map(tag=>tag.id));return ids.every(id=>assigned.has(canonicalTag(id,tags)?.id||id));}
export function bucket(task,day,dateTiming){return task.someday?'someday':({asap:'today',week:'upcoming',later:'later'})[dateTiming(task.waiting?task.followUp:task.dueDate,day)];}

// Metadata has its own durable queue; it never participates in task projection.
export function organizerStore({sdk,db,device,events}){
  let uid=null,space=null,environment=null,preview=false,version=0,records=new Map(),unsub=[],flushing=false,retry=null,metadataError='';
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('lists-organizer'):null;
  const prefKey=()=>JSON.stringify([uid,'preferences']),tagCacheKey=()=>JSON.stringify([uid,space,environment,'tags']);
  const keyFor=kind=>kind==='preferences'?prefKey():tagCacheKey();
  const refFor=(kind,id)=>kind==='preferences'?sdk.doc(db,'listUsers',uid,'preferences','main'):sdk.doc(db,'listSpaces',space,'environments',environment,'tags',id);
  function values(record){const value={...(record?.values||{})};for(const op of record?.operations||[])value[op.items[0].id]={...value[op.items[0].id],...op.items[0].patch};return value;}
  function emit(){
    if(!uid)return;
    events.change({settings:{...accountDefaults,...values(records.get(prefKey())).main},tags:Object.entries(values(records.get(tagCacheKey()))).map(([id,data])=>({id,...data}))});
    events.status({pending:[...records.values()].reduce((sum,r)=>sum+(r.operations?.length||0),0),syncing:flushing,error:metadataError});
  }
  async function bind(account,household,env,readOnly=false){
    version++;const run=version;unsub.forEach(stop=>stop());unsub=[];clearTimeout(retry);records=new Map();uid=account?.uid;space=household;environment=env;preview=readOnly;metadataError='';
    if(!uid){events.status({pending:0,syncing:false,error:''});return;}
    const keys=[prefKey(),tagCacheKey()];
    if(device&&!preview){for(const key of keys){const saved=await device.read(key);if(run!==version)return;if(saved)records.set(key,saved);}emit();}
    else emit();
    const receive=query=>sdk.onSnapshot(query,snapshot=>{
      if(run!==version)return;const key=prefKey(),data=snapshot.exists()?{main:snapshot.data()}:{};
      records.set(key,{...(records.get(key)||{key,operations:[]}),values:data});
      emit();if(device&&!preview)void device.change(key,old=>({...old,values:data})).catch(error=>events.error(error));
      void flush();
    },error=>{if(run===version){metadataError='Account settings or tags could not sync. Publish the latest Firebase rules, then reopen Lists.';emit();}});
    const tagParts={shared:{},private:{}};
    unsub.push(receive(refFor('preferences','main')));
    const collection=sdk.collection(db,'listSpaces',space,'environments',environment,'tags');
    for(const [scope,query] of [['shared',sdk.query(collection,sdk.where('visibility','==','shared'))],['private',sdk.query(collection,sdk.where('visibility','==','private'),sdk.where('ownerUid','==',uid))]]){
      // Keep query objects untouched: Firebase query implementations may be frozen.
      unsub.push(sdk.onSnapshot(query,snapshot=>{
        if(run!==version)return;const key=tagCacheKey();tagParts[scope]=Object.fromEntries(snapshot.docs.map(doc=>[doc.id,doc.data()]));
        const data={...tagParts.shared,...tagParts.private},old=records.get(key)||{key,operations:[]};records.set(key,{...old,values:data});emit();
        if(device&&!preview)void device.change(key,old=>({...old,values:data})).catch(error=>events.error(error));void flush();
      },()=>{if(run===version){metadataError='Tags could not sync. Publish the latest Firebase rules, then reopen Lists.';emit();}}));
    }
    void flush();
  }
  async function write(kind,id,patch){
    if(preview||!uid)throw new Error('Exit read-only preview before changing settings or tags.');
    const run=version,key=keyFor(kind),operation={id:crypto.randomUUID(),kind,items:[{id,patch}],at:Date.now()};
    if(!device)throw new Error('Device storage is required to safely save settings and tags.');
    const record=await device.change(key,old=>({...old,operations:[...(old.operations||[]),operation]}));
    if(run!==version)return;records.set(key,record);emit();channel?.postMessage(key);void flush();
  }
  async function flush(){
    if(flushing||preview||!uid||!navigator.onLine||!device)return;
    const run=version,keys=[prefKey(),tagCacheKey()],account=uid,household=space,env=environment;
    const work=async()=>{
      if(flushing||run!==version)return;flushing=true;emit();
      try{
        for(const key of keys){
          while(run===version&&navigator.onLine){
            const saved=await device.read(key),operation=saved?.operations?.[0];if(!operation)break;
            const {id,patch}=operation.items[0],ref=operation.kind==='preferences'?sdk.doc(db,'listUsers',account,'preferences','main'):sdk.doc(db,'listSpaces',household,'environments',env,'tags',id);
            await sdk.setDoc(ref,{...patch,updatedAt:sdk.serverTimestamp()},{merge:true});
            const record=await device.change(key,old=>({...old,values:{...old.values,[id]:{...old.values?.[id],...patch}},operations:(old.operations||[]).filter(op=>op.id!==operation.id)}));
            if(run!==version)return;records.set(key,record);metadataError='';emit();channel?.postMessage(key);
          }
        }
      }catch(error){if(run===version){const transient=['unavailable','deadline-exceeded','aborted','cancelled','resource-exhausted'].includes(error.code);metadataError=error.code==='permission-denied'?'Settings or tags are saved on this device but need the latest Firebase rules to sync.':'Settings or tags are saved on this device. Use Retry sync if this persists.';clearTimeout(retry);if(transient)retry=setTimeout(()=>void flush(),20000);}}
      finally{flushing=false;if(run===version)emit();else void flush();}
    };
    if(navigator.locks)await navigator.locks.request('lists-organizer:'+account,{ifAvailable:true},lock=>lock?work():undefined);else await work();
  }
  channel?.addEventListener('message',async event=>{if(preview||![prefKey(),tagCacheKey()].includes(event.data))return;const run=version,record=await device?.read(event.data);if(run===version&&record){records.set(event.data,record);emit();void flush();}});
  window.addEventListener('online',()=>void flush());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flush();});
  return {bind,write,flush,async refresh(){const run=version;metadataError='';for(const key of [prefKey(),tagCacheKey()]){const record=await device?.read(key);if(run!==version)return;if(record)records.set(key,record);channel?.postMessage(key);}emit();void flush();},stop(){version++;unsub.forEach(stop=>stop());unsub=[];uid=null;records.clear();clearTimeout(retry);events.status({pending:0,syncing:false,error:''});}};
}
