const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const PROJECT='demo-lists-admin';
const java=process.env.LISTS_TEST_JAVA||'/private/tmp/lists-rules-runtime/jdk-21.0.13+9-jre/Contents/Home/bin/java';
const jar=process.env.LISTS_TEST_FIRESTORE_JAR||'/private/tmp/lists-rules-runtime/firestore.jar';
function token(uid,email,extra={}){const now=Math.floor(Date.now()/1000),encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');return `${encode({alg:'none',typ:'JWT'})}.${encode({iss:`https://securetoken.google.com/${PROJECT}`,aud:PROJECT,sub:uid,user_id:uid,iat:now,exp:now+3600,auth_time:now,email,email_verified:true,firebase:{sign_in_provider:'google.com',identities:{'google.com':[uid],email:[email]}},...extra})}.`;}
const tal=token('test-tal','talrme@gmail.com'),sophie=token('test-sophie','sophiegreen2@gmail.com'),alice=token('test-alice','alice@example.com'),bob=token('test-bob','bob@example.com');
function value(v){if(v===null)return {nullValue:null};if(Array.isArray(v))return {arrayValue:{values:v.map(value)}};if(typeof v==='object')return {mapValue:{fields:fields(v)}};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return {integerValue:String(v)};return {stringValue:v};}
function fields(data){return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,value(v)]));}
(async()=>{
 assert(fs.existsSync(java)&&fs.existsSync(jar),'Set LISTS_TEST_JAVA and LISTS_TEST_FIRESTORE_JAR to a temporary Java 21 runtime and Google Firestore emulator JAR.');
 const reservation=net.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const emulator=spawn(java,['-jar',jar,'--host','127.0.0.1','--port',String(port),'--project_id',PROJECT,'--single_project_mode','--single_project_mode_error','--rules',path.resolve(__dirname,'../firestore.rules')]);
 let logs='',checks=0;emulator.stdout.on('data',data=>logs+=data);emulator.stderr.on('data',data=>logs+=data);
 const base=`http://127.0.0.1:${port}/v1/projects/${PROJECT}/databases/(default)/documents`,name=doc=>`projects/${PROJECT}/databases/(default)/documents/${doc}`;
 async function request(url,auth,options={}){return fetch(url,{...options,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{}),...options.headers}});}
 async function expected(response,allow,label){const body=await response.text();assert.equal(response.ok,allow,`${label}: ${response.status} ${body.slice(0,600)}`);checks++;return body;}
 async function write(doc,data,auth,allow,label,transforms=['updatedAt'],update=false){
  const updateFields=fields(data),operation={update:{name:name(doc),fields:updateFields},updateTransforms:transforms.map(fieldPath=>({fieldPath,setToServerValue:'REQUEST_TIME'}))};
  if(update)operation.updateMask={fieldPaths:Object.keys(data)};
  return expected(await request(base+':commit',auth,{method:'POST',body:JSON.stringify({writes:[operation]})}),allow,label);
 }
 const read=(doc,auth,allow,label)=>request(base+'/'+doc,auth).then(r=>{if(allow&&r.status===404){checks++;return r.text();}return expected(r,allow,label);});
 const task=(ownerUid,visibility='private',assigneeUid=null)=>({title:'Synthetic task',category:'todo',ownerUid,visibility,assigneeUid,dueDate:null,waiting:false,followUp:null,completed:false,rev:1,createdAt:0});
 const household=(emails,title='Test household')=>({schemaVersion:2,title,memberEmails:emails,memberUids:[],names:{},createdBy:'test-tal',rev:1});
 try{
  for(let i=0;i<100;i++){if(emulator.exitCode!==null)throw Error('Emulator exited: '+logs);try{await fetch(base+'/ready');break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
  await read('listSpaces/home',null,false,'Anonymous denied');
  await write('listUsers/test-tal',{email:'talrme@gmail.com',name:'Tal'},tal,true,'Register own directory profile');
  await write('listUsers/test-sophie',{email:'sophiegreen2@gmail.com',name:'Sophie'},sophie,true,'Sophie registers directory profile');
  await write('listUsers/test-tal',{email:'sophiegreen2@gmail.com',name:'Forged'},sophie,false,'Cannot overwrite another directory profile');
  await write('listUsers/test-sophie',{email:'talrme@gmail.com',name:'Forged'},sophie,false,'Directory email must match Google identity');
  await read('listUsers/test-sophie',tal,true,'Admin reads user directory');
  await read('listUsers/test-tal',sophie,false,'Nonadmin cannot read other directory profiles');
  await expected(await request(base+':runQuery',sophie,{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId:'listUsers'}]}})}),false,'Nonadmin cannot enumerate users');
  await read('listSpaces/missing',tal,true,'Admin may check nonexistent household for transaction');
  await write('listSpaces/home',household(['talrme@gmail.com','sophiegreen2@gmail.com']),sophie,false,'Sophie cannot create household',['createdAt','updatedAt']);
  await write('listSpaces/home',household(['talrme@gmail.com']),token('test-tal','talrme@gmail.com',{email_verified:false}),false,'Unverified admin email denied',['createdAt','updatedAt']);
  await write('listSpaces/home',household(['talrme@gmail.com']),token('test-sophie','sophiegreen2@gmail.com',{admin:true}),false,'Client admin claim does not grant admin',['createdAt','updatedAt']);
  await write('listSpaces/home',household(['talrme@gmail.com','sophiegreen2@gmail.com']),tal,true,'Tal creates household',['createdAt','updatedAt']);
  await read('listSpaces/home',sophie,true,'Invited Sophie reads household');await read('listSpaces/home',alice,false,'Uninvited Alice denied');
  await write('listSpaces/home/members/test-tal',{email:'talrme@gmail.com',name:'Tal'},tal,true,'Tal registers only authorized identity',['joinedAt']);
  await write('listSpaces/home/members/test-sophie',{email:'sophiegreen2@gmail.com',name:'Sophie'},sophie,true,'Sophie registers own identity',['joinedAt']);
  await write('listSpaces/home/members/forged',{email:'talrme@gmail.com',name:'Tal'},sophie,false,'Cannot forge another member profile',['joinedAt']);
  await write('listSpaces/home/members/test-sophie',{admin:true},sophie,false,'Cannot self-promote using member fields',[],true);
  await write('listSpaces/home',{title:'Hijacked'},sophie,false,'Nonadmin cannot modify invitations',[],true);
  const home='listSpaces/home/environments/staging/tasks/';
  await read(home+'new-task',tal,true,'Missing task readable for create transaction');
  await write(home+'private-tal',task('test-tal'),tal,true,'Create Tal private task');
  await write(home+'private-sophie',task('test-sophie'),sophie,true,'Create Sophie private task');
  await read(home+'private-sophie',tal,true,'Admin can preview Sophie personal task');
  await write(home+'private-sophie',{title:'Admin edit',rev:2},tal,false,'Admin has no write bypass for other personal tasks',['updatedAt'],true);
  await expected(await request(base+'/'+home+'private-sophie',tal,{method:'DELETE'}),false,'Admin cannot delete other personal tasks');
  await read(home+'private-tal',sophie,false,'Sophie cannot read Tal private task');
  await write(home+'shared',task('test-tal','shared','test-sophie'),tal,true,'Assign shared task to registered Sophie');
  await read(home+'shared',sophie,true,'Sophie reads shared task');
  await write(home+'shared',{completed:true,rev:2},sophie,true,'Sophie completes shared task', ['updatedAt'],true);
  await write(home+'shared',{title:'Stale edit',rev:2},tal,false,'Stale revision denied',['updatedAt'],true);
  await write(home+'shared',{visibility:'private',assigneeUid:null,rev:3},sophie,false,'Only creator may unshare task',['updatedAt'],true);
  await write(home+'forged-owner',task('test-sophie'),tal,false,'Cannot forge task owner');
  await write(home+'forged-assignee',task('test-tal','shared','test-bob'),tal,false,'Cannot assign outsider');
  const query={structuredQuery:{from:[{collectionId:'tasks'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'visibility'},op:'EQUAL',value:{stringValue:'private'}}},{fieldFilter:{field:{fieldPath:'ownerUid'},op:'EQUAL',value:{stringValue:'test-sophie'}}}]}}}};
  await expected(await request(base+'/listSpaces/home/environments/staging:runQuery',sophie,{method:'POST',body:JSON.stringify(query)}),true,'Scoped private query allowed');
  await expected(await request(base+'/listSpaces/home/environments/staging:runQuery',tal,{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId:'tasks'}]}})}),true,'Admin can read household tasks for preview');
  const discover={structuredQuery:{from:[{collectionId:'listSpaces'}],where:{fieldFilter:{field:{fieldPath:'memberEmails'},op:'ARRAY_CONTAINS',value:{stringValue:'sophiegreen2@gmail.com'}}}}};
  await expected(await request(base+':runQuery',sophie,{method:'POST',body:JSON.stringify(discover)}),true,'Member discovers invited households');
  await expected(await request(base+':runQuery',sophie,{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId:'listSpaces'}]}})}),false,'Nonadmin cannot enumerate all households');
  await write('listSpaces/friends',household(['alice@example.com','bob@example.com'],'Friends'),tal,true,'Admin creates household for others without joining',['createdAt','updatedAt']);
  await read('listSpaces/friends',tal,true,'Admin reads management metadata');
  const friends='listSpaces/friends/environments/staging/tasks/';
  await write(friends+'alice-private',task('test-alice'),alice,true,'New invited Google account creates own private task');
  await write(friends+'shared',task('test-alice','shared'),alice,true,'Friend household shared task');
  await read(friends+'shared',bob,true,'Friend household member sees shared task');
  await read(friends+'shared',tal,true,'Admin can preview shared tasks without joining household');
  await read(friends+'alice-private',tal,true,'Admin can preview friend personal tasks');
  await write(friends+'shared',{completed:true,rev:2},tal,false,'Admin cannot write outside own household',['updatedAt'],true);
  await read(home+'shared',bob,false,'Cross-household access denied');
  const picks='listSpaces/home/environments/staging/daily/2026-11-16/picks/';
  await write(picks+'test-tal',{taskId:'private-tal'},tal,true,'Own eligible daily suggestion',['createdAt']);
  await read(picks+'test-tal',sophie,false,'Other member daily choice private');
  await write(picks+'test-sophie',{taskId:'private-sophie'},sophie,true,'Sophie creates own daily choice',['createdAt']);
  await read(picks+'test-sophie',tal,true,'Admin reads exact daily choice for preview');
  await write(picks+'test-alice',{taskId:null},tal,false,'Admin cannot create choice on behalf of another user',['createdAt']);
  await write(picks+'test-sophie',{taskId:'private-tal'},sophie,false,'Cannot pick other private task',['createdAt']);
  await write('listSpaces/legacy',{memberUids:['test-tal','test-sophie'],names:{'test-tal':'Tal','test-sophie':'Sophie'}},'owner',true,'Seed old manual format in demo emulator only',[]);
  await read('listSpaces/legacy',sophie,true,'Legacy manual household still accessible');
  await write('listSpaces/legacy',{schemaVersion:2,title:'Migrated',memberEmails:['talrme@gmail.com','sophiegreen2@gmail.com'],createdBy:'test-tal',rev:1},tal,true,'Explicit admin migration preserves legacy fields',['createdAt','updatedAt'],true);
  await write('listSpaces/home',{memberEmails:['talrme@gmail.com'],rev:2},tal,true,'Admin can revoke invitation',['updatedAt'],true);
  await read(home+'shared',sophie,false,'Removed member immediately loses task access');
  await write(home+'shared',{title:'Reassignable after removal',rev:3},tal,true,'Remaining owner can still edit shared task after member removal',['updatedAt'],true);
  console.log(JSON.stringify({result:'PASS',checks,project:PROJECT,coverage:'Actual local Firestore rules: admin-only create/manage, verified identities, self-registration, scoped queries, private/shared isolation, new households and invited third parties, revision checks, daily choices, legacy migration and revoked access',productionWrites:0}));
 }catch(error){console.error(logs.slice(-6000));throw error;}finally{emulator.kill('SIGTERM');await new Promise(resolve=>{if(emulator.exitCode!==null)return resolve();emulator.once('exit',resolve);});}
})().catch(error=>{console.error(error);process.exitCode=1;});
