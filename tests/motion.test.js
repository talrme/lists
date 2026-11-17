import test from 'node:test';
import assert from 'node:assert/strict';
import {restore,presets,labels} from '../shared/motion.js';
test('Existing animation preferences migrate without overriding Off or Gentle',()=>{
 assert.equal(restore({motion:'off'}).animationLevel,'off');
 assert.equal(restore({motion:'gentle'}).animationLevel,'light');
 assert.equal(restore({motion:'playful'}).animationLevel,'medium');
});
test('Presets cover every effect and custom toggles survive reload',()=>{
 for(const values of Object.values(presets))assert.deepEqual(Object.keys(values),Object.keys(labels));
 assert(Object.values(presets.off).every(value=>value===false));
 assert(Object.values(presets.wild).every(value=>value===true));
 assert(!presets.medium.ambient);assert(presets.medium.confetti);
 assert.equal(restore({animationLevel:'custom',animations:{confetti:false}}).animations.confetti,false);
 assert.equal(restore({animationLevel:'invalid',motion:'off'}).animationLevel,'off');
});
