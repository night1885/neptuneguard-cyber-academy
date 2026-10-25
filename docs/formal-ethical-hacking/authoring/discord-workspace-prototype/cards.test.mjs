import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createWorkspace } from './navigation.mjs';
import { createCardRenderer, buildCardFrame } from './cards.mjs';
import { createCardArt } from './card-art.mjs';
import { createCardReviewWorkspace } from './card-workspace.mjs';
const bundle = () => JSON.parse(readFileSync(new URL('./draft-pages.json', import.meta.url), 'utf8'));
const A='100000000000000001', B='100000000000000002', G='100000000000000003', C='100000000000000004', R='100000000000000005', M='100000000000000006', K='formal-ethical-hacking';
const flags={has: bit => bit === 64};
function harness() {
  const state={allowed:true,now:0,token:0};
  const config={enabled:true,guildId:G,entryChannelId:C,courseId:K,verifiedRoleId:R,bundle:bundle(),clock:()=>state.now,
    makeToken:()=>(++state.token).toString(16).padStart(32,'0'),
    readMember:async()=>({id:A,guild:{id:G},roles:{cache:{has:()=>true}}}),
    readCourseGrant:async()=>state.allowed?{student_id:'SYNTHETIC',course_key:K}:null};
  const control=createCardReviewWorkspace(config);
  const interaction=(customId='fws:open',extra={})=>({customId,guildId:G,channelId:C,user:{id:A},message:{id:M,flags},calls:[],isButton:()=>true,
    async deferReply(p){this.deferred=true;this.ephemeral=p.flags===64;this.calls.push(['deferReply',p]);},
    async deferUpdate(){this.deferred=true;this.calls.push(['deferUpdate']);},
    async reply(p){this.replied=true;this.calls.push(['reply',p]);},
    async editReply(p){this.last=p;this.calls.push(['editReply',p]);return {id:M,flags};},...extra});
  const open=async()=>{const i=interaction();await control.handle(i);return i;};
  return {state,control,interaction,open,config};
}
const renderer=()=>createCardRenderer({courseId:K,bundle:bundle()});
const view=()=>renderer().render({courseId:K,page:0});
const button=(i,action)=>i.last.components.flatMap(r=>r.components).find(b=>b.custom_id.endsWith(':'+action)).custom_id;
test('three home cards have short previews and explicit destinations',()=>{
  const v=view();assert.equal(v.cards.length,3);assert.deepEqual(v.cards.map(c=>c.target),[1,2,3]);assert.ok(v.cards.every(c=>c.description.length<=180));
});
test('reading view is a full illustrated card, not a text module list',()=>{
  const v=renderer().render({courseId:K,page:1});assert.equal(v.cards.length,1);assert.equal(v.cards[0].target,null);assert.ok(v.cards[0].description.length>180);
});
test('card frame uses native accent embeds and attachment-only thumbnails',()=>{
  const frame=buildCardFrame(view(),{pages:4});assert.equal(frame.payload.embeds.length,3);assert.equal(new Set(frame.payload.embeds.map(e=>e.color)).size,3);
  assert.ok(frame.payload.embeds.every(e=>/^attachment:\/\/card-(scope|prepare|evidence)\.png$/.test(e.thumbnail.url)));
  assert.deepEqual(frame.payload.attachments,[]);assert.equal(frame.choices.length,3);
});
test('illustrations are bounded original PNGs with matching hashes',()=>{
  for(const key of ['scope','prepare','evidence']){const art=createCardArt(key),b=Buffer.from(art.base64,'base64');assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16),96);assert.equal(b.readUInt32BE(20),96);assert.ok(b.length<=4096);assert.equal(createHash('sha256').update(b).digest('hex'),art.sha256);}
});
test('file payloads are byte buffers, never external paths',()=>{
  for(const f of buildCardFrame(view(),{pages:4}).payload.files){assert.equal(Buffer.isBuffer(f.attachment),true);assert.match(f.name,/^card-[a-z]+\.png$/);assert.ok(f.description.length>0);}
});
test('unknown art, external media and additional frame payloads are rejected',()=>{
  for(const mutate of [v=>{v.cards[0].art='https://example.invalid/a.png';},v=>{v.cards[0].url='https://example.invalid';},v=>{v.files=[];}]){const v=view();mutate(v);assert.throws(()=>buildCardFrame(v,{pages:4}));}
});
test('oversized descriptions and duplicate targets are rejected',()=>{
  for(const mutate of [v=>{v.cards[0].description='x'.repeat(1601);},v=>{v.cards[1].target=1;}]){const v=view();mutate(v);assert.throws(()=>buildCardFrame(v,{pages:4}));}
});
test('review-only bundle and explicit card-count limit are enforced',()=>{
  const b=bundle();b.pages.push({...b.pages[0],id:'fourth'});assert.throws(()=>createCardRenderer({courseId:K,bundle:b}));
  b.pages.pop();b.publishable=true;assert.throws(()=>createCardRenderer({courseId:K,bundle:b}));
});
test('card composition is default-off',async()=>{const h=harness(),i=h.interaction();assert.equal(await createCardReviewWorkspace().handle(i),false);assert.equal(i.calls.length,0);});
test('home privately renders cards and three bound Open buttons',async()=>{
  const h=harness(),i=await h.open();assert.equal(i.calls[0][1].flags,64);assert.equal(i.last.embeds.length,3);assert.equal(i.last.components[1].components.length,3);assert.deepEqual(i.last.allowedMentions,{parse:[]});h.control.dispose();
});
test('Open and Home edit the same private workspace without new navigation replies',async()=>{
  const h=harness(),home=await h.open(),i=h.interaction(button(home,'open-2'));await h.control.handle(i);assert.equal(i.calls[0][0],'deferUpdate');assert.equal(i.last.embeds[0].title,'Before a practical');assert.equal(i.last.files.length,1);assert.deepEqual(i.last.attachments,[]);
  const back=h.interaction(button(i,'home'));await h.control.handle(back);assert.equal(back.last.embeds.length,3);assert.equal(back.calls.some(c=>c[0]==='reply'||c[0]==='deferReply'),false);h.control.dispose();
});
test('stale Open buttons do not apply a second transition',async()=>{
  const h=harness(),home=await h.open(),id=button(home,'open-1');await h.control.handle(h.interaction(id));const stale=h.interaction(id);await h.control.handle(stale);assert.equal(stale.calls[0][0],'reply');assert.equal(stale.calls.some(c=>c[1]?.embeds?.length),false);h.control.dispose();
});
test('wrong actor or public message cannot open a card',async()=>{
  const h=harness(),home=await h.open();for(const extra of [{user:{id:B}},{message:{id:M,flags:{has:()=>false}}}]){const i=h.interaction(button(home,'open-1'),extra);await h.control.handle(i);assert.equal(i.calls.some(c=>c[1]?.embeds?.length),false);}h.control.dispose();
});
test('revocation clears card embeds, files retained by the message, and controls',async()=>{
  const h=harness(),home=await h.open();h.state.allowed=false;const i=h.interaction(button(home,'open-1'));await h.control.handle(i);assert.deepEqual(i.last.embeds,[]);assert.deepEqual(i.last.attachments,[]);assert.deepEqual(i.last.components,[]);h.control.dispose();
});
test('expired card controls require fresh button entry',async()=>{
  const h=harness(),home=await h.open();h.state.now=600000;const stale=h.interaction(button(home,'open-1'));await h.control.handle(stale);assert.equal(stale.calls.some(c=>c[1]?.embeds?.length),false);const fresh=await h.open();assert.equal(fresh.last.embeds.length,3);h.control.dispose();
});
test('targets not offered on the current card view fail closed',async()=>{
  const h=harness(),home=await h.open(),detail=h.interaction(button(home,'open-1'));await h.control.handle(detail);
  const forged=h.interaction(button(detail,'home').replace(':home',':open-2'));await h.control.handle(forged);assert.equal(forged.calls.some(c=>c[1]?.embeds?.length),false);h.control.dispose();
});
test('structured card output is rejected without explicit card opt-in',async()=>{
  const h=harness(),c=createWorkspace({...h.config,authorize:async()=>true,render:()=>view(),pages:4}),i=h.interaction();await c.handle(i);assert.equal(i.calls.some(c=>c[1]?.embeds?.length),false);c.dispose();h.control.dispose();
});
test('card renderer snapshots content rather than retaining mutable bundle objects',()=>{
  const b=bundle(),r=createCardRenderer({courseId:K,bundle:b});b.pages[0].text='MUTATED';assert.equal(r.render({courseId:K,page:1}).cards[0].description.includes('MUTATED'),false);
});
