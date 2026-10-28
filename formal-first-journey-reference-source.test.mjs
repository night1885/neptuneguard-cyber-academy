import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FIRST_JOURNEY_PAGES,reviewedDraftReferences,resolveDraftReference,relatedReadingFor,createFormalDraftLessonLoader} from './formal-first-journey-content.mjs';
import {extractMarkdownLinks} from './formal-render-audit.mjs';
const root=new URL('./',import.meta.url);
test('reviewed reference pairs still match all actual simple relative links in the ten-document source',async()=>{
 const actual=[];
 for(const p of FIRST_JOURNEY_PAGES){const raw=await readFile(new URL(p.path,root),'utf8');for(const r of extractMarkdownLinks(raw))if(r.kind==='relative')actual.push(p.key+'|'+r.target);}
 const reviewed=reviewedDraftReferences().map(r=>r.sourceKey+'|'+r.target);assert.equal(actual.length,14);assert.deepEqual(actual.sort(),reviewed.sort());
 assert.equal(FIRST_JOURNEY_PAGES.length,10);assert.equal(reviewedDraftReferences().filter(r=>resolveDraftReference(r.sourceKey,r.target).available).length,9);
});
for(const ref of reviewedDraftReferences().filter(r=>r.pageKey))test('reviewed related cursor loads only its existing actual lesson: '+ref.pageKey,async()=>{
 const resolved=resolveDraftReference(ref.sourceKey,ref.target),load=createFormalDraftLessonLoader({allowDraftContent:true,repositoryRoot:root});
 const page=await load({courseKey:'ethical-hacking',cursor:resolved.cursor});assert.equal(page.pageKey,ref.pageKey);assert.equal(page.pageIndex,0);assert.ok(page.content.length<=1900);
 assert.equal(relatedReadingFor(ref.sourceKey).available.some(r=>r.cursor===resolved.cursor),true);
});
