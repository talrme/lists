const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let layouts=0;
 try{for(let design=1;design<=10;design++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
  await ui.mockBackend(page,BASE);await page.addInitScript(()=>localStorage.setItem('lists-preferences-v1',JSON.stringify({lists:{todo:{editor:'inline'}}})));await page.goto(BASE+``);await page.locator('#workspace').waitFor();
  await page.locator('#new-title').fill('Preserve my draft');await ui.options(page);await page.locator('#dialog #composer').waitFor();await page.locator('#new-description').fill('Details that must survive collapsing');
  await page.locator('#composer [name=waiting]').check();await page.locator('#composer [data-followup="90"]').click();
  assert.equal(await page.locator('#view-title').textContent(),'ASAP');
  await page.locator('#dialog [data-close]').click();await page.locator('#dialog').waitFor({state:'hidden'});assert.equal(await page.locator('#new-title').inputValue(),'Preserve my draft');
  await ui.options(page);assert.equal(await page.locator('#new-description').inputValue(),'Details that must survive collapsing');await page.keyboard.press('Escape');await page.locator('#dialog').waitFor({state:'hidden'});
  await ui.options(page);await page.locator('#composer .cancel-new-task').last().click();assert.equal(await page.locator('#new-title').inputValue(),'');
  await page.locator('#new-title').fill('Quick ASAP');await page.locator('#composer [data-timing=asap]').click();await page.getByText('Quick ASAP',{exact:true}).waitFor();assert.equal(await page.locator('#new-title').inputValue(),'');
  await page.locator('#new-title').fill('Quick week');await page.locator('#composer [data-timing=week]').click();await page.waitForFunction(()=>document.querySelector('#new-title').value==='');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.filter(t=>t.title==='Quick week').length),1);
  await page.locator('#new-title').fill('Keep Later as draft');await page.locator('#composer [data-timing=later]').click();assert.equal(await page.locator('#new-title').inputValue(),'Keep Later as draft');await ui.options(page);await page.locator('#composer [data-timing=asap]').click();assert.equal(await page.locator('#new-title').inputValue(),'Keep Later as draft');await page.locator('#composer .cancel-new-task').last().click();
  await ui.add(page,'Modal task',{description:'A useful short description, not a mysterious ellipsis'});let row=page.locator('.task-row').filter({hasText:'Modal task'});await row.locator('.task-excerpt').waitFor();assert.equal(await row.locator('.task-meta').count(),0);
  await row.locator('[data-edit]').click();await page.locator('#dialog #edit-form').waitFor();assert(await page.locator('#edit-form').evaluate(form=>form.firstElementChild.classList.contains('editor-top-actions')));
  await page.locator('#edit-form [name=waiting]').check();await page.locator('#edit-form [data-followup="90"]').click();await page.locator('#edit-form [type=submit]').last().click();await page.locator('#edit-form').waitFor({state:'detached'});
  await page.locator('#composer [data-view=later]').click();await row.waitFor();await row.locator('.waiting-badge').waitFor();await page.locator('.list-shortcuts [data-view=waiting]').click();await row.waitFor();
  await row.locator('[data-edit]').click();
  for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
   await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);await page.waitForTimeout(30);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),JSON.stringify(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,cls:n.className,width:n.getBoundingClientRect().width})).slice(0,10)}))));assert(await page.locator('#dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
   
   await page.locator('#edit-form [name=description]').focus();await page.locator('#dialog').evaluate(node=>node.scrollTop=200);
   const save=await page.locator('#edit-form .editor-top-actions [type=submit]').boundingBox(),dialog=await page.locator('#dialog').boundingBox();assert(save.y>=dialog.y&&save.y<dialog.y+200,'Save stays near top');layouts++;
   if(design===1&&[390,1280].includes(width)&&['original','night'].includes(palette))await page.screenshot({path:`/private/tmp/lists-modal-${width}-${palette}.png`});
  }
  await page.setViewportSize({width:390,height:420});await page.locator('#edit-form [name=description]').focus();await page.locator('#dialog').evaluate(node=>node.scrollTop=node.scrollHeight);const keyboardSave=await page.locator('#edit-form [type=submit]').last().boundingBox();assert(keyboardSave.y>=0&&keyboardSave.y+keyboardSave.height<420,'Save remains available in a keyboard-sized viewport');await page.setViewportSize({width:390,height:844});
  await page.locator('#edit-form .cancel-editor').last().click();await page.locator('[data-action=views]').click();await page.locator('#days-shown').fill('2');await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.locator('[data-action=settings]').click();assert.equal(await page.locator('.view-options').count(),0);assert.equal(await page.locator('#days-shown').count(),1);await page.getByRole('button',{name:'Done',exact:true}).click();
  assert.deepEqual(errors,[]);await context.close();console.log('Modal UX '+design+' passed');
 }console.log(JSON.stringify({result:'PASS',designs:10,layouts,coverage:'Draft-preserving arrow/Escape, explicit Cancel clears, modal default, sticky top actions, description excerpts, Waiting/date overlap, View/Settings separation. Fixture backend; emulated mobile.'}));}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
