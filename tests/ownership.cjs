const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});let layouts=0;
 try{
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);
   await page.goto(new URL(`staging/${String(design).padStart(2,'0')}/`,BASE).href);await page.locator('#workspace').waitFor();await ui.options(page);
   const form=page.locator('#composer'),owner=form.locator('.ownership-field');
   assert(await owner.isVisible());assert.equal(await owner.getAttribute('data-private'),'true');assert.equal(await form.locator('[data-assignee][aria-pressed=true]').count(),0);assert.equal(await form.locator('.sharing-line>span').textContent(),'Task list');assert.equal(await owner.locator(':scope>span').textContent(),'Task owner');
   await form.locator('[data-assignee=sophie]').click();assert.equal(await form.locator('[name=person]').inputValue(),'sophie');assert.equal(await form.locator('[data-sharing=shared]').getAttribute('aria-pressed'),'true');assert.equal(await owner.getAttribute('data-private'),'false');
   await form.locator('[data-sharing=shared]').click();assert.equal(await form.locator('[name=person]').inputValue(),'sophie','Repeated Shared click keeps selected owner');
   await form.locator('[data-sharing=private]').click();assert(await owner.isVisible());await form.locator('[data-sharing=shared]').click();assert.equal(await form.locator('[name=person]').inputValue(),'tal','Sharing a private task defaults to current user');
   await form.locator('[data-sharing=private]').click();await form.locator('[data-assignee=shared]').click();assert.equal(await form.locator('[name=person]').inputValue(),'shared');assert.equal(await form.locator('[data-sharing=shared]').getAttribute('aria-pressed'),'true');
   await form.locator('[data-sharing=private]').click();
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
    await page.setViewportSize({width,height:844});await page.evaluate(value=>document.documentElement.dataset.palette=value,palette);
    const label=await form.locator('.sharing-line>span').boundingBox(),pill=await form.locator('.sharing-track').boundingBox();assert(pill.y>=label.y+label.height);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));layouts++;
    if(design===1&&[390,1280].includes(width)&&['original','night'].includes(palette)){await page.waitForTimeout(100);await page.screenshot({path:`/private/tmp/lists-owner-${width}-${palette}.png`,animations:'disabled',fullPage:true});}
   }
   await page.setViewportSize({width:390,height:844});await form.locator('[data-assignee=sophie]').click();await form.locator('[name=title]').fill('Owner shortcut '+design);await form.locator('.composer-actions [type=submit]').click();await ui.scope(page,'shared','sophie');
   const row=page.locator('.task-row').filter({hasText:'Owner shortcut '+design});await row.locator('.task-avatar[aria-label=Sophie]').waitFor();await row.locator('[data-edit]').click();
   await page.locator('#edit-form [data-sharing=private]').click();assert.equal(await page.locator('#edit-form .ownership-field').getAttribute('data-private'),'true');assert(await page.locator('#edit-form [data-assignee=sophie]').isVisible());await page.locator('#edit-form [data-assignee=tal]').click();assert.equal(await page.locator('#edit-form [data-sharing=shared]').getAttribute('aria-pressed'),'true');await page.locator('#edit-form [type=submit]').click();
   await ui.scope(page,'mine');await row.locator('.task-avatar[aria-label=Tal]').waitFor();
   await page.evaluate(()=>window.__testSelectUser('sophie'));await page.locator('#workspace').waitFor();await ui.options(page);await form.locator('[data-sharing=shared]').click();assert.equal(await form.locator('[name=person]').inputValue(),'sophie');
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({result:'PASS',designs:10,layouts,coverage:'Visible muted private owners; Task list/Task owner labels; stacked pill; name and Unassigned shortcuts auto-share; current-user default for both accounts; preserve selected owner; saved assignment; edit reassignment; mobile/desktop/palettes. Fixture backend only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
