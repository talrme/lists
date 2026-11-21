const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
const csv='Task ID,Name,Completed At,Parent task,Section/Column,Notes,Created At,Due Date\n1,Email cleanup,,,This ~ Week,"A note, with a comma",2025-01-01,\n2,E-mail cleanup,,,Later,"<img src=x onerror=alert(1)>",2025-01-02,\n3,Completed,2026-11-20,,Later,,,\n4,Idea for a website,,,Maybe...,,,\n5,Child,,Idea for a website,Later,,,\n6,Check insurance,,,Waiting For Response,,,2024-01-01';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register=async()=>null;});
  await page.route('https://firestore.googleapis.com/**',route=>route.abort());
  await page.route('**/shared/firebase.js*',route=>route.fulfill({contentType:'text/javascript',body:`
   import{sandboxStore}from'${BASE}tests/fixtures/store.js';import{openDeviceStore}from'${BASE}shared/device-store.js';
   export async function connectFirebase(config,events){const db=await openDeviceStore('demo-asana-review'),store=sandboxStore(events.tasks,events.status);let uid='test-tal';
   async function select(next='test-tal'){uid=next;events.account({uid,email:uid==='test-tal'?'talrme@gmail.com':'sophiegreen2@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]});events.space({id:'home'});events.members({'test-tal':'Tal','test-sophie':'Sophie'});events.households([{id:'home',title:'Home'}]);await store.ready();events.ready();}
   setTimeout(select,0);window.__reviewTestUser=select;
   return{...store,listHouseholds:async()=>[],loadAsanaReview:async()=> (await db.read(JSON.stringify([uid,'home','staging','asana-review'])))?.asanaReview||null,saveAsanaReview:async value=>{await db.change(JSON.stringify([uid,'home','staging','asana-review']),old=>({...old,asanaReview:value}));}};
   }` }));
  await page.goto(BASE);await page.locator('#workspace').waitFor();
  const open=async()=>{await ui.menuAction(page,'settings');await page.locator('#settings-admin>summary').click();await page.locator('.admin-asana>summary').click();await page.locator('#open-asana-review').click();await page.locator('#asana-file').waitFor();};
  await open();await page.locator('#asana-file').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByText('4 tasks to review',{exact:true}).waitFor();assert.equal(await page.locator('[data-review-id]').count(),4);assert.equal(await page.locator('.review-item img').count(),0);
  const before=await page.evaluate(()=>localStorage.getItem('lists-sandbox-v1'));
  await page.locator('[data-review-id="1"] .review-related>summary').click();await page.locator('[data-select-group="1"]').click();await page.locator('[data-bulk=combine]').click();await page.locator('#confirm-action').click();await page.getByText('2 reviewed · 1 kept · 1 completed rows excluded',{exact:true}).waitFor();
  await page.locator('#review-undo').click();await page.getByText('0 reviewed · 0 kept · 1 completed rows excluded',{exact:true}).waitFor();
  const item=page.locator('[data-review-id="4"]');await item.locator('.review-comment>summary').click();await item.locator('textarea').fill('Keep as a someday idea, rename it later.');await item.locator('textarea').press('Tab');await item.locator('[data-decision=keep]').click();await page.getByText('1 reviewed · 1 kept · 1 completed rows excluded',{exact:true}).waitFor();
  await page.locator('#dialog [data-close]').click();await page.reload();await page.locator('#workspace').waitFor();await open();await page.getByText('1 reviewed · 1 kept · 1 completed rows excluded',{exact:true}).waitFor();
  await page.locator('#review-queue').selectOption('decided');await page.locator('[data-review-id="4"]').waitFor();await page.locator('.review-comment>summary').click();assert.equal(await page.locator('[data-review-comment="4"]').inputValue(),'Keep as a someday idea, rename it later.');
  const downloadEvent=page.waitForEvent('download');await page.locator('#save-review-file').click();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'asana-review.json');const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const backup=JSON.parse(Buffer.concat(chunks));assert.equal(backup.decisions['4'].destination,'someday');assert.equal(backup.rows.length,5);
  await page.locator('#asana-file').setInputFiles({name:'asana-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.locator('#confirm-action').click();await page.getByText('1 reviewed · 1 kept · 1 completed rows excluded',{exact:true}).waitFor();
  await page.locator('#review-queue').selectOption('all');
  let layouts=0;for(const width of [320,390,844,1280])for(const palette of ['original','garden','cherry','night']){
   await page.setViewportSize({width,height:844});await page.evaluate(palette=>document.documentElement.dataset.palette=palette,palette);assert(await page.locator('#dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Dialog fits '+width+'/'+palette);assert(await page.locator('.asana-review').evaluate(node=>node.scrollWidth<=node.clientWidth+1));layouts++;
   if(width===390&&palette==='night')await page.screenshot({path:'/private/tmp/lists-asana-review-phone.png'});if(width===1280&&palette==='original')await page.screenshot({path:'/private/tmp/lists-asana-review-desktop.png'});
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('lists-sandbox-v1')),before,'Reviewing never changes Lists tasks');
  await page.locator('#dialog [data-close]').click();await page.evaluate(()=>window.__reviewTestUser('test-sophie'));await page.locator('#workspace').waitFor();await ui.menuAction(page,'settings');assert.equal(await page.locator('#open-asana-review').count(),0,'Review is absent for non-admin accounts');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',layouts,coverage:'Synthetic CSV only: admin route, duplicate compare/combine, Undo, comments, durable reload, review backup, XSS escape, all palettes, phone/desktop overflow, non-admin hidden and zero task mutations.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
