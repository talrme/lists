import test from 'node:test';
import assert from 'node:assert/strict';
import {belongsTo,householdDraft,isAdministrator} from '../shared/households.js';
import {isPlayground,playgroundDraft,playgroundEnvironment,playgroundSamples} from '../shared/playground.js';
const tal={uid:'test-tal',email:'talrme@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]};
test('Admin identity is not a sandbox preference or display name',()=>{
 assert(isAdministrator(tal));assert(!isAdministrator({...tal,email:'sophiegreen2@gmail.com'}));
 assert(!isAdministrator({...tal,emailVerified:false}));assert(!isAdministrator({...tal,providerData:[{providerId:'password'}]}));assert(!isAdministrator({uid:'tal',displayName:'Tal',admin:true}));
});
test('Household invitations normalize, deduplicate and validate',()=>{
 assert.deepEqual(householdDraft({id:' Friends ',title:' Friends ',emails:'ALICE@example.com\nbob@example.com;alice@example.com'}),{id:'friends',title:'Friends',memberEmails:['alice@example.com','bob@example.com']});
 for(const input of [{id:'../home',title:'Home',emails:'a@example.com'},{id:'home',title:'',emails:'a@example.com'},{id:'home',title:'Home',emails:'not email'}])assert.throws(()=>householdDraft(input));
});
test('Membership helpers do not silently enroll the admin in a household',()=>{
 assert(belongsTo({schemaVersion:2,memberEmails:['talrme@gmail.com']},tal));
 assert(!belongsTo({schemaVersion:2,memberEmails:['alice@example.com'],memberUids:['test-tal']},tal));
 assert(belongsTo({memberUids:['test-tal']},tal));assert(!belongsTo({schemaVersion:2,memberEmails:['alice@example.com']},tal));
});
test('Playground requires its reserved ID, marker and a valid run',()=>{
 const value={id:'playground',kind:'playground',playgroundRun:'11111111-1111-4111-8111-111111111111'};
 assert(isPlayground(value));assert(!isPlayground({...value,id:'home'}));assert(!isPlayground({...value,kind:'real'}));assert(!isPlayground({...value,playgroundRun:'../../home'}));
 assert.equal(playgroundEnvironment(value,'staging'),'playground-'+value.playgroundRun);assert.equal(playgroundEnvironment({id:'home'},'staging'),'staging');
});
test('Playground invitations retain admin and examples belong only to the actual seeding user',()=>{
 const draft=playgroundDraft('sophiegreen2@gmail.com');assert.equal(draft.id,'playground');assert(draft.memberEmails.includes('talrme@gmail.com'));
 const examples=playgroundSamples('synthetic-user','2026-11-16');assert.equal(examples.length,9);assert(examples.every(task=>task.ownerUid==='synthetic-user'&&task.title.startsWith('[Test]')&&task.id.startsWith('playground-example-')));assert(examples.some(task=>task.visibility==='shared'));assert(examples.some(task=>task.waiting));assert(examples.some(task=>task.dueDate==='2026-11-17'));
 assert.deepEqual(examples.map(t=>t.id),playgroundSamples('synthetic-user','2026-11-17').map(t=>t.id));
});
