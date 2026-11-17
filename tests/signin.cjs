const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const errors=[],requests=[];let checked=0;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  context.on('request',request=>requests.push(request.url()));
  for(let i=1;i<=10;i++){
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(new URL(`staging/${String(i).padStart(2,'0')}/`,base).href);
   await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor({timeout:30000});
   assert(!await page.locator('#workspace').isVisible());
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1'))),null,'Live sign-in must not seed sample data');
   assert((await page.locator('#mode-status').innerText()).includes('Google sign-in'));
   assert.equal(await page.locator('#sandbox-person,#reset-sandbox').count(),0);
   assert.equal(await page.evaluate(()=>typeof window.__testSelectUser),'undefined');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(i===1)await page.screenshot({path:'/private/tmp/lists-live-signin.png'});
   checked++;await page.close();
  }
  const legacy=await context.newPage(),oldSamples=JSON.stringify({tasks:[{id:'do-not-import',title:'Old local sample must stay hidden'}],picks:{}});
  await legacy.goto(new URL('staging/01/',base).href);await legacy.evaluate(value=>{localStorage.setItem('lists-sandbox-v1',value);localStorage.setItem('lists-preferences-v1',JSON.stringify({sandboxUser:'sophie'}));},oldSamples);
  for(const query of ['','?mode=sandbox','?mode=live','?mode=demo']){
   await legacy.goto(new URL('staging/01/'+query,base).href);await legacy.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();assert(!await legacy.locator('#workspace').isVisible());assert.equal(await legacy.getByText('Old local sample must stay hidden',{exact:true}).count(),0);assert.equal(await legacy.evaluate(()=>localStorage.getItem('lists-sandbox-v1')),oldSamples);
  }
  const gallery=await context.newPage();await gallery.goto(base);assert.equal(await gallery.locator('article').count(),10);assert.equal(await gallery.locator('.links a').count(),10);assert(!/sandbox/i.test(await gallery.locator('body').innerText()));
  for(const link of await gallery.locator('.links a').all())assert((await link.getAttribute('href')).startsWith('staging/'));
  assert(!requests.some(url=>url.includes('/tests/fixtures/')||url.includes('/shared/store.js')),'Public site must never load a sample store');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',checked,coverage:'All ten bare staging URLs require Google sign-in. Legacy mode=sandbox/live/demo URLs and old sample-person preferences cannot bypass auth. Old sample tasks stay untouched and hidden; no sample store loaded. Gallery has ten live-only choices.',limitations:'No Google account signed in, no OAuth completion, no task writes or authenticated rule tests'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
