const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);await page.clock.setFixedTime(new Date('2026-11-25T20:00:00Z'));
  await page.addInitScript(()=>{
   if(localStorage.getItem('column-test-ready'))return;localStorage.setItem('column-test-ready','true');
   const make=(id,dueDate,extra={})=>({id,title:id,category:'todo',ownerUid:'tal',visibility:'private',completed:false,waiting:false,dueDate,followUp:null,sortOrder:1024,createdAt:1,rev:1,...extra});
   localStorage.setItem('lists-test-metadata-tal',JSON.stringify({settings:{showSomeday:true},tags:[]}));localStorage.setItem('lists-sandbox-v1',JSON.stringify({picks:{'2026-11-25_tal':'daily'},tasks:[make('today','2026-11-25'),make('week','2026-11-27'),make('daily',null),make('later-task',null),make('someday-task',null,{someday:true})]}));
  });
  await page.goto(BASE);await page.locator('[data-toggle-column=someday]').waitFor();const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks);
  const lane=id=>page.locator('.board-lane[data-lane='+id+']'),toggle=id=>page.locator('[data-toggle-column='+id+']');
  const wide=(await lane('later').boundingBox()).width;
  await toggle('later').click();await page.waitForTimeout(120);const mid=(await lane('later').boundingBox()).width;await page.waitForTimeout(400);const narrow=(await lane('later').boundingBox()).width;
  assert(mid>narrow+1&&mid<wide-1,'Column width animates through intermediate sizes');assert(narrow<=49);assert(!await lane('later').locator('.day-tasks').isVisible());assert.equal(await toggle('later').getAttribute('aria-label'),'Show Later');assert(await toggle('later').isVisible());
  await toggle('someday').click();await page.waitForTimeout(450);assert(!await lane('someday').locator('.day-tasks').isVisible());assert(await page.locator('[data-task=daily]').isVisible(),'Daily suggestion stays in Today');
  await page.locator('[data-days=more]').click();await page.waitForTimeout(600);assert.equal(await page.locator('.board-merged').count(),1);
  for(const width of [1100,1280,1440,1920])for(const style of [1,7,4,8,9])for(const palette of ['original','garden','cherry','night']){await page.setViewportSize({width,height:1000});await page.evaluate(({style,palette})=>{document.body.dataset.design=style;document.documentElement.dataset.palette=palette;},{style,palette});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{document.body.dataset.design='1';document.documentElement.dataset.palette='garden';});await page.screenshot({path:'/private/tmp/lists-collapsed-columns.png'});
  await page.reload();await toggle('later').waitFor();assert.equal(await toggle('later').getAttribute('aria-expanded'),'false');assert.equal(await toggle('someday').getAttribute('aria-expanded'),'false');
  await page.locator('#desktop-task-search').fill('later-task');await page.locator('[data-reveal-task=later-task]').click();await page.locator('[data-task=later-task][data-search-highlight]').waitFor();assert.equal(await toggle('later').getAttribute('aria-expanded'),'true');assert.equal(await toggle('someday').getAttribute('aria-expanded'),'false');
  await page.locator('#composer [data-view=someday]').click();assert.equal(await toggle('someday').getAttribute('aria-expanded'),'true');
  await toggle('someday').press('Enter');await page.waitForTimeout(450);assert.equal(await toggle('someday').getAttribute('aria-expanded'),'false');assert(await toggle('someday').evaluate(node=>node===document.activeElement));
  await page.emulateMedia({reducedMotion:'reduce'});await toggle('later').click();assert.equal(await page.locator('#task-list').evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
  await page.setViewportSize({width:390,height:844});await page.locator('#composer [data-view=later]').click();assert(await page.locator('[data-task=later-task]').isVisible());assert.equal(await page.locator('[data-toggle-column]').count(),0,'No phone collapse controls');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks),before,'Column visibility never edits tasks');
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.__testSelectUser('sophie'));await page.locator('#workspace').waitFor();assert.equal(await toggle('later').getAttribute('aria-expanded'),'true','Device layout is scoped to account');
  assert.deepEqual(errors,[]);console.log('PASS: animated collapse/restore, independent Later/Someday, merged layout, style/palette/width checks, persistence, search and timing reveal, keyboard focus, reduced motion, phone fallback, unchanged tasks and account isolation. Synthetic data only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
