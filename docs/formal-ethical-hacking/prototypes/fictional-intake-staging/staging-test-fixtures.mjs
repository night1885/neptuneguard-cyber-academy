import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createStagingStorage} from './staging-storage.mjs';
import {createStagingChannels} from './staging-channels.mjs';
import {createStagingRetention} from './staging-retention.mjs';
import {createFictionalStagingSourceReader} from './fictional-intake-staging-source-reader.mjs';
import {createNoModalIntakeCoordinator} from '../synthetic-workspace/no-modal-intake.mjs';
const G='100000000000000001',B='100000000000000002',E='100000000000000003',A='100000000000000004',O='100000000000000099',C='100000000000000005',M='100000000000000006',X='100000000000000088';
const R='11111111-1111-1111-1111-111111111111';const DAY=86400000,V=1024n,S=2048n,H=65536n;
// This backend is a SCRIPTED CONTRACT MODEL, not PostgreSQL or SQL execution evidence.
export async function fixture(t){
 const f={now:Date.now(),rev:0,active:true,journal:null,journalExpiry:Date.now()+DAY,reports:new Map(),drafts:new Map(),messages:new Map(),sql:[],created:0,deleted:0,release:0,outsiderAdmin:false,failDelete:false,failQuery:false};
 const profile={mode:'fictional-intake-staging',fictionalReportsOnly:true,staging:{guildId:G,botId:B,entryChannelId:E,operatorId:A,database:{host:'stage.invalid',port:'5432',name:'fictional_intake'}},production:{guildId:'200000000000000001',botId:'200000000000000002',database:{host:'prod.invalid',port:'5432',name:'production'}}};
 const scope={courseKey:'demo-course',exerciseKey:'demo-exercise'};
 function model(args){const [actor,guild,record,course,exercise,op,raw]=args,p=JSON.parse(raw);assert.equal(guild,G);assert.equal(record,R);assert.equal(course,scope.courseKey);assert.equal(exercise,scope.exerciseKey);
  if(['due','claim','erase','noteDraft','maintenance','retireJournal'].includes(op))assert.equal(actor,O);else{assert.equal(actor,A);if(!f.active)throw Error('unavailable');}
  if(op==='resolve')return {ok:true,recordId:R,learnerId:A,...scope,revision:f.rev};
  if(op==='journalRead')return {ok:true,journal:f.now>=f.journalExpiry?{state:'reconcile-required'}:f.journal};
  if(op==='journalWrite'){f.journal={...p};return {ok:true};}
  if(op==='maintenance')return {ok:true,journal:f.journal??{state:'unprovisioned'},journalExpiresAtMs:f.journalExpiry};
  if(op==='retireJournal'){if(f.now>=f.journalExpiry&&!f.reports.size&&!f.drafts.size)f.journal={state:'erased'};return {ok:true};}
  if(op==='noteDraft'){if(![...f.reports.values()].some(r=>r.sourceMessageId===p.messageId)&&!f.drafts.has(p.messageId))f.drafts.set(p.messageId,{...p,deadlineMs:p.createdAtMs+DAY,kind:'draft'});return {ok:true};}
  if(op==='receipt'){const r=f.reports.get(p.requestId);if(r&&f.now>=r.expiresAtMs)throw Error('expired');return r??null;}
  if(op==='submit'){assert.equal(p.expectedRevision,f.rev);assert.equal(p.digest,createHash('sha256').update(p.body).digest('hex'));if(f.now>=p.createdAtMs+DAY)throw Error('expired');f.rev++;
   const r={ok:true,reportId:randomUUID(),recordId:R,learnerId:A,revision:f.rev,digest:p.digest,submittedAtMs:f.now,expiresAtMs:f.now+DAY,sourceGuildId:G,sourceChannelId:p.channelId,sourceMessageId:p.messageId,sourceCreatedAtMs:p.createdAtMs,body:p.body};f.reports.set(p.requestId,r);f.drafts.delete(p.messageId);f.journalExpiry=r.expiresAtMs;return r;}
  if(op==='discover')return {ok:true,items:[...f.reports].filter(([,r])=>f.now<r.expiresAtMs).map(([q,r])=>({requestId:q,reportId:r.reportId,revision:r.revision,expiresAtMs:r.expiresAtMs})).slice(0,p.limit)};
  if(op==='due'){const items=[];for(const r of f.reports.values())if(f.now>=r.expiresAtMs){r.body=null;r.digest=null;items.push({kind:'report',id:r.reportId,channelId:r.sourceChannelId,messageId:r.sourceMessageId,deadlineMs:r.expiresAtMs});}for(const d of f.drafts.values())if(f.now>=d.deadlineMs)items.push(d);return {ok:true,items:items.slice(0,20)};}
  if(op==='claim'){const d=f.drafts.get(p.messageId);if(d)d.claimed=true;return {ok:true,claimed:!!d};}
  if(op==='erase'){assert.equal(p.confirmed,true);if(p.kind==='report'){for(const [q,r]of f.reports)if(r.reportId===p.id)f.reports.delete(q);}else f.drafts.delete(p.messageId);if(f.now>=f.journalExpiry&&!f.reports.size&&!f.drafts.size)f.journal={state:'erased'};return {ok:true};}
  throw Error('unknown operation');
 }
 const pool={async query(){return {rows:[{db:'fictional_intake',actor:'fictional_stage_worker',contract:1,elevated:false,can_create:false,table_access:false}]};},async connect(){const client={async query(sql,args){f.sql.push({client,sql,args});if(f.failQuery&&args)throw Error('fixture-private-marker');if(!args)return {rows:[]};assert.equal(sql,'SELECT fi_stage.dispatch($1,$2,$3::uuid,$4,$5,$6,$7::jsonb) AS r');return {rows:[{r:model(args)}]};},release(){f.release++;}};return client;}};
 const members=new Map([B,A,O,X].map(id=>[id,{id,guild:{id:G},user:{bot:id===B},permissions:{has(p){return id===B&&p==='ManageChannels'||id===O&&p==='Administrator'||id===X&&f.outsiderAdmin&&p==='Administrator';}}}]));
 function channelFrom(overwrites){const cache=new Map(overwrites.map(o=>[o.id,{type:o.type,allow:{bitfield:o.allow},deny:{bitfield:o.deny}}]));return {id:C,guildId:G,type:0,parentId:null,
  permissionOverwrites:{cache,async edit(id,p){const a=cache.get(id);for(const [k,bit]of [['ViewChannel',V],['SendMessages',S],['ReadMessageHistory',H]]){if(p[k]===true){a.allow.bitfield|=bit;a.deny.bitfield&=~bit;}if(p[k]===false){a.deny.bitfield|=bit;a.allow.bitfield&=~bit;}}}},
  permissionsFor(member){return {has(p){if(member.id===O)return true;if(member.id===X)return f.outsiderAdmin;const a=cache.get(member.id);return p==='ViewChannel'?!!(a.allow.bitfield&V):p==='SendMessages'?!!(a.allow.bitfield&S):p==='ReadMessageHistory'?!!(a.allow.bitfield&H):member.id===B;}};},
  messages:{async fetch(p){if(p.message)return f.messages.get(p.message);return new Map([...f.messages].reverse().slice(0,p.limit));},async delete(id){if(f.failDelete)throw Error('unknown');if(!f.messages.has(id)){const e=Error();e.code=10008;throw e;}f.messages.delete(id);f.deleted++;}}};}
 const guild={id:G,ownerId:O,memberCount:4,roles:{async fetch(){}},members:{async list(p){assert.equal(p.limit,1000);return members;}},channels:{async fetch(id){assert.equal(id,C);return f.channel;},async create(p){f.created++;assert.equal(p.parent,null);assert.equal(p.permissionOverwrites.find(x=>x.id===A).allow,0n);f.channel=channelFrom(p.permissionOverwrites);return f.channel;}}};
 const client={user:{id:B},isReady:()=>true,guilds:{async fetch(){return guild;}}},resources={client,pool};
 f.resources=resources;f.guild=guild;f.members=members;
 f.store=createStagingStorage({profile,scope,recordId:R,reviewerId:O,expectedRole:'fictional_stage_worker',getResources:()=>resources});await f.store.initialize();
 f.channels=createStagingChannels({profile,reviewerId:O,store:f.store,getResources:()=>resources,isReady:()=>f.store.ready,now:()=>f.now});
 f.reader=createFictionalStagingSourceReader({enabled:true,...profile},{getClient:()=>client,isReady:()=>f.store.ready,resolve:f.store.resolve,authorize:f.store.authorize,journalRead:f.store.journalRead,verifyPrivate:f.channels.verifyPrivate,now:()=>f.now});
 const unsupported=async()=>{throw Error('unsupported');};
 f.coordinator=createNoModalIntakeCoordinator({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:profile.production.guildId,ownerId:O,courseKey:scope.courseKey,policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:1000},{...f.store,...f.channels,latest:f.reader.latest,exact:f.reader.exact,now:()=>f.now,readReport:unsupported,publishTrackedReview:unsupported,review:unsupported,claimDraft:unsupported,deleteDraft:unsupported,finishDraft:unsupported});
 f.retention=createStagingRetention({store:f.store,channels:f.channels,now:()=>f.now});f.ctx={actorId:A,guildId:G};
 f.add=(id=M,body='Fictional laboratory report.')=>f.messages.set(id,{id,guildId:G,channelId:C,author:{id:A,bot:false},webhookId:null,partial:false,system:false,type:0,reference:null,attachments:new Map(),messageSnapshots:new Map(),stickers:new Map(),components:[],poll:null,content:body,createdTimestamp:f.now-1000});
 t.after(async()=>{await f.retention.stop();f.coordinator.dispose();f.reader.dispose();f.channels.dispose();f.store.dispose();});return f;
}