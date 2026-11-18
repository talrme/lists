async function options(page){const button=page.locator('#composer .options-toggle');if(await button.getAttribute('aria-expanded')==='false')await button.click();}
async function assign(page,person){
  await options(page);
  if(person==='private')await page.locator('#composer [data-sharing=private]').click();
  else{await page.locator('#composer [data-sharing=shared]').click();await page.locator(`#composer [data-assignee="${person}"]`).click();}
}
async function add(page,title,{when='asap',person='private',description}={}){
  const timing=page.locator(`#composer [data-timing=${when}]`);if(await timing.isVisible())await timing.click();await page.locator('#new-title').fill(title);
  if(person!=='private')await assign(page,person);
  if(description!==undefined){await options(page);await page.locator('#new-description').fill(description);}
  if(await page.locator('#composer.modal-composer').count())await page.locator('#composer .modal-footer.composer-actions [type=submit]').click();else await page.getByRole('button',{name:'Add task',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#composer [type=submit]').disabled);
  const error=await page.locator('#compose-error').textContent();if(error)throw Error(error);
}
async function scope(page,value,person='all'){
  if(await page.locator('#edit-form').count())await page.locator('#edit-form').waitFor({state:'detached'});
  await page.locator('[data-action=settings]').click();await page.locator('#task-visibility>summary').click();
  const inputs=page.locator('[data-audience]'),self=await inputs.nth(1).getAttribute('data-audience');
  for(const input of await inputs.all()){
   const key=await input.getAttribute('data-audience');const checked=value==='all'||value==='mine'&&['private',self,'unassigned'].includes(key)||value==='shared'&&key!=='private'&&(person==='all'||person===key);
   await input.setChecked(checked);
  }
  await page.getByRole('button',{name:'Done',exact:true}).click();
}
async function scheduleView(page,view){
  await page.locator(`[data-view=${view}]`).first().click();
}
async function editorMode(page,mode){
  await page.locator('[data-action=settings]').click();await page.locator('#list-settings>summary').click();await page.locator(`[data-editor-mode=${mode}]`).click();await page.getByRole('button',{name:'Done',exact:true}).click();
}
async function extended(page,days){
 await page.locator('[data-action=settings]').click();await page.locator('#list-settings>summary').click();await page.locator('#days-shown').fill(String(days));await page.locator('#days-shown').dispatchEvent('change');await page.getByRole('button',{name:'Done',exact:true}).click();await page.locator('#open-menu').click();await page.locator('[data-menu-days=extended]').click();await page.locator('#navigation-drawer').waitFor({state:'hidden'});
}
async function move(page,row){await row.locator('[data-edit]').press('Alt+m');}
async function mockBackend(page,base){
  await page.addInitScript(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register=async()=>null;});
  const fixture=new URL('tests/fixtures/store.js',base).href;
  await page.route('https://firestore.googleapis.com/**',route=>route.abort());
  await page.route('**/shared/firebase.js*',route=>route.fulfill({contentType:'text/javascript',body:`
    import {sandboxStore} from ${JSON.stringify(fixture)};
    export async function connectFirebase(config,events){
      const store=sandboxStore(events.tasks,events.status);
      const select=async uid=>{events.account({uid,email:uid+'@test.invalid',emailVerified:false,displayName:uid==='tal'?'Tal':'Sophie',providerData:[]});events.preview?.(null);events.households([{id:'home',title:'Test household'}]);events.space({id:'home',title:'Test household'});events.members({tal:'Tal',sophie:'Sophie'});await store.ready();events.ready();};
      window.__testSelectUser=select;setTimeout(()=>void select('tal'),0);
      return {...store,logout:async()=>events.account(null)};
    }
  `}));
}
module.exports={options,assign,add,scope,scheduleView,editorMode,extended,move,mockBackend};
