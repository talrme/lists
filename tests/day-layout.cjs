const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const style of [1,9]){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});await page.clock.install({time:new Date('2026-11-17T20:00:00Z')});await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();
  await page.evaluate(()=>{
   const rows=[['today','2026-11-17'],['tomorrow1','2026-11-18'],['tomorrow2','2026-11-18'],['tomorrow3','2026-11-18'],['thursday','2026-11-19'],['saturday','2026-11-21'],['sunday','2026-11-22'],['monday','2026-11-23']];
   localStorage.setItem('lists-sandbox-v1',JSON.stringify({tasks:rows.map(([id,dueDate],i)=>({id,title:id,category:'todo',visibility:'private',ownerUid:'tal',assigneeUid:null,dueDate,waiting:false,followUp:null,completed:false,sortOrder:i*1024,createdAt:i,rev:1})),picks:{}}));
  });await page.reload();await page.locator('#workspace').waitFor();await ui.menuAction(page,'settings');await page.locator('[data-style="'+style+'"]').click();await page.getByRole('button',{name:'Done',exact:true}).click();
  assert.equal(await page.locator('.utilities,.list-shortcuts').count(),0);assert.equal(await page.locator('.day-controls button:visible').count(),1);assert.equal(await page.locator('[data-days=more]').innerText(),'Show 5 days');
  const label=await page.locator('#expand-days-label').boundingBox();assert(label.x<80);await page.locator('[data-days=more]').click();assert.equal(await page.locator('.day-controls button:visible').count(),1);assert(await page.locator('[data-days=today]').isVisible());
  const weekend=page.locator('.weekend-group');assert.equal(await weekend.count(),1);assert((await weekend.locator('.day-heading').innerText()).includes('Weekend'));assert.equal(await weekend.getAttribute('data-day'),'2026-11-21');assert.equal(await weekend.getAttribute('data-end'),'2026-11-22');assert.equal(await weekend.locator('.task-row').count(),2);assert.equal(await page.locator('[data-task=monday]').count(),0);
  // A full destination grows while the pointer is held, pushing the next heading down.
  const row=page.locator('[data-task=today]'),target=page.locator('[data-day="2026-11-18"].day-group .day-tasks'),next=page.locator('[data-day="2026-11-19"].day-group .day-heading');
  const before=await target.boundingBox(),nextTop=(await next.boundingBox()).y,start=await row.locator('.task-content').boundingBox(),x=start.x+100,y=start.y+start.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(190);await page.mouse.move(x,y+10,{steps:3});await page.waitForTimeout(90);await page.mouse.move(before.x+120,before.y+before.height-15,{steps:20});await page.waitForTimeout(350);
  assert((await target.boundingBox()).height>before.height+30,'Full destination must grow during drag');assert((await next.boundingBox()).y>nextTop+30,'Following heading moves down to make room');assert(await target.evaluate(n=>n.scrollHeight<=n.clientHeight+1),'No nested overflow/hidden task rows');
  await page.screenshot({path:'/private/tmp/lists-growing-day-drag-'+style+'.png'});await page.mouse.up();await target.locator('[data-task=today]').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.id==='today').dueDate),'2026-11-18');
  // Reordering inside Weekend keeps Sunday's actual date; moving into it uses Saturday.
  async function drag(source,destination){const a=await source.locator('.task-content').boundingBox(),b=await destination.boundingBox();await page.mouse.move(a.x+100,a.y+a.height/2);await page.mouse.down();await page.waitForTimeout(190);await page.mouse.move(a.x+100,a.y+a.height/2+10,{steps:3});await page.waitForTimeout(90);await page.mouse.move(b.x+100,b.y+8,{steps:20});await page.waitForTimeout(230);await page.mouse.up();await page.waitForTimeout(100);}
  await page.locator('[data-task=sunday]').scrollIntoViewIfNeeded();await drag(page.locator('[data-task=sunday]'),page.locator('[data-task=saturday]'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.id==='sunday').dueDate),'2026-11-22');
  await ui.move(page,page.locator('[data-task=sunday]'));await page.locator('#move-date').fill('2026-11-21');await page.locator('#move-date-save').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.id==='sunday').dueDate==='2026-11-21');
  await page.locator('[data-task=thursday]').scrollIntoViewIfNeeded();await drag(page.locator('[data-task=thursday]'),weekend.locator('.day-tasks'));await weekend.locator('[data-task=thursday]').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(t=>t.id==='thursday').dueDate),'2026-11-21');
  await page.locator('[data-days=today]').click();assert.equal(await page.locator('.day-heading:visible').count(),0);assert(await page.locator('[data-days=more]').isVisible());
  await page.close();
  }
  console.log('PASS: left-aligned single expand/collapse row, no footer shortcuts, complete weekend including Sunday, natural full-day growth during drag, following heading movement, weekend dates preserved on reorder, Saturday on entry. Synthetic fixtures only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
