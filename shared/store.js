import {candidateTasks,choose,dayKey,seededTasks} from './core.js';
const KEY='lists-sandbox-v1';
export function sandboxStore(onChange,onStatus) {
  let state={tasks:seededTasks(dayKey()),picks:{}};
  try {const raw=JSON.parse(localStorage.getItem(KEY));if(raw&&Array.isArray(raw.tasks)&&raw.picks)state=raw;} catch {}
  const refresh=()=>onChange(state.tasks);
  function save(){try {localStorage.setItem(KEY,JSON.stringify(state));}catch{onStatus('Device storage is unavailable. Changes last only in this tab.');}refresh();}
  const receive=event=>{if(event.key!==KEY)return;try{const value=JSON.parse(event.newValue);if(value&&Array.isArray(value.tasks)&&value.picks){state=value;refresh();}}catch{}};
  window.addEventListener('storage',receive);
  return {
    ready:async()=>refresh(),
    async write(id,patch,expectedRev){
      const i=state.tasks.findIndex(t=>t.id===id),old=state.tasks[i];
      if(old&&!expectedRev&&Object.entries(patch).every(([key,value])=>old[key]===value))return;
      if(old&&old.rev!==expectedRev)throw new Error('This task changed. Reopen it and try again.');
      if(old)state.tasks[i]={...old,...patch,rev:old.rev+1};
      else {if(expectedRev)throw new Error('This task was removed.');state.tasks.push({id,...patch,rev:1,createdAt:Date.now()});}
      save();
    },
    async remove(id,rev){const task=state.tasks.find(t=>t.id===id);if(!task||task.rev!==rev)throw new Error('This task changed. Reopen it first.');state.tasks=state.tasks.filter(t=>t.id!==id);save();},
    async pick(day,uid){const key=`${day}_${uid}`;if(!(key in state.picks)){state.picks[key]=choose(candidateTasks(state.tasks,uid))?.id||null;save();}return state.picks[key];},
    reset(){state={tasks:seededTasks(dayKey()),picks:{}};save();},
    close(){window.removeEventListener('storage',receive);},
  };
}
