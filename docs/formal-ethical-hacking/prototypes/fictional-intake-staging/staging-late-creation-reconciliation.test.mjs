import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './staging-test-fixtures.mjs';

test('late channel creation remains quarantined and retry creates no duplicate', {timeout:10000}, async t => {
 const f=await fixture(t);
 let enter,release,settled;
 const entered=new Promise(resolve=>{enter=resolve;});
 const held=new Promise(resolve=>{release=resolve;});
 const finished=new Promise(resolve=>{settled=resolve;});
 const original=f.guild.channels.create;
 f.guild.channels.create=async function(...args){
  enter();
  await held;
  try{return await original.apply(this,args);}finally{settled();}
 };
 const preparing=f.coordinator.prepare(f.ctx);
 try{
  await entered;
  const result=await preparing;
  assert.equal(result.ok,false);
  assert.equal(result.reason,'reconcile-required');
  assert.equal(f.journal.state,'reconcile-required');
  assert.equal(f.journal.channelId,undefined);
  assert.equal(f.created,0);
  release();
  await finished;
  assert.equal(f.created,1);
  assert.ok(f.channel);
  assert.equal(f.journal.state,'reconcile-required');
  assert.equal(f.journal.channelId,undefined);
  const retry=await f.coordinator.prepare(f.ctx);
  assert.equal(retry.ok,false);
  assert.equal(retry.reason,'reconcile-required');
  assert.equal(f.created,1);
 }finally{
  release();
  await preparing;
  await finished;
 }
});
