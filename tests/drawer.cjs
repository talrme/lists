const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});let layouts=0;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);await page.clock.install({time:new Date('2026-11-17T20:00:00Z')});await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();
  const menu=page.locator('#navigation-drawer'),open=()=>page.locator('#open-menu').click();
  assert(await page.locator('#mode-status').isHidden());assert(await page.locator('#connection').isHidden());assert(await page.locator('#back-asap').isHidden());
  await open();await menu.waitFor();assert((await page.locator('#drawer-account').textContent()).includes('Tal'));assert(await menu.evaluate(node=>node.getAnimations().some(animation=>animation.effect.getKeyframes().some(frame=>String(frame.transform).includes('-100%')))));
  await menu.locator('[data-menu-days=extended]').click();await menu.waitFor({state:'hidden'});assert.equal(await page.locator('.day-heading:visible').count(),5);assert(await page.locator('#back-asap').isVisible());await page.locator('#back-asap').click();assert.equal(await page.locator('.day-heading:visible').count(),0);
  for(const view of ['waiting','done']){
   await open();await menu.locator('[data-menu-view="'+view+'"]').click();await menu.waitFor({state:'hidden'});assert(await page.locator('#back-asap').isVisible());await page.locator('#back-asap').click();assert.equal(await page.locator('#view-title').textContent(),'ASAP');assert(await page.locator('#back-asap').isHidden());
  }
  await open();await menu.locator('[data-menu-action=settings]').click();await page.locator('#list-settings>summary').click();await page.locator('#days-shown').waitFor();assert.equal(await page.locator('#dialog-title').textContent(),'Settings');assert.equal(await page.locator('#days-shown').inputValue(),'5');await page.getByRole('button',{name:'Done',exact:true}).click();
  for(const action of ['settings','share']){
   await open();await menu.locator('[data-menu-action="'+action+'"]').click();await page.locator('#dialog').waitFor();assert.equal(await page.locator('#dialog-title').textContent(),action==='settings'?'Settings':'Save / Share');await page.locator('#dialog [data-close]').first().click();
  }
  await open();await page.mouse.click(380,450);await menu.waitFor({state:'hidden'});assert.equal(await page.locator('#open-menu').getAttribute('aria-expanded'),'false');await open();await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});
  for(const style of [1,7,4,8,9]){
   await ui.menuAction(page,'settings');await page.locator('[data-style="'+style+'"]').click();await page.getByRole('button',{name:'Done',exact:true}).click();
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
    await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);await open();await page.waitForTimeout(280);const box=await menu.boundingBox();assert(Math.abs(box.x)<1);assert(box.width<=width);assert(await menu.evaluate(node=>node.scrollWidth<=node.clientWidth+1));layouts++;
    if(style===1&&width===390&&['original','night'].includes(palette))await page.screenshot({path:'/private/tmp/lists-drawer-'+palette+'.png'});
    await page.locator('#close-menu').click();await menu.waitFor({state:'hidden'});
   }
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',layouts,coverage:'Sliding drawer, click-off/Escape/X dismissal, current account, simplified shortcuts, extended-day setting, list-heading ASAP return, Settings/Share routes, five styles and phone/desktop palettes. Fixtures only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
