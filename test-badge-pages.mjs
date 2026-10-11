import assert from 'node:assert/strict';
import { buildBadgePage } from './badge-pages.js';
let checks=0;
for(const count of [0,1,6,7,28,100]) {
 const badges=Array.from({length:count},(_,i)=>({badge_name:`Badge ${i}: `+'x'.repeat(200),earned_at:new Date()}));
 const pages=Math.max(1,Math.ceil(count/6));
 for(let p=0;p<pages;p++) {
  const payload=buildBadgePage(badges,p);
  assert.ok(payload.content.length<=2000);checks++;
  assert.ok(payload.content.includes(`Page ${p+1}/${pages}`));checks++;
  assert.ok(payload.components.length<=1);checks++;
 }
}
assert.throws(()=>buildBadgePage([],99),/Invalid badge page/);checks++;
console.log(`PASS: ${checks} badge-page checks. No network access.`);
