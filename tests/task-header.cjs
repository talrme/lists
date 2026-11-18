const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});let layouts=0;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);await page.clock.setFixedTime(new Date('2026-11-17T20:00:00Z'));await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();
  await ui.options(page);const form=page.locator('#composer');
  assert(await form.locator('[name=title]').evaluate(node=>node===document.activeElement));assert(await page.locator('#dialog>.modal-header').isHidden());assert.equal(await form.locator('.task-name-label').textContent(),'Task name');assert.equal(await form.locator('.editor-top-actions button').count(),2);assert.equal(await form.locator('.editor-top-actions [data-lucide=x]').count(),1);
  await form.locator('[name=title]').fill('Keep exact later date');
  for(const [date,bucket] of [['2026-11-16','asap'],['2026-11-17','asap'],['2026-11-20','week'],['2026-11-25','week'],['2026-11-26','later'],['2027-03-01','later']]){
   await form.locator('[name=date]').fill(date);await form.locator('[name=date]').dispatchEvent('change');assert.equal(await form.locator('[data-timing][aria-pressed=true]').getAttribute('data-timing'),bucket);
   await form.locator('[data-timing="'+bucket+'"]').click();assert.equal(await form.locator('[name=date]').inputValue(),date,'Matching bucket preserves exact date');
  }
  await form.locator('.modal-footer [type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});await page.locator('#composer [data-view=later]').click();
  const row=page.locator('.task-row').filter({hasText:'Keep exact later date'});await row.locator('[data-edit]').click();const editor=page.locator('#edit-form');assert.equal(await editor.locator('[name=date]').inputValue(),'2027-03-01');assert.equal(await editor.locator('[data-timing][aria-pressed=true]').getAttribute('data-timing'),'later');
  assert(await editor.locator('[name=title]').evaluate(node=>node===document.activeElement));await editor.locator('[name=waiting]').check();
  for(const [days,bucket] of [['3','week'],['7','week'],['14','later'],['90','later']]){
   await editor.locator('[data-followup="'+days+'"]').click();assert.equal(await editor.locator('[data-timing][aria-pressed=true]').getAttribute('data-timing'),bucket);const date=await editor.locator('[name=followUp]').inputValue();await editor.locator('[data-timing="'+bucket+'"]').click();assert(await editor.locator('[name=waiting]').isChecked());assert.equal(await editor.locator('[name=followUp]').inputValue(),date);
  }
  await editor.locator('[name=followUp]').fill('2026-11-18');await editor.locator('[name=followUp]').dispatchEvent('change');assert.equal(await editor.locator('[data-timing=week]').getAttribute('aria-pressed'),'true');await editor.locator('.editor-top-actions [type=submit]').click();await editor.waitFor({state:'detached'});
  await page.locator('#composer [data-view=upcoming]').click();await row.waitFor();await row.locator('[data-edit]').click();assert(await editor.locator('[name=waiting]').isChecked());assert.equal(await editor.locator('[name=followUp]').inputValue(),'2026-11-18');await editor.locator('.cancel-editor').last().click();
  for(const style of [1,7,4,8,9]){
   await ui.menuAction(page,'settings');await page.locator('[data-style="'+style+'"]').click();await page.getByRole('button',{name:'Done',exact:true}).click();
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
    await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);await row.locator('[data-edit]').click();
    assert(await page.locator('#dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1));const name=await editor.locator('[name=title]').boundingBox(),actions=await editor.locator('.editor-top-actions').boundingBox();assert(actions.y<name.y&&actions.x+actions.width<=width);assert(await page.locator('#dialog>.modal-header').isHidden());await page.locator('#dialog').evaluate(node=>node.scrollTop=node.scrollHeight);assert((await editor.locator('.editor-top-actions').boundingBox()).y<170);layouts++;
    if(style===1&&width===390&&['original','night'].includes(palette))await page.screenshot({path:'/private/tmp/lists-task-header-'+palette+'.png'});await editor.locator('.cancel-editor').last().click();
   }
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',layouts,coverage:'Editable name-first modal, two top actions/no redundant X, focus and responsive sticky header; exact/manual dates and follow-ups highlight correct bucket and survive matching selection/save/reopen. Fixtures only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
