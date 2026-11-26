const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});let layouts=0;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);await page.clock.install({time:new Date('2026-11-17T20:00:00Z')});await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();await ui.quickActions(page,true);
  assert.equal(await page.locator('body').getAttribute('data-design'),'1');assert.equal(await page.locator('.utilities a').count(),0);
  assert.equal(await page.locator('.list-shortcuts,.utilities').count(),0);
  await page.locator('[data-days=more]').click();assert.equal(await page.locator('.day-heading:visible').count(),5);await page.locator('[data-days=today]').click();assert.equal(await page.locator('.day-heading:visible').count(),0);
  await ui.options(page);assert.equal(await page.locator('#composer .editor-top-actions').count(),1);assert.equal(await page.locator('#composer .modal-footer').count(),1);
  await page.locator('#new-title').fill('Save at either end');await page.locator('#new-description').fill('Useful details');await page.screenshot({path:'/private/tmp/lists-production-add-modal.png'});await page.locator('#composer .editor-top-actions [type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});
  let row=page.locator('.task-row:not([data-waiting-copy])').filter({hasText:'Save at either end'});await row.locator('[data-edit]').click();await page.screenshot({path:'/private/tmp/lists-production-edit-modal.png'});assert.equal(await page.locator('#edit-form .move-editor').count(),0);assert.equal(await page.locator('#edit-form .editor-top-actions').count(),1);assert.equal(await page.locator('#edit-form .modal-footer').count(),1);
  await page.locator('#edit-form [name=waiting]').check();await page.locator('#edit-form [data-followup="3"]').click();await page.locator('#edit-form .modal-footer [type=submit]').click();await page.locator('#edit-form').waitFor({state:'detached'});
  await page.locator('#composer [data-view=upcoming]').click();await row.waitFor();await row.locator('.waiting-badge svg[data-lucide=clock-3]').waitFor();await row.locator('[data-quick]').click();await page.locator('#composer [data-view=today]').click();await row.waitFor();assert((await row.locator('[data-quick]').getAttribute('title')).includes('Punt'));
  await page.locator('.toast-undo').last().click();await page.locator('#composer [data-view=upcoming]').click();await row.waitFor();
  await ui.menuAction(page,'share');assert.equal(await page.locator('#share-link').inputValue(),'https://talrme.github.io/lists/?household=home');await page.locator('#qr img').waitFor();await page.locator('[data-close]').first().click();
  const manifest=await page.evaluate(async()=>fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json()));assert(manifest.start_url.includes('/lists/?household=home'));assert(manifest.icons.every(icon=>icon.src.includes('/lists/assets/')));
  for(const style of [1,7,4,8,9]){
   await ui.menuAction(page,'settings');assert.deepEqual(await page.locator('[data-style]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.style))),[1,7,4,8,9]);await page.locator('[data-style="'+style+'"]').click();await page.getByRole('button',{name:'Done',exact:true}).click();
   for(const width of [320,390,844,1280])for(const palette of ['original','garden','cherry','night']){
    await page.setViewportSize({width,height:width===844?390:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);await page.waitForTimeout(20);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page fits '+style+'/'+width+'/'+palette);
    await row.locator('[data-edit]').click();assert(await page.locator('#dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1));await page.locator('#edit-form [name=description]').focus();await page.locator('#dialog').evaluate(node=>node.scrollTop=node.scrollHeight);const save=await page.locator('#edit-form .editor-top-actions [type=submit]').boundingBox();assert(save.y>=0&&save.y<200,'Top Save stays visible');await page.locator('#edit-form .cancel-editor').last().click();layouts++;
    if(width===390&&['original','night'].includes(palette))await page.screenshot({path:'/private/tmp/lists-production-'+style+'-'+palette+'.png',fullPage:true});
   }
  }
  await page.reload();await page.locator('#workspace').waitFor();await ui.quickActions(page,true);assert.equal(await page.locator('body').getAttribute('data-design'),'9');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',styles:5,layouts,coverage:'Production root, bottom controls, more days, matching add/edit actions, no move icon, waiting icon and Week-to-Today action/Undo, canonical sharing/install icons, all styles/palettes/mobile/desktop, persisted style. Fixtures only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
