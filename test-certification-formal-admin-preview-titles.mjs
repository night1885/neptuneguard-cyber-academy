import test from 'node:test';
import assert from 'node:assert/strict';
import {formalLessonTitle as title} from './certification-formal-lesson-title.mjs';
const id='EH-LAB-00';
for(const [heading,expected] of [
 [id+' — Authorization',id+' — Authorization'],
 [id+' – Authorization',id+' — Authorization'],
 [id+' - Authorization',id+' — Authorization'],
 [id+': Authorization',id+' — Authorization'],
 ['Authorization',id+' — Authorization'],
 [id,id],['',id],[undefined,id],
 [id+' — '+id+' — Authorization',id+' — Authorization'],
 ['EH-LAB-01 — Other',id+' — EH-LAB-01 — Other'],
 ['A reference to '+id,id+' — A reference to '+id]
])test('formal title '+JSON.stringify(heading),()=>assert.equal(title({id,heading}),expected));
test('bounded title',()=>assert.equal(title({id,heading:'x'.repeat(1000)}).length,256));
test('Unicode-safe title clip',()=>{const p=title({id,heading:'x'.repeat(255-id.length-3)+'🛡'});assert.ok(p.length<=256);assert.ok(!/[\uD800-\uDBFF]$/.test(p));});
for(const bad of ['',null,'../EH-LAB-00','EH-lab-00','EH-'+ 'A'.repeat(70)])test('invalid title identity '+JSON.stringify(bad),()=>assert.throws(()=>title({id:bad,heading:'Text'}),TypeError));
