import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultColumnOrder,normalizeColumnOrder,visibleColumnOrder} from '../shared/column-order.js';
test('desktop defaults place Waiting after Week, second when merged',()=>{
 assert.deepEqual(normalizeColumnOrder(),['today','upcoming','waiting','later','someday']);
 assert.deepEqual(visibleColumnOrder(null,{merged:true,someday:true}),['today','waiting','later','someday']);
});
test('column orders normalize malformed, repeated and missing entries',()=>{
 for(const value of [null,{},'waiting'])assert.deepEqual(normalizeColumnOrder(value),defaultColumnOrder);
 assert.deepEqual(normalizeColumnOrder(['waiting','unknown','waiting','later']),['waiting','later','today','upcoming','someday']);
});
test('merged columns occupy the earlier Today/Week slot, hidden Someday is not forgotten',()=>{
 const order=['waiting','upcoming','later','someday','today'];
 assert.deepEqual(visibleColumnOrder(order,{merged:true,someday:true}),['waiting','today','later','someday']);
 assert.deepEqual(visibleColumnOrder(order),['waiting','upcoming','later','today']);
 assert.deepEqual(visibleColumnOrder(order,{someday:true}),order);
});
