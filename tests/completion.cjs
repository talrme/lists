const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let checks=0;
 try{
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{window.__motion=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.__motion.push({className:this.className,frames,duration:options.duration});return original.call(this,frames,options);};});
   await ui.mockBackend(page,BASE);
   await page.route('**/tests/fixtures/store.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(require.resolve('./fixtures/store.js'),'utf8').replace('async write(id,patch,expectedRev){',"async write(id,patch,expectedRev){if(window.__failWrite)throw Error('Test save failed');if(window.__delayWrite)await new Promise(resolve=>setTimeout(resolve,500));")}));
   await page.goto(new URL(`staging/${String(design).padStart(2,'0')}/`,BASE).href);await page.locator('#workspace').waitFor();
   for(const width of [390,1280]){
    await page.setViewportSize({width,height:844});await page.waitForTimeout(450);
    const row=page.locator('.task-row').filter({hasText:'Book the dentist'});
    await page.evaluate(()=>{window.__motion=[];window.__delayWrite=true;});await row.locator('[data-complete]').click();
    assert.equal(await page.locator('.completion-exit').count(),0,'No exit while the save is pending');
    await page.waitForFunction(()=>window.__motion.some(effect=>effect.className.includes('completion-exit')));
    assert(await page.evaluate(()=>window.__motion.some(effect=>effect.className.includes('task-row')&&effect.frames[0].transform.startsWith('translate('))),'Remaining tasks animate into their new positions');
    await page.waitForFunction(()=>!document.querySelector('.completion-exit'));
    assert.equal(await row.count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('.toast-undo').click();await row.waitFor();await page.waitForTimeout(450);checks++;
   }
   await page.evaluate(()=>{window.__motion=[];window.__failWrite=true;});await page.locator('.task-row').filter({hasText:'Book the dentist'}).locator('[data-complete]').click();
   await page.getByText('Test save failed',{exact:true}).waitFor();assert(!(await page.evaluate(()=>window.__motion.some(effect=>effect.className.includes('completion-exit')))));
   await page.evaluate(()=>{window.__failWrite=false;window.__delayWrite=false;});
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.__motion=[]);await page.locator('.task-row').filter({hasText:'Book the dentist'}).locator('[data-complete]').click();
   assert.equal(await page.locator('.completion-exit').count(),0);assert(!(await page.evaluate(()=>window.__motion.some(effect=>effect.className.includes('completion-exit')))));
   await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{window.__motion=[];const ids=[...document.querySelectorAll('.task-row')].slice(0,2).map(row=>row.dataset.task);for(const id of ids)document.querySelector(`[data-complete="${id}"]`).click();});
   await page.waitForFunction(()=>window.__motion.filter(effect=>effect.className.includes('completion-exit')).length===2);await page.waitForFunction(()=>!document.querySelector('.completion-exit'));
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({result:'PASS',animatedLayouts:checks,coverage:'Ten designs on phone/desktop; acknowledged exit and sibling slide-up, cleanup, Undo, delayed/failed saves, reduced motion and no overflow. Test-only backend; no production writes.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
