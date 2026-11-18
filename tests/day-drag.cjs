const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),BASE='http://127.0.0.1:5195/lists/';
 try{
  for(const style of [1,9]){
   const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();await page.locator('[data-action=settings]').click();await page.locator('[data-style="'+style+'"]').click();await page.getByRole('button',{name:'Done',exact:true}).click();await ui.add(page,'Move between days');
   await page.locator('[data-action=views]').click();await page.locator('#days-shown').fill('3');await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForTimeout(500);
   const row=page.locator('.task-row').filter({hasText:'Move between days'}),start=await row.locator('.task-content').boundingBox(),target=await page.locator('.day-tasks').nth(1).boundingBox();
   const headers=()=>page.locator('.day-heading').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top+scrollY)),before=await headers();
   const x=start.x+start.width/2,y=start.y+start.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(190);await page.mouse.move(x,y+10,{steps:3});await page.waitForTimeout(90);
   for(let i=1;i<=16;i++){
    await page.mouse.move(x+(target.x+target.width/2-x)*i/16,y+(target.y+target.height/2-y)*i/16);await page.waitForTimeout(20);
    const after=await headers();assert(after.every((position,index)=>Math.abs(position-before[index])<1),'Every day header stays fixed while dragging');
   }
   await page.screenshot({path:'/private/tmp/lists-day-drag-'+style+'.png'});await page.mouse.up();await page.locator('.day-tasks').nth(1).locator('.task-row').filter({hasText:'Move between days'}).waitFor();
   assert(await page.locator('.day-tasks').evaluateAll(nodes=>nodes.every(node=>!node.style.height&&!node.style.minHeight&&!node.style.maxHeight)),'Temporary day sizing is removed after drop');
   await page.close();
  }
  console.log('PASS: all three day headers stay fixed throughout cross-day dragging, dates save, and temporary heights release after drop (Clear Day and Block Party, phone viewport). Fixture data only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
