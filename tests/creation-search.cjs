const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-18T20:00:00Z'));await ui.mockBackend(page,BASE);
  await page.addInitScript(()=>localStorage.getItem('lists-sandbox-v1')||localStorage.setItem('lists-sandbox-v1',JSON.stringify({tasks:[],picks:{'2026-11-18_tal':null}})));
  await page.goto(BASE);await page.locator('#workspace').waitFor();assert.equal(await page.locator('.compose-line [type=submit]').count(),0);assert.equal(await page.locator('.compose-line .leaf-options').count(),1);
  await page.locator('#new-title').fill('Dentist appointment');await page.locator('#composer [data-timing=later]').click();await page.getByText('Dentist appointment',{exact:true}).waitFor();assert.equal(await page.locator('#composer [data-view=today]').getAttribute('aria-current'),'');
  assert.equal(await page.locator('.suggestion .task-meta').innerText(),'From Later');
  const id=await page.locator('.suggestion').getAttribute('data-task');await page.reload();await page.locator('.suggestion').waitFor();assert.equal(await page.locator('.suggestion').getAttribute('data-task'),id);
  await page.locator('.suggestion [data-complete]').click();await page.locator('.suggestion').waitFor({state:'detached'});
  await page.locator('#new-title').fill('Another future task');await page.locator('#composer [data-timing=later]').click();await page.waitForTimeout(100);assert.equal(await page.locator('.suggestion').count(),0);
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')));assert.equal(state.picks['2026-11-18_tal'],id);assert(state.tasks.find(t=>t.id===id).completed);
  await page.locator('#new-title').fill('Next week task');await page.locator('#composer [data-timing=week]').click();await page.waitForFunction(()=>document.querySelector('#new-title').value==='');assert.equal(await page.locator('#composer [data-view=today]').getAttribute('aria-current'),'');
  await ui.scheduleView(page,'later');await page.locator('#new-title').fill('Enter keeps Later');await page.locator('#new-title').press('Enter');await page.getByText('Enter keeps Later',{exact:true}).waitFor();assert.equal(await page.locator('#composer [data-view=later]').getAttribute('aria-current'),'');
  await page.locator('#new-title').fill('Leaf preserved draft');await ui.options(page);assert.equal(await page.locator('#new-title').inputValue(),'Leaf preserved draft');assert(await page.evaluate(()=>document.activeElement.tagName!=='INPUT'));await page.locator('#composer .cancel-new-task').last().click();
  await ui.menuAction(page,'search');await page.locator('#task-search').fill('dentst');await page.getByRole('button',{name:/Dentist appointment/}).click();assert.equal(await page.locator('#edit-form [name=title]').inputValue(),'Dentist appointment');await page.locator('#edit-form .cancel-editor').last().click();
  await ui.menuAction(page,'settings');assert(await page.locator('#dialog-body>details').nth(1).evaluate(n=>n.id==='list-settings'&&n.open));await page.getByRole('button',{name:'About Swipe for quick actions',exact:true}).click();assert(await page.getByText(/Swipe right in Today to punt/).isVisible());await page.screenshot({path:'/private/tmp/lists-settings-help.png'});await page.getByRole('button',{name:'Done',exact:true}).click();
  await ui.scheduleView(page,'later');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('#composer [data-view=today]').getAttribute('aria-current'),'');
  await ui.scheduleView(page,'later');await page.locator('#new-title').fill('Do not lose this');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('#new-title').inputValue(),'Do not lose this');assert.equal(await page.locator('#composer [data-view=later]').getAttribute('aria-current'),'');await page.locator('#new-title').fill('');
  for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
   await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===390&&['original','night'].includes(palette))await page.screenshot({path:'/private/tmp/lists-leaf-'+palette+'.png'});
  }
  assert.deepEqual(errors,[]);console.log('PASS: empty-receipt recovery, one completed pick/day, Later/Week immediate add without navigation, Enter, leaf draft, typo search/edit, Settings help, resume-Today and draft safety. Synthetic data only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
