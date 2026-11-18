const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),errors=[];let workflows=0,layouts=0;
 try{
  for(let design=1;design<=10;design++){
   const number=String(design).padStart(2,'0'),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push({design,error:e.message}));
   await ui.mockBackend(page,BASE);await page.goto(new URL(``,BASE).href);await page.locator('#workspace').waitFor();
   assert.equal(await page.locator('.topbar,.page-heading,.scope-strip').count(),0);assert((await page.locator('#new-title').boundingBox()).y<30);
   assert((await page.locator('#mode-status').innerText()).includes('Test household'));assert((await page.locator('#mode-status').boundingBox()).y>(await page.locator('.utilities').boundingBox()).y);
   assert.equal(await page.getByText('Order a new bike helmet',{exact:true}).count(),0);assert.equal(await page.locator('[data-quick=waiting]').count(),0);
   const title='Test task '+number;await ui.add(page,title,{description:'**Bring these**\n- Apples\n- [ ] Bananas'});
   let row=page.locator('.task-row').filter({hasText:title});await row.locator('.task-excerpt').waitFor();await ui.editorMode(page,'inline');await row.locator('[data-edit]').click();
   assert(!await page.locator('#dialog').isVisible());await page.locator('#edit-form [name=title]').fill('Edited '+number);
   assert.equal(await page.locator('#edit-form [name=description]').inputValue(),'**Bring these**\n- Apples\n- [ ] Bananas');assert.equal(await page.locator('#edit-form [data-format]').count(),0);
   await page.locator('#edit-form .popout-editor').click();assert(await page.locator('#dialog').isVisible());assert.equal(await page.locator('#edit-form [name=title]').inputValue(),'Edited '+number);
   await page.locator('#edit-form [type=submit],#composer.modal-composer [type=submit]').last().click();await page.locator('#dialog').waitFor({state:'hidden'});
   row=page.locator('.task-row').filter({hasText:'Edited '+number});await row.locator('[data-complete]').click();await ui.scheduleView(page,'done');await row.locator('[data-complete]').click();await page.locator('[data-view=today]').click();
   await row.locator('[data-quick=week]').click();await page.locator('[data-view=upcoming]').click();if(!await row.isVisible())await page.locator('[data-view=later]').click();await row.waitFor();
   await page.locator('[data-view=today]').click();await ui.add(page,'Waiting '+number);row=page.locator('.task-row').filter({hasText:'Waiting '+number});await row.locator('[data-edit]').click();await page.locator('#edit-form [name=waiting]').check();await page.locator('#edit-form [data-followup="14"]').click();await page.locator('#edit-form [type=submit],#composer.modal-composer [type=submit]').last().click();await ui.scheduleView(page,'waiting');await row.waitFor();
   await page.locator('[data-view=today]').click();await ui.add(page,'Shared '+number,{person:'sophie'});await ui.scope(page,'shared','sophie');row=page.locator('.task-row').filter({hasText:'Shared '+number});await row.locator('.task-avatar[aria-label=Sophie]').waitFor();
   await row.locator('[data-edit]').click();await page.getByRole('button',{name:'Remove task',exact:true}).click();await page.locator('#confirmation [value=cancel]').click();assert(await page.locator('#edit-form').isVisible());await page.getByRole('button',{name:'Remove task',exact:true}).click();await page.locator('#confirmation [value=confirm]').click();await page.locator('#edit-form').waitFor({state:'detached'});
   await ui.scope(page,'mine');await ui.editorMode(page,'modal');await page.locator('.task-row [data-edit]').first().click();assert(await page.locator('#dialog').isVisible());await page.getByRole('button',{name:'Close',exact:true}).click();await page.reload();await page.locator('#workspace').waitFor();await page.locator('.task-row [data-edit]').first().click();assert(await page.locator('#dialog').isVisible());await page.getByRole('button',{name:'Close',exact:true}).click();
   for(const category of ['grocery','movies','other']){await page.locator(`[data-category=${category}]`).click();await page.locator('#new-title').fill('Category '+category);await page.getByRole('button',{name:'Add task',exact:true}).click();await page.getByText('Category '+category,{exact:true}).waitFor();}
   await page.locator('[data-category=todo]').click();await page.locator('[data-action=share]').click();assert.equal(await page.locator('#qr img').count(),1);await page.getByRole('button',{name:'Close',exact:true}).click();
   for(const width of [320,390,844,1280]){await page.setViewportSize({width,height:width===844?390:844});for(const palette of ['original','garden','cherry','night']){
    await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${design}/${width}/${palette}`);layouts++;
    if([390,1280].includes(width)&&palette==='original')await page.screenshot({path:`/private/tmp/lists-design-${number}-${width}.png`,fullPage:true});
   }}
   await page.route('**/config.js*',route=>route.fulfill({contentType:'text/javascript',body:'export const config={firebase:null,space:"home",environment:"staging",timeZone:"America/Los_Angeles",liveUrl:"https://talrme.github.io/lists/"};'}));await page.goto(new URL(`?mode=live`,BASE).href);await page.getByText('Google sign-in is not connected yet.',{exact:true}).waitFor();assert(!await page.locator('#workspace').isVisible());
   workflows++;await context.close();console.log('Checked compact design '+number);
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',workflows,layouts,testing:'Test-only backend interception; public staging always requires Google sign-in',coverage:'Compact top composer, formatted descriptions, inline/modal draft transfer, save, completion, defer, waiting details, sharing/avatar filtering, delete confirmation, per-list editor persistence, four categories, 160 responsive/palette combinations, fail-closed unconfigured live mode'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
