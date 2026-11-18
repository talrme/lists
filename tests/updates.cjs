const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),ui=require('./ui.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});let server;
 try{
  // Real app reload guards, with a fake waiting worker and synthetic tasks only.
  const page=await browser.newPage({viewport:{width:390,height:844}});await ui.mockBackend(page,BASE);
  await page.addInitScript(()=>{
   Object.defineProperty(navigator.serviceWorker,'controller',{value:{},configurable:true});
   const registration=new EventTarget();registration.waiting={postMessage(){window.__activated=true;}};registration.update=async()=>{};
   navigator.serviceWorker.register=async()=>registration;
  });
  await page.goto(BASE);await page.locator('#workspace').waitFor();await page.locator('#new-title').fill('Unsaved test draft');const bar=page.locator('.app-update');await bar.waitFor();
  for(const width of [320,390,1280])for(const palette of ['original','night']){await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);await page.waitForTimeout(240);assert(await bar.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth+1;}));if(width===390)await page.screenshot({path:'/private/tmp/lists-update-'+palette+'.png'});}
  await page.waitForTimeout(4300);assert(!await page.evaluate(()=>window.__activated));await bar.getByRole('button',{name:'Reload',exact:true}).click();assert((await bar.innerText()).includes('draft'));assert(!await page.evaluate(()=>window.__activated));assert.equal(await page.locator('#new-title').inputValue(),'Unsaved test draft');
  await page.locator('#new-title').fill('');await ui.menuAction(page,'settings');await page.evaluate(()=>document.querySelector('.app-update button').click());assert((await bar.innerText()).includes('dialog'));await page.keyboard.press('Escape');
  await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,value:false}));await bar.getByRole('button',{name:'Reload',exact:true}).click();assert((await bar.innerText()).includes('Reconnect'));assert(!await page.evaluate(()=>window.__activated));
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:true});dispatchEvent(new Event('online'));});await page.locator('.task-row [data-complete]').first().click();await page.locator('.toast-undo').waitFor();await page.waitForTimeout(4300);assert(!await page.evaluate(()=>window.__activated),'Keep the Undo opportunity before auto-updating');assert((await bar.innerText()).includes('Undo'));await page.waitForFunction(()=>window.__activated,{},{timeout:10000});assert.equal(await bar.locator('button').innerText(),'Updating...');assert((await bar.innerText()).includes('Applying'));await page.screenshot({path:'/private/tmp/lists-update-applying.png'});await page.close();

  // Real workers update automatically, while each tab protects its own drafts.
  // Only the precache list is reduced: no auth, API requests or production data.
  let version=1;
  server=http.createServer((req,res)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;
   res.setHeader('Cache-Control','no-store');
   if(pathname==='/lists/'||pathname==='/lists/index.html'){
    res.setHeader('Content-Type','text/html');return res.end(`<html><head><title>Version ${version}</title></head><body><script type="module">import {setupUpdates} from './shared/updates.js';window.reason='';setupUpdates({canReload:async()=>window.reason,idleMs:150,retryMs:100});</script></body></html>`);
   }
   res.setHeader('Content-Type','text/javascript');
   if(pathname==='/lists/sw.js')return res.end(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').replace(/const CACHE='[^']+';/,`const CACHE='lists-update-test-${version}';`).replace(/^const URLS=.*$/m,"const URLS=['index.html','shared/updates.js'].map(path=>new URL(path,BASE).href);"));
   if(pathname==='/lists/shared/updates.js')return res.end(fs.readFileSync(path.join(ROOT,'shared/updates.js')));
   res.writeHead(404).end();
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/lists/`,context=await browser.newContext(),first=await context.newPage();await first.goto(url);await first.waitForFunction(()=>!!navigator.serviceWorker.controller);assert(await first.locator('.app-update').isHidden());
  const second=await context.newPage();await second.goto(url);await second.waitForFunction(()=>!!navigator.serviceWorker.controller);assert.equal(await second.title(),'Version 1');
  await second.evaluate(()=>window.reason='Unsaved draft');await first.evaluate(()=>window.reason='Wait for pending changes.');
  version=2;await first.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await first.bringToFront();await first.locator('.app-update').waitFor();await first.waitForTimeout(450);assert.equal(await first.title(),'Version 1');
  await first.evaluate(()=>window.reason='');await first.waitForFunction(()=>document.title==='Version 2');assert.equal(await second.title(),'Version 1');
  await second.bringToFront();await second.waitForTimeout(350);assert.equal(await second.title(),'Version 1','Other tab keeps its unsaved draft even after activation');
  await second.evaluate(()=>window.reason='');await second.waitForFunction(()=>document.title==='Version 2');
  version=3;await first.bringToFront();await first.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+61000;document.dispatchEvent(new Event('pointerdown'));});await first.waitForFunction(()=>document.title==='Version 3');
  // Reload remains usable immediately, without waiting for the idle delay.
  await first.evaluate(()=>window.reason='Block auto while checking the fallback');version=4;await first.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await first.locator('.app-update').waitFor();
  await first.evaluate(()=>window.reason='');await first.locator('.app-update button').click();await first.waitForFunction(()=>document.title==='Version 4');
  await context.setOffline(true);await first.reload();assert.equal(await first.title(),'Version 4');await context.close();
  console.log('PASS: automatic idle updates, real app draft/dialog/offline guards, pending-change refusal, protected second-tab drafts, automatic catch-up after clearing drafts, foreground updates, manual fallback and updated offline shell. No production data writes.');
 }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
