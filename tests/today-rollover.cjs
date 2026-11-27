const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const {width,board,merged} of [{width:390,board:false,merged:false},{width:1280,board:false,merged:false},{width:1440,board:true,merged:false},{width:1440,board:true,merged:true}]){
   const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);await page.clock.setFixedTime(new Date('2026-11-26T07:55:00Z'));
   await page.addInitScript(({board})=>{
    if(localStorage.getItem('rollover-fixture'))return;localStorage.setItem('rollover-fixture','true');const make=(id,dueDate,sortOrder,extra={})=>({id,title:id,category:'todo',ownerUid:'tal',visibility:'private',completed:false,waiting:false,dueDate,followUp:null,sortOrder,createdAt:1,rev:1,...extra});
    localStorage.setItem('lists-preferences-v1',JSON.stringify({desktopBoard:board}));localStorage.setItem('lists-sandbox-v1',JSON.stringify({picks:{'2026-11-25_tal':'daily','2026-11-26_tal':'daily','2026-11-27_tal':'daily'},tasks:[make('old','2026-11-24',500),make('yesterday-b','2026-11-25',1000),make('yesterday-a','2026-11-25',2000),make('waiting-past',null,1500,{waiting:true,followUp:'2026-11-25'}),make('new-today','2026-11-26',-10000),make('waiting-today',null,-20000,{waiting:true,followUp:'2026-11-26'}),make('future','2026-11-27',-30000),make('done','2026-11-25',-40000,{completed:true}),make('daily',null,-50000)]}));
   },{board});
   await page.goto(BASE);await page.locator('.suggestion').waitFor();if(merged||!board)await page.locator('[data-days=more]').click();
   let day='2026-11-25';const rows=()=>page.locator(board&&!merged?'.board-lane[data-lane=today]>.day-tasks>.task-row':'.day-group[data-day="'+day+'"]>.day-tasks>.task-row'),ids=()=>rows().evaluateAll(nodes=>nodes.map(node=>node.dataset.task)),source=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks);
   const baseline=expected=>page.waitForFunction(day=>JSON.parse(localStorage.getItem('lists-test-metadata-tal')||'{}').settings?.todayOrder?.day===day,expected);
   const moveUp=async id=>{await ui.move(page,page.locator('.task-row:not([data-waiting-copy])[data-task="'+id+'"]'));await page.locator('[data-move-direction="-1"]').click();};
   await baseline(day);assert.deepEqual(await ids(),['old','yesterday-b','waiting-past','yesterday-a','daily']);
   const initial=await source();for(let i=0;i<3;i++)await moveUp('yesterday-a');
   assert.deepEqual(await ids(),['yesterday-a','old','yesterday-b','waiting-past','daily'],'Current-day tasks can move above older carryovers');
   assert.deepEqual(await source(),initial,'Today reordering changes no task dates, ranks or revisions');
   await moveUp('new-today');const before=await source();
   await page.clock.setFixedTime(new Date('2026-11-26T08:05:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));day='2026-11-26';await baseline(day);
   assert.deepEqual(await ids(),['yesterday-a','old','yesterday-b','waiting-past','new-today','waiting-today','daily'],'Yesterday order then independently arranged tomorrow order');
   assert.deepEqual(await source(),before,'Midnight does not rewrite tasks');
   for(let i=0;i<4;i++)await moveUp('new-today');
   assert.deepEqual((await ids()).slice(0,3),['new-today','yesterday-a','old'],'No fixed overdue/today boundary');
   await moveUp('daily');await moveUp('daily');assert.deepEqual(await ids(),['new-today','yesterday-a','old','yesterday-b','daily','waiting-past','waiting-today'],'Daily suggestion can move anywhere, too');
   await page.locator('#new-title').fill('added today');await page.locator('#composer [data-view=today]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.some(task=>task.title==='added today'));
   const newId=(await source()).find(task=>task.title==='added today').id;assert.equal((await ids())[0],newId,'A new task starts at the top of the freely ordered list');
   const arranged=await ids();await page.reload();await rows().filter({hasText:'added today'}).waitFor();assert.deepEqual(await ids(),arranged,'Free order persists through refresh');
   const nextBefore=await source();await page.clock.setFixedTime(new Date('2026-11-27T08:05:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));day='2026-11-27';await baseline(day);
   assert.deepEqual(await ids(),[newId,'new-today','yesterday-a','old','yesterday-b','waiting-past','waiting-today','future','daily'],'The next rollover preserves the full rearranged queue before newly due tasks; the renewed Later pick starts last');
   assert.deepEqual(await source(),nextBefore);assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: phone/list/board/merged layouts; two Pacific rollovers concatenate yesterday manual order then tomorrow saved order; free cross-boundary and daily reorder; new tasks/reload; no task date/rank/revision writes for Today reorder or midnight. Synthetic only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
