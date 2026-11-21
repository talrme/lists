const text=value=>String(value??'');
export const normalizeTitle=value=>text(value).normalize('NFKC').toLowerCase().replace(/e[ -]?mail/g,'email').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const destinations={today:'Today',week:'Week',later:'Later',someday:'Someday / Maybe'};
export function parseAsana(csv,parser){
  if(typeof csv!=='string'||csv.length>10000000)throw new Error('Choose a CSV smaller than 10 MB.');
  const parsed=parser.parse(csv,{header:true,skipEmptyLines:'greedy',dynamicTyping:false,transformHeader:value=>value.replace(/^\uFEFF/,'').trim()});
  if(parsed.errors.length)throw new Error('The CSV has malformed rows. Export a fresh CSV from Asana.');
  if(Object.keys(parsed.meta.renamedHeaders||{}).length)throw new Error('The CSV has duplicate column names. Export a fresh CSV from Asana.');
  for(const name of ['Task ID','Name','Completed At','Parent task','Section/Column'])if(!parsed.meta.fields?.includes(name))throw new Error('This does not look like an Asana task export: missing '+name+'.');
  if(parsed.data.length>20000)throw new Error('Review at most 20,000 source rows at a time.');
  const ids=new Set(),rows=[];let completed=0,blank=0;
  for(const row of parsed.data){
    const id=text(row['Task ID']);if(!/^\d{1,30}$/.test(id)||ids.has(id))throw new Error('The export has missing or repeated task IDs. Nothing was loaded.');ids.add(id);
    if(row['Completed At']){completed++;continue;}
    if(!text(row.Name).trim())blank++;
    rows.push({id,title:text(row.Name),section:text(row['Section/Column']),parent:text(row['Parent task']),created:text(row['Created At']),modified:text(row['Last Modified']),due:text(row['Due Date']),notes:text(row.Notes),tags:text(row.Tags),assignee:text(row.Assignee),assigneeEmail:text(row['Assignee Email']),projects:text(row.Projects)});
  }
  if(rows.length>3000)throw new Error('Review at most 3,000 open rows at a time.');
  return {version:1,rows,sourceCount:parsed.data.length,completed,blank,decisions:{},history:[],filename:''};
}
export function validateReview(value){
  if(value?.version!==1||!Array.isArray(value.rows)||value.rows.length>3000||!Number.isInteger(value.sourceCount)||!Number.isInteger(value.completed)||value.completed<0||value.sourceCount!==value.rows.length+value.completed||!value.decisions||typeof value.decisions!=='object'||Array.isArray(value.decisions))throw new Error('Invalid saved review. Choose an Asana CSV or a review saved by Lists.');
  const ids=new Set();
  for(const row of value.rows){
    if(!row||typeof row.id!=='string'||!/^\d{1,30}$/.test(row.id)||ids.has(row.id))throw new Error('Invalid review task ID.');ids.add(row.id);
    for(const key of ['title','section','parent','created','modified','due','notes','tags','assignee','assigneeEmail','projects'])if(typeof row[key]!=='string')throw new Error('Invalid task data.');
  }
  for(const [id,decision] of Object.entries(value.decisions)){
    if(!ids.has(id)||value.rows.find(row=>row.id===id).parent||!['keep','skip','defer','merge'].includes(decision?.action))throw new Error('Invalid saved decision.');
    if(decision.action==='keep'&&!destinations[decision.destination])throw new Error('Invalid destination.');
    if(decision.action==='merge'&&(!ids.has(decision.into)||value.decisions[decision.into]?.action!=='keep'||decision.into===id))throw new Error('Invalid merge decision.');
  }
  for(const [id,note] of Object.entries(value.feedback||{}))if(!ids.has(id)||typeof note!=='string'||note.length>2000)throw new Error('Invalid review comment.');
  // Undo entries from a file are not trusted execution or state-replacement instructions.
  return {...value,history:[],filename:text(value.filename).slice(0,200)};
}
export function reviewIndex(rows,day){
  const items=rows.filter(row=>!row.parent),byId=new Map(rows.map(row=>[row.id,row])),duplicates=new Set(),related=new Map(),exact=new Map(),tokens=new Map(),inverted=new Map();
  const link=(a,b)=>{duplicates.add(a);duplicates.add(b);if(!related.has(a))related.set(a,new Set());if(!related.has(b))related.set(b,new Set());related.get(a).add(b);related.get(b).add(a);};
  for(const row of items){
    const key=normalizeTitle(row.title);if(key){for(const id of exact.get(key)||[])link(row.id,id);exact.set(key,[...(exact.get(key)||[]),row.id]);}
    const words=new Set(key.split(' ').filter(word=>word.length>2&&!['the','and','with','for','get','make','look','into','out','deets','details'].includes(word)));tokens.set(row.id,words);
    if(words.size<2)continue;
    const candidates=new Map();for(const word of words)for(const id of inverted.get(word)||[])candidates.set(id,(candidates.get(id)||0)+1);
    for(const [id,common] of candidates){const other=tokens.get(id);if(common>=2&&common/(words.size+other.size-common)>=.8)link(row.id,id);}
    for(const word of words){if(!inverted.has(word))inverted.set(word,[]);inverted.get(word).push(row.id);}
  }
  const children=new Map(),unlinked=[];
  for(const row of rows.filter(row=>row.parent)){const parents=items.filter(item=>item.title===row.parent);if(parents.length!==1){unlinked.push(row);continue;}const id=parents[0].id;if(!children.has(id))children.set(id,[]);children.get(id).push(row);}
  const flags=row=>({duplicate:duplicates.has(row.id),important:/\b(irs|tax|insurance|passport|certificate|legalease|cpa|financial|paycheck|credit|mortgage|benefits|8606)\b/i.test(row.title)||/\b(?:write|create|make|living)\s+(?:a\s+)?will\b/i.test(row.title),idea:/\b(website|idea|learn|explore|maybe|try|check out)\b/i.test(row.title)||/maybe/i.test(row.section),old:!!row.created&&row.created<day.slice(0,4)+'-01-01',pastDue:!!row.due&&row.due<day});
  return {items,byId,duplicates,related,children,unlinked,flags};
}
export function suggestion(row){
  if(/maybe/i.test(row.section))return 'Someday / Maybe';
  if(/waiting/i.test(row.section))return 'Waiting: review follow-up date';
  if(/\b(website|idea|learn|explore)\b/i.test(row.title))return 'Consider Someday / Maybe';
  return 'Review before assigning a list';
}
export function decide(review,ids,decision){
  const available=new Set(review.rows.filter(row=>!row.parent).map(row=>row.id));
  if(!ids.length||ids.some(id=>!available.has(id)))throw new Error('Select main tasks to review.');
  const decisions={...review.decisions},before={...decisions};
  // Re-deciding a primary task releases its merged sources for another review.
  for(const [id,old] of Object.entries(decisions))if(old.action==='merge'&&ids.includes(old.into))delete decisions[id];
  if(decision.action==='combine'){
    if(ids.length<2)throw new Error('Select at least two tasks to combine.');
    decisions[ids[0]]={action:'keep',destination:decision.destination};
    for(const id of ids.slice(1))decisions[id]={action:'merge',into:ids[0]};
  }else for(const id of ids){if(decision.action==='reset')delete decisions[id];else decisions[id]={...decision};}
  const next={...review,decisions,history:[...(review.history||[]),before].slice(-50)};validateReview(next);return next;
}
