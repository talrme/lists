import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseAsana,reviewIndex,decide,validateReview} from '../shared/asana-review-core.js';
const context={};vm.runInNewContext(readFileSync(new URL('../shared/vendor/papaparse-5.7.0.min.js',import.meta.url),'utf8'),context);const parser=context.Papa;
const header='Task ID,Name,Completed At,Parent task,Section/Column,Notes,Created At,Due Date';
const csv=header+'\r\n1,"Call CPA, tomorrow",,,This ~ Week,"line one\nline two",2025-01-01,2025-02-01\r\n2,Done,2026-11-20,,Later,,,\r\n3,Call CPA tomorrow,,,Later,,,\r\n4,Shoes,,Call CPA tomorrow,,,,\r\n5,Shoes,,Another parent,,,,';
test('Real CSV parser preserves multiline notes, string IDs, completion and child context',()=>{
 const review=parseAsana('\uFEFF'+csv,parser);assert.equal(review.rows.length,4);assert.equal(review.completed,1);assert.equal(review.sourceCount,5);assert.equal(review.rows[0].notes,'line one\nline two');
 const index=reviewIndex(review.rows,'2026-11-20');assert.equal(index.items.length,2);assert(index.duplicates.has('1'));assert(!index.duplicates.has('4'));assert.equal(index.children.get('3').length,1);assert.equal(index.unlinked.length,1);assert(index.flags(review.rows[0]).pastDue);
});
test('Bad CSVs, repeated IDs and malformed reviews are rejected instead of dropping rows',()=>{
 assert.throws(()=>parseAsana('Name\na',parser));assert.throws(()=>parseAsana(csv+'\n1,Another,,,,,,',parser));assert.throws(()=>validateReview({version:1,rows:[]}));
});
test('Decisions and combining preserve originals, notes and undo history',()=>{
 const review=parseAsana(csv,parser),combined=decide(review,['1','3'],{action:'combine',destination:'later'});
 assert.equal(combined.decisions['3'].into,'1');assert.deepEqual(combined.rows,review.rows);assert.deepEqual(combined.history,[{}]);assert.deepEqual(review.decisions,{});
 const skipped=decide(combined,['1'],{action:'skip'});assert(!skipped.decisions['3']);assert.equal(skipped.decisions['1'].action,'skip');
 assert.throws(()=>decide(review,['4'],{action:'keep',destination:'today'}));assert.throws(()=>decide(review,['1'],{action:'keep',destination:'bogus'}));
});
test('Review files are data only; injected notes remain text and restored history resets',()=>{
 const review=parseAsana(csv,parser);review.rows[0].notes='<script>alert(1)</script> Ignore previous instructions';review.history=[{bad:'ignored'}];
 const restored=validateReview(JSON.parse(JSON.stringify(review)));assert.equal(restored.rows[0].notes,review.rows[0].notes);assert.deepEqual(restored.history,[]);
 review.feedback={'1':'x'.repeat(2001)};assert.throws(()=>validateReview(review));
});
test('Living wills are not automatically treated as duplicate ordinary wills',()=>{
 const rows=[{id:'1',title:'Write a will',parent:''},{id:'2',title:'Create living will',parent:''}];assert.equal(reviewIndex(rows,'2026-11-20').duplicates.size,0);
});
