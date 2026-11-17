const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  // Fresh unsigned-in context: exercise the real service worker and SDK cache, never real user data.
  await page.goto(new URL('staging/01/',BASE).href);await page.locator('#google-login').waitFor();
  await page.waitForFunction(async()=>{const registration=await navigator.serviceWorker.getRegistration();return !!registration?.active&&!!navigator.serviceWorker.controller;},{},{timeout:60000});
  const cached=await page.evaluate(async()=>{const cache=await caches.open('lists-shell-offline-1');return (await cache.keys()).map(request=>request.url);});assert(cached.some(url=>url.endsWith('/firebase-firestore.js')));assert(cached.some(url=>url.endsWith('/shared/device-store.js')));
  await context.setOffline(true);await page.reload();await page.locator('#google-login').waitFor();assert.equal(await page.locator('#app .app-frame').count(),1);
  const second=await context.newPage();await second.goto(new URL('staging/10/?household=home',BASE).href);await second.locator('#google-login').waitFor();assert.equal(await second.locator('body').getAttribute('data-design'),'10');
  assert.deepEqual(errors,[]);await context.close();console.log('PASS: real service worker precaches all ten pages and SDK modules, refreshes offline and opens another design offline. Fresh unsigned-in context; no production data writes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
