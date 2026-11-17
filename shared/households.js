export const ADMIN_EMAIL='talrme@gmail.com';
export const HOME_EMAILS=['talrme@gmail.com','sophiegreen2@gmail.com'];
export function isAdministrator(account){
  return !!account && account.emailVerified===true && account.email===ADMIN_EMAIL && account.providerData?.some(p=>p.providerId==='google.com')===true;
}
export function householdDraft({id,title,emails}){
  id=String(id||'').trim().toLowerCase();title=String(title||'').trim();
  if(!/^[a-z0-9][a-z0-9-]{0,47}$/.test(id))throw new Error('Use 1–48 lowercase letters, numbers or hyphens for the household link.');
  if(!title||title.length>80)throw new Error('Give the household a name, up to 80 characters.');
  const memberEmails=[...new Set((Array.isArray(emails)?emails:String(emails||'').split(/[\s,;]+/)).map(email=>String(email).trim().toLowerCase()).filter(Boolean))].sort();
  if(!memberEmails.length||memberEmails.length>20)throw new Error('Add between 1 and 20 Google email addresses.');
  if(memberEmails.some(email=>!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email)))throw new Error('Check the Google email addresses.');
  return {id,title,memberEmails};
}
export function belongsTo(household,account){
  if(!household||!account)return false;
  return household.memberEmails?.includes(account.email)===true || household.schemaVersion!==2 && household.memberUids?.includes(account.uid)===true;
}
export function memberLabel(account){
  return account.email==='talrme@gmail.com'?'Tal':account.email==='sophiegreen2@gmail.com'?'Sophie':String(account.displayName||account.email?.split('@')[0]||'Member').trim().slice(0,80);
}
