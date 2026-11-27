const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});await ui.mockBackend(page,BASE);await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
  await page.addInitScript(()=>{localStorage.setItem('lists-preferences-v1',JSON.stringify({desktopBoard:false}));const make=(id,date)=>({id,title:id,category:'todo',ownerUid:'tal',visibility:'private',completed:false,waiting:false,dueDate:date,followUp:null,sortOrder:1,createdAt:1,rev:1});localStorage.setItem('lists-sandbox-v1',JSON.stringify({tasks:[make('carryover','2026-11-25'),make('today','2026-11-26')],picks:{}}));});
  await page.route('**/shared/firebase.js*',route=>route.fulfill({contentType:'text/javascript',body:`
   import {sandboxStore} from '${BASE}tests/fixtures/store.js';
   export async function connectFirebase(config,events){
    const store=sandboxStore(events.tasks,events.status);let settings={todayOrder:{scope:'["home","staging"]',day:'2026-11-25',ids:['carryover']}};
    const publish=ready=>events.organizer({tags:[],settings,preferencesReady:ready});window.__orderWrites=[];
    window.__serverPreferences=()=>{settings={todayOrder:{scope:'["home","staging"]',day:'2026-11-26',ids:['today','carryover']}};publish(true);};
    setTimeout(async()=>{events.account({uid:'tal',email:'tal@test.invalid',displayName:'Tal'});events.space({id:'home',title:'Synthetic'});events.members({tal:'Tal'});publish(false);await store.ready();events.ready();},0);
    return {...store,async savePreferences(patch){if(window.__failOrder){window.__failOrder=false;throw Error('Synthetic order save failure');}window.__orderWrites.push(patch);settings={...settings,...patch};publish(true);}};
   }`}));
  await page.goto(BASE);await page.locator('[data-task=carryover]').waitFor();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__orderWrites.length),0,'Cached settings must not overwrite the server order during hydration');
  await page.evaluate(()=>window.__serverPreferences());const ids=()=>page.locator('.task-row').evaluateAll(rows=>rows.map(row=>row.dataset.task));assert.deepEqual(await ids(),['today','carryover']);assert.equal(await page.evaluate(()=>window.__orderWrites.length),0);
  const before=await page.evaluate(()=>localStorage.getItem('lists-sandbox-v1'));await page.evaluate(()=>window.__failOrder=true);await ui.move(page,page.locator('[data-task=carryover]'));await page.locator('[data-move-direction="-1"]').click();await page.getByText('Synthetic order save failure',{exact:true}).waitFor();assert.deepEqual(await ids(),['today','carryover'],'Failed saves retain the last saved order');
  await ui.move(page,page.locator('[data-task=carryover]'));await page.locator('[data-move-direction="-1"]').click();assert.deepEqual(await ids(),['carryover','today']);assert.equal(await page.evaluate(()=>localStorage.getItem('lists-sandbox-v1')),before,'Reordering never rewrites task content/ranks/dates');
  console.log('PASS: server-preference hydration is not overwritten by a cached daily baseline; saved order wins, failures roll back, retry succeeds without task mutations. Synthetic only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
