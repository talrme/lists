const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const errors=[];let checked=0;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  for(let i=1;i<=10;i++){
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(new URL(`staging/${String(i).padStart(2,'0')}/?mode=live`,base).href);
   await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor({timeout:30000});
   assert(!await page.locator('#workspace').isVisible());
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lists-sandbox-v1'))),null,'Live sign-in must not seed sample data');
   assert((await page.locator('#mode-status').innerText()).includes('Google sign-in'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(i===1)await page.screenshot({path:'/private/tmp/lists-live-signin.png'});
   checked++;await page.close();
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',checked,coverage:'Real Firebase CDN SDK initialization and signed-out Google sign-in gate on all ten designs; no sample fallback or task access',limitations:'No Google account signed in, no OAuth completion, no task writes or authenticated rule tests'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
