import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createFormalReviewDiscovery} from './formal-review-discovery.mjs';
import {createFormalReviewOwnerBrowser} from './formal-review-owner-browser.mjs';
const G='100000000000000001',O='100000000000000002',D='100000000000000003',A='100000000000000004',C='100000000000000005',B='100000000000000006',E='100000000000000007';
function fixture(mode='current-administrator'){
 let permitted=true,queries=0;const actors=[],events=[],workId=randomUUID(),reportId=randomUUID(),stamp=Date.now();
 const verifyAdministrator=async id=>id===D&&permitted;
 const discovery=createFormalReviewDiscovery({enabled:true,guildId:G,ownerId:O,isReady:()=>true,now:()=>stamp,reviewerMode:mode,...(mode==='current-administrator'?{verifyAdministrator}:{}),readPool:{async query(sql,args){queries++;assert.deepEqual(args,[G,A]);return {rows:[{work_id:workId,report_id:reportId,guild_id:G,learner_id:A}]};}},core:{enabled:true,async read(ctx){actors.push(ctx.actorId);return {ok:true,reportId,revision:1,expiresAtMs:stamp+60000,body:'PRIVATE FICTIONAL BODY',review:{decision:'review-recorded',feedback:'PRIVATE FICTIONAL FEEDBACK'}};}}});
 const reviewer={enabled:true,handle:async()=>false,dispose(){},drain:async()=>{}};
 const browser=createFormalReviewOwnerBrowser({enabled:true,guildId:G,ownerId:O,channelId:C,applicationId:B,botId:B,reviewer,discovery,isReady:()=>true,now:()=>stamp,reviewerMode:mode,...(mode==='current-administrator'?{verifyAdministrator}:{})});
 function interaction(actor=D,origin=actor){return {id:'100000000000000099',customId:'frr:list:'+A+':0',guildId:G,applicationId:B,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:actor},message:{author:{id:B},flags:{has:n=>n===64},interactionMetadata:{user:{id:origin}}},inGuild:()=>true,isButton:()=>true,async deferUpdate(){this.deferred=true;},async editReply(p){events.push(p);},async reply(p){events.push(p);this.replied=true;}};}
 return {discovery,browser,actors,events,interaction,reportId,get queries(){return queries;},revoke(){permitted=false;},async close(){browser.dispose();await browser.drain();}};
}
test('Administrator discovery preserves actual actor and returns metadata only',async()=>{
 const f=fixture();try{const v=await f.discovery.list({actorId:D,guildId:G},{learnerId:A});assert.equal(v.ok,true);assert.equal(v.reports[0].reportId,f.reportId);assert.deepEqual(f.actors,[D]);assert.equal(JSON.stringify(v).includes('PRIVATE'),false);}finally{await f.close();}
});
test('learner own discovery remains allowed; another learner is denied before query',async()=>{
 const f=fixture();try{assert.equal((await f.discovery.list({actorId:A,guildId:G},{learnerId:A})).ok,true);const before=f.queries;assert.deepEqual(await f.discovery.list({actorId:E,guildId:G},{learnerId:A}),{ok:false});assert.equal(f.queries,before);}finally{await f.close();}
});
test('reviewer browser uses Administrator identity and rejects another origin',async()=>{
 const f=fixture();try{await f.browser.handle(f.interaction());assert.deepEqual(f.actors,[D]);assert.ok(f.events.at(-1).components.length>0);assert.equal(JSON.stringify(f.events).includes('PRIVATE'),false);const before=f.queries;await f.browser.handle(f.interaction(D,E));assert.equal(f.queries,before);assert.deepEqual(f.events.at(-1).components,[]);}finally{await f.close();}
});
test('permission loss and owner-mode policy prevent non-owner metadata access',async()=>{
 for(const mode of ['owner','current-administrator']){const f=fixture(mode);try{if(mode!=='owner')f.revoke();await f.browser.handle(f.interaction());assert.equal(f.queries,0);assert.deepEqual(f.events.at(-1).components,[]);}finally{await f.close();}}
});
