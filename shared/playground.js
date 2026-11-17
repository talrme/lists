import {ADMIN_EMAIL,HOME_EMAILS,householdDraft} from './households.js';
import {addDays,taskDraft} from './core.js';
export const PLAYGROUND_ID='playground';
export function isPlayground(space){return space?.id===PLAYGROUND_ID&&space.kind==='playground'&&typeof space.playgroundRun==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(space.playgroundRun);}
export function playgroundEnvironment(space,fallback){return isPlayground(space)?'playground-'+space.playgroundRun:fallback;}
export function playgroundDraft(emails=HOME_EMAILS){return householdDraft({id:PLAYGROUND_ID,title:'Playground',emails:[ADMIN_EMAIL,...(Array.isArray(emails)?emails:String(emails).split(/[\s,;]+/))]});}
export function playgroundSamples(uid,day){
 const entries=[
  {title:'[Test] Complete me, then try Undo',mode:'asap'},
  {title:'[Test] Swipe me to defer',mode:'asap'},
  {title:'[Test] Drag me to tomorrow',mode:'asap'},
  {title:'[Test] Only I can see this private task',mode:'asap'},
  {title:'[Test] Complete this together',mode:'asap',shared:true},
  {title:'[Test] Assign me to another member',mode:'asap',shared:true},
  {title:'[Test] A task for tomorrow',mode:'date',exact:addDays(day,1)},
  {title:'[Test] A sometime-later suggestion',mode:'later'},
  {title:'[Test] Waiting for a reply',mode:'later',waiting:true},
 ];
 return entries.map((entry,i)=>({id:'playground-example-'+uid+'-'+i,...taskDraft({...entry,ownerUid:uid,day}),...(entry.waiting?{waiting:true,followUp:addDays(day,2)}:{})}));
}
