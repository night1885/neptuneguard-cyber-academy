import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createFormalDraftLessonLoader,FIRST_JOURNEY_PAGES} from './formal-first-journey-content.mjs';
const footer='Draft review only. Reading does not grant enrollment, exercise authorization, completion or an award. Report intake and reviewer actions are unavailable.';
const root=new URL('./',import.meta.url);
test('actual-source allowlist remains bounded and excludes instructor/authoring paths',()=>{
 assert.equal(FIRST_JOURNEY_PAGES.length,10);assert.equal(new Set(FIRST_JOURNEY_PAGES.map(p=>p.key)).size,10);
 for(const p of FIRST_JOURNEY_PAGES){assert.match(p.path,/^docs\/formal-ethical-hacking\/(?:START-HERE\.md|lessons\/[A-Z0-9-]+\.md)$/);assert.doesNotMatch(p.path,/authoring|instructor|prototype/i);}
});
for(const p of FIRST_JOURNEY_PAGES)test('actual source text survives rendering: '+p.key,async t=>{
 const bytes=await readFile(new URL(p.path,root));assert.ok(bytes.length>0&&bytes.length<=131072);
 const load=createFormalDraftLessonLoader({allowDraftContent:true,repositoryRoot:root});
 const first=await load({courseKey:'ethical-hacking',cursor:`${p.key}:0`});
 assert.ok(Number.isSafeInteger(first.pageCount)&&first.pageCount>0&&first.pageCount<=9999);
 const pieces=[];let oddFencePages=0;
 for(let n=0;n<first.pageCount;n++){
  const page=await load({courseKey:'ethical-hacking',cursor:`${p.key}:${n}`});
  assert.equal(page.pageKey,p.key);assert.equal(page.pageIndex,n);assert.equal(page.pageCount,first.pageCount);assert.ok(page.content.length<=1900);
  const prefix=`${p.title} — draft page ${n+1}/${first.pageCount}\n`,suffix=`\n\n${footer}`;
  assert.equal(page.content.startsWith(prefix),true);assert.equal(page.content.endsWith(suffix),true);
  const body=page.content.slice(prefix.length,-suffix.length);pieces.push(body);
  if((body.match(/(?:^|\n)[ \t]{0,3}(?:`{3,}|~{3,})/g)||[]).length%2)oddFencePages++;
 }
 assert.deepEqual(Buffer.from(pieces.join(''),'utf8'),bytes);
 await assert.rejects(load({courseKey:'ethical-hacking',cursor:`${p.key}:${first.pageCount}`}));
 t.diagnostic(JSON.stringify({document:p.key,bytes:bytes.length,renderedPages:first.pageCount,sha256:createHash('sha256').update(bytes).digest('hex'),oddFencePages,notice:'Fence count is heuristic and non-gating; text preservation does not establish readable or safe Markdown continuation.'}));
});
