import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileLessonReadings} from './source-readings.mjs';
import {createReadingCatalogueRenderer} from './reading-catalogue.mjs';
import {createReadingReviewWorkspace} from './reading-workspace.mjs';
const K='formal-ethical-hacking',A='100000000000000001',B='100000000000000002',G='100000000000000003',C='100000000000000004',M='100000000000000005',R='100000000000000006';
const ids=['EH-LAB-00','EH-LAB-01','EH-LAB-02','EH-LAB-03','EH-LAB-04','EH-LAB-05','EH-LINUX-01','EH-LINUX-02','EH-LINUX-03','EH-LINUX-04','EH-LINUX-05','EH-NET-01','EH-NET-02'];
const profiles={
 './reading-sources.json':{ids:['EH-LAB-00','EH-LAB-01','EH-LAB-02'],bytes:37989,pages:32,views:79},
 './lab-linux-sources.json':{ids:['EH-LINUX-01','EH-LINUX-02','EH-LINUX-03','EH-LINUX-04','EH-LINUX-05'],bytes:46678,pages:38,views:83},
 './foundation-sources.json':{ids:['EH-LAB-03','EH-LAB-04','EH-LAB-05','EH-NET-01','EH-NET-02'],bytes:57366,pages:48,views:93}
};
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
function data(profile){
 const spec=profiles[profile];assert.ok(spec,'Only the three fixed reviewed profiles may be loaded');
 const catalogue=load('../../curriculum-catalogue.json'),manifests=Object.fromEntries(Object.keys(profiles).map(p=>[p,load(p)]));
 const union=[];
 for(const [p,m] of Object.entries(manifests)){
  assert.deepEqual(m.entries.map(e=>e.id),profiles[p].ids);
  assert.equal(m.runtimeIntegration,false);assert.equal(m.publishable,false);assert.equal(m.status,'draft-source-review');
  assert.equal(m.sourceCommit,'4ae5f6deab77b5e369436366c9850b670e52b0ff');
  for(const e of m.entries){assert.equal(e.path,`lessons/${e.id}.md`);union.push(e.id);}
 }
 assert.equal(new Set(union).size,13);assert.equal(union.length,13);assert.deepEqual([...union].sort(),[...ids].sort());
 const selected=new Set(union);for(const l of catalogue.lessons)if(selected.has(l.id))for(const req of l.requires)assert.ok(selected.has(req),`${l.id} missing ${req} across reviewed profiles`);
 const manifest=manifests[profile],sources=Object.fromEntries(manifest.entries.map(e=>[e.id,{path:e.path,text:readFileSync(new URL('../../'+e.path,import.meta.url),'utf8')}]));
 assert.equal(Object.values(sources).reduce((n,s)=>n+Buffer.byteLength(s.text),0),spec.bytes);
 return {courseId:K,catalogue,labels:load('./catalogue-labels.json'),manifest,sources};
}
function harness(t,profile){
 const d=data(profile),spec=profiles[profile],model=createReadingCatalogueRenderer(d),chunks=compileLessonReadings(d);assert.deepEqual([model.readingLessonCount,model.readingPageCount,model.pageCount],[spec.ids.length,spec.pages,spec.views]);assert.ok(model.pageCount<=100);
 const state={grant:true,role:true,n:0};
 const control=createReadingReviewWorkspace({enabled:true,...d,guildId:G,entryChannelId:C,verifiedRoleId:R,readMember:async()=>({id:A,guild:{id:G},roles:{cache:{has:r=>state.role&&r===R}}}),readCourseGrant:async()=>state.grant?{student_id:'SYNTHETIC',course_key:K}:null,clock:()=>0,makeToken:()=>(++state.n).toString(16).padStart(32,'0')});t.after(()=>control.dispose());
 const interaction=(customId='fws:open',extra={})=>({customId,user:{id:A},guildId:G,channelId:C,message:{id:M,flags:{has:b=>b===64}},calls:[],isButton:()=>true,async deferReply(p){this.deferred=true;this.ephemeral=p.flags===64;this.calls.push(['deferReply',p]);},async deferUpdate(){this.deferred=true;this.calls.push(['deferUpdate']);},async reply(p){this.last=p;this.calls.push(['reply',p]);},async editReply(p){this.last=p;this.calls.push(['editReply',p]);return this.message;},...extra});
 const button=(i,a)=>{const b=i.last.components.flatMap(r=>r.components).find(b=>b.custom_id.endsWith(':'+a));assert.ok(b,a);return b;};
 const move=async(i,a)=>{const b=button(i,a);assert.notEqual(b.disabled,true);const n=interaction(b.custom_id);await control.handle(n);return n;};
 async function openLesson(id){const index=d.catalogue.lessons.findIndex(l=>l.id===id);assert.ok(index>=0);const group=Math.floor(index/3);let i=interaction();await control.handle(i);assert.equal(i.ephemeral,true);for(let g=0;g<group;g++)i=await move(i,'next');const card=model.render({courseId:K,page:group}).cards.find(c=>c.title.startsWith(id+':'));assert.ok(card);return {i:await move(i,`open-${card.target}`),group};}
 return {state,control,model,chunks,interaction,button,move,openLesson};
}
function cleared(i){assert.deepEqual(i.last.embeds,[]);assert.deepEqual(i.last.components,[]);assert.deepEqual(i.last.attachments,[]);assert.equal(i.calls.some(c=>c[1]?.embeds?.length||c[1]?.files?.length),false);}
for(const id of ids){
 const profile=Object.keys(profiles).find(p=>profiles[p].ids.includes(id));
 test(`${id}: Open all pages Previous and Home`,async t=>{const h=harness(t,profile),opened=await h.openLesson(id),pages=h.chunks[id];let i=opened.i;for(let p=0;p<pages.length;p++){assert.equal(i.last.content,`Draft source reading - ${id} ${p+1}/${pages.length}`);assert.equal(i.last.embeds[0].description,pages[p].display);assert.equal(i.calls[0][0],'deferUpdate');assert.equal(h.button(i,'prev').disabled,p===0);assert.equal(h.button(i,'next').disabled,p===pages.length-1);if(p+1<pages.length)i=await h.move(i,'next');}for(let p=pages.length-2;p>=0;p--){i=await h.move(i,'prev');assert.equal(i.last.embeds[0].description,pages[p].display);}i=await h.move(i,'home');assert.equal(i.last.content,h.model.render({courseId:K,page:opened.group}).heading);});
 test(`${id}: grant revocation clears payload`,async t=>{const h=harness(t,profile),{i}=await h.openLesson(id);h.state.grant=false;cleared(await h.move(i,'next'));});
 test(`${id}: role revocation clears payload`,async t=>{const h=harness(t,profile),{i}=await h.openLesson(id);h.state.role=false;cleared(await h.move(i,'next'));});
 test(`${id}: foreign and stale controls denied`,async t=>{const h=harness(t,profile),{i}=await h.openLesson(id),old=h.button(i,'next').custom_id;const other=h.interaction(old,{user:{id:B}});await h.control.handle(other);assert.deepEqual(other.last.embeds,[]);assert.equal(other.last.flags,64);const advanced=await h.move(i,'next');assert.equal(advanced.last.embeds.length,1);const stale=h.interaction(old);await h.control.handle(stale);assert.deepEqual(stale.last.embeds,[]);assert.equal(stale.last.flags,64);});
}
