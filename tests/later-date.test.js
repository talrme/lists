import test from 'node:test';
import assert from 'node:assert/strict';
import {laterDate,addDays} from '../shared/core.js';

test('flexible later shortcuts choose five nearby weekdays, not the same fixed date',()=>{
 for(const day of ['2026-11-18','2026-12-31','2027-01-31','2028-01-31','2026-03-07']){
  for(const period of ['fortnight','month','two-months']){
   const dates=Array.from({length:5},(_,i)=>laterDate(day,period,()=>i/5));
   assert.equal(new Set(dates).size,5);
   for(const date of dates){assert(date>day);assert(![0,6].includes(new Date(date+'T12:00:00Z').getUTCDay()));}
   assert(dates[4]<=addDays(dates[0],6));
  }
 }
 assert.equal(laterDate('2027-01-31','month',()=>.4),'2027-03-01');
 assert.equal(laterDate('2028-01-31','month',()=>.4),'2028-02-29');
 assert.throws(()=>laterDate('bad','month'));
});
