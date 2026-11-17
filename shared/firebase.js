import {candidateTasks,choose} from './core.js';
import {belongsTo,householdDraft,isAdministrator,memberLabel} from './households.js';
const VERSION='13.3.0';
export async function connectFirebase(config,events) {
  const [appSdk,authSdk,dbSdk]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`),
  ]);
  const app=appSdk.initializeApp(config.firebase,'lists'),auth=authSdk.getAuth(app),db=dbSdk.getFirestore(app);
  await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
  let user=null,activeId=config.space,tasks=[],spaces=[],stopDiscovery=()=>{},stopSpace=()=>{},children=[],authVersion=0,spaceVersion=0,needsReconnect=false;
  const root=dbSdk.collection(db,'listSpaces');
  const path=()=>['listSpaces',activeId,'environments',config.environment];
  const key=()=>`lists-household-v1-${user?.uid}`;
  function clearChildren(){spaceVersion++;children.forEach(fn=>fn());children=[];tasks=[];events.tasks([]);}
  function stop(){authVersion++;stopDiscovery();stopDiscovery=()=>{};stopSpace();stopSpace=()=>{};clearChildren();spaces=[];events.households?.([]);}
  function availableSpaces(){events.households?.(spaces.filter(space=>belongsTo(space,user)));}
  function requireAdmin(){if(!isAdministrator(user))throw new Error('Only Tal can manage households.');}
  function requireOnline(){if(!navigator.onLine)throw new Error('You are offline. Keep this open and try again when connected.');}
  function selectSpace(id,{remember=true}={}){
    if(!/^[a-z0-9][a-z0-9-]{0,47}$/.test(id))throw new Error('Invalid household link.');
    needsReconnect=false;events.loading?.();stopSpace();clearChildren();activeId=id;const authRun=authVersion;
    if(remember){try{localStorage.setItem(key(),id);}catch{}}
    events.space?.({id,title:id});let fingerprint='';
    stopSpace=dbSdk.onSnapshot(dbSdk.doc(db,'listSpaces',id),async snapshot=>{
      if(authRun!==authVersion||id!==activeId)return;
      if(!snapshot.exists()){fingerprint='';events.unavailable?.('This household has not been created yet.');return;}
      const household={id,...snapshot.data()};events.space?.(household);
      if(!belongsTo(household,user)){needsReconnect=true;fingerprint='';clearChildren();events.unavailable?.('Your Google account is not a member of this household.');return;}
      if(!spaces.some(s=>s.id===id)){spaces.push(household);availableSpaces();}
      const signature=JSON.stringify([household.schemaVersion,household.memberEmails,household.memberUids]);
      if(signature===fingerprint)return;fingerprint=signature;clearChildren();const run=spaceVersion;
      const account=user;
      try{
        // Registration only records the identity already authorized by household rules.
        const profile=dbSdk.doc(db,'listSpaces',id,'members',account.uid);
        await dbSdk.runTransaction(db,async transaction=>{
          const old=await transaction.get(profile);
          if(!old.exists())transaction.set(profile,{email:account.email,name:memberLabel(account),joinedAt:dbSdk.serverTimestamp()});
        });
        if(run!==spaceVersion||authRun!==authVersion)return;
        children.push(dbSdk.onSnapshot(dbSdk.collection(db,'listSpaces',id,'members'),snapshot=>{
          if(run!==spaceVersion)return;
          const names=household.schemaVersion===2?{}:{...(household.names||{})};
          snapshot.docs.forEach(doc=>{if(household.memberEmails?.includes(doc.data().email)||household.schemaVersion!==2)names[doc.id]=doc.data().name;});
          events.members(names);
        },error=>{if(run===spaceVersion)events.error(error);}));
        const rows=[[],[]],received=[false,false],collection=dbSdk.collection(db,'listSpaces',id,'environments',config.environment,'tasks');
        const queries=[dbSdk.query(collection,dbSdk.where('visibility','==','private'),dbSdk.where('ownerUid','==',account.uid)),dbSdk.query(collection,dbSdk.where('visibility','==','shared'))];
        queries.forEach((query,index)=>children.push(dbSdk.onSnapshot(query,{includeMetadataChanges:true},snapshot=>{
          if(run!==spaceVersion||authRun!==authVersion)return;
          rows[index]=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));received[index]=!snapshot.metadata.fromCache;
          tasks=[...new Map(rows.flat().map(t=>[t.id,t])).values()];events.tasks(tasks);
          if(received.every(Boolean)){events.status(snapshot.metadata.hasPendingWrites?'Saving…':'Live');events.ready();}
        },error=>{if(run===spaceVersion){clearChildren();events.unavailable?.('Household access changed. Check Settings or sign in again.');events.error(error);}})));
      }catch(error){if(run===spaceVersion){fingerprint='';events.error(error);}}
    },error=>{if(authRun===authVersion&&id===activeId){needsReconnect=true;clearChildren();events.unavailable?.('Household access is not ready.');events.error(error);}});
  }
  authSdk.onAuthStateChanged(auth,account=>{
    stop();user=account;events.account(account);if(!account)return;
    const run=authVersion;
    const query=isAdministrator(account)?root:dbSdk.query(root,dbSdk.where('memberEmails','array-contains',account.email));
    stopDiscovery=dbSdk.onSnapshot(query,snapshot=>{
      if(run!==authVersion)return;spaces=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));availableSpaces();if(needsReconnect&&spaces.some(space=>space.id===activeId&&belongsTo(space,user)))selectSpace(activeId,{remember:false});
    },error=>{if(run===authVersion)events.status(isAdministrator(account)?'Household management needs the updated Firebase rules.':error.message);});
    let saved='';try{saved=localStorage.getItem(key())||'';}catch{}
    const requested=new URLSearchParams(location.search).get('household');
    selectSpace(requested||saved||config.space,{remember:!!requested});
  });
  return {
    async login(){await authSdk.signInWithPopup(auth,new authSdk.GoogleAuthProvider());},
    async logout(){stop();await authSdk.signOut(auth);},
    selectSpace,
    async listHouseholds(){requireAdmin();const snapshot=await dbSdk.getDocs(root);return snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(a.title||a.id).localeCompare(b.title||b.id));},
    async saveHousehold(input,expectedRev=null){
      requireAdmin();requireOnline();const draft=householdDraft(input),account=user;
      await dbSdk.runTransaction(db,async transaction=>{
        const ref=dbSdk.doc(db,'listSpaces',draft.id),old=await transaction.get(ref);
        if(expectedRev===null){
          if(old.exists())throw new Error('That household already exists. Open Manage to edit it; nothing was overwritten.');
          transaction.set(ref,{schemaVersion:2,title:draft.title,memberEmails:draft.memberEmails,memberUids:[],names:{},createdBy:account.uid,createdAt:dbSdk.serverTimestamp(),updatedAt:dbSdk.serverTimestamp(),rev:1});
        }else{
          if(!old.exists()||(old.data().rev||0)!==expectedRev)throw new Error('This household changed. Reopen Manage and try again.');
          const migration=old.data().schemaVersion!==2;
          transaction.update(ref,{schemaVersion:2,title:draft.title,memberEmails:draft.memberEmails,rev:expectedRev+1,updatedAt:dbSdk.serverTimestamp(),...(migration?{createdBy:account.uid,createdAt:dbSdk.serverTimestamp()}: {})});
        }
      });
      return draft;
    },
    async write(id,patch,expectedRev){
      requireOnline();const ref=dbSdk.doc(db,...path(),'tasks',id);
      await dbSdk.runTransaction(db,async transaction=>{
        const snap=await transaction.get(ref);
        if(snap.exists()){
          if(!expectedRev&&Object.entries(patch).every(([key,value])=>snap.data()[key]===value))return;
          if(snap.data().rev!==expectedRev)throw new Error('This task changed on another phone. Close and reopen it.');
          transaction.update(ref,{...patch,rev:expectedRev+1,updatedAt:dbSdk.serverTimestamp()});
        }else{
          if(expectedRev)throw new Error('This task was removed on another phone.');
          transaction.set(ref,{...patch,rev:1,createdAt:Date.now(),updatedAt:dbSdk.serverTimestamp()});
        }
      });
    },
    async remove(id,rev){
      requireOnline();const ref=dbSdk.doc(db,...path(),'tasks',id);
      await dbSdk.runTransaction(db,async transaction=>{const snap=await transaction.get(ref);if(!snap.exists()||snap.data().rev!==rev)throw new Error('This task changed. Close and reopen it.');transaction.delete(ref);});
    },
    async pick(day,uid){
      const ref=dbSdk.doc(db,...path(),'daily',day,'picks',uid),candidates=candidateTasks(tasks,uid);
      return dbSdk.runTransaction(db,async transaction=>{
        const old=await transaction.get(ref);if(old.exists())return old.data().taskId;
        const taskId=choose(candidates)?.id||null;
        transaction.set(ref,{taskId,createdAt:dbSdk.serverTimestamp()});return taskId;
      });
    },
    close:stop,
  };
}
