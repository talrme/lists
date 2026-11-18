const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-16T20:00:00Z'));await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();await ui.quickActions(page,true);
  await page.evaluate(()=>Math.random=()=>0);await ui.add(page,'Created in Week today',{when:'week'});const row=page.locator('.task-row').filter({hasText:'Created in Week today'});assert.equal(await row.count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.title==='Created in Week today').dueDate),'2026-11-16');
  await ui.scheduleView(page,'today');await row.waitFor();await page.evaluate(()=>Math.random=()=>.999);await row.locator('[data-quick]').click();await row.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.title==='Created in Week today').dueDate),'2026-11-23');
  await ui.scheduleView(page,'upcoming');await row.waitFor();await ui.scheduleView(page,'later');assert.equal(await row.count(),0);await ui.scheduleView(page,'upcoming');await row.waitFor();
  await row.locator('[data-quick]').click();await row.waitFor({state:'detached'});await ui.scheduleView(page,'today');await row.waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.title==='Created in Week today').dueDate),'2026-11-16');
  await page.locator('.toast-undo').last().click();await row.waitFor({state:'detached'});await ui.scheduleView(page,'upcoming');await row.waitFor();
  await page.screenshot({path:'/private/tmp/lists-week-punt.png'});assert.deepEqual(errors,[]);console.log('PASS: Week creation may choose today and appears only in Today; latest possible punt chooses fifth future weekday, appears in Week not Later; promote and Undo work. Synthetic tasks only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
