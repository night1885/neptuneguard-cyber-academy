import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FIRST_JOURNEY_PAGES,FIRST_PRACTICAL_REVIEW_PAGES,createFormalDraftLessonLoader} from './formal-first-journey-content.mjs';
import {inspectPagination,extractMarkdownLinks} from './formal-render-audit.mjs';
const footer='Draft review only. Reading does not grant enrollment, exercise authorization, completion or an award. Report intake and reviewer actions are unavailable.';
test('all eleven opt-in documents preserve exact source bytes and publish bounded audit metadata',async t=>{
 const load=createFormalDraftLessonLoader({allowDraftContent:true,allowReadOnlyWorksheet:true});assert.equal(FIRST_JOURNEY_PAGES.length,10);assert.equal(FIRST_PRACTICAL_REVIEW_PAGES.length,11);
 for(const p of FIRST_PRACTICAL_REVIEW_PAGES){const bytes=await readFile(new URL(p.path,import.meta.url)),raw=bytes.toString('utf8'),first=await load({courseKey:'ethical-hacking',cursor:p.key+':0'}),fragments=[];
  for(let n=0;n<first.pageCount;n++){const page=await load({courseKey:'ethical-hacking',cursor:p.key+':'+n}),head=`${p.title} — draft page ${n+1}/${first.pageCount}\n`,tail='\n\n'+footer;assert.equal(page.pageKey,p.key);assert.equal(page.pageIndex,n);assert.equal(page.pageCount,first.pageCount);assert.ok(page.content.startsWith(head)&&page.content.endsWith(tail)&&page.content.length<=1900);fragments.push(page.content.slice(head.length,-tail.length));}
  assert.ok(Buffer.from(fragments.join(''),'utf8').equals(bytes));const inspection=inspectPagination(raw,fragments);
  t.diagnostic(JSON.stringify({document:p.key,bytes:bytes.length,pages:first.pageCount,sha256:createHash('sha256').update(bytes).digest('hex'),...inspection,relativeReferences:extractMarkdownLinks(raw).filter(l=>l.kind==='relative').length,releaseApproval:false}));
 }
});
