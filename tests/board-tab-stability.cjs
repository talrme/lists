const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
  await page.addInitScript(()=>{
   const make=(id,dueDate,extra={})=>({id,title:id,category:'todo',ownerUid:'tal',visibility:'private',completed:false,waiting:false,dueDate,followUp:null,sortOrder:1024,createdAt:1,rev:1,...extra});
   localStorage.setItem('lists-preferences-v1',JSON.stringify({extendedDays:10}));localStorage.setItem('lists-test-metadata-tal',JSON.stringify({settings:{showSomeday:true},tags:[]}));localStorage.setItem('lists-sandbox-v1',JSON.stringify({picks:{'2026-11-26_tal':'daily'},tasks:[make('today','2026-11-26'),make('week','2026-11-30'),make('extended','2026-12-04'),make('later','2026-12-20'),make('daily',null),make('waiting-today',null,{waiting:true,followUp:'2026-11-26'}),make('idea',null,{someday:true})]}));
  });
  await page.goto(BASE);await page.locator('.board-lane[data-lane=someday]').waitFor();await page.waitForTimeout(200);
  const meta=id=>page.locator('.task-row:not([data-waiting-copy])[data-task="'+id+'"] .task-meta').allTextContents();
  await page.locator('#composer [data-view=later]').click();assert.deepEqual(await meta('today'),[],'Later tab must not add a date to Today tasks');assert.deepEqual(await meta('week'),[]);assert.deepEqual(await meta('waiting-today'),[]);
  const snapshot=()=>page.evaluate(()=>[...document.querySelectorAll('#task-list>.board-lane,#task-list .day-heading,.task-row')].map(node=>{const r=node.getBoundingClientRect();return {key:node.dataset.instance||node.dataset.lane||node.textContent,top:Math.round((r.top+scrollY)*10)/10,left:Math.round((r.left+scrollX)*10)/10,width:Math.round(r.width*10)/10,height:Math.round(r.height*10)/10,meta:[...node.querySelectorAll(':scope>.task-summary .task-meta')].map(n=>n.textContent)};}));
  let checks=0;
  for(const merged of [false,true]){
   if(merged){await page.locator('[data-days=more]').click();await page.waitForTimeout(650);assert.deepEqual(await meta('extended'),[],'Merged date groups do not repeat Later dates');}
   else assert.equal((await meta('extended')).length,1,'Dated Later items show dates regardless of selected tab');
   for(const style of [1,7,4,8,9])for(const width of [1100,1440]){
    await page.setViewportSize({width,height:1000});await page.evaluate(style=>document.body.dataset.design=style,style);await page.locator('#composer [data-view=today]').click();await page.waitForTimeout(100);const before=await snapshot();
    for(const view of ['later','someday','upcoming','today']){await page.locator('#composer [data-view='+view+']').click();await page.waitForTimeout(60);assert.deepEqual(await snapshot(),before,'Stable '+style+'/'+width+'/'+merged+'/'+view);assert(await page.locator('#view-title').evaluate(node=>node.classList.contains('sr-only')));assert.deepEqual(await meta('today'),[]);assert.equal((await meta('later')).length,1);checks++;}
   }
  }
  await page.evaluate(()=>document.body.dataset.design='1');await page.locator('#composer [data-view=later]').click();await page.screenshot({path:'/private/tmp/lists-desktop-stable-later.png'});await page.locator('#composer [data-view=someday]').click();await page.screenshot({path:'/private/tmp/lists-desktop-stable-someday.png'});
  await page.setViewportSize({width:390,height:844});await page.locator('#composer [data-view=someday]').click();assert(!(await page.locator('#view-title').evaluate(node=>node.classList.contains('sr-only'))),'Single-list Someday retains its heading');await page.locator('#composer [data-view=later]').click();assert.equal((await meta('later')).length,1);assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks,coverage:'Stable desktop row/heading geometry and per-column dates across Today/Week/Later/Someday tabs, five styles, two widths, regular/merged board, extended Later date projection, Waiting pair dates and phone heading/date fallback. Synthetic only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
