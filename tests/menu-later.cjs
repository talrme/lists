const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-18T20:00:00Z'));await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();
  const drawer=page.locator('#navigation-drawer');await page.locator('#open-menu').click();
  assert.equal(await page.locator('[data-menu-audience][aria-pressed=true]').count(),2);
  assert(await page.locator('#drawer-task-filters').evaluate(n=>n.previousElementSibling.querySelector('[data-menu-action=share]')&&n.nextElementSibling.querySelector('[data-menu-action=guide]')));
  assert.equal(await page.locator('.drawer-filter-label').textContent(),'View tasks in');assert.equal(await page.locator('[data-menu-audience=private] [data-lucide=list-checks]').count(),1);
  assert.equal(await page.locator('[data-menu-audience=tal]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-menu-audience=sophie]').click();await page.locator('#close-menu').click();assert(await page.locator('#back-asap').isVisible());
  await page.locator('#back-asap').click();await page.locator('#open-menu').click();assert.equal(await page.locator('[data-menu-audience=sophie]').getAttribute('aria-pressed'),'false');await page.locator('#close-menu').click();assert(await page.locator('#back-asap').isHidden());
  for(const view of ['upcoming','later']){await ui.scheduleView(page,view);assert(await page.locator('#back-asap').isHidden());}
  await ui.options(page);const composer=page.locator('#composer');await composer.locator('[name=title]').fill('Flexible date example');
  await composer.locator('[data-later-date=month]').click();const chosen=await composer.locator('[name=date]').inputValue();assert(chosen>='2026-12-16'&&chosen<='2026-12-22');assert.equal(await composer.locator('[name=when]').inputValue(),'date');
  await composer.locator('.editor-top-actions [type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});
  const row=page.locator('.task-row').filter({hasText:'Flexible date example'});assert(await row.locator('.task-meta').isVisible());await row.locator('[data-edit]').click();
  assert(await page.evaluate(()=>!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)));assert.equal(await page.locator('#edit-form [name=date]').inputValue(),chosen);
  await page.locator('#edit-form .cancel-editor').last().click();
  await ui.extended(page,10);await ui.menuAction(page,'settings');await ui.section(page,'list-settings');await ui.days(page,3);await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('.day-heading:visible').count(),3);
  await ui.scheduleView(page,'later');assert(await page.locator('#back-asap').isHidden());await page.reload();await page.locator('#workspace').waitFor();assert.equal(await page.locator('#composer [data-view=today]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.day-heading:visible').count(),3);
  await page.evaluate(()=>window.__testSelectUser('sophie'));await page.locator('#workspace').waitFor();await page.locator('#open-menu').click();assert.equal(await page.locator('[data-menu-audience=sophie]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-menu-audience=tal]').getAttribute('aria-pressed'),'false');await page.locator('#close-menu').click();
  let layouts=0;
  for(const style of [1,7,4,8,9])for(const palette of ['original','garden','cherry','night'])for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:844});await page.evaluate(({style,palette})=>{document.body.dataset.design=style;document.documentElement.dataset.palette=palette;},{style,palette});await page.locator('#open-menu').click();
   assert(await drawer.evaluate(n=>n.scrollWidth<=n.clientWidth+1));const first=await page.locator('[data-menu-audience=private]').boundingBox(),last=await page.locator('[data-menu-audience=unassigned]').boundingBox();assert(Math.abs(first.y-last.y)<2);assert(last.x+last.width<width);
   if(style===1&&width===390&&['original','night'].includes(palette))await page.screenshot({path:'/private/tmp/lists-menu-later-'+palette+'.png'});
   await page.locator('#close-menu').click();layouts++;
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',layouts,coverage:'Drawer filters/defaults for two users, normal-view reset, no extra reset for Week/Later, flexible exact date save/reopen, edit without keyboard, live extended-day adjustment, Today reload with days retained. Synthetic fixtures; zero production writes.'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
