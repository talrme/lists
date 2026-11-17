async function options(page){const button=page.locator('#composer .options-toggle');if(await button.getAttribute('aria-expanded')==='false')await button.click();}
async function assign(page,person){
  await options(page);
  if(person==='private')await page.locator('#composer [data-sharing=private]').click();
  else{await page.locator('#composer [data-sharing=shared]').click();await page.locator(`#composer [data-assignee="${person}"]`).click();}
}
async function add(page,title,{when='asap',person='private',description}={}){
  await page.locator('#new-title').fill(title);await page.locator(`#composer [data-timing=${when}]`).click();
  if(person!=='private')await assign(page,person);
  if(description!==undefined){await options(page);await page.locator('#new-description').fill(description);}
  await page.getByRole('button',{name:'Add task',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#composer [type=submit]').disabled);
  const error=await page.locator('#compose-error').textContent();if(error)throw Error(error);
}
async function scope(page,value,person='all'){
  await page.locator('[data-action=views]').click();await page.locator(`[data-scope=${value}]`).click();
  if(value==='shared')await page.locator('#person-filter').selectOption(person);
  await page.getByRole('button',{name:'Done',exact:true}).click();
}
async function editorMode(page,mode){
  await page.locator('[data-action=settings]').click();await page.locator('#list-settings>summary').click();await page.locator(`[data-editor-mode=${mode}]`).click();await page.getByRole('button',{name:'Done',exact:true}).click();
}
module.exports={options,assign,add,scope,editorMode};
