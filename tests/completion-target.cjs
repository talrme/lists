const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));await ui.mockBackend(page,BASE);
  await page.route('**/tests/fixtures/store.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(require.resolve('./fixtures/store.js'),'utf8').replace('async write(id,patch,expectedRev){',"async write(id,patch,expectedRev){if('completed' in patch)await new Promise(resolve=>setTimeout(resolve,600));")}));
  await page.goto(BASE);await page.locator('#workspace').waitFor();await ui.add(page,'Thumb target');await ui.add(page,'Keyboard target');
  const row=title=>page.locator('.task-row').filter({has:page.getByText(title,{exact:true})}),saved=title=>page.evaluate(title=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title===title)?.completed,title);
  assert.equal(await page.locator('body').getAttribute('data-completion-side'),'right');
  let button=row('Thumb target').locator('[data-complete]'),box=await button.boundingBox(),copy=await row('Thumb target').locator('.task-content').boundingBox();assert.equal(Math.round(box.width),56);assert(box.height>=52);assert(box.x>=copy.x+copy.width);
  await page.mouse.move(box.x+28,box.y+box.height/2);await page.mouse.down();assert(await button.evaluate(node=>node.classList.contains('completion-pressed')));assert.equal(await saved('Thumb target'),false);
  assert(await button.evaluate(node=>{const swatch=document.createElement('span');swatch.style.backgroundColor='var(--accent)';document.body.append(swatch);const accent=getComputedStyle(swatch).backgroundColor;swatch.remove();return getComputedStyle(node).backgroundColor===accent;}),'Press fills the target with the actual theme accent');
  await page.mouse.move(box.x-30,box.y+box.height/2,{steps:5});assert(!await button.evaluate(node=>node.classList.contains('completion-pressed')));await page.mouse.up();await page.waitForTimeout(300);assert.equal(await saved('Thumb target'),false);assert.equal(await page.locator('#edit-form').count(),0);
  box=await button.boundingBox();await page.mouse.move(box.x+28,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-20,box.y+box.height/2);await page.mouse.move(box.x+28,box.y+box.height/2);await page.mouse.up();await page.waitForTimeout(300);assert.equal(await saved('Thumb target'),false,'Leaving then returning still cancels');
  box=await button.boundingBox();await page.mouse.move(box.x+28,box.y+box.height/2);await page.mouse.down();await page.keyboard.press('Escape');await page.waitForTimeout(1100);await page.mouse.up();await page.waitForTimeout(30);assert.equal(await saved('Thumb target'),false,'Cancel does not expire while a finger is still held');
  const cdp=await page.context().newCDPSession(page);
  const touch=async(box,{cancel=false}={})=>{const x=box.x+box.width/2,y=box.y+box.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});if(cancel)for(let dx=20;dx<=120;dx+=20)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-dx,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await touch(await button.boundingBox(),{cancel:true});await page.waitForTimeout(300);assert.equal(await saved('Thumb target'),false,'Captured touch release away must not complete');assert.equal(await page.locator('#edit-form').count(),0);
  await touch(await button.boundingBox());assert.equal(await row('Thumb target').count(),0,'Release removes immediately');assert.equal(await saved('Thumb target'),false,'Does not wait for the write');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title==='Thumb target').completed);await page.locator('.toast-undo').last().click();await row('Thumb target').waitFor();
  await row('Keyboard target').locator('[data-complete]').focus();await page.keyboard.down('Space');assert.equal(await saved('Keyboard target'),false);await page.keyboard.up('Space');await row('Keyboard target').waitFor({state:'detached'});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1')).tasks.find(task=>task.title==='Keyboard target').completed);
  await ui.add(page,'Already elsewhere');const remote=row('Already elsewhere'),remoteButton=remote.locator('[data-complete]'),remoteBox=await remoteButton.boundingBox();await page.mouse.move(remoteBox.x+28,remoteBox.y+remoteBox.height/2);await page.mouse.down();
  await page.evaluate(()=>{const key='lists-sandbox-v1',value=JSON.parse(localStorage.getItem(key));const task=value.tasks.find(task=>task.title==='Already elsewhere');task.completed=true;task.rev++;localStorage.setItem(key,JSON.stringify(value));dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify(value)}));});
  assert.equal(await remoteButton.getAttribute('class').then(value=>value.includes('checked')),false,'Keep the pressed target stable until release');await page.mouse.up();await page.waitForTimeout(700);assert.equal(await saved('Already elsewhere'),true,'Remote completion must not turn the old Complete tap into Reopen');
  await row('Thumb target').locator('[data-edit]').click();await page.locator('#edit-form').waitFor();await page.locator('#edit-form .cancel-editor').last().click();
  const side=async value=>{await ui.menuAction(page,'settings');await page.locator('[data-completion-side='+value+']').click();await page.getByRole('button',{name:'Done',exact:true}).click();};
  await side('left');assert.equal(await page.locator('body').getAttribute('data-completion-side'),'left');assert.equal(Math.round((await page.locator('[data-complete]').first().boundingBox()).width),56,'Left-handed phones keep the wide target');await page.reload();await page.locator('#workspace').waitFor();assert.equal(await page.locator('body').getAttribute('data-completion-side'),'left');await page.setViewportSize({width:1280,height:844});assert.equal(await page.locator('body').getAttribute('data-completion-side'),'left');
  await side('right');assert.equal(Math.round((await page.locator('[data-complete]').first().boundingBox()).width),56);await side('auto');assert.equal(await page.locator('body').getAttribute('data-completion-side'),'left');await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.body.dataset.completionSide==='right');assert.equal(await page.locator('body').getAttribute('data-completion-side'),'right');
  await ui.quickActions(page,true);let layouts=0;
  for(const style of [1,7,4,8,9])for(const palette of ['original','garden','cherry','night'])for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:844});await page.waitForFunction(width=>document.body.dataset.completionSide===(width<768?'right':'left'),width);await page.evaluate(({style,palette})=>{document.body.dataset.design=String(style);document.documentElement.dataset.palette=palette;}, {style,palette});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),style+'/'+palette+'/'+width);
   for(const task of await page.locator('.task-row').all()){const check=await task.locator('[data-complete]').boundingBox(),summary=await task.locator('.task-summary').boundingBox();assert(check.x>=summary.x-1&&check.x+check.width<=summary.x+summary.width+1);}
   if(width===390&&style===1&&['garden','night'].includes(palette))await page.screenshot({path:'/private/tmp/lists-completion-'+palette+'.png',fullPage:true});layouts++;
  }
  await page.setViewportSize({width:390,height:844});
  for(const chosenSide of ['left','right']){
   await side(chosenSide);
   for(const style of [1,7,4,8,9])for(const palette of ['original','garden','cherry','night']){
    await page.evaluate(({style,palette})=>{document.body.dataset.design=String(style);document.documentElement.dataset.palette=palette;},{style,palette});
    const first=page.locator('.task-row').first(),target=await first.locator('[data-complete]').boundingBox(),content=await first.locator('.task-content').boundingBox();
    assert.equal(Math.round(target.width),56);assert(chosenSide==='right'?target.x>=content.x+content.width-1:target.x+target.width<=content.x+1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));layouts++;
   }
  }
  await cdp.detach();assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',layouts,coverage:'Phone right/desktop left default; 56px target; press preview, drag-away and re-entry cancellation; real CDP touch cancellation and completion; optimistic delayed write and Undo; keyboard; edit region; side preference persistence and responsive auto; five styles/four palettes. Synthetic fixtures only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
