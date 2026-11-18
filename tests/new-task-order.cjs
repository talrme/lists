const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);
   await page.goto(new URL(``,BASE).href);await page.locator('#workspace').waitFor();
   const titles=()=>page.locator('.task-row .task-name').allTextContents();
   await ui.add(page,'Older addition');await ui.add(page,'Newest addition');
   assert.deepEqual((await titles()).slice(0,2),['Newest addition','Older addition']);
   await ui.move(page,page.locator('.task-row').filter({hasText:'Newest addition'}));await page.locator('[data-move-direction="1"]').click();
   const manual=await titles();await ui.add(page,'After manual reorder');assert.deepEqual(await titles(),['After manual reorder',...manual]);
   await ui.add(page,'Later addition',{when:'later'});await page.locator('[data-view=later]').click();assert.equal((await titles())[0],'Later addition');
   await page.reload();await page.locator('#workspace').waitFor();await page.locator('[data-view=later]').click();assert.equal((await titles())[0],'Later addition');
   for(const category of ['grocery','movies','other']){
    await page.locator(`[data-category=${category}]`).click();await ui.add(page,'First '+category);await ui.add(page,'Newest '+category);
    assert.deepEqual((await titles()).slice(0,2),['Newest '+category,'First '+category]);
   }
   for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   if(design===1)await page.screenshot({path:'/private/tmp/lists-new-task-first.png'});
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: new-first placement, preserved manual order, Later destination, all categories, reload, ten designs and mobile/desktop widths. Test fixture only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
