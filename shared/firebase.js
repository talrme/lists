import {candidateTasks,choose,dayKey} from './core.js?v=nextweek1';
import {belongsTo,householdDraft,isAdministrator,memberLabel,householdPeople} from './households.js?v=sharing2';
import {photoUrl} from './task-fields.js?v=editor3';
import {PLAYGROUND_ID,isPlayground,playgroundEnvironment,playgroundDraft,playgroundSamples} from './playground.js?v=1';
import {openDeviceStore,scopeKey,pointerKey,projectTasks,changedFields,mergeResults} from './device-store.js?v=1';
const VERSION='13.3.0';
export async function connectFirebase(config,events) {
  const [appSdk,authSdk,dbSdk]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`),
  ]);
  const app=appSdk.initializeApp(config.firebase,'lists'),auth=authSdk.getAuth(app),db=dbSdk.getFirestore(app);
  await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
  if(!navigator.onLine)await dbSdk.disableNetwork(db);
  let device=null;try{device=await openDeviceStore(config.firebase.projectId);}catch{events.status('Offline storage unavailable on this browser. Online saves still work.');}
  let user=null,preview=null,activeId=config.space,activeEnvironment=config.environment,tasks=[],spaces=[],stopDiscovery=()=>{},stopSpace=()=>{},children=[],authVersion=0,spaceVersion=0,needsReconnect=false;
  let record=null,recordKey='',serverTasks=[],networkReady=false,saving=0,flushing=false,retryTimer=null,syncError='',memberNames={},memberProfiles={};
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('lists-device-'+config.firebase.projectId):null;
  const subject=()=>preview||user;
  const root=dbSdk.collection(db,'listSpaces');
  const path=()=>['listSpaces',activeId,'environments',activeEnvironment];
  const key=()=>`lists-household-v1-${user?.uid}`;
  function syncStatus(){const connecting=!!user&&navigator.onLine&&!networkReady&&!record?.blocked;events.sync?.({pending:record?.operations?.length||0,syncing:!!saving||flushing||connecting,connecting,offline:!navigator.onLine||!networkReady,error:syncError,lastSynced:record?.lastSynced||null});}
  function emitTasks(){tasks=projectTasks(serverTasks,record?.operations);events.tasks(tasks);syncStatus();}
  function clearChildren(){spaceVersion++;children.forEach(fn=>fn());children=[];tasks=[];serverTasks=[];memberNames={};memberProfiles={};record=null;recordKey='';networkReady=false;syncError='';clearTimeout(retryTimer);events.tasks([]);syncStatus();}
  async function saveRecord(patch,key=recordKey){
    if(!device||!key||preview)return;
    const next=await device.change(key,old=>({...old,...patch,...(patch.picks?{picks:{...old.picks,...patch.picks}}:{})}));
    if(key===recordKey){record=next;emitTasks();}channel?.postMessage(key);
    return next;
  }
  async function restoreCached(id,version){
    if(!device||preview||!user)return;
    const uid=user.uid,pointer=await device.read(pointerKey(uid,id)),cached=pointer?.target?await device.read(pointer.target):null;
    if(version!==spaceVersion||uid!==user?.uid||recordKey||!cached||cached.key!==scopeKey(uid,id,cached.environment)||cached.blocked||!belongsTo(cached.household,user))return;
    recordKey=pointer.target;record=cached;serverTasks=cached.tasks||[];activeEnvironment=cached.environment;
    events.space?.(cached.household);events.members(cached.members||{},cached.profiles||{});emitTasks();events.ready();
  }
  async function bindCache(household,environment,version){
    if(!device||preview)return;
    const uid=user.uid,key=scopeKey(uid,household.id,environment),cached=await device.read(key);
    if(version!==spaceVersion)return;
    recordKey=key;record={key,operations:[],tasks:[],picks:{},...cached,household,environment,blocked:false};serverTasks=record.tasks;
    await device.change(key,old=>({...old,household,environment,blocked:false}));
    if(version!==spaceVersion||uid!==user?.uid)return;
    await device.change(pointerKey(uid,household.id),()=>({target:key,operations:[]}));if(version===spaceVersion)emitTasks();
  }
  async function blockCache(){if(device&&recordKey&&!preview)await saveRecord({blocked:true,tasks:[]});}
  channel?.addEventListener('message',async event=>{
    const key=recordKey;if(!device||!key||event.data!==key||preview)return;
    const next=await device.read(key);if(key!==recordKey||!next)return;record=next;serverTasks=next.tasks||[];emitTasks();void flushQueue();
  });
  function resume(){syncStatus();if(navigator.onLine){void dbSdk.enableNetwork(db).then(()=>flushQueue()).catch(()=>{});}}
  window.addEventListener('online',resume);window.addEventListener('offline',()=>{networkReady=false;syncStatus();void dbSdk.disableNetwork(db).catch(()=>{});});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume();});
  function stop(){authVersion++;stopDiscovery();stopDiscovery=()=>{};stopSpace();stopSpace=()=>{};clearChildren();spaces=[];events.households?.([]);}
  function availableSpaces(){events.households?.(spaces.filter(space=>belongsTo(space,subject())));}
  function requireAdmin(){if(!isAdministrator(user))throw new Error('Only Tal can manage households.');}
  function requireWritable(){if(preview)throw new Error('View as user is read-only. Exit the preview to make changes.');}
  function requireOnline(){if(!navigator.onLine)throw new Error('You are offline. Keep this open and try again when connected.');}
  function selectSpace(id,{remember=true}={}){
    if(!/^[a-z0-9][a-z0-9-]{0,47}$/.test(id))throw new Error('Invalid household link.');
    needsReconnect=false;events.loading?.();stopSpace();clearChildren();activeId=id;activeEnvironment=config.environment;const authRun=authVersion;
    if(remember&&!preview){try{localStorage.setItem(key(),id);}catch{}}
    events.space?.({id,title:id});let fingerprint='';
    const restoringVersion=spaceVersion;
    void restoreCached(id,restoringVersion).then(()=>{if(restoringVersion===spaceVersion&&!navigator.onLine&&!recordKey)events.unavailable?.('No saved list on this device yet. Open this household once while connected.');}).catch(()=>events.status('Could not read saved data on this device.'));
    stopSpace=dbSdk.onSnapshot(dbSdk.doc(db,'listSpaces',id),async snapshot=>{
      if(authRun!==authVersion||id!==activeId)return;
      if(!snapshot.exists()){if(snapshot.metadata.fromCache)return;fingerprint='';void blockCache();events.unavailable?.('This household has not been created yet.');return;}
      const household={id,...snapshot.data()};events.space?.(household);
      if(!belongsTo(household,subject())){needsReconnect=true;fingerprint='';void blockCache();clearChildren();events.unavailable?.(preview?'This user is not a member of this household.':'Your Google account is not a member of this household.');return;}
      if(!spaces.some(s=>s.id===id)){spaces.push(household);availableSpaces();}
      const environment=playgroundEnvironment(household,config.environment),signature=JSON.stringify([household.schemaVersion,household.memberEmails,household.memberUids,household.kind,household.playgroundRun]);
      if(signature===fingerprint)return;if(fingerprint&&activeEnvironment!==environment)events.loading?.();activeEnvironment=environment;fingerprint=signature;clearChildren();const run=spaceVersion;
      const account=subject();
      try{
        await bindCache(household,environment,run);if(run!==spaceVersion||authRun!==authVersion)return;
        // Registration only records the identity already authorized by household rules.
        const profile=dbSdk.doc(db,'listSpaces',id,'members',account.uid);
        if(!preview&&navigator.onLine){
          const register=withPhoto=>dbSdk.runTransaction(db,async transaction=>{
            const old=await transaction.get(profile),name=memberLabel(account).slice(0,80),photoURL=photoUrl(account.photoURL);
            if(!old.exists())transaction.set(profile,{email:account.email,name,...(withPhoto?{photoURL}:{}),joinedAt:dbSdk.serverTimestamp()});
            else if(withPhoto&&(old.data().name!==name||old.data().photoURL!==photoURL))transaction.update(profile,{name,photoURL});
          });
          void register(true).catch(async error=>{if(run!==spaceVersion)return;if(error.code==='permission-denied'){try{await register(false);}catch(failure){if(run===spaceVersion)events.error(failure);}}else if(error.code!=='unavailable')events.error(error);});
        }
        if(run!==spaceVersion||authRun!==authVersion)return;
        children.push(dbSdk.onSnapshot(dbSdk.collection(db,'listSpaces',id,'members'),snapshot=>{
          if(run!==spaceVersion)return;
          const {names,profiles}=householdPeople(household,snapshot.docs.map(doc=>({uid:doc.id,...doc.data()})));
          memberNames=names;memberProfiles=profiles;void saveRecord({members:names,profiles}).catch(()=>{});
          events.members(names,profiles);
        },error=>{if(run===spaceVersion)events.error(error);}));
        const rows=[[],[]],received=[false,false],collection=dbSdk.collection(db,'listSpaces',id,'environments',environment,'tasks');
        const queries=[dbSdk.query(collection,dbSdk.where('visibility','==','private'),dbSdk.where('ownerUid','==',account.uid)),dbSdk.query(collection,dbSdk.where('visibility','==','shared'))];
        queries.forEach((query,index)=>children.push(dbSdk.onSnapshot(query,{includeMetadataChanges:true},snapshot=>{
          if(run!==spaceVersion||authRun!==authVersion)return;
          rows[index]=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));received[index]=!snapshot.metadata.fromCache;
          const reconnected=!networkReady;networkReady=received.every(Boolean);syncStatus();
          if(networkReady){
            serverTasks=[...new Map(rows.flat().map(t=>[t.id,t])).values()];emitTasks();
            void (async()=>{try{await saveRecord({tasks:serverTasks,household,environment,members:memberNames,profiles:memberProfiles,lastSynced:Date.now(),blocked:false});if(run!==spaceVersion)return;events.status('Live');events.ready();if(reconnected)events.refreshDaily?.();void flushQueue();}catch(error){events.error(error);}})();
          }
        },error=>{if(run===spaceVersion){void blockCache();clearChildren();events.unavailable?.('Household access changed. Check Settings or sign in again.');events.error(error);}})));
      }catch(error){if(run===spaceVersion){fingerprint='';events.error(error);}}
    },error=>{if(authRun===authVersion&&id===activeId){needsReconnect=true;void blockCache();clearChildren();events.unavailable?.('Household access is not ready.');events.error(error);}});
  }
  authSdk.onAuthStateChanged(auth,account=>{
    stop();preview=null;user=account;events.account(account);events.preview?.(null);if(!account)return;
    const run=authVersion;
    const identity={email:account.email,name:memberLabel(account).slice(0,80),updatedAt:dbSdk.serverTimestamp()};
    dbSdk.setDoc(dbSdk.doc(db,'listUsers',account.uid),{...identity,photoURL:photoUrl(account.photoURL)}).catch(async error=>{if(run!==authVersion)return;if(error.code==='permission-denied'){try{await dbSdk.setDoc(dbSdk.doc(db,'listUsers',account.uid),identity);}catch(failure){if(run===authVersion)events.error(failure);}}else events.error(error);});
    const query=isAdministrator(account)?root:dbSdk.query(root,dbSdk.where('memberEmails','array-contains',account.email));
    stopDiscovery=dbSdk.onSnapshot(query,snapshot=>{
      if(run!==authVersion)return;spaces=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));availableSpaces();if(needsReconnect&&spaces.some(space=>space.id===activeId&&belongsTo(space,subject())))selectSpace(activeId,{remember:false});
    },error=>{if(run===authVersion)events.status(isAdministrator(account)?'Household management needs the updated Firebase rules.':error.message);});
    let saved='';try{saved=localStorage.getItem(key())||'';}catch{}
    const requested=new URLSearchParams(location.search).get('household');
    selectSpace(requested||saved||config.space,{remember:!!requested});
  });
  async function commitItems(items,strict){
    const refs=items.map(item=>dbSdk.doc(db,...path(),'tasks',item.id)),uid=user?.uid,version=spaceVersion;
    return dbSdk.runTransaction(db,async transaction=>{
      if(preview||user?.uid!==uid||version!==spaceVersion)throw new Error('The active account or household changed.');
      const snapshots=await Promise.all(refs.map(ref=>transaction.get(ref)));
      if(preview||user?.uid!==uid||version!==spaceVersion)throw new Error('The active account or household changed.');
      return items.map((item,index)=>{
        const snap=snapshots[index],old=snap.exists()?snap.data():null;
        if(item.type==='create'){
          if(old){
            if(Object.entries(item.patch).every(([key,value])=>old[key]===value)||!strict&&old.ownerUid===uid&&old.createdAt===item.createdAt)return {id:item.id,...old};
            throw new Error('This task already exists. Reopen it before editing.');
          }
          const next={...item.patch,rev:1,createdAt:item.createdAt};transaction.set(refs[index],{...next,updatedAt:dbSdk.serverTimestamp()});return {id:item.id,...next};
        }
        if(!old){if(strict)throw new Error('This task was removed on another phone.');return {id:item.id,removed:true};}
        if(strict&&old.rev!==item.rev)throw new Error('This task changed on another phone. Close and reopen it.');
        if(item.type==='remove'){transaction.delete(refs[index]);return {id:item.id,removed:true};}
        if(!strict&&Object.entries(item.patch).every(([key,value])=>old[key]===value))return {id:item.id,...old};
        const next={...old,...item.patch,rev:old.rev+1};transaction.update(refs[index],{...item.patch,rev:next.rev,updatedAt:dbSdk.serverTimestamp()});return {id:item.id,...next};
      });
    });
  }
  async function enqueue(items){
    if(!device||!recordKey||!record||record.blocked)throw new Error('Offline saving is not ready on this device. Open this household once while connected.');
    const key=recordKey,operation={id:crypto.randomUUID(),items,at:Date.now()};
    const next=await device.change(key,old=>{
      if(old.blocked)throw new Error('Household access needs to be checked before saving.');
      const projected=projectTasks(old.tasks||[],old.operations);
      for(const item of items){const task=projected.find(task=>task.id===item.id);if(item.type!=='create'&&(!task||task.rev!==item.rev))throw new Error('This task changed. Close and reopen it.');}
      return {...old,operations:[...(old.operations||[]),operation]};
    });
    if(key===recordKey){record=next;emitTasks();}channel?.postMessage(key);void flushQueue();
    void navigator.storage?.persist?.().catch(()=>{});
  }
  async function mutateItems(items){
    requireWritable();
    if(!navigator.onLine||!networkReady||record?.operations?.length||flushing)return enqueue(items);
    const key=recordKey,version=spaceVersion;saving++;syncStatus();
    try{
      const results=await commitItems(items,true);
      if(device&&key&&version===spaceVersion&&key===recordKey){const next=await device.change(key,old=>({...old,tasks:mergeResults(old.tasks||[],results),lastSynced:Date.now()}));if(key===recordKey&&version===spaceVersion){record=next;serverTasks=next.tasks;emitTasks();}channel?.postMessage(key);}
      return results;
    }
    catch(error){if(version!==spaceVersion||key!==recordKey)throw new Error('The household changed before saving finished. Reopen the original household to check this task.');if(['unavailable','deadline-exceeded'].includes(error.code)||!navigator.onLine){networkReady=false;return await enqueue(items);}throw error;}
    finally{saving--;syncStatus();}
  }
  async function flushQueue(){
    if(flushing||!device||!recordKey||!user||preview||!networkReady||!navigator.onLine||record?.blocked||!record?.operations?.length)return;
    const key=recordKey,version=spaceVersion;
    const flush=async()=>{
      if(key!==recordKey||flushing)return;flushing=true;syncError='';syncStatus();
      try{
        while(key===recordKey&&version===spaceVersion&&navigator.onLine&&networkReady&&!preview){
          const current=await device.read(key),operation=current?.operations?.[0];if(!operation||current.blocked)break;
          const results=await commitItems(operation.items,false);
          const next=await device.change(key,old=>{
            const remaining=(old.operations||[]).filter(item=>item.id!==operation.id);
            return {...old,tasks:mergeResults(old.tasks||[],results),operations:remaining,lastSynced:Date.now()};
          });
          if(key===recordKey){record=next;serverTasks=next.tasks;emitTasks();}channel?.postMessage(key);
        }
      }catch(error){
        if(key===recordKey){const transient=['unavailable','deadline-exceeded','aborted','cancelled','resource-exhausted'].includes(error.code);syncError=error.code==='permission-denied'?'Pending changes need access restored. They remain saved on this device.':transient?'Changes saved on this device. Sync will retry.':'Pending changes need review. They remain saved on this device.';syncStatus();
          if(transient&&navigator.onLine){clearTimeout(retryTimer);retryTimer=setTimeout(()=>void flushQueue(),20000);}}
      }finally{flushing=false;syncStatus();if(key!==recordKey)void flushQueue();}
    };
    if(navigator.locks)await navigator.locks.request('lists-outbox:'+config.firebase.projectId+key,{ifAvailable:true},lock=>lock?flush():undefined);else await flush();
  }
  return {
    async login(){await authSdk.signInWithPopup(auth,new authSdk.GoogleAuthProvider());},
    async pendingChanges(){if(!device||!user||preview)return [];return (await device.recordsForUser(user.uid)).flatMap(saved=>(saved.operations||[]).map(operation=>({id:operation.id,household:saved.household?.title||JSON.parse(saved.key)[1],title:operation.items[0]?.patch?.title||saved.tasks?.find(task=>task.id===operation.items[0]?.id)?.title||'Task change',count:operation.items.length})));},
    async discardPending(id){
      requireWritable();if(flushing)throw new Error('Wait for the current sync to finish, then try again.');
      if(!device||!user)return;
      for(const saved of await device.recordsForUser(user.uid))if(saved.operations?.some(operation=>operation.id===id)){
        const next=await device.change(saved.key,old=>({...old,operations:old.operations.filter(operation=>operation.id!==id)}));
        if(saved.key===recordKey){record=next;syncError='';emitTasks();}channel?.postMessage(saved.key);
      }
      void flushQueue();
    },
    async retrySync(){requireWritable();syncError='';syncStatus();if(navigator.onLine)await dbSdk.enableNetwork(db);await flushQueue();},
    async logout(){if(device&&await device.userPending(user.uid))throw new Error('There are changes saved on this device waiting to sync. Reconnect before signing out.');const uid=user?.uid;stop();await authSdk.signOut(auth);if(device&&uid)await device.clearUser(uid);},
    selectSpace,
    async listUsers(){
      requireAdmin();
      const snapshot=await dbSdk.getDocs(dbSdk.collection(db,'listUsers')),profiles=new Map(snapshot.docs.map(doc=>[doc.id,{uid:doc.id,...doc.data()}]));
      // Include household members who visited before the global directory existed.
      const households=await dbSdk.getDocs(root);
      for(const household of households.docs){const members=await dbSdk.getDocs(dbSdk.collection(household.ref,'members'));members.docs.forEach(doc=>{if(!profiles.has(doc.id))profiles.set(doc.id,{uid:doc.id,...doc.data()});});}
      return [...profiles.values()].sort((a,b)=>a.name.localeCompare(b.name));
    },
    async viewAs(profile){
      requireAdmin();const account=user,run=authVersion;
      const snapshot=await dbSdk.getDocs(root);if(run!==authVersion||account!==user)return;
      spaces=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
      preview={uid:profile.uid,email:profile.email,name:profile.name,displayName:profile.name};
      events.preview?.(preview);availableSpaces();
      const available=spaces.filter(space=>belongsTo(space,preview));
      selectSpace(available.some(space=>space.id===activeId)?activeId:available[0]?.id||config.space,{remember:false});
    },
    exitPreview(){
      preview=null;events.preview?.(null);availableSpaces();let saved='';try{saved=localStorage.getItem(key())||'';}catch{}
      selectSpace(spaces.some(space=>space.id===saved&&belongsTo(space,user))?saved:spaces.find(space=>belongsTo(space,user))?.id||config.space,{remember:false});
    },
    async getPlayground(){
      requireAdmin();const snapshot=await dbSdk.getDoc(dbSdk.doc(db,'listSpaces',PLAYGROUND_ID));
      if(!snapshot.exists())return null;
      const value={id:snapshot.id,...snapshot.data()};if(!isPlayground(value))throw new Error('A regular household already uses the playground link. Nothing was changed.');return value;
    },
    async configurePlayground(emails,expectedRev=null){
      requireAdmin();requireWritable();requireOnline();const draft=playgroundDraft(emails),account=user,newRun=crypto.randomUUID();
      await dbSdk.runTransaction(db,async transaction=>{
        const ref=dbSdk.doc(db,'listSpaces',PLAYGROUND_ID),old=await transaction.get(ref);
        if(expectedRev===null){
          if(old.exists())throw new Error('That link already exists. Refresh Testing; nothing was overwritten.');
          transaction.set(ref,{title:draft.title,memberEmails:draft.memberEmails,schemaVersion:2,memberUids:[],names:{},createdBy:account.uid,createdAt:dbSdk.serverTimestamp(),updatedAt:dbSdk.serverTimestamp(),rev:1,kind:'playground',playgroundRun:newRun});
        }else{
          if(!old.exists()||!isPlayground({id:old.id,...old.data()})||old.data().rev!==expectedRev)throw new Error('Playground changed. Refresh Testing before saving.');
          transaction.update(ref,{memberEmails:draft.memberEmails,rev:expectedRev+1,updatedAt:dbSdk.serverTimestamp()});
        }
      });
    },
    async seedPlayground(){
      requireAdmin();requireWritable();requireOnline();const uid=user.uid,examples=playgroundSamples(uid,dayKey(Date.now(),config.timeZone));
      return dbSdk.runTransaction(db,async transaction=>{
        const parent=await transaction.get(dbSdk.doc(db,'listSpaces',PLAYGROUND_ID));
        if(!parent.exists()||!isPlayground({id:parent.id,...parent.data()}))throw new Error('Create Playground first. No real tasks were changed.');
        const environment=playgroundEnvironment({id:parent.id,...parent.data()},null),refs=examples.map(task=>dbSdk.doc(db,'listSpaces',PLAYGROUND_ID,'environments',environment,'tasks',task.id));
        const existing=await Promise.all(refs.map(ref=>transaction.get(ref)));let added=0;
        examples.forEach((task,i)=>{if(existing[i].exists())return;const {id,...data}=task;transaction.set(refs[i],{...data,rev:1,createdAt:Date.now()+i,updatedAt:dbSdk.serverTimestamp()});added++;});return added;
      });
    },
    async resetPlayground(expectedRev){
      requireAdmin();requireWritable();requireOnline();const nextRun=crypto.randomUUID();
      await dbSdk.runTransaction(db,async transaction=>{
        const ref=dbSdk.doc(db,'listSpaces',PLAYGROUND_ID),old=await transaction.get(ref);
        if(!old.exists()||!isPlayground({id:old.id,...old.data()})||old.data().rev!==expectedRev)throw new Error('Playground changed. Refresh Testing before resetting.');
        // Reset only changes the isolated test namespace; no task or real-household document is deleted.
        transaction.update(ref,{playgroundRun:nextRun,rev:expectedRev+1,updatedAt:dbSdk.serverTimestamp()});
      });
    },
    async listHouseholds(){requireAdmin();const snapshot=await dbSdk.getDocs(root);return snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(a.title||a.id).localeCompare(b.title||b.id));},
    async saveHousehold(input,expectedRev=null){
      requireAdmin();requireWritable();requireOnline();const draft=householdDraft(input),account=user;
      if(draft.id===PLAYGROUND_ID&&expectedRev===null)throw new Error('Use Admin → Testing to manage Playground.');
      await dbSdk.runTransaction(db,async transaction=>{
        const ref=dbSdk.doc(db,'listSpaces',draft.id),old=await transaction.get(ref);
        if(expectedRev===null){
          if(old.exists())throw new Error('That household already exists. Open Manage to edit it; nothing was overwritten.');
          transaction.set(ref,{schemaVersion:2,title:draft.title,memberEmails:draft.memberEmails,memberUids:[],names:{},createdBy:account.uid,createdAt:dbSdk.serverTimestamp(),updatedAt:dbSdk.serverTimestamp(),rev:1});
        }else{
          if(!old.exists()||(old.data().rev||0)!==expectedRev)throw new Error('This household changed. Reopen Manage and try again.');
          if(isPlayground({id:old.id,...old.data()}))throw new Error('Use Admin → Testing to manage Playground.');
          const migration=old.data().schemaVersion!==2;
          transaction.update(ref,{schemaVersion:2,title:draft.title,memberEmails:draft.memberEmails,rev:expectedRev+1,updatedAt:dbSdk.serverTimestamp(),...(migration?{createdBy:account.uid,createdAt:dbSdk.serverTimestamp()}: {})});
        }
      });
      return draft;
    },
    async write(id,patch,expectedRev){
      const task=tasks.find(task=>task.id===id);
      if(!expectedRev&&task&&Object.entries(patch).every(([key,value])=>task[key]===value))return;
      const item=expectedRev?{id,type:'update',patch:task?changedFields(task,patch):patch,rev:expectedRev}:{id,type:'create',patch,createdAt:Date.now()};
      return mutateItems([item]);
    },
    async writeMany(changes){
      if(!changes.length||changes.length>400)throw new Error('Move fewer tasks at once.');
      return mutateItems(changes.map(change=>({...change,type:'update'})));
    },
    async remove(id,rev){
      return mutateItems([{id,type:'remove',rev}]);
    },
    async pick(day,uid){
      const ref=dbSdk.doc(db,...path(),'daily',day,'picks',uid),candidates=candidateTasks(tasks,uid,subject()?.email);
      if(preview){const old=await dbSdk.getDoc(ref);return old.exists()?old.data().taskId:null;}
      if(!navigator.onLine||!networkReady)return record?.picks?.[day]??null;
      const taskId=await dbSdk.runTransaction(db,async transaction=>{
        const old=await transaction.get(ref);if(old.exists())return old.data().taskId;
        const taskId=choose(candidates)?.id||null;
        transaction.set(ref,{taskId,createdAt:dbSdk.serverTimestamp()});return taskId;
      });
      if(device&&recordKey)await saveRecord({picks:{...record.picks,[day]:taskId}});return taskId;
    },
    close:stop,
  };
}
