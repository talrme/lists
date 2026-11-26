const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error);});
 await ui.mockBackend(page,BASE);
 await page.clock.setFixedTime(new Date('2026-11-25T20:00:00Z'));
 await page.addInitScript(()=>{
  const make=(id,dueDate,extra={})=>({id,title:id,category:'todo',ownerUid:'tal',visibility:'private',completed:false,waiting:false,dueDate,followUp:null,sortOrder:1024,createdAt:1,rev:1,...extra});
  localStorage.setItem('lists-sandbox-v1',JSON.stringify({picks:{'2026-11-25_tal':'far'},tasks:[make('today','2026-11-25'),make('tomorrow','2026-11-26'),make('weekend','2026-11-29'),make('last-week','2026-12-02'),make('far',null),make('hidden-idea',null,{someday:true}),make('other-owner','2026-11-25',{visibility:'shared',assigneeUid:'sophie'}),make('completed-find',null,{completed:true}),...Array.from({length:30},(_,i)=>make('searchable '+i,null))]}));
 });
 await page.goto(BASE);await page.locator('.board-lane[data-lane=upcoming]').waitFor();
 assert(await page.locator('#desktop-task-search').isVisible());
 await page.locator('[data-days=more]').click();await page.locator('.board-merged').waitFor();await page.waitForTimeout(650);
 assert.equal(await page.locator('.board-lane[data-lane=upcoming]').count(),0);
 assert.equal(await page.locator('.board-merged [data-task=last-week]').count(),1);
 assert.equal(await page.locator('.weekend-group [data-task=weekend]').count(),1);
 assert.equal(await page.locator('[data-task=far]').count(),1);
 assert.equal(await page.locator('.board-lane[data-lane=later]').count(),1);
 await page.screenshot({path:'/private/tmp/lists-merged-desktop.png',fullPage:true});
 for(const width of [1100,1280,1440,1920])for(const style of [1,7,4,8,9])for(const palette of ['original','garden','cherry','night']){await page.setViewportSize({width,height:1000});await page.evaluate(({style,palette})=>{document.body.dataset.design=style;document.documentElement.dataset.palette=palette;},{style,palette});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow '+width+'/'+style+'/'+palette);}
 await page.evaluate(()=>{document.body.dataset.design='1';document.documentElement.dataset.palette='original';});await page.setViewportSize({width:1440,height:1000});
 const from=await page.locator('[data-task=tomorrow] .task-content').boundingBox(),to=await page.locator('.board-merged [data-day="2026-11-27"]>.day-tasks').boundingBox();
 await page.mouse.move(from.x+80,from.y+15);await page.mouse.down();await page.waitForTimeout(190);await page.mouse.move(from.x+80,from.y+30,{steps:3});await page.mouse.move(to.x+80,to.y+30,{steps:25});await page.waitForTimeout(200);await page.mouse.up();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.id==='tomorrow').dueDate==='2026-11-27');await page.waitForTimeout(400);
 await ui.menuAction(page,'settings');await ui.days(page,10);await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('.board-merged>.day-group').last().getAttribute('data-day'),'2026-12-04');
 await page.locator('[data-days=today]').click();assert.equal(await page.locator('.board-merged').count(),0);await page.locator('.board-lane[data-lane=upcoming] [data-task=last-week]').waitFor();
 const search=page.locator('#desktop-task-search');await search.fill('tomorow');await page.locator('[data-reveal-task=tomorrow]').click();await page.locator('[data-task=tomorrow][data-search-highlight]').waitFor();assert.equal(await page.locator('#edit-form').count(),0);
 await search.fill('other-owner');await page.locator('[data-reveal-task=other-owner]').click();await page.locator('[data-task=other-owner][data-search-highlight]').waitFor();assert(await page.locator('#back-asap').isVisible());await page.locator('#back-asap').click();assert.equal(await page.locator('[data-task=other-owner]').count(),0);
 await search.fill('hidden-idea');await page.locator('[data-reveal-task=hidden-idea]').click();await page.locator('[data-task=hidden-idea][data-search-highlight]').waitFor();
 await search.fill('completed-find');assert.equal(await page.locator('[data-reveal-task=completed-find]').count(),0);await page.locator('.desktop-search [type=checkbox]').check();await page.locator('[data-reveal-task=completed-find]').click();await page.locator('[data-task=completed-find][data-search-highlight]').waitFor();assert(await page.locator('[data-task=completed-find]').evaluate(node=>node.classList.contains('completed')));
 await search.fill('searchable');assert.equal(await page.locator('[data-reveal-task]').count(),30);assert(await page.locator('#desktop-search-results').evaluate(node=>node.scrollHeight>node.clientHeight));await search.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-reveal-task')),true);await page.keyboard.press('Enter');await page.locator('[data-search-highlight]').waitFor();await page.waitForTimeout(5200);assert.equal(await page.locator('[data-search-highlight]').count(),0);
 await search.fill('tomorrow');await search.press('Escape');assert(!await page.locator('.desktop-search-popover').isVisible());
 await search.fill('');await search.press('Enter');assert.equal(await page.locator('[data-search-highlight]').count(),0,'Empty search cannot activate an old hidden result');
 await page.locator('#back-asap').click();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-days=more]').click();assert.equal(await page.locator('.board-merged').count(),1);assert.equal(await page.evaluate(()=>document.getAnimations().filter(animation=>animation.id==='lists-navigation').length),0);
 await page.screenshot({path:'/private/tmp/lists-merged-desktop-final.png'});
 await page.evaluate(()=>window.__testSelectUser('sophie'));await page.locator('.board-merged').waitFor();assert(await page.locator('[data-days=today]').isVisible());assert.equal(await search.inputValue(),'');assert.equal(await page.locator('[data-task=last-week]').count(),0,'Private search/rows cleared on account switch');
 await page.setViewportSize({width:390,height:844});assert(!await search.isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);console.log('PASS: merged Week/date groups, weekends, deduplication, collapse, responsive widths, typo search, hidden owners/Someday, completed opt-in, keyboard, scrollable results, timed highlight, mobile fallback. Synthetic data only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
