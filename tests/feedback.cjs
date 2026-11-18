const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let layouts=0;
 try{
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);await page.goto(new URL(``,BASE).href);await page.locator('#workspace').waitFor();
   assert.equal(await page.locator('.drag-handle').count(),0);assert(await page.locator('.defer-task .lucide-corner-up-right').count()>0);
   const row=title=>page.locator('.task-row').filter({hasText:title}),notice=title=>page.locator('.task-notice').filter({hasText:title});
   for(let i=0;i<6;i++)await ui.add(page,'Notice task '+i);
   while(await page.locator('.notice-close').count())await page.locator('.notice-close').first().click();
   await row('Notice task 0').locator('[data-complete]').click();await row('Notice task 1').locator('[data-quick]').click();await row('Notice task 2').locator('[data-complete]').click();
   assert.equal(await page.locator('.toast-undo').count(),3);assert((await notice('Notice task 0').innerText()).includes('Task completed'));assert((await notice('Notice task 1').innerText()).includes('Punted to ~ Week'));
   await notice('Notice task 0').locator('.toast-undo').click();await row('Notice task 0').waitFor();assert.equal(await row('Notice task 1').count(),0);assert.equal(await row('Notice task 2').count(),0);
   await notice('Notice task 1').locator('.notice-close').click();assert.equal(await row('Notice task 1').count(),0,'Dismiss is not Undo');await notice('Notice task 2').locator('.toast-undo').click();await row('Notice task 2').waitFor();
   while(await page.locator('.notice-close').count())await page.locator('.notice-close').first().click();
   for(const i of [0,2,3,4,5])await row('Notice task '+i).locator('[data-complete]').click();assert.equal(await page.locator('.task-notice').count(),4);assert.equal(await notice('Notice task 0').count(),0,'Only four most recent notices are retained');
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){await page.setViewportSize({width,height:844});await page.evaluate(palette=>document.documentElement.dataset.palette=palette,palette);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await page.locator('#toast').evaluate(node=>node.getBoundingClientRect().bottom<document.querySelector('.bottom-nav').getBoundingClientRect().top));layouts++;if(design===1&&width===390&&palette==='night')await page.screenshot({path:'/private/tmp/lists-notices-phone.png'});}
   if(design===1){
    const second=await context.newPage();await ui.mockBackend(second,BASE);await second.goto(new URL('',BASE).href);await second.locator('#workspace').waitFor();await ui.scheduleView(second,'done');await second.locator('.task-row').filter({hasText:'Notice task 2'}).locator('[data-edit]').click();await second.locator('#edit-form [name=description]').fill('Updated from another device');await second.locator('#edit-form [type=submit]').last().click();
    await notice('Notice task 2').locator('.toast-undo').click();await page.getByText('This task changed. Reopen it and try again.',{exact:true}).waitFor();assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title==='Notice task 2').completed),'Stale Undo must not overwrite a later edit');await second.close();
    await page.setViewportSize({width:390,height:844});await page.locator('#new-title').focus();await page.mouse.move(1,1);await page.waitForTimeout(6500);assert.equal(await page.locator('.task-notice').count(),0,'Notices expire independently');
    await ui.add(page,'Pause notice');await row('Pause notice').locator('[data-complete]').click();await notice('Pause notice').hover();await page.waitForTimeout(6200);assert.equal(await notice('Pause notice').count(),1,'Hover pauses expiry');await notice('Pause notice').locator('.notice-close').click();
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({result:'PASS',designs:10,layouts,coverage:'Independent completion/defer Undo, dismissal without undo, four-item limit, automatic expiry and hover pause, no drag dots, curved defer icon, phone/desktop palettes and bottom-nav clearance. Test-only backend; no production writes.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
