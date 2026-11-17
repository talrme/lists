const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(10000);await ui.mockBackend(page,BASE);await page.goto(BASE+'staging/01/');await page.locator('#workspace').waitFor();
  const cdp=await context.newCDPSession(page),touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
  await ui.add(page,'Touch swipe');let row=page.locator('.task-row').filter({hasText:'Touch swipe'}),box=await row.locator('.task-content').boundingBox(),x=box.x+box.width-10,y=box.y+box.height/2;
  await touch('touchStart',x,y);for(let i=1;i<=8;i++){await touch('touchMove',x-i*14,y);await page.waitForTimeout(15);}assert(await row.evaluate(node=>node.classList.contains('swipe-ready')));assert((await row.evaluate(node=>getComputedStyle(node,':before').content)).includes('Defer'));await page.screenshot({path:'/private/tmp/lists-touch-swipe.png'});await touch('touchEnd');await row.waitFor({state:'detached'});await page.locator('.toast-undo').click();await row.waitFor();
  await page.locator('[data-action=settings]').click();await page.locator('#days-shown').fill('2');await page.getByRole('button',{name:'Done',exact:true}).click();
  box=await row.locator('.drag-handle').boundingBox();const target=await page.locator('.day-tasks').nth(1).boundingBox();x=box.x+box.width/2;y=box.y+box.height/2;
  await touch('touchStart',x,y);await touch('touchMove',x,y+9);await page.waitForTimeout(80);for(let i=1;i<=16;i++){await touch('touchMove',x+(target.x+target.width/2-x)*i/16,y+(target.y+target.height/2-y)*i/16);await page.waitForTimeout(15);}await touch('touchEnd');await page.locator('.day-tasks').nth(1).locator('.task-row').filter({hasText:'Touch swipe'}).waitFor();
  for(let i=0;i<10;i++)await ui.add(page,'Scroll test '+i);await page.evaluate(()=>scrollTo(0,0));
  const first=page.locator('.task-row').first();box=await first.locator('.task-content').boundingBox();x=box.x+50;y=box.y+box.height/2;const ids=await page.locator('.task-row').evaluateAll(rows=>rows.map(row=>row.dataset.task));
  await touch('touchStart',x,y);for(let i=1;i<=8;i++){await touch('touchMove',x,y-i*20);await page.waitForTimeout(20);}await touch('touchEnd');await page.waitForTimeout(200);
  assert(await page.evaluate(()=>scrollY>0),'Vertical touch should scroll the page');assert.deepEqual(await page.locator('.task-row').evaluateAll(rows=>rows.map(row=>row.dataset.task)),ids);assert(!await page.locator('#edit-form').count());
  console.log(JSON.stringify({result:'PASS',coverage:'Chrome mobile emulation with trusted CDP touch events: reveal Defer during swipe, release to defer, Undo, grip drag to empty tomorrow, normal vertical scrolling without rearranging or opening editor. Not a physical phone test.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
