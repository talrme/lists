const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),ui=require('./ui.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});let server;
 try{
  // Real app reload guards, with a fake waiting worker and synthetic tasks only.
  const page=await browser.newPage({viewport:{width:390,height:844}});await ui.mockBackend(page,BASE);
  await page.addInitScript(()=>{
   Object.defineProperty(navigator.serviceWorker,'controller',{value:{},configurable:true});
   const registration=new EventTarget();window.__updateRegistration=registration;registration.waiting=null;registration.update=async()=>{};window.__offerUpdate=()=>{registration.waiting={postMessage(){window.__activated=true;}};registration.dispatchEvent(new Event('updatefound'));};
   navigator.serviceWorker.register=async()=>registration;
  });
  await page.goto(BASE);await page.locator('#workspace').waitFor();await page.locator('#new-title').fill('Unsaved test draft');await page.evaluate(()=>window.__offerUpdate());const bar=page.locator('.app-update');await bar.waitFor({state:'attached'});
  await page.waitForTimeout(350);assert(!await page.evaluate(()=>window.__activated));assert(await bar.isHidden());assert.equal(await bar.locator('button').count(),0);assert.equal(await page.locator('#new-title').inputValue(),'Unsaved test draft');
  await ui.options(page);await page.locator('#new-title').fill('');await page.locator('#new-description').fill('Unfinished details');await page.waitForTimeout(350);assert(await page.locator('#dialog').isVisible());assert(await bar.isHidden());assert(!await page.evaluate(()=>window.__activated));
  await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,value:false}));await page.locator('#composer .cancel-new-task').last().click();await page.waitForTimeout(350);assert(await bar.isHidden());assert(!await page.evaluate(()=>window.__activated));
  await page.locator('.task-row [data-complete]').first().click();await page.locator('.toast-undo').waitFor();
  await page.evaluate(()=>{window.__testSync({pending:1,syncing:true,connecting:false,offline:false});Object.defineProperty(navigator,'onLine',{configurable:true,value:true});dispatchEvent(new Event('online'));});
  await page.waitForTimeout(350);assert(!await page.evaluate(()=>window.__activated),'Pending saves must still block an immediate update');assert(await bar.isHidden());
  await page.locator('#new-title').focus();const released=Date.now();await page.evaluate(()=>window.__testSync({pending:0,syncing:false,connecting:false,offline:false}));await page.waitForFunction(()=>window.__activated,{},{timeout:1500});assert(Date.now()-released<1500,'No idle countdown after saving clears');assert(await page.locator('.toast-undo').count()>0,'An Undo notice must not add an update delay');assert.equal(await bar.innerText(),'Updating to latest software version...');assert.equal(await bar.locator('button').count(),0);
  for(const width of [320,390,1280])for(const palette of ['original','night']){await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);await page.waitForTimeout(180);assert(await bar.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth+1;}));if(width===390)await page.screenshot({path:'/private/tmp/lists-update-'+palette+'.png'});}
  await page.locator('#new-title').click();await page.locator('#new-title').fill('Typed while software activates');assert.equal(await page.locator('#new-title').inputValue(),'Typed while software activates');await page.evaluate(()=>{window.__updateRegistration.waiting=null;navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));});await bar.waitFor({state:'hidden'});assert.equal(await page.locator('#new-title').inputValue(),'Typed while software activates','Activation must not freeze input or reload over a newly typed draft');await page.close();

  // Real workers update automatically, while each tab protects its own drafts.
  // Only the precache list is reduced: no auth, API requests or production data.
  let version=1;
  server=http.createServer((req,res)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;
   res.setHeader('Cache-Control','no-store');
   if(pathname==='/lists/'||pathname==='/lists/index.html'){
    res.setHeader('Content-Type','text/html');return res.end(`<html><head><title>Version ${version}</title></head><body><script type="module">import {setupUpdates} from './shared/updates.js';window.reason='';setupUpdates({canReload:async()=>window.reason,retryMs:100});</script></body></html>`);
   }
   res.setHeader('Content-Type','text/javascript');
   if(pathname==='/lists/sw.js')return res.end(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').replace(/const CACHE='[^']+';/,`const CACHE='lists-update-test-${version}';`).replace(/^const URLS=.*$/m,"const URLS=['index.html','shared/updates.js'].map(path=>new URL(path,BASE).href);"));
   if(pathname==='/lists/shared/updates.js')return res.end(fs.readFileSync(path.join(ROOT,'shared/updates.js')));
   res.writeHead(404).end();
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/lists/`,context=await browser.newContext(),first=await context.newPage();await first.goto(url);await first.waitForFunction(()=>!!navigator.serviceWorker.controller);assert(await first.locator('.app-update').isHidden());
  const second=await context.newPage();await second.goto(url);await second.waitForFunction(()=>!!navigator.serviceWorker.controller);assert.equal(await second.title(),'Version 1');
  await second.evaluate(()=>window.reason='Unsaved draft');await first.evaluate(()=>window.reason='Wait for pending changes.');
  version=2;await first.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await first.bringToFront();await first.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);assert(await first.locator('.app-update').isHidden());await first.waitForTimeout(450);assert.equal(await first.title(),'Version 1');
  await first.evaluate(()=>window.reason='');await first.waitForFunction(()=>document.title==='Version 2');await first.locator('.app-update').filter({hasText:'Software updated'}).waitFor();assert.equal(await second.title(),'Version 1');
  await second.bringToFront();await second.waitForTimeout(350);assert.equal(await second.title(),'Version 1','Other tab keeps its unsaved draft even after activation');assert(await second.locator('.app-update').isHidden());
  await second.evaluate(()=>window.reason='');await second.waitForFunction(()=>document.title==='Version 2');
  version=3;await first.bringToFront();await first.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+61000;document.dispatchEvent(new Event('pointerup'));});await first.waitForFunction(()=>document.title==='Version 3');
  // Completed saves, scrolling and ordinary interaction do not introduce an idle countdown.
  await first.evaluate(()=>window.reason='Pending write');version=4;await first.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await first.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);assert(await first.locator('.app-update').isHidden());assert.equal(await first.locator('.app-update button').count(),0);
  await first.evaluate(()=>{window.__pulse=setInterval(()=>document.dispatchEvent(new Event('pointerup')),10);window.reason='';});await first.waitForFunction(()=>document.title==='Version 4',{},{timeout:1500});await first.locator('.app-update').filter({hasText:'Software updated'}).waitFor();await first.waitForTimeout(2700);assert(await first.locator('.app-update').isHidden());

  const timedContext=await browser.newContext(),timed=await timedContext.newPage();
  await timed.addInitScript(()=>{
   Object.defineProperty(navigator.serviceWorker,'controller',{value:{},configurable:true});
   const registration=new EventTarget();window.__updateRegistration=registration;registration.waiting={postMessage(){window.__attempts=(window.__attempts||0)+1;}};registration.update=async()=>{};navigator.serviceWorker.register=async()=>registration;
  });
  await timed.route(url,route=>route.fulfill({contentType:'text/html',body:`<html><head><title>Timeout test</title></head><body><script type="module">import {setupUpdates} from './shared/updates.js';window.reason='';setupUpdates({canReload:async()=>window.reason,retryMs:20,activationTimeoutMs:80});</script></body></html>`}));
  await timed.goto(url);await timed.waitForFunction(()=>window.__attempts===1);await timed.waitForTimeout(250);assert(await timed.locator('.app-update').isHidden());assert.equal(await timed.evaluate(()=>window.__attempts),1,'Stalled activation backs off instead of looping');
  await timed.evaluate(()=>{window.reason='Draft typed during activation';window.__updateRegistration.waiting=null;navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));});await timed.waitForTimeout(100);assert.equal(await timed.title(),'Timeout test');assert(await timed.locator('.app-update').isHidden());await timedContext.close();
  await context.setOffline(true);await first.reload();assert.equal(await first.title(),'Version 4');await context.close();
  console.log('PASS: one quiet automatic update path; no Reload prompt/buttons; unfinished-edit/offline/pending-write and multi-tab protection; immediate application without idle or Undo waits; one reload with expiring success confirmation; stalled activation backoff and late-controller draft protection; updated offline shell. No production data writes.');
 }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
