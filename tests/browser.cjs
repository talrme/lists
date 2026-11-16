const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.LISTS_TEST_URL||'http://localhost:5195/lists/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const errors=[],layouts=[];let workflows=0;
 try{
  for(let design=1;design<=10;design++){
   const number=String(design).padStart(2,'0'),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
   page.on('pageerror',e=>errors.push({design,error:e.message}));
   await page.goto(new URL(`staging/${number}/`,BASE).href);await page.locator('#workspace').waitFor();
   assert((await page.locator('#mode-status').innerText()).includes('sample data'));
   assert.equal(await page.getByText('Order a new bike helmet',{exact:true}).count(),0,'Do not show Sophie private tasks');
   const add=async(title,when='asap',person='private')=>{await page.locator('#new-title').fill(title);await page.locator('#new-when').selectOption(when);await page.locator('#new-person').selectOption(person);await page.getByRole('button',{name:'Add task',exact:true}).click();};
   await add('Test task '+number);let row=page.locator('.task-row').filter({hasText:'Test task '+number});await row.waitFor();
   await row.locator('[data-edit]').click();await page.locator('#edit-form [name=title]').fill('Edited task '+number);await page.getByRole('button',{name:'Save',exact:true}).click();await page.locator('#dialog').waitFor({state:'hidden'});
   row=page.locator('.task-row').filter({hasText:'Edited task '+number});await row.locator('[data-complete]').click();await page.locator('[data-view=done]').click();await page.locator('.task-row').filter({hasText:'Edited task '+number}).locator('[data-complete]').click();await page.locator('[data-view=today]').click();
   row=page.locator('.task-row').filter({hasText:'Edited task '+number});await row.locator('[data-quick=week]').click();await page.locator('[data-view=upcoming]').click();await page.locator('.task-row').filter({hasText:'Edited task '+number}).waitFor();
   await page.locator('[data-view=today]').click();await add('Waiting task '+number);row=page.locator('.task-row').filter({hasText:'Waiting task '+number});await row.locator('[data-quick=waiting]').click();await page.getByRole('button',{name:'Set follow-up',exact:true}).click();await page.locator('[data-view=waiting]').click();await page.locator('.task-row').filter({hasText:'Waiting task '+number}).waitFor();
   await page.locator('[data-view=today]').click();await add('Shared task '+number,'asap','sophie');await page.locator('[data-scope=shared]').click();row=page.locator('.task-row').filter({hasText:'Shared task '+number});await row.waitFor();
   await page.locator('#person-filter').selectOption('sophie');assert((await row.innerText()).includes('Sophie'));await page.locator('#person-filter').selectOption('all');
   await row.locator('[data-edit]').click();await page.getByRole('button',{name:'Remove task',exact:true}).click();await page.locator('#confirmation button[value=cancel]').click();assert(await page.locator('#dialog').isVisible());await page.getByRole('button',{name:'Remove task',exact:true}).click();await page.locator('#confirmation button[value=confirm]').click();await page.locator('#dialog').waitFor({state:'hidden'});
   for(const category of ['grocery','movies','other']){await page.locator(`[data-category=${category}]`).click();await page.locator('#new-title').fill('Category '+category);await page.getByRole('button',{name:'Add task',exact:true}).click();await page.locator('.task-row').filter({hasText:'Category '+category}).waitFor();}
   await page.locator('[data-category=todo]').click();await page.locator('[data-scope=mine]').click();
   await page.locator('[data-action=settings]').click();await page.locator('button[data-palette=night]').click();await page.getByRole('button',{name:'Done',exact:true}).click();await page.reload();await page.locator('#workspace').waitFor();assert.equal(await page.locator('html').getAttribute('data-palette'),'night');
   await page.locator('[data-action=settings]').click();await page.locator('button[data-palette=original]').click();await page.locator('#dialog').evaluate(d=>d.close());
   await page.locator('[data-action=share]').click();assert.equal(await page.locator('#qr img').count(),1);await page.getByRole('button',{name:'Close',exact:true}).click();
   for(const width of [320,390,844,1280]){
    await page.setViewportSize({width,height:width===844?390:844});
    for(const palette of ['original','garden','cherry','night']){
     await page.evaluate(p=>{document.documentElement.dataset.palette=p;},palette);
     const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,rows:[...document.querySelectorAll('.task-row')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const t=e.querySelector('.task-title').getBoundingClientRect(),r=e.getBoundingClientRect();return t.right<=r.right+1&&t.left>=r.left-1;})}));
     assert(dimensions.scroll<=dimensions.width+1,`Overflow design ${design} width ${width} palette ${palette}`);assert(dimensions.rows.every(Boolean),'Task title stays inside row');layouts.push({design,width,palette});
     if([390,1280].includes(width)&&palette==='original')await page.screenshot({path:`/private/tmp/lists-design-${number}-${width}.png`,fullPage:true});
    }
   }
   await page.goto(new URL(`staging/${number}/?mode=live`,BASE).href);await page.getByText('Google sign-in is not connected yet.',{exact:true}).waitFor();assert(!await page.locator('#workspace').isVisible());
   workflows++;await context.close();console.log('Checked design '+number);
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',workflows,layouts:layouts.length,limitations:'Chrome emulation and explicit local samples. Firebase Google sign-in/security requires project setup.'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
