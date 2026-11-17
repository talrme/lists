const {chromium}=require('playwright'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
async function swipe(page,row,distance){const box=await row.locator('.task-content').boundingBox(),x=box.x+8,y=box.y+box.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+distance,y,{steps:10});await page.mouse.up();}
async function drag(page,row,target){const start=await row.locator('.task-content').boundingBox();await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.waitForTimeout(420);await page.mouse.move(start.x+start.width/2,start.y+start.height/2+8,{steps:3});await page.waitForTimeout(100);await page.mouse.move(target.x,target.y,{steps:18});await page.waitForTimeout(100);await page.mouse.up();}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let layouts=0;
 try{
  const {businessDays,dayKey}=await import('../shared/core.js'),nextWeek=businessDays(dayKey(),true);
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
   await ui.mockBackend(page,BASE);
   await page.route('**/tests/fixtures/store.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(require.resolve('./fixtures/store.js'),'utf8').replace('async write(id,patch,expectedRev){',"async write(id,patch,expectedRev){ if(window.__failMove&&'sortOrder' in patch)throw new Error('Test move denied');")}));
   await page.goto(new URL(`staging/${String(design).padStart(2,'0')}/`,BASE).href);await page.locator('#workspace').waitFor();assert.equal(await page.locator('.day-heading:visible').count(),0);
   const title='Planning '+design;await ui.add(page,title);let row=page.locator('.task-row').filter({hasText:title});
   await row.locator('[data-complete]').click();await page.locator('.toast-undo').last().click();await row.waitFor();assert((await row.locator('[data-complete]').getAttribute('aria-label')).startsWith('Complete'));
   await swipe(page,row,40);await row.waitFor();assert(!await page.locator('#edit-form').count());
   await swipe(page,row,115);await row.waitFor({state:'detached'});assert((await page.locator('#toast').innerText()).includes('Task deferred'));assert(nextWeek.includes(await page.evaluate(title=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title===title).dueDate,title)),'Swipe Defer must schedule within next Monday-Friday');await page.locator('.toast-undo').last().click();await row.waitFor();
   await page.locator('[data-action=settings]').click();await page.locator('#list-settings>summary').click();assert(await page.locator('#swipe-defer').isChecked());await page.getByRole('button',{name:'Done',exact:true}).click();await page.locator('[data-action=views]').click();assert.equal(await page.locator('#days-shown').inputValue(),'1');await page.locator('#days-shown').fill('3');await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.day-heading:not([hidden])').length===3);
   const first=page.locator('.day-tasks').first(),before=await first.locator('.task-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.task)),firstId=before[0];
   const secondBox=await first.locator('.task-row').nth(1).boundingBox();await drag(page,first.locator('.task-row').first(),{x:secondBox.x+secondBox.width/2,y:secondBox.y+secondBox.height-2});
   await page.waitForFunction(id=>document.querySelector('.day-tasks .task-row').dataset.task!==id,firstId);assert((await page.locator('#toast').innerText()).includes('Moved'));
   const tomorrow=page.locator('.day-tasks').nth(1),day=await tomorrow.getAttribute('data-day'),target=await tomorrow.boundingBox();
   await drag(page,row,{x:target.x+target.width/2,y:target.y+target.height/2});await tomorrow.locator('.task-row').filter({hasText:title}).waitFor();
   assert.equal(await page.evaluate(title=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.title===title).dueDate,title),day);
   await page.reload();await tomorrow.locator('.task-row').filter({hasText:title}).waitFor();assert.equal(await page.locator('.day-heading:visible').count(),3);
   await page.locator('[data-view=upcoming]').click();await row.waitFor();assert.equal(await row.count(),1);await page.locator('[data-view=today]').click();
   await ui.move(page,row);await page.locator('#move-date').fill(await first.getAttribute('data-day'));await page.locator('#move-date-save').click();await first.locator('.task-row').filter({hasText:title}).waitFor();
   const ids=await first.locator('.task-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.task));await page.evaluate(()=>window.__failMove=true);await ui.move(page,row);await page.locator('[data-move-direction="-1"]').click();await page.getByText('Test move denied',{exact:true}).waitFor();assert.deepEqual(await first.locator('.task-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.task)),ids);await page.evaluate(()=>window.__failMove=false);
   await page.locator('[data-action=settings]').click();await page.locator('#list-settings>summary').click();await page.locator('#swipe-defer').uncheck();await page.getByRole('button',{name:'Done',exact:true}).click();await swipe(page,row,110);assert(await row.isVisible());if(await page.locator('#edit-form').count())await page.locator('#edit-form .cancel-editor').click();
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));layouts++;if(design===1&&palette==='night'&&width===390)await page.screenshot({path:'/private/tmp/lists-planning-phone.png',fullPage:true});}
   assert.deepEqual(errors,[]);await context.close();console.log('Planning design '+design+' passed');
  }
  console.log(JSON.stringify({result:'PASS',designs:10,layouts,coverage:'Completion Undo, canceled/full swipes, defer Undo, defaults, dated groups, real pointer drag ordering and cross-day dates, persistence, Upcoming overlap, accessible moves, denied move rollback, swipe toggle, mobile/desktop. Test-only fixture; no production writes.'}));
 }catch(error){for(const context of browser.contexts())for(const page of context.pages()){console.error(await page.locator('body').innerText());await page.screenshot({path:'/private/tmp/lists-planning-failure.png'});}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
