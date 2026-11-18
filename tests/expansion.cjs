const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(let design=1;design<=10;design++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);await ui.mockBackend(page,BASE);
  await page.route('**/tests/fixtures/store.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(require.resolve('./fixtures/store.js'),'utf8').replace('async write(id,patch,expectedRev){',"async write(id,patch,expectedRev){if(window.__failWrite)throw Error('Test save failed');if(window.__delayWrite)await new Promise(resolve=>setTimeout(resolve,400));")}));
  await page.goto(BASE);await page.locator('#workspace').waitFor();await ui.editorMode(page,'inline');
  const dentist=page.locator('.task-row').filter({hasText:'Book the dentist'}),photos=page.locator('.task-row').filter({hasText:'Send the family photos'});
  await dentist.locator('[data-edit]').click();await ui.options(page);assert.equal(await page.locator('#edit-form').count(),0);
  await page.locator('#new-title').fill('Preserved');await page.locator('#new-description').fill('Draft notes');await page.locator('#composer .options-toggle').click();assert.equal(await page.locator('#new-title').inputValue(),'Preserved');
  await dentist.locator('[data-edit]').click();assert.equal(await page.locator('#new-description').inputValue(),'Draft notes');await photos.locator('[data-edit]').click();assert.equal(await page.locator('#edit-form').count(),1);
  await page.locator('#edit-form [name=description]').fill('Do not discard');await ui.options(page);await page.locator('#confirmation [value=cancel]').click();assert.equal(await page.locator('#edit-form [name=description]').inputValue(),'Do not discard');
  await page.locator('#edit-form .cancel-editor').last().click();await ui.options(page);await page.locator('#composer .cancel-new-task').last().click();assert.equal(await page.locator('#new-title').inputValue(),'');
  await ui.options(page);await page.locator('#new-title').fill('Save safely');await page.evaluate(()=>window.__failWrite=true);await page.locator('#composer .modal-footer.composer-actions [type=submit]').click();await page.getByText('Test save failed',{exact:true}).waitFor();assert.equal(await page.locator('#new-title').inputValue(),'Save safely');
  await page.evaluate(()=>{window.__failWrite=false;window.__delayWrite=true;});await page.locator('#composer .modal-footer.composer-actions [type=submit]').click();assert(await page.locator('#composer .cancel-new-task').last().isDisabled());await page.getByText('Save safely',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.filter(t=>t.title==='Save safely').length),1);
  await page.evaluate(()=>window.__delayWrite=false);await ui.editorMode(page,'modal');await ui.options(page);await page.locator('#new-title').fill('Modal draft');await page.mouse.click(2,2);await page.locator('#dialog').waitFor({state:'hidden'});assert.equal(await page.locator('#new-title').inputValue(),'Modal draft');
  await context.close();
 }console.log('PASS: ten designs; optional inline exclusivity, dirty edit protection, preserved composer drafts, explicit Cancel, failed/delayed saves and modal backdrop dismissal. Test fixtures only.');}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
