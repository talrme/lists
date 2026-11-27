const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 let checks=0;
 try{
  for(const layout of [{width:390,board:false,merged:false},{width:1280,board:false,merged:false},{width:1440,board:true,merged:false},{width:1440,board:true,merged:true}])for(const style of [1,7,4,8,9]){
   const page=await browser.newPage({viewport:{width:layout.width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
   await page.addInitScript(({board,style})=>{localStorage.setItem('lists-preferences-v1',JSON.stringify({desktopBoard:board,style}));const make=(id,date,sortOrder)=>({id,title:id,category:'todo',ownerUid:'tal',visibility:'private',completed:false,waiting:false,dueDate:date,followUp:null,sortOrder,createdAt:1,rev:1});if(!localStorage.getItem('lists-sandbox-v1'))localStorage.setItem('lists-sandbox-v1',JSON.stringify({tasks:[make('old-a','2026-11-25',1000),make('old-b','2026-11-25',2000),make('today-a','2026-11-26',-10000),make('today-b','2026-11-26',-9000)],picks:{}}));},{...layout,style});
   await page.goto(BASE);await page.locator('[data-task=today-b]').waitFor();if(layout.merged)await page.locator('[data-days=more]').click();
   const root=page.locator(layout.board&&!layout.merged?'[data-lane=today]>.day-tasks':'.day-group[data-day="2026-11-26"]>.day-tasks'),ids=()=>root.locator(':scope>.task-row').evaluateAll(nodes=>nodes.map(node=>node.dataset.task));
   const from=await root.locator('[data-task=today-b] .task-content').boundingBox(),to=await root.locator('[data-task=old-a]').boundingBox();
   await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
   // No artificial hold: ordinary desktop dragging starts moving immediately.
   await page.mouse.move(from.x+from.width/2,from.y+from.height/2-15);await page.mouse.move(to.x+to.width/2,to.y+4,{steps:15});
   assert(await page.locator('body').evaluate(node=>node.classList.contains('task-dragging')),'Immediate mouse movement must start dragging');await page.mouse.up();await page.waitForTimeout(400);
   assert.deepEqual(await ids(),['today-b','old-a','old-b','today-a']);assert.equal(await page.locator('#edit-form').count(),0,'Dropping does not open the editor');
   await page.reload();await page.locator('[data-task=old-b]').waitFor();if(layout.merged&&await page.locator('[data-days=more]').isVisible())await page.locator('[data-days=more]').click();assert.deepEqual(await ids(),['today-b','old-a','old-b','today-a'],'Saved order survives reload');
   await root.locator('[data-task=today-a] [data-edit]').click();await page.locator('#edit-form').waitFor();await page.locator('#edit-form .cancel-editor').last().click();
   await root.locator('[data-task=today-a] [data-edit]').focus();await page.keyboard.press('Enter');await page.locator('#edit-form').waitFor();await page.locator('#edit-form .cancel-editor').last().click();
   assert.deepEqual(errors,[]);checks++;await page.close();
  }
  console.log('PASS: '+checks+' phone-width/desktop-list/board/merged style combinations; immediate mouse drag startup, saved Today reorder/reload, ordinary click and keyboard editing, no accidental editor on drop. Synthetic only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
