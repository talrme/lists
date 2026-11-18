const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE='http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await ui.mockBackend(page,BASE);await page.goto(BASE);await page.locator('#workspace').waitFor();
  const launch=async()=>{await page.locator('#open-menu').click();await page.locator('[data-menu-action=guide]').click();await page.locator('.quick-guide').waitFor();};
  await launch();const text=await page.locator('.quick-guide').innerText();assert(text.split(/\s+/).length<280);for(const phrase of ['six business days','five weekdays','Swipe right','swipe left','Undo','follow-up date','reconnect'])assert(text.includes(phrase));assert.equal(await page.locator('.guide-gestures svg').count(),2);
  await page.getByRole('button',{name:'Got it',exact:true}).click();assert(await page.locator('#dialog').isHidden());
  for(const dismissal of ['escape','x','outside']){await launch();if(dismissal==='escape')await page.keyboard.press('Escape');else if(dismissal==='x')await page.locator('#dialog [data-close]').first().click();else await page.mouse.click(2,2);assert(await page.locator('#dialog').isHidden());}
  let layouts=0;
  for(const style of [1,7,4,8,9])for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
   await page.setViewportSize({width,height:844});await page.evaluate(({style,palette})=>{document.body.dataset.design=String(style);document.documentElement.dataset.palette=palette;},{style,palette});await launch();
   assert(await page.locator('#dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert(await page.locator('.quick-guide').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
   await page.getByRole('button',{name:'Got it',exact:true}).scrollIntoViewIfNeeded();assert(await page.getByRole('button',{name:'Got it',exact:true}).evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
   if(style===1&&width===390&&['original','night'].includes(palette)){await page.locator('#dialog').evaluate(n=>n.scrollTop=0);await page.screenshot({path:'/private/tmp/lists-guide-'+palette+'.png'});}
   await page.keyboard.press('Escape');layouts++;
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',layouts,coverage:'Guide content, illustrated icons, drawer route, four dismissal paths, phone/desktop overflow, five styles and four palettes. Synthetic fixtures only.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
