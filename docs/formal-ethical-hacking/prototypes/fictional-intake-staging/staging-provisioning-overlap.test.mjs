import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './staging-test-fixtures.mjs';

test('characterization: retention reports incomplete while channel creation is pending', async t => {
 const f = await fixture(t);
 let entered, release;
 const seen = new Promise(resolve => { entered = resolve; });
 const gate = new Promise(resolve => { release = resolve; });
 const originalCreate = f.guild.channels.create;
 f.guild.channels.create = async function (...args) {
  entered();
  await gate;
  return originalCreate.apply(this, args);
 };
 let timer;
 const deadline = new Promise((_, reject) => {
  timer = setTimeout(() => reject(Error('creation was not reached')), 500);
 });
 const preparation = f.coordinator.prepare(f.ctx);
 try {
  await Promise.race([seen, deadline]);
  clearTimeout(timer);
  assert.equal(f.journal.state, 'creating');
  const result = await f.retention.pass();
  assert.equal(result.complete, false);
  assert.equal(f.retention.admissionReady, false);
 } finally {
  clearTimeout(timer);
  release();
  await preparation;
 }
});
