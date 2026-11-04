import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './staging-test-fixtures.mjs';
const A='100000000000000004',C='100000000000000005';
test('missing guild ManageRoles fails audit and prevents channel creation',async t=>{
 const f=await fixture(t);f.manageRoles=false;
 await assert.rejects(f.channels.auditGuild(),/unavailable/);
 const result=await f.coordinator.prepare(f.ctx);
 assert.equal(result.ok,false);assert.equal(f.created,0);assert.equal(f.overwriteEdits,0);
 assert.equal(f.journal.state,'reconcile-required');assert.equal(f.journal.channelId,undefined);
});
test('missing effective channel ManageRoles preserves restricted reconciliation reference',async t=>{
 const f=await fixture(t);f.channelManageRoles=false;
 const result=await f.coordinator.prepare(f.ctx);
 assert.equal(result.ok,false);assert.equal(f.created,1);assert.equal(f.overwriteEdits,0);
 assert.equal(f.journal.state,'reconcile-required');assert.equal(f.journal.channelId,C);
 assert.equal(f.channel.permissionOverwrites.cache.get(A).allow.bitfield,0n);
});
test('guild permission loss after creation cannot admit learner or discard channel reference',async t=>{
 const f=await fixture(t),create=f.guild.channels.create;
 f.guild.channels.create=async(...args)=>{const channel=await create(...args);f.manageRoles=false;return channel;};
 const result=await f.coordinator.prepare(f.ctx);
 assert.equal(result.ok,false);assert.equal(f.created,1);assert.equal(f.overwriteEdits,0);
 assert.equal(f.journal.state,'reconcile-required');assert.equal(f.journal.channelId,C);
 assert.equal(f.channel.permissionOverwrites.cache.get(A).allow.bitfield,0n);
});
test('authorized admission succeeds and fixture rejects later unauthorized overwrite edits',async t=>{
 const f=await fixture(t),result=await f.coordinator.prepare(f.ctx);
 assert.equal(result.ok,true);assert.equal(f.journal.state,'available');assert.equal(f.overwriteEdits,1);
 assert.equal(f.channel.permissionOverwrites.cache.size,4);
 f.manageRoles=false;
 await assert.rejects(f.channel.permissionOverwrites.edit(A,{ViewChannel:false}),error=>error.code===50013);
 assert.equal(f.overwriteEdits,1);
});
