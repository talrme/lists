const {chromium}=require('playwright'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
async function level(page,value){await page.locator('#animation-level').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function settings(page){await page.locator('[data-action=settings]').click();await page.locator('#animation-settings>summary').click();}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});let layouts=0;
 try{
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage(),errors=[];
   page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    window.__bursts=0;window.__flights=0;window.__effects=[];
    const original=Element.prototype.animate;Element.prototype.animate=function(...args){window.__effects.push(this.className);return original.apply(this,args);};
    new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.classList?.contains('motion-confetti'))window.__bursts++;if(node.classList?.contains('motion-traveler'))window.__flights++;}))).observe(document,{childList:true,subtree:true});
   });
   await ui.mockBackend(page,BASE);
   await page.route('**/tests/fixtures/store.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(require.resolve('./fixtures/store.js'),'utf8').replace('async write(id,patch,expectedRev){',"async write(id,patch,expectedRev){ if(window.__failWrite)throw new Error('Test save failed'); if(window.__delayWrite)await new Promise(resolve=>setTimeout(resolve,500));")}));
   await page.goto(new URL(`staging/${String(design).padStart(2,'0')}/`,BASE).href);await page.locator('#workspace').waitFor();
   await settings(page);await level(page,3);assert.equal(await page.locator('#animation-level-name').innerText(),'All out');
   await page.locator('.custom-effects>summary').click();assert.equal(await page.locator('[data-effect]:checked').count(),8);
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
    await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);
    assert(await page.locator('#dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));layouts++;
    if(design===1&&width===390&&palette==='night')await page.screenshot({path:'/private/tmp/lists-animations-settings.png'});
   }
   await page.setViewportSize({width:390,height:844});await page.locator('#preview-animations').click();await page.waitForFunction(()=>window.__bursts===1);assert(await page.locator('#dialog').isVisible());await page.waitForFunction(()=>!document.querySelector('.motion-confetti'));await page.evaluate(()=>window.__bursts=0);await page.getByRole('button',{name:'Done',exact:true}).click();
   await ui.add(page,'Motion task '+design);const row=page.locator('.task-row').filter({hasText:'Motion task '+design});
   assert(await page.evaluate(async()=>{for(let i=0;i<20;i++){await new Promise(requestAnimationFrame);if(document.documentElement.scrollWidth>innerWidth+1)return false;}return true;}),'Task bounce must not create horizontal scrolling');
   assert((await page.evaluate(()=>window.__effects)).some(name=>String(name).includes('task-row')));
   await page.evaluate(()=>{window.__failWrite=true;});await row.locator('[data-complete]').click();await page.getByText('Test save failed',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__bursts),0);
   await page.evaluate(()=>{window.__failWrite=false;window.__delayWrite=true;});await row.locator('[data-complete]').click();assert.equal(await page.evaluate(()=>window.__bursts),0);
   await page.waitForFunction(()=>window.__bursts===1&&window.__flights===1);assert.equal(await page.locator('.motion-confetti b').count(),64);
   if(design===1)await page.screenshot({path:'/private/tmp/lists-animations-confetti.png',timeout:5000});
   await page.waitForFunction(()=>!document.querySelector('.motion-confetti,.motion-traveler'));console.log('Completion cleanup '+design);
   await ui.scheduleView(page,'done');await row.locator('[data-complete]').click();await page.locator('[data-view=today]').click();await row.locator('[data-quick=week]').click();await page.waitForFunction(()=>window.__flights===2);
   await settings(page);await page.locator('.custom-effects>summary').click();await page.locator('[data-effect=confetti]').uncheck();assert.equal(await page.locator('#animation-level-name').innerText(),'Custom');
   await page.reload();await page.locator('#workspace').waitFor();await settings(page);assert.equal(await page.locator('#animation-level-name').innerText(),'Custom');assert(!await page.locator('[data-effect=confetti]').isChecked());
   await level(page,3);await page.getByRole('button',{name:'Done',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});
   await ui.add(page,'Reduced motion '+design);await page.locator('.task-row').filter({hasText:'Reduced motion '+design}).locator('[data-complete]').click();await page.waitForTimeout(650);
   assert.equal(await page.evaluate(()=>window.__bursts),0);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
   await page.emulateMedia({reducedMotion:'no-preference'});await settings(page);await level(page,0);await page.getByRole('button',{name:'Done',exact:true}).click();
   assert.equal(await page.locator('.motion-confetti,.motion-traveler').count(),0);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
   assert.deepEqual(errors,[]);await context.close();console.log('Animation design '+design+' passed');
  }
  console.log(JSON.stringify({result:'PASS',designs:10,layouts,coverage:'Presets/custom persistence; save acknowledgment/failure; confetti and flight cleanup; defer; reduced-motion and Off; mobile/desktop four palettes. Test-only backend, no production writes.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
