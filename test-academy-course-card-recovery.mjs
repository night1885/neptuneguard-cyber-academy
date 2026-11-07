import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {withAcademyCourseCards} from './academy-course-card-ui.mjs';
const source=await readFile(new URL('./certification-runtime.js',import.meta.url),'utf8');
const match=source.match(/    const respond = content => \{[\s\S]*?\n    \};/);
assert.ok(match,'Self-contained outer responder required');
assert.ok(!match[0].includes('replyAcademyCardNotice'),'Outer recovery must not depend on a stripped import');
const key=Symbol.for('neptuneguard.academy.course-card-response');
function responder(interaction){const context={interaction};runInNewContext(match[0]+';globalThis.respond=respond;',context);return context.respond;}
for(const format of ['legacy','card','marked'])for(const deferred of [false,true])test(`outer recovery ${format} deferred=${deferred}`,async()=>{
 const calls=[],interaction={deferred,message:{flags:{has:n=>format==='card'&&n===32768}},reply:p=>calls.push(['reply',JSON.parse(JSON.stringify(p))]),editReply:p=>calls.push(['edit',JSON.parse(JSON.stringify(p))])};
 if(format==='marked')interaction[key]=true;
 await responder(interaction)('Outcome unconfirmed. Check current status before retrying.');
 assert.equal(calls.length,1);const [method,p]=calls[0];assert.equal(method,deferred?'edit':'reply');assert.deepEqual(p.allowedMentions,{parse:[]});
 if(format==='legacy'){assert.equal(p.flags,deferred?undefined:64);assert.ok(p.content.includes('Outcome unconfirmed'));}
 else{assert.equal(p.flags,deferred?32768:32832);assert.ok(!('content'in p));assert.ok(!('embeds'in p));assert.equal(p.components[0].type,10);}
});
test('real card adapter marks a converted legacy reply for isolated outer recovery',async()=>{
 const guildId='333333333333333333',actor='111111111111111111',bot='222222222222222222',calls=[];
 const interaction={guildId,guild:{id:guildId},user:{id:actor,bot:false},client:{user:{id:bot}},customId:'cert:course:catalog:0',isButton:()=>true,message:{author:{id:bot},interactionMetadata:{user:{id:actor}},flags:{has:n=>n===64}},async deferReply(){this.deferred=true;},async editReply(p){calls.push(p);},async reply(p){this.replied=true;calls.push(p);}};
 await withAcademyCourseCards(async i=>{await i.deferReply({flags:64});await i.editReply({content:'Course page',components:[]});return true;},{guildId})(interaction);
 assert.equal(interaction[key],true);await responder(interaction)('Outcome unconfirmed');assert.equal(calls.at(-1).flags,32768);assert.ok(!('embeds'in calls.at(-1)));
});
