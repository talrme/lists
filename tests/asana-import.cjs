const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.addInitScript(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register=async()=>null;});
  await page.route('https://firestore.googleapis.com/**',route=>route.abort());
  await page.route('**/shared/firebase.js*',route=>route.fulfill({contentType:'text/javascript',body:`
   import {sandboxStore} from '${BASE}tests/fixtures/store.js';
   import {importDrafts} from '${BASE}shared/asana-import-core.js';
   export async function connectFirebase(config,events){
    const store=sandboxStore(events.tasks,events.status);let existing=[];
    window.__importCalls=0;
    setTimeout(async()=>{events.account({uid:'test-tal',email:'talrme@gmail.com',emailVerified:true,displayName:'Tal',providerData:[{providerId:'google.com'}]});events.space({id:'home',title:'Synthetic household'});events.members({'test-tal':'Tal'});await store.ready();events.ready();},0);
    return {...store,async importAsanaTasks(plan){window.__importCalls++;let created=0,skipped=0;for(const task of importDrafts(plan,{uid:'test-tal',day:'2026-11-24'})){if(existing.includes(task.id)){skipped++;continue;}await store.write(task.id,task);existing.push(task.id);created++;}return {created,skipped};}};
   }`}));
  await page.goto(BASE+'?import=asana');await page.locator('#prepared-import-file').waitFor();
  assert.equal(await page.evaluate(()=>window.__importCalls),0);
  const payload={kind:'lists-asana-import',version:1,tasks:[{sourceId:'1',title:'<img src=x onerror=alert(1)>',description:'Details\n\n<script>window.__injected=true</script>',destination:'later',waiting:true},{sourceId:'2',title:'Week example',description:'All source details',destination:'week',waiting:false}]};
  const choose=()=>page.locator('#prepared-import-file').setInputFiles({name:'prepared.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await choose();assert.equal(await page.locator('#confirm-prepared-import').textContent(),'Import 2 tasks');assert.equal(await page.evaluate(()=>window.__importCalls),0);assert.equal(await page.locator('#prepared-import-preview img,#prepared-import-preview script').count(),0);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(await page.locator('#dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1));}
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:'/private/tmp/lists-prepared-import-phone.png'});
  await page.locator('#confirm-prepared-import').click();await page.getByText('Imported 2 tasks · 0 already present. Details verified.',{exact:true}).waitFor();
  await choose();await page.locator('#confirm-prepared-import').click();await page.getByText('Imported 0 tasks · 2 already present. Details verified.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>!!window.__injected),false);assert.deepEqual(errors,[]);
  await page.locator('#dialog [data-close]').first().click();await ui.menuAction(page,'settings');await page.locator('#settings-admin>summary').click();await page.locator('.admin-asana>summary').click();await page.locator('#open-asana-import').click();await page.locator('#prepared-import-file').waitFor();
  console.log(JSON.stringify({result:'PASS',coverage:'Signed-in admin deep link/menu; explicit file/import action; escaped source text; private Waiting/Week fixtures; safe repeat IDs; 320/390/1280px layouts. Synthetic data only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
