const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),ui=require('./ui.cjs');
(async()=>{
 const BASE='http://127.0.0.1:5195/lists/',browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});await ui.mockBackend(page,BASE);
  await page.route('**/tests/fixtures/store.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(require.resolve('./fixtures/store.js'),'utf8').replace('async write(id,patch,expectedRev){',"async write(id,patch,expectedRev){if('sortOrder' in patch&&expectedRev)await new Promise(resolve=>setTimeout(resolve,450));")}));
  await page.goto(BASE+'');await page.locator('#workspace').waitFor();await page.waitForTimeout(500);
  const rows=page.locator('.day-tasks>.task-row'),id=await rows.first().getAttribute('data-task'),start=await rows.first().locator('.task-content').boundingBox(),target=await rows.nth(1).boundingBox();
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.waitForTimeout(270);await page.mouse.move(start.x+start.width/2,start.y+start.height/2+10,{steps:3});await page.waitForTimeout(100);await page.mouse.move(target.x+target.width/2,target.y+target.height-3,{steps:18});await page.waitForTimeout(200);await page.mouse.up();
  await page.waitForTimeout(30);
  const samples=await page.evaluate(async id=>{
   const values=[],end=performance.now()+750;
   while(performance.now()<end){const rows=[...document.querySelectorAll('.day-tasks>.task-row')],index=rows.findIndex(row=>row.dataset.task===id),row=rows[index];values.push({index,top:row?.getBoundingClientRect().top,animations:row?.getAnimations().map(a=>a.id)});await new Promise(requestAnimationFrame);}
   return values;
  },id);
  assert(samples.every(sample=>sample.index===samples[0].index&&sample.index!==0),'Drop must not revert to its original order while saving');
  assert(samples.every(sample=>!sample.animations.includes('lists-reorder')),'No second FLIP animation after drop');
  assert(Math.max(...samples.map(s=>s.top))-Math.min(...samples.map(s=>s.top))<3,'Dropped tile stays visually in place');
  assert.equal(await page.locator('#toast .toast-notice').count(),0);
  const task=page.locator('[data-task="'+id+'"]').first(),title=await task.locator('.task-name').innerText();await task.locator('[data-quick]').click();await page.locator('.punt-traveler').waitFor();assert.equal(await page.locator('.punt-traveler').textContent(),title);assert((await page.locator('.punt-traveler').boundingBox()).width>150);assert.equal(await page.locator('.punt-traveler').evaluate(node=>node.getAnimations()[0].effect.getTiming().duration),1000);await page.locator('.punt-traveler').waitFor({state:'detached'});
  console.log('PASS: animated drag drop stays in place through a delayed save, with no second FLIP or snap back. Fixture only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
