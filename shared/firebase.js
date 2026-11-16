import {candidateTasks,choose} from './core.js';
const VERSION='13.3.0';
export async function connectFirebase(config,events) {
  const [appSdk,authSdk,dbSdk]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`),
  ]);
  const app=appSdk.initializeApp(config.firebase,'lists'), auth=authSdk.getAuth(app), db=dbSdk.getFirestore(app);
  await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
  const space=dbSdk.doc(db,'listSpaces',config.space),path=['listSpaces',config.space,'environments',config.environment];
  let unsubscribe=[],user=null,tasks=[],generation=0;
  function stop(){generation++;unsubscribe.forEach(fn=>fn());unsubscribe=[];tasks=[];events.tasks([]);}
  authSdk.onAuthStateChanged(auth,async account=>{
    stop();user=account;events.account(account);if(!account)return;
    const run=generation;
    try {
      const membership=await dbSdk.getDoc(space);
      if(run!==generation)return;
      if(!membership.exists()||!membership.data().memberUids.includes(account.uid))throw new Error('Your account has not been added to this household yet.');
      events.members(membership.data().names||{});
      const rows=[[],[]],received=[false,false];
      const collection=dbSdk.collection(db,...path,'tasks');
      const queries=[dbSdk.query(collection,dbSdk.where('visibility','==','private'),dbSdk.where('ownerUid','==',account.uid)),dbSdk.query(collection,dbSdk.where('visibility','==','shared'))];
      queries.forEach((query,index)=>unsubscribe.push(dbSdk.onSnapshot(query,{includeMetadataChanges:true},snapshot=>{
        if(run!==generation)return;
        rows[index]=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
        received[index]=!snapshot.metadata.fromCache;
        tasks=[...new Map(rows.flat().map(t=>[t.id,t])).values()];events.tasks(tasks);
        if(received.every(Boolean))events.status(snapshot.metadata.hasPendingWrites?'Saving…':'Live');
        if(received.every(Boolean))events.ready();
      },error=>events.error(error))));
    }catch(error){if(run===generation)events.error(error);}
  });
  const docFor=id=>dbSdk.doc(db,...path,'tasks',id);
  return {
    async login(){const provider=new authSdk.GoogleAuthProvider();await authSdk.signInWithPopup(auth,provider);},
    async logout(){stop();await authSdk.signOut(auth);},
    async write(id,patch,expectedRev){
      if(!navigator.onLine)throw new Error('You are offline. Keep this open and try again when connected.');
      await dbSdk.runTransaction(db,async transaction=>{
        const ref=docFor(id),snap=await transaction.get(ref);
        if(snap.exists()){
          if(!expectedRev && Object.entries(patch).every(([key,value])=>snap.data()[key]===value))return;
          if(snap.data().rev!==expectedRev)throw new Error('This task changed on another phone. Close and reopen it.');
          transaction.update(ref,{...patch,rev:expectedRev+1,updatedAt:dbSdk.serverTimestamp()});
        }else{
          if(expectedRev)throw new Error('This task was removed on another phone.');
          transaction.set(ref,{...patch,rev:1,createdAt:Date.now(),updatedAt:dbSdk.serverTimestamp()});
        }
      });
    },
    async remove(id,rev){
      if(!navigator.onLine)throw new Error('Connect to the internet to remove this task.');
      await dbSdk.runTransaction(db,async transaction=>{const ref=docFor(id),snap=await transaction.get(ref);if(!snap.exists()||snap.data().rev!==rev)throw new Error('This task changed. Close and reopen it.');transaction.delete(ref);});
    },
    async pick(day,uid){
      const ref=dbSdk.doc(db,...path,'daily',day,'picks',uid);
      return dbSdk.runTransaction(db,async transaction=>{
        const old=await transaction.get(ref);if(old.exists())return old.data().taskId;
        const taskId=choose(candidateTasks(tasks,uid))?.id||null;
        transaction.set(ref,{taskId,createdAt:dbSdk.serverTimestamp()});return taskId;
      });
    },
    close:stop,
  };
}
