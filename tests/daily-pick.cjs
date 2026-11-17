const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();await ui.mockBackend(page,BASE);
  await page.clock.install({time:new Date('2026-11-17T07:59:00Z')});
  await page.goto(new URL('staging/01/',BASE).href);await page.locator('.suggestion').waitFor();
  const first=await page.locator('.suggestion').getAttribute('data-task');
  const receipt=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).picks);
  assert.equal((await receipt())['2026-11-16_tal'],first);
  await page.reload();await page.locator('.suggestion').waitFor();assert.equal(await page.locator('.suggestion').getAttribute('data-task'),first);
  await page.locator('.suggestion [data-complete]').click();await page.locator('.suggestion').waitFor({state:'detached'});
  await page.reload();await page.locator('#workspace').waitFor();assert.equal((await receipt())['2026-11-16_tal'],first);assert.equal(await page.locator('.suggestion').count(),0);
  await page.clock.setSystemTime(new Date('2026-11-17T08:01:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.locator('.suggestion').waitFor();const second=await page.locator('.suggestion').getAttribute('data-task');assert.notEqual(second,first);
  const saved=await receipt();assert.equal(saved['2026-11-16_tal'],first);assert.equal(saved['2026-11-17_tal'],second);
  const task=await page.evaluate(id=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.id===id),second);assert.equal(task.dueDate,null,'A daily projection must not permanently schedule a Later task');
  await context.close();console.log('PASS: saved daily pick survives refresh, completion does not redraw, Pacific midnight selects the next dated receipt, and task dueDate remains unchanged. Fixture backend only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
