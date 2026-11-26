const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();
  assert(!await page.locator('#composer [data-view=someday]').isVisible());
  await ui.menuAction(page,'settings');await page.locator('#show-someday').check();await page.locator('[data-palette=night]').click();await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.locator('#new-title').fill('Maybe learn pottery');await page.locator('#composer [data-view=someday]').click();await page.locator('#new-title').waitFor();
  assert.equal(await page.locator('#new-title').inputValue(),'');assert.equal(await page.getByText('Maybe learn pottery',{exact:true}).count(),0);
  await page.locator('#composer [data-view=someday]').click();const row=page.locator('.task-row').filter({hasText:'Maybe learn pottery'});await row.waitFor();await row.locator('[data-edit]').click();
  assert(!await page.locator('#edit-form .exact-date-row').isVisible());assert(!await page.locator('#edit-form .waiting-toggle').isVisible());
  await page.locator('#edit-form .tag-input').fill('Pottery');await page.locator('#edit-form [data-create-tag]').first().click();await page.locator('#edit-form .selected-tags').getByText('Pottery',{exact:false}).waitFor();
  await page.locator('#edit-form .tag-input').fill('Weekend');await page.locator('#edit-form [data-create-tag=shared]').click();
  await page.locator('#edit-form .modal-footer [type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});
  await row.locator('[data-filter-tag]').first().click();await page.locator('[data-search-edit]').filter({hasText:'Maybe learn pottery'}).waitFor();await page.locator('#dialog [data-close]').click();
  await ui.menuAction(page,'settings');await page.locator('#show-someday').uncheck();await page.getByRole('button',{name:'Done',exact:true}).click();assert(!await page.locator('#composer [data-view=someday]').isVisible());
  await ui.menuAction(page,'search');await page.locator('#task-search').fill('pottery');await page.locator('[data-search-edit]').filter({hasText:'Maybe learn pottery'}).waitFor();await page.locator('#dialog [data-close]').click();
  await ui.menuAction(page,'settings');await page.locator('#show-someday').check();await page.locator('#manage-tags').click();await page.locator('[data-rename-tag]').first().click();await page.locator('[name=tagName]').fill('Ceramics');await page.locator('#tag-edit [type=submit]').click();await page.locator('#tag-directory').getByText('Ceramics',{exact:true}).waitFor();await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.locator('#composer [data-view=someday]').click();await row.locator('[data-edit]').click();await page.locator('#edit-form .tag-input').fill('Clay');await page.locator('#edit-form [data-create-tag]').first().click();await page.locator('#edit-form .modal-footer [type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});
  await ui.menuAction(page,'settings');await page.locator('#manage-tags').click();const clay=page.locator('.tag-directory-row').filter({has:page.getByText('Clay',{exact:true})});await clay.locator('[data-merge-tag]').click();await page.locator('#tag-edit [name=target]').selectOption({label:'Ceramics'});await page.locator('#tag-edit [type=submit]').click();await page.locator('#tag-directory').waitFor();assert.equal(await page.locator('#tag-directory').getByText('Clay',{exact:true}).count(),0);
  const ceramics=page.locator('.tag-directory-row').filter({has:page.getByText('Ceramics',{exact:true})});await ceramics.locator('[data-archive-tag]').click();await ceramics.getByText(/Archived/).waitFor();await ceramics.locator('[data-archive-tag]').click();await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await row.locator('[data-filter-tag]').count(),2,'Merged aliases display once');
  await page.reload();await page.locator('#workspace').waitFor();assert.equal(await page.locator('html').getAttribute('data-palette'),'night');assert(await page.locator('#composer [data-view=someday]').isVisible());
  await page.setViewportSize({width:1440,height:1000});await page.locator('.board-lane[data-lane=someday]').waitFor();assert.equal(await page.locator('.board-lane').count(),5);await page.screenshot({path:'/private/tmp/lists-organizer-desktop.png',fullPage:true});
  assert.equal(await page.locator('.task-row').filter({hasText:'Maybe learn pottery'}).count(),1);
  assert((await page.locator('.suggestion [data-quick]').first().getAttribute('title')).includes('Punt'),'Daily projection uses Today action, not its stored Later bucket');
  const drag=async(source,target)=>{const from=await source.locator('.task-content').boundingBox(),to=await target.boundingBox();await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.waitForTimeout(190);await page.mouse.move(from.x+from.width/2,from.y+from.height/2+12,{steps:3});await page.mouse.move(to.x+to.width/2,to.y+to.height-12,{steps:30});await page.waitForTimeout(180);await page.mouse.up();};
  await drag(row,page.locator('.board-lane[data-lane=upcoming] .day-tasks'));await page.locator('.board-lane[data-lane=upcoming]').getByText('Maybe learn pottery',{exact:true}).waitFor();
  const moved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title==='Maybe learn pottery'));assert.equal(moved.someday,false);assert(moved.dueDate);
  await drag(row,page.locator('.board-lane[data-lane=someday] .day-tasks'));await page.locator('#confirmation').waitFor();await page.locator('#confirm-action').click();await page.locator('.board-lane[data-lane=someday]').getByText('Maybe learn pottery',{exact:true}).waitFor();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title==='Maybe learn pottery')?.someday===true);
  const idea=await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title==='Maybe learn pottery'));assert.equal(idea.someday,true);assert.equal(idea.dueDate,null);
  await page.waitForTimeout(400);
  for(const width of [320,390,844,1100,1280,1440])for(const palette of ['original','garden','cherry','night']){
   await page.setViewportSize({width,height:844});await page.evaluate(palette=>document.documentElement.dataset.palette=palette,palette);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Fits '+width+'/'+palette);
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#composer [data-view=someday]').click();await page.screenshot({path:'/private/tmp/lists-organizer-phone.png',fullPage:true});
  await row.locator('[data-edit]').click();await page.locator('#edit-form [data-sharing=shared]').click();assert.equal(await page.locator('#edit-form .selected-tags').getByText('Ceramics',{exact:false}).count(),0,'Personal tag removed before sharing');await page.locator('#edit-form .cancel-editor').last().click();
  await page.evaluate(()=>window.__testSelectUser('sophie'));await page.locator('#workspace').waitFor();assert(!await page.locator('#composer [data-view=someday]').isVisible(),'Sophie stays uncluttered');assert.equal(await page.locator('html').getAttribute('data-palette'),'original');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',coverage:'Someday isolation/hiding/search, personal and household tag creation, rename, account preference persistence/isolation, board and single-list mobile layouts, all palettes at six widths, personal tag stripping on sharing. Synthetic fixture only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
