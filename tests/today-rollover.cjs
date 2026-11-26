const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const {width,board,merged} of [{width:390,board:false,merged:false},{width:1280,board:false,merged:false},{width:1440,board:true,merged:false},{width:1440,board:true,merged:true}]){
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error);});await ui.mockBackend(page,BASE);await page.clock.setFixedTime(new Date('2026-11-26T07:55:00Z'));
   await page.addInitScript(({board})=>{
    if(localStorage.getItem('rollover-fixture'))return;localStorage.setItem('rollover-fixture','true');const make=(id,dueDate,sortOrder,extra={})=>({id,title:id,category:'todo',ownerUid:'tal',visibility:'private',completed:false,waiting:false,dueDate,followUp:null,sortOrder,createdAt:1,rev:1,...extra});
    localStorage.setItem('lists-preferences-v1',JSON.stringify({desktopBoard:board}));localStorage.setItem('lists-sandbox-v1',JSON.stringify({picks:{'2026-11-25_tal':'daily','2026-11-26_tal':'daily'},tasks:[make('old','2026-11-24',500),make('yesterday-b','2026-11-25',1000),make('yesterday-a','2026-11-25',2000),make('waiting-past',null,1500,{waiting:true,followUp:'2026-11-25'}),make('new-today','2026-11-26',-10000),make('waiting-today',null,-20000,{waiting:true,followUp:'2026-11-26'}),make('future','2026-11-27',-30000),make('done','2026-11-25',-40000,{completed:true}),make('daily',null,-50000)]}));
   },{board});
   await page.goto(BASE);await page.locator('.suggestion').waitFor();if(merged)await page.locator('[data-days=more]').click();
   let day='2026-11-25';const rows=()=>page.locator(board&&!merged?'.board-lane[data-lane=today]>.day-tasks>.task-row':'.day-group[data-day="'+day+'"]>.day-tasks>.task-row'),ids=()=>rows().evaluateAll(nodes=>nodes.map(node=>node.dataset.task)),source=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks);
   assert.deepEqual(await ids(),['old','yesterday-b','waiting-past','yesterday-a','daily']);const before=await source();
   await page.clock.setFixedTime(new Date('2026-11-26T08:05:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));day='2026-11-26';await rows().filter({hasText:'new-today'}).waitFor();await page.waitForTimeout(100);
   assert.deepEqual(await ids(),['old','yesterday-b','waiting-past','yesterday-a','waiting-today','new-today','daily'],'Carryovers stay above newly due tasks');assert.deepEqual(await source(),before,'Midnight does not rewrite task dates/ranks/revisions');
   const moveUp=async id=>{await ui.move(page,rows().filter({has:page.locator('[data-edit="'+id+'"]')}));await page.locator('[data-move-direction="-1"]').click();};
   await moveUp('yesterday-a');await moveUp('yesterday-a');assert.deepEqual((await ids()).slice(0,4),['old','yesterday-a','yesterday-b','waiting-past'],'Carryovers retain manual reordering');
   await moveUp('new-today');await moveUp('new-today');assert.deepEqual((await ids()).slice(0,5),['old','yesterday-a','yesterday-b','waiting-past','new-today'],'Today reorder cannot jump the carryover group');
   await page.locator('#new-title').fill('added today');await page.locator('#composer [data-view=today]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.some(task=>task.title==='added today'));
   const newId=(await source()).find(task=>task.title==='added today').id;assert.deepEqual((await ids()).slice(0,5),['old','yesterday-a','yesterday-b','waiting-past',newId],'New task starts first among today tasks, below carryovers');
   await page.reload();await rows().filter({hasText:'added today'}).waitFor();assert.deepEqual((await ids()).slice(0,5),['old','yesterday-a','yesterday-b','waiting-past',newId]);assert.equal(await page.locator('[data-task=done]').count(),0);assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: Pacific midnight rollover, overdue-first ordering, saved manual order within groups, boundary-safe reordering, new task placement, daily bottom, Waiting follow-ups, no midnight task writes and reload across phone/desktop list/board/merged board. Synthetic only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
