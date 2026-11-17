const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let layouts=0;
 try{
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);
   await page.goto(new URL(`staging/${String(design).padStart(2,'0')}/`,BASE).href);await page.locator('#workspace').waitFor();
   assert.equal(await page.locator('.view-tabs').count(),0);
   assert.deepEqual(await page.locator('#composer [data-timing]').allTextContents(),['ASAP','~ Week','Later']);
   await page.locator('.suggestion .task-meta').waitFor();assert.equal(await page.locator('.suggestion').count(),1);assert.equal(await page.locator('.suggestion .task-meta').textContent(),'From Later');
   const pick=await page.locator('.suggestion').getAttribute('data-task');
   await page.locator('[data-view=later]').click();assert.equal(await page.locator('#new-when').inputValue(),'later');assert(await page.locator(`[data-task="${pick}"]`).isVisible());
   await page.locator('#new-title').fill('Later from combined row');await page.getByRole('button',{name:'Add task',exact:true}).click();await page.getByText('Later from combined row',{exact:true}).waitFor();
   assert.equal(await page.locator('.task-row .task-name').first().textContent(),'Later from combined row');assert.equal(await page.locator('#new-when').inputValue(),'later');assert.equal(await page.locator('[data-view=later]').getAttribute('aria-pressed'),'true');
   await page.locator('[data-view=upcoming]').click();assert.equal(await page.locator('#new-when').inputValue(),'week');
   await page.locator('[data-view=today]').click();assert.equal(await page.locator('#new-when').inputValue(),'asap');assert.equal(await page.locator('.suggestion').getAttribute('data-task'),pick);
   await page.locator('.task-row [data-edit]').first().click();await page.locator('#edit-form [name=title]').fill('Keep unsaved edit');
   await page.locator('#composer [data-view=later]').click();await page.locator('#confirmation [value=cancel]').click();assert.equal(await page.locator('#new-when').inputValue(),'asap');assert.equal(await page.locator('[data-view=today]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#edit-form [name=title]').inputValue(),'Keep unsaved edit');await page.locator('#edit-form .cancel-editor').click();
   await ui.scheduleView(page,'waiting');assert.equal(await page.locator('#view-title').textContent(),'Waiting for a response');assert.equal(await page.locator('#composer [aria-current]').count(),0);
   await page.locator('[data-view=today]').click();await ui.scheduleView(page,'done');assert.equal(await page.locator('#view-title').textContent(),'Completed');await page.locator('[data-view=today]').click();
   await ui.options(page);await page.locator('#composer [name=date]').fill('2035-12-31');await page.locator('#composer [name=date]').dispatchEvent('change');assert.equal(await page.locator('[data-view=upcoming]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#new-when').inputValue(),'date');
   await page.locator('#composer [name=waiting]').check();assert.equal(await page.locator('#view-title').textContent(),'Waiting for a response');await page.locator('#composer [data-sharing=shared]').click();assert.equal(await page.locator('#composer [data-timing][aria-pressed=true]').count(),0);
   await page.locator('#composer .cancel-new-task').click();await page.locator('[data-view=today]').click();
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
    await page.setViewportSize({width,height:844});await page.evaluate(value=>document.documentElement.dataset.palette=value,palette);
    const arrow=await page.locator('#composer .options-toggle').boundingBox(),tabs=await page.locator('#composer .timing-track').boundingBox();assert(arrow.x+arrow.width<=tabs.x);assert(tabs.x+tabs.width<=width);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));layouts++;
    if(design===1&&[390,1280].includes(width)&&['original','night'].includes(palette))await page.screenshot({path:`/private/tmp/lists-combined-${width}-${palette}.png`,fullPage:true});
   }
   await page.reload();await page.locator('#workspace').waitFor();assert.equal(await page.locator('.suggestion').getAttribute('data-task'),pick);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({result:'PASS',designs:10,layouts,coverage:'Single shared scheduling/view row, left options arrow, new-task destination and retained selection, From Later daily pick stable through browsing/reload, dirty-edit cancellation, secondary Waiting/Completed, mobile/desktop/palettes. Fixture backend only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
