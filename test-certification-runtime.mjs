import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachCertificationRuntime } from './certification-runtime.js';

const guildId = '1339276399390887957';
const tick = () => new Promise(resolve => setImmediate(resolve));

function clientFixture() {
  const client = new EventEmitter();
  client.isReady = () => false;
  client.guilds = { async fetch() { throw new Error('Unexpected guild lookup'); } };
  return client;
}

test('disabled runtime registers no listeners', () => {
  const client = clientFixture();
  const runtime = attachCertificationRuntime(client, {}, guildId, {});
  assert.equal(runtime.enabled, false);
  assert.equal(client.eventNames().length, 0);
  runtime.detach();
});

test('missing schema keeps runtime unavailable and detach removes listeners', async () => {
  const client = clientFixture();
  const pool = { async query() { return { rows: [{ agreements: null, enrollments: null, labs: null, audit: null }] }; } };
  const runtime = attachCertificationRuntime(client, pool, guildId, { CERTIFICATION_ENABLED: 'true' });
  client.emit('clientReady');
  await tick();
  assert.equal(runtime.ready, false);
  runtime.detach();
  assert.equal(client.listenerCount('interactionCreate'), 0);
  assert.equal(client.listenerCount('clientReady'), 0);
});

test('startup-pending certification interaction receives private unavailable reply', async () => {
  const client = clientFixture();
  const runtime = attachCertificationRuntime(client, {}, guildId, { CERTIFICATION_ENABLED: 'true' });
  const replies = [];
  client.emit('interactionCreate', {
    isButton: () => true, isModalSubmit: () => false, customId: 'cert:admin:overview:0',
    async reply(payload) { replies.push(payload); }
  });
  await tick();
  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, 64);
  assert.match(replies[0].content, /unavailable/);
  runtime.detach();
});

test('unrelated academy interaction is untouched', async () => {
  const client = clientFixture();
  const runtime = attachCertificationRuntime(client, {}, guildId, { CERTIFICATION_ENABLED: 'true' });
  let replies = 0;
  client.emit('interactionCreate', {
    isButton: () => true, isModalSubmit: () => false, customId: 'academy:existing',
    async reply() { replies++; }
  });
  await tick();
  assert.equal(replies, 0);
  runtime.detach();
});
