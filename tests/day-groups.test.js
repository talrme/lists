import test from 'node:test';
import assert from 'node:assert/strict';
import {dayGroups,groupDay} from '../shared/day-groups.js';

test('expanded days merge weekends and extend a Saturday ending through Sunday',()=>{
 const groups=dayGroups('2026-11-17',5);
 assert.deepEqual(groups.map(g=>[g.start,g.end]),[['2026-11-17','2026-11-17'],['2026-11-18','2026-11-18'],['2026-11-19','2026-11-19'],['2026-11-20','2026-11-20'],['2026-11-21','2026-11-22']]);
 assert(groups.at(-1).weekend);assert.equal(groupDay('2026-11-22',groups),'2026-11-21');
});
test('single day does not include tomorrow, and Sunday never creates a drop date in the past',()=>{
 assert.deepEqual(dayGroups('2026-11-21',1),[{start:'2026-11-21',end:'2026-11-21',weekend:false}]);
 const sunday=dayGroups('2026-11-22',5);assert.deepEqual(sunday[0],{start:'2026-11-22',end:'2026-11-22',weekend:true});
 const saturday=dayGroups('2026-11-21',2);assert.equal(saturday.length,1);assert.equal(saturday[0].end,'2026-11-22');
});
test('grouping crosses months, years, and DST without duplicated or missing dates',()=>{
 for(const today of ['2026-12-30','2026-10-30','2026-11-01','2026-02-27'])for(const count of [2,5,7,14]){
  const groups=dayGroups(today,count);assert.equal(groups[0].start,today);
  for(let i=1;i<groups.length;i++)assert.equal(Date.parse(groups[i].start)-Date.parse(groups[i-1].end),86400000);
  assert(groups.every(g=>g.start<=g.end));assert(!groups.some(g=>new Date(g.end+'T12:00:00Z').getUTCDay()===6));
 }
});
