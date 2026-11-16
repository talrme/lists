const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),errors=[];let checks=0;
 try{
  for(let i=1;i<=10;i++){
   const page=await browser.newPage({viewport:{width:320,height:740},hasTouch:true,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(new URL(`staging/${String(i).padStart(2,'0')}/`,BASE).href);await page.locator('#workspace').waitFor();
   for(const palette of ['original','garden','cherry','night']){
    await page.locator('[data-action=settings]').click();await page.locator(`button[data-palette=${palette}]`).click();
    assert(await page.locator('#dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
    await page.locator('#dialog').screenshot({path:`/private/tmp/lists-settings-${i}-${palette}.png`});
    await page.mouse.click(2,2);await page.locator('#dialog').waitFor({state:'hidden'});
    await page.locator('.task-row [data-edit]').first().click();
    await page.locator('#edit-form [name=title]').fill('A long task with enough detail to wrap onto multiple lines on a small phone');
    assert(await page.locator('#dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
    await page.locator('#dialog').screenshot({path:`/private/tmp/lists-editor-${i}-${palette}.png`});
    await page.keyboard.press('Escape');await page.locator('#dialog').waitFor({state:'hidden'});checks++;
   }
   await page.locator('[data-action=settings]').click();await page.locator('summary').filter({hasText:'Quick actions'}).click();await page.locator('[data-preference=quickWaiting]').uncheck();await page.locator('[data-preference=quickWeek]').uncheck();await page.getByRole('button',{name:'Done',exact:true}).click();
   assert.equal(await page.locator('[data-quick=week]').count(),0);assert.equal(await page.locator('[data-quick=waiting]').count(),0);
   await page.locator('[data-action=settings]').click();await page.locator('summary').filter({hasText:'Account & privacy'}).click();await page.locator('#sandbox-person').selectOption('sophie');await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByText('Order a new bike helmet',{exact:true}).waitFor();assert.equal(await page.getByText('Book the dentist',{exact:true}).count(),0);
   await page.locator('[data-category=grocery]').click();const row=page.locator('.task-row').first(),title=await row.locator('.task-title').innerText();await row.locator('[data-complete]').click();await page.locator('[data-action=completed]').click();await page.getByText(title,{exact:true}).waitFor();await page.locator('.task-row').filter({hasText:title}).locator('[data-complete]').click();await page.locator('[data-action=completed]').click();await page.getByText(title,{exact:true}).waitFor();
   await page.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),first=await context.newPage(),second=await context.newPage();
  await first.goto(new URL('staging/01/',BASE).href);await first.locator('#workspace').waitFor();
  const selected=await first.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).picks);
  await second.goto(new URL('staging/08/',BASE).href);await second.locator('#workspace').waitFor();assert.deepEqual(await second.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).picks),selected,'Daily suggestion survives changing designs');
  await first.locator('#new-title').fill('Cross-tab check');await first.getByRole('button',{name:'Add task',exact:true}).click();await second.getByText('Cross-tab check',{exact:true}).waitFor();
  await second.reload();await second.getByText('Cross-tab check',{exact:true}).waitFor();assert.deepEqual(await second.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).picks),selected,'Daily suggestion survives reload');await context.close();
  const gallery=await browser.newPage({viewport:{width:390,height:844}});await gallery.goto(BASE);assert.equal(await gallery.locator('article').count(),10);assert(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await gallery.screenshot({path:'/private/tmp/lists-gallery-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',modalPaletteChecks:checks,coverage:'All designs at 320px; editor/settings; backdrop/Escape dismissal; local settings; private-person switching; completed non-todo items; stable daily picks across reload/designs; real same-origin storage-event propagation between tabs; gallery',limitations:'Local sandbox only; not authenticated cross-device Firestore testing'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
