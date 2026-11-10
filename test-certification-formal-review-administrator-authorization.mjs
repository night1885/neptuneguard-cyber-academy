import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewAdministratorAuthorization as create} from './formal-review-administrator-authorization.mjs';
const guildId='100000000000000001',actorId='100000000000000002',learnerId='100000000000000003';
const scope=()=>({guildId,actorId,learnerId,studentId:'fictional-student',courseKey:'ethical-hacking-reading',exerciseKey:'EH-NET-02',workId:'11111111-1111-4111-8111-111111111111',sourceChannelId:'100000000000000004'});
test('administrator authority rechecks every call and denies permission loss',async()=>{
 let permitted=true,calls=0;const p=create({guildId,isReady:()=>true,verifyAdministrator:async id=>{assert.equal(id,actorId);calls++;return permitted;}});
 assert.equal(await p.authorizeReviewer(scope()),true);permitted=false;assert.equal(await p.authorizeReviewer(scope()),false);permitted=true;assert.equal(await p.authorizeReviewer(scope()),true);assert.equal(calls,3);p.dispose();assert.equal(await p.authorizeReviewer(scope()),false);await p.drain();
});
test('self review, foreign guild and malformed scopes do not invoke verifier',async()=>{
 let calls=0;const p=create({guildId,isReady:()=>true,verifyAdministrator:async()=>{calls++;return true;}});
 for(const value of [null,{...scope(),actorId:learnerId},{...scope(),guildId:actorId},{...scope(),workId:'bad'},{...scope(),courseKey:'other'},{...scope(),extra:true}])assert.equal(await p.authorizeReviewer(value),false);assert.equal(calls,0);p.dispose();await p.drain();
});
test('provider exceptions, nonboolean results and readiness loss deny',async()=>{
 for(const verifyAdministrator of [async()=>{throw Error('fictional');},async()=>1,async()=>false]){const p=create({guildId,isReady:()=>true,verifyAdministrator});assert.equal(await p.authorizeReviewer(scope()),false);p.dispose();await p.drain();}
 let ready=true;const p=create({guildId,isReady:()=>ready,verifyAdministrator:async()=>{ready=false;return true;}});assert.equal(await p.authorizeReviewer(scope()),false);p.dispose();await p.drain();
});
test('timeout denies late success and drain retains outstanding verification',async()=>{
 let release;const p=create({guildId,isReady:()=>true,timeoutMs:20,verifyAdministrator:()=>new Promise(resolve=>{release=resolve;})});
 assert.equal(await p.authorizeReviewer(scope()),false);let drained=false;const draining=p.drain().then(()=>{drained=true;});await Promise.resolve();assert.equal(drained,false);release(true);await draining;p.dispose();assert.equal(await p.authorizeReviewer(scope()),false);
});
test('default provider fetches current guild, member and roles',async()=>{
 let admin=true;const calls=[];const guild={id:guildId,members:{async fetch(options){calls.push(['member',options]);return {id:actorId,guild:{id:guildId},permissions:{has:()=>admin}};}},roles:{async fetch(){calls.push(['roles']);}}};
 const client={guilds:{async fetch(options){calls.push(['guild',options]);return guild;}}};
 const p=create({guildId,client,isReady:()=>true});assert.equal(await p.authorizeReviewer(scope()),true);admin=false;assert.equal(await p.authorizeReviewer(scope()),false);assert.equal(calls.length,6);assert.deepEqual(calls[0],['guild',{guild:guildId,force:true}]);assert.deepEqual(calls[1],['member',{user:actorId,force:true,cache:false}]);p.dispose();await p.drain();
});
