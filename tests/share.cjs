const {chromium}=require('playwright'),assert=require('node:assert/strict'),ui=require('./ui.cjs');
const BASE=process.env.LISTS_TEST_URL||'http://127.0.0.1:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 let layouts=0;
 try{
  for(let design=1;design<=10;design++){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text;}}}));
   await ui.mockBackend(page,BASE);await page.goto(new URL(``,BASE).href);await page.locator('#workspace').waitFor();
   for(const name of ['mobile-web-app-capable','apple-mobile-web-app-capable'])assert.equal(await page.locator(`meta[name="${name}"]`).getAttribute('content'),'yes');
   assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'),'Lists');
   const cdp=await context.newCDPSession(page),manifest=await cdp.send('Page.getAppManifest');
   assert.deepEqual(manifest.errors,[]);const data=JSON.parse(manifest.data);
   assert.equal(data.display,'standalone');assert.equal(data.scope,new URL('./',page.url()).href);assert(new URL(data.id).searchParams.get('household')==='home');assert(new URL(data.start_url).searchParams.get('household')==='home');
   const sizes=await page.evaluate(async icons=>Promise.all(icons.map(icon=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth+'x'+image.naturalHeight);image.onerror=reject;image.src=icon.src;}))),data.icons);
   assert.deepEqual(sizes,['192x192','512x512']);
   await page.locator('[data-action=share]').click();const link=await page.locator('#share-link').inputValue();
   assert.equal(link,`https://talrme.github.io/lists/?household=home`);
   await page.waitForFunction(()=>document.querySelector('#qr img')?.naturalWidth>0);
   await page.locator('#copy-link').click();assert.equal(await page.evaluate(()=>window.__copied),link);
   for(const width of [320,390,1280])for(const palette of ['original','garden','cherry','night']){
    await page.setViewportSize({width,height:844});await page.evaluate(p=>document.documentElement.dataset.palette=p,palette);
    for(const summary of await page.locator('.install-details summary').all()){await summary.click();}
    assert(await page.evaluate(()=>{const d=document.querySelector('#dialog');return d.scrollWidth<=d.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1;}),`Overflow ${design}/${width}/${palette}`);layouts++;
    if(design===1&&[390,1280].includes(width)&&['original','night'].includes(palette))await page.screenshot({path:`/private/tmp/lists-share-${width}-${palette}.png`});
   }
   await page.getByRole('button',{name:'Close',exact:true}).click();assert(!await page.locator('#dialog').isVisible());
   await page.locator('[data-action=share]').click();await page.keyboard.press('Escape');assert(!await page.locator('#dialog').isVisible());
   await page.locator('[data-action=share]').click();await page.mouse.click(2,2);assert(!await page.locator('#dialog').isVisible());
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({result:'PASS',designs:10,shareLayouts:layouts,coverage:'Absolute standalone manifests without parse warnings, Apple metadata, real icon dimensions, QR image, household links, Copy, X/Escape/backdrop. Test-only backend; physical installation not automated.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
