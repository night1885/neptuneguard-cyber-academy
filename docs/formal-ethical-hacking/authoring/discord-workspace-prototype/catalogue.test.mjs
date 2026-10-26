import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalogueRenderer } from './catalogue.mjs';
import { createCatalogueReviewWorkspace } from './catalogue-workspace.mjs';
import { buildCardFrame } from './cards.mjs';
const source=()=>JSON.parse(readFileSync(new URL('../../curriculum-catalogue.json',import.meta.url),'utf8'));
const labels=JSON.parse(readFileSync(new URL('./catalogue-labels.json',import.meta.url),'utf8'));
const K='formal-ethical-hacking', A='100000000000000001', G='100000000000000002', C='100000000000000003', R='100000000000000004';
const render=(c=source(),l=structuredClone(labels))=>createCatalogueRenderer({courseId:K,catalogue:c,labels:l});
const view=page=>render().render({courseId:K,page});
function harness(){
  const state={allowed:true,now:0,n:0}, flags={has:()=>true};
  const control=createCatalogueReviewWorkspace({enabled:true,guildId:G,entryChannelId:C,courseId:K,verifiedRoleId:R,catalogue:source(),labels,
    clock:()=>state.now,makeToken:()=>(++state.n).toString(16).padStart(32,'0'),readMember:async()=>({id:A,guild:{id:G},roles:{cache:flags}}),readCourseGrant:async()=>state.allowed?{student_id:'SYNTHETIC',course_key:K}:null});
  const interaction=(customId='fws:open',extra={})=>({customId,guildId:G,channelId:C,user:{id:A},message:{id:R,flags},isButton:()=>true,calls:[],
    async deferReply(p){this.deferred=true;this.ephemeral=p.flags===64;},async deferUpdate(){this.deferred=true;},async reply(p){this.calls.push(p);},async editReply(p){this.last=p;this.calls.push(p);return this.message;},...extra});
  const move=async(i,action)=>{const b=i.last.components.flatMap(r=>r.components).find(b=>b.custom_id.endsWith(':'+action)),n=interaction(b.custom_id);await control.handle(n);return n;};
  return {state,control,interaction,move,async open(){const i=interaction();await control.handle(i);return i;}};
}
const cases=[
['counts',()=>{const r=render();assert.deepEqual([r.lessonCount,r.groupCount,r.pageCount],[37,13,50]);}],
['all IDs',()=>{const ids=[];for(let p=0;p<13;p++)ids.push(...view(p).cards.map(c=>c.title.split(': ')[0]));assert.deepEqual(ids,source().lessons.map(l=>l.id));}],
['all frames',()=>{for(let p=0;p<50;p++){const f=buildCardFrame(view(p),{pages:50});assert.ok(f.payload.embeds.length<=3);assert.ok(f.payload.files.length<=3);}}],
['all edges',()=>{let n=0;source().lessons.forEach((l,i)=>l.requires.forEach(id=>{assert.ok(view(13+i).cards[0].description.includes(id));n++;}));assert.equal(n,65);}],
['contextual Home',()=>{for(let i=0;i<37;i++)assert.equal(view(13+i).routes.home,Math.floor(i/3));}],
['group endpoints',()=>{assert.equal(view(0).routes.prev,null);assert.equal(view(12).routes.next,null);assert.equal(view(49).routes.next,null);}],
['metadata limits',()=>{assert.match(view(13).cards[0].description,/lesson body is not loaded/);assert.match(view(13).cards[0].description,/No completion/);}],
['draft flags',()=>{for(const change of [{publishable:true},{runtimeIntegration:true},{labDelivery:'hosted'}])assert.throws(()=>render({...source(),...change}));}],
['bad edges',()=>{for(const requires of [['unknown'],['EH-LAB-01'],['EH-LAB-00','EH-LAB-00']]){const c=source();c.lessons[1].requires=requires;assert.throws(()=>render(c));}}],
['cycles and IDs',()=>{const c=source();c.lessons[0].requires=['EH-LAB-01'];assert.throws(()=>render(c));const d=source();d.lessons[1].id=d.lessons[0].id;assert.throws(()=>render(d));}],
['labels',()=>{const l={...labels};delete l['EH-LAB-00'];assert.throws(()=>render(source(),l));assert.throws(()=>render(source(),{...labels,unknown:'x'}));assert.throws(()=>render(source(),{...labels,'EH-LAB-00':'@everyone'}));}],
['snapshots',()=>{const c=source(),l={...labels},r=render(c,l);c.lessons[0].requires.push('MUTATED');l['EH-LAB-00']='MUTATED';assert.equal(JSON.stringify(r.render({courseId:K,page:13})).includes('MUTATED'),false);}],
['cursors',()=>{const r=render();for(const req of [{courseId:'other',page:0},{courseId:K,page:true},{courseId:K,page:50},{courseId:K,page:0,owner:A}])assert.throws(()=>r.render(req));}],
['route bounds',()=>{for(const routes of [{prev:null,home:50,next:1},{prev:null,home:0,next:true},{prev:null,home:0,next:1,url:'x'}])assert.throws(()=>buildCardFrame({...view(0),routes},{pages:50}));}],
['default off',async()=>{const h=harness(),i=h.interaction();assert.equal(await createCatalogueReviewWorkspace().handle(i),false);assert.equal(i.calls.length,0);h.control.dispose();}],
['private browse',async()=>{const h=harness();let i=await h.open();i=await h.move(i,'next');i=await h.move(i,'open-16');assert.match(i.last.embeds[0].title,/EH-LINUX-01/);i=await h.move(i,'home');assert.match(i.last.content,/cards 2\/13/);assert.equal(i.calls.length,1);h.control.dispose();}],
['disabled route',async()=>{const h=harness();let i=await h.open();for(let n=0;n<12;n++)i=await h.move(i,'next');assert.equal(i.last.components[0].components[2].disabled,true);i=await h.move(i,'next');assert.deepEqual(i.last.embeds,[]);h.control.dispose();}],
['foreign and stale',async()=>{const h=harness(),i=await h.open(),id=i.last.components[1].components[0].custom_id,other=h.interaction(id,{user:{id:R}});await h.control.handle(other);assert.equal(other.calls.some(p=>p.embeds?.length),false);await h.move(i,'next');const stale=h.interaction(id);await h.control.handle(stale);assert.equal(stale.calls.some(p=>p.embeds?.length),false);h.control.dispose();}],
['revocation',async()=>{const h=harness(),i=await h.open();h.state.allowed=false;const denied=await h.move(i,'next');assert.deepEqual(denied.last.embeds,[]);assert.deepEqual(denied.last.attachments,[]);assert.deepEqual(denied.last.components,[]);h.control.dispose();}],
['expiry',async()=>{const h=harness(),i=await h.open();h.state.now=600000;const stale=await h.move(i,'next');assert.equal(stale.calls.some(p=>p.embeds?.length),false);assert.match((await h.open()).last.content,/cards 1\/13/);h.control.dispose();}]
];
for(const [name,run] of cases)test(name,run);
