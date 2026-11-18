const words=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
function near(a,b){
 if(Math.abs(a.length-b.length)>1)return false;
 const row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  let diagonal=row[0];row[0]=i;
  for(let j=1;j<=b.length;j++){const previous=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+Number(a[i-1]!==b[j-1]));diagonal=previous;}
 }
 return row[b.length]<=1;
}
export function searchTasks(tasks,query){
 const terms=words(query).slice(0,12);if(!terms.length)return [];
 return tasks.map(task=>{
  const title=words(task.title),all=[...title,...words(task.description)];let score=0;
  for(const term of terms){
   if(title.some(word=>word.includes(term))){score+=3;continue;}
   if(all.some(word=>word.includes(term))){score++;continue;}
   if(term.length>=4&&all.some(word=>near(term,word))){continue;}
   return null;
  }
  return {task,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.task.title.localeCompare(b.task.title)).map(hit=>hit.task);
}
