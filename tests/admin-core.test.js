import test from 'node:test';
import assert from 'node:assert/strict';
import {belongsTo,householdDraft,isAdministrator} from '../shared/households.js';
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
