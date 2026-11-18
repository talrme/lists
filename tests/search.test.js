import test from 'node:test';
import assert from 'node:assert/strict';
import {searchTasks} from '../shared/search.js';
test('search supports phrases, descriptions, accents and single-letter typos',()=>{
 const tasks=[{title:'Buy groceries',description:'Milk and café beans'},{title:'Call dentist'},{title:'Send photos'}];
 for(const query of ['groceris','milk','cafe','buy beans'])assert.equal(searchTasks(tasks,query)[0],tasks[0]);
 assert.deepEqual(searchTasks(tasks,''),[]);assert.deepEqual(searchTasks(tasks,'unrelated'),[]);
 assert.equal(searchTasks(tasks,'dentst')[0],tasks[1]);
});
