const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let checks=0;
 try{
  for(const [width,board] of [[390,false],[1280,false],[1280,true]])for(const style of [1,7,4,8,9]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390,reducedMotion:'no-preference'}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);await page.clock.setFixedTime(new Date('2026-11-25T20:00:00Z'));
   await page.addInitScript(({style,board})=>{
    const task=(id,title,dueDate,sortOrder)=>({id,title,category:'todo',ownerUid:'tal',visibility:'private',assigneeUid:null,dueDate,waiting:false,followUp:null,completed:false,rev:1,createdAt:100,sortOrder});
    if(!localStorage.getItem('lists-sandbox-v1'))localStorage.setItem('lists-sandbox-v1',JSON.stringify({tasks:[task('a','Today Alpha','2026-11-25',100),task('b','Today Beta','2026-11-25',200),task('c','Today Gamma','2026-11-25',300),task('later-a','Daily later example',null,-5000),task('later-b','Other later example',null,-6000)],picks:{'2026-11-25_tal':'later-a'}}));
    localStorage.setItem('lists-preferences-v1',JSON.stringify({style,desktopBoard:board,motion:'playful'}));
    window.__rowMotion=[];const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){const animation=original.call(this,frames,options),node=this;queueMicrotask(()=>{if(node.classList.contains('task-row'))window.__rowMotion.push({id:node.dataset.task,effect:animation.id,from:frames[0],at:performance.now()});});return animation;};
   },{style,board});
   await ui.mockBackend(page,BASE);
   await page.route('**/shared/firebase.js*',route=>route.fulfill({contentType:'text/javascript',body:`
    import {sandboxStore} from '${BASE}tests/fixtures/store.js';
    export async function connectFirebase(config,events){
     let latest=[],daily=JSON.parse(localStorage.getItem('test-daily-state')||'{"taskId":"later-a","dismissed":false,"sortOrder":null}');
     const push=rows=>{latest=rows;events.tasks(rows);};
     const emit=()=>events.daily?.({day:'2026-11-25',uid:'tal',...daily});
     const store=sandboxStore(push,events.status);
     const settings=()=>({style:${style},...JSON.parse(localStorage.getItem('test-steady-settings')||'{}')});
     window.__echo=()=>{events.tasks(latest);events.members({tal:'Tal'});events.organizer?.({tags:[],settings:settings()});events.ready();};
     setTimeout(async()=>{events.account({uid:'tal',email:'tal@test.invalid',displayName:'Tal'});events.space({id:'home',title:'Synthetic'});events.members({tal:'Tal'});events.organizer?.({tags:[],settings:settings()});await store.ready();events.ready();setTimeout(()=>window.__echo(),40);setTimeout(()=>window.__echo(),100);},0);
     return {...store,async savePreferences(patch){localStorage.setItem(\'test-steady-settings\',JSON.stringify({...settings(),...patch}));events.organizer?.({tags:[],settings:settings()});},async pick(){emit();return daily.dismissed?null:daily.taskId;},async updateDaily(day,uid,id,patch){if(day!=='2026-11-25'||uid!=='tal'||id!==daily.taskId)throw Error('Wrong daily scope');daily={...daily,...patch};localStorage.setItem('test-daily-state',JSON.stringify(daily));emit();},async write(...args){await new Promise(resolve=>setTimeout(resolve,120));await store.write(...args);setTimeout(()=>window.__echo(),30);setTimeout(()=>window.__echo(),75);}};
    }`}));
   await page.goto(BASE);await page.locator('.suggestion').waitFor();await page.waitForTimeout(250);
   const todayRows=page.locator(board?'.day-tasks[data-lane=today] .task-row':'.task-row');
   assert.equal(await todayRows.last().getAttribute('data-task'),'later-a','Suggestion starts last regardless of stored Later order');
   if(style===1)await page.screenshot({path:'/private/tmp/lists-steady-today-'+width+'-'+board+'.png'});
   assert.deepEqual(await page.evaluate(()=>window.__rowMotion),[],'Loading and repeated ready/cache events must not animate rows');
   await page.locator('#composer [data-view=later]').click();await page.locator('#composer [data-view=today]').click();await page.waitForTimeout(120);
   assert.deepEqual(await page.evaluate(()=>window.__rowMotion),[],'Switching views has no list re-entry bounce');
   await page.evaluate(()=>window.__rowMotion=[]);await page.locator('[data-task=a] [data-complete]').click();
   const tops=await page.evaluate(async()=>{const points=[];for(let i=0;i<45;i++){await new Promise(requestAnimationFrame);points.push(document.querySelector('[data-task=b]').getBoundingClientRect().top);if(i%4===0)window.__echo();}return points;});
   assert(tops.every((y,i)=>!i||y<=tops[i-1]+.8),'Completion moves remaining rows upward without a second bounce');
   const moves=await page.evaluate(()=>window.__rowMotion.filter(item=>item.id==='b'&&item.effect==='lists-reorder'));
   assert.equal(moves.length,1,'Acknowledgement/status echoes must not restart the same move');
   const daily=page.locator('.suggestion[data-task=later-a]');await ui.move(page,daily);await page.locator('[data-move-direction="-1"]').click();await page.waitForTimeout(60);
   assert.notEqual(await todayRows.last().getAttribute('data-task'),'later-a','Daily suggestion can be moved up');
   await page.reload();await daily.waitFor();assert.notEqual(await todayRows.last().getAttribute('data-task'),'later-a','Daily order survives reload');
   await daily.locator('[data-skip-later]').click();await daily.waitFor({state:'detached'});
   await page.locator('.task-notice').filter({hasText:'Kept in Later for today'}).locator('.toast-undo').click();await daily.waitFor();
   await daily.locator('[data-skip-later]').click();await daily.waitFor({state:'detached'});await page.reload();await page.locator('#workspace').waitFor();await page.waitForTimeout(120);
   assert.equal(await page.locator('.suggestion').count(),0,'Skip persists and never replaces the daily pick');
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.id==='later-a'));
   assert.equal(stored.completed,false);assert.equal(stored.dueDate,null);assert.equal(stored.sortOrder,-5000,'Daily position does not change the underlying Later task');
   await page.locator('#composer [data-view=later]').click();await page.locator('[data-task=later-a]').waitFor();
   if(width===390&&style===1)await page.screenshot({path:'/private/tmp/lists-steady-later-phone.png'});
   assert.deepEqual(errors,[]);checks++;await page.close();
  }
  console.log(JSON.stringify({result:'PASS',checks,coverage:'Five styles on phone/desktop; quiet startup and tab switches; monotonic completion with repeated sync/ready events; one FLIP per layout change; bottom-first daily suggestion, saved reorder, Not today/Undo/reload/no replacement, unchanged source task. Synthetic data only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
