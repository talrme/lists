const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error);});await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('.board-lane').first().waitFor();
  const order=()=>page.locator('#task-list>.board-lane').evaluateAll(nodes=>nodes.map(node=>node.dataset.lane));
  assert.deepEqual(await order(),['today','upcoming','waiting','later']);const tasksBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks);
  await ui.menuAction(page,'settings');await page.locator('#desktop-column-order>summary').click();await page.locator('#show-someday').check();await page.getByRole('button',{name:'About Desktop column order',exact:true}).click();assert(await page.getByText(/merge at whichever/).isVisible());
  await page.getByRole('button',{name:'Move Waiting for a response up',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();assert.deepEqual(await order(),['today','waiting','upcoming','later','someday']);
  await page.locator('[data-days=more]').click();assert.deepEqual(await order(),['today','waiting','later','someday']);
  await ui.menuAction(page,'settings');await page.locator('#desktop-column-order>summary').click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Move Today down',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();assert.deepEqual(await order(),['waiting','today','later','someday']);
  assert.equal(await page.locator('.board-merged>.day-group').count()>1,true);await page.locator('[data-days=today]').click();assert.deepEqual(await order(),['waiting','upcoming','later','someday','today']);
  await page.reload();await page.locator('.board-lane').first().waitFor();assert.deepEqual(await order(),['waiting','upcoming','later','someday','today']);
  await page.locator('[data-toggle-column=later]').click();assert.equal(await page.locator('[data-toggle-column=later]').getAttribute('aria-expanded'),'false');await page.locator('[data-days=more]').click();assert.deepEqual(await order(),['waiting','today','later','someday']);assert.equal(await page.locator('[data-toggle-column=later]').getAttribute('aria-expanded'),'false');
  await ui.menuAction(page,'settings');await page.locator('#desktop-column-order>summary').click();await page.locator('#show-someday').uncheck();await page.getByRole('button',{name:'Done',exact:true}).click();assert.deepEqual(await order(),['waiting','today','later']);
  await ui.menuAction(page,'settings');await page.locator('#desktop-column-order>summary').click();await page.locator('#show-someday').check();await page.getByRole('button',{name:'Done',exact:true}).click();assert.deepEqual(await order(),['waiting','today','later','someday']);
  await page.screenshot({path:'/private/tmp/lists-custom-column-order.png'});
  await ui.menuAction(page,'settings');await page.locator('#desktop-column-order>summary').click();await page.getByRole('button',{name:'Reset column order',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();assert.deepEqual(await order(),['today','waiting','later','someday']);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks),tasksBefore,'View order never changes tasks');
  await page.setViewportSize({width:320,height:844});await ui.menuAction(page,'settings');await page.locator('#desktop-column-order>summary').click();assert(await page.locator('#desktop-column-order').evaluate(node=>node.scrollWidth<=node.clientWidth+1));await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('.board-lane').count(),0);
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.__testSelectUser('sophie'));await page.locator('.board-lane').first().waitFor();assert.deepEqual(await order(),['today','waiting','later']);assert.deepEqual(errors,[]);console.log('PASS: default/custom column order, all-column moves, merged placement, reload, collapse, optional Someday, reset, help, task preservation, 320px settings and account isolation. Synthetic only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
