async function options(page){const button=page.locator('#composer .options-toggle');if(await button.getAttribute('aria-expanded')==='false')await button.click();}
async function assign(page,person){
  await options(page);
  if(person==='private')await page.locator('#composer [data-sharing=private]').click();
  else{await page.locator('#composer [data-sharing=shared]').click();await page.locator(`#composer [data-assignee="${person}"]`).click();}
}
async function add(page,title,{when='asap',person='private',description}={}){
  await page.locator('#new-title').fill(title);const timing=page.locator(`#composer [data-timing=${when}]`);if(await timing.isVisible())await timing.click();
  if(person!=='private')await assign(page,person);
  if(description!==undefined){await options(page);await page.locator('#new-description').fill(description);}
  await page.getByRole('button',{name:'Add task',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#composer [type=submit]').disabled);
  const error=await page.locator('#compose-error').textContent();if(error)throw Error(error);
}
async function scope(page,value,person='all'){
  await page.locator('[data-action=views]').click();await page.locator(`[data-scope=${value}]`).click();
  if(value==='shared')await page.locator(`[data-person="${person}"]`).click();
  await page.getByRole('button',{name:'Done',exact:true}).click();
}
async function editorMode(page,mode){
  await page.locator('[data-action=settings]').click();await page.locator('#list-settings>summary').click();await page.locator(`[data-editor-mode=${mode}]`).click();await page.getByRole('button',{name:'Done',exact:true}).click();
}
async function move(page,row){await row.locator('[data-edit]').click();await page.locator('#edit-form .move-editor').click();}
async function mockBackend(page,base){
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
module.exports={options,assign,add,scope,editorMode,move,mockBackend};
