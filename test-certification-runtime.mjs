import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachCertificationRuntime } from './certification-runtime.js';

const guildId = '1339276399390887957';
const databaseEnvironment = { CERTIFICATION_DATABASE_URL: 'postgresql://cert_fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable' };
const tick = () => new Promise(resolve => setImmediate(resolve));
function clientFixture() {
  const client = new EventEmitter(); client.isReady = () => false;
  client.guilds = { async fetch() { throw new Error('Unexpected guild lookup'); } }; return client;
}
function attach(client, pool, env) {
  return attachCertificationRuntime(client, {}, guildId, { ...databaseEnvironment, ...env }, { createPool: () => ({ ...pool, async end() {} }) });
}

test('disabled runtime registers no listeners and ignores invalid unused database configuration', () => {
  const client = clientFixture();
  const runtime = attachCertificationRuntime(client, {}, guildId, { CERTIFICATION_DATABASE_URL: 'invalid', CERTIFICATION_DATABASE_TLS: 'invalid' },
    { createPool() { assert.fail('Disabled runtime must not create a pool'); } });
  assert.equal(runtime.enabled, false); assert.equal(client.eventNames().length, 0); runtime.detach();
});
test('missing schema keeps runtime unavailable and detach removes listeners', async () => {
  const client = clientFixture();
  const pool = { async query() { return { rows: [{ agreements: null, enrollments: null, labs: null, audit: null }] }; } };
  const runtime = attach(client, pool, { CERTIFICATION_ENABLED: 'true' });
  client.emit('clientReady'); await tick(); assert.equal(runtime.ready, false);
  await runtime.detach(); assert.equal(client.listenerCount('interactionCreate'), 0); assert.equal(client.listenerCount('clientReady'), 0);
});
test('startup-pending certification interaction receives private unavailable reply', async () => {
  const client = clientFixture(); const runtime = attach(client, {}, { CERTIFICATION_ENABLED: 'true' });
  const replies = []; client.emit('interactionCreate', {
    isButton: () => true, isModalSubmit: () => false, customId: 'cert:admin:overview:0',
    async reply(payload) { replies.push(payload); } });
  await tick(); assert.equal(replies.length, 1); assert.equal(replies[0].flags, 64); assert.match(replies[0].content, /unavailable/);
  await runtime.detach();
});
test('unrelated academy interaction is untouched', async () => {
  const client = clientFixture(); const runtime = attach(client, {}, { CERTIFICATION_ENABLED: 'true' });
  let replies = 0; client.emit('interactionCreate', {
    isButton: () => true, isModalSubmit: () => false, customId: 'academy:existing', async reply() { replies++; } });
  await tick(); assert.equal(replies, 0); await runtime.detach();
});
test('owned pool uses certification configuration instead of academy credentials and closes once', async () => {
  const client = clientFixture(); let ended = 0; let received;
  const source = { options: { connectionString: 'postgresql://academy_fixture:fixture@localhost/academy_test', ssl: { rejectUnauthorized: false } },
    async end() { assert.fail('Shared academy pool must not be closed'); } };
  const runtime = attachCertificationRuntime(client, source, guildId, { ...databaseEnvironment, CERTIFICATION_ENABLED: 'true' }, {
    createPool(connection) { received = connection; return { async end() { ended++; } }; } });
  assert.deepEqual(received, { connectionString: databaseEnvironment.CERTIFICATION_DATABASE_URL, ssl: false });
  assert.notEqual(received.connectionString, source.options.connectionString);
  const first = runtime.detach(); assert.equal(runtime.detach(), first); await first;
  assert.equal(ended, 1); assert.equal(runtime.ready, false);
});
test('detach waits for pending startup before ending owned pool', async () => {
  const client = clientFixture(); let release; let ended = 0;
  const runtime = attachCertificationRuntime(client, {}, guildId, { ...databaseEnvironment, CERTIFICATION_ENABLED: 'true' }, {
    createPool: () => ({ query() { return new Promise(resolve => { release = resolve; }); }, async end() { ended++; } }) });
  client.emit('clientReady'); const closed = runtime.detach(); await tick(); assert.equal(ended, 0);
  release({ rows: [{ agreements: null, enrollments: null, labs: null, audit: null }] });
  await closed; assert.equal(ended, 1); assert.equal(runtime.ready, false);
});
test('detach waits for tracked reply and stops admitting interactions', async () => {
  const client = clientFixture(); let release; let ended = 0; let replies = 0;
  const runtime = attachCertificationRuntime(client, {}, guildId, { ...databaseEnvironment, CERTIFICATION_ENABLED: 'true' }, {
    createPool: () => ({ async end() { ended++; } }) });
  const interaction = { isButton: () => true, isModalSubmit: () => false, customId: 'cert:admin:overview:0',
    reply() { replies++; return new Promise(resolve => { release = resolve; }); } };
  client.emit('interactionCreate', interaction); const closed = runtime.detach();
  client.emit('interactionCreate', interaction); await tick();
  assert.equal(replies, 1); assert.equal(ended, 0); release(); await closed; assert.equal(ended, 1);
});
test('invalid enabled configuration fails before pool creation', () => {
  let calls = 0; const client = clientFixture();
  assert.throws(() => attachCertificationRuntime(client, {}, guildId, { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'true' }, {
    createPool() { calls++; } }));
  assert.equal(calls, 0); assert.equal(client.eventNames().length, 0);
});
test('enabled runtime cannot fall back to shared academy URL before listener registration', () => {
  const client = clientFixture(); const source = { options: { connectionString: databaseEnvironment.CERTIFICATION_DATABASE_URL, ssl: false } };
  assert.throws(() => attachCertificationRuntime(client, source, guildId, { CERTIFICATION_ENABLED: 'true' }), /Explicit certification database URL required/);
  assert.equal(client.eventNames().length, 0);
});
test('remote TLS disable fails before factory invocation and listener registration', () => {
  const client = clientFixture(); let calls = 0;
  assert.throws(() => attachCertificationRuntime(client, {}, guildId, { CERTIFICATION_ENABLED: 'true',
    CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@database.example.invalid/certification_fixture', CERTIFICATION_DATABASE_TLS: 'disable' },
    { createPool() { calls++; } }), /loopback/);
  assert.equal(calls, 0); assert.equal(client.eventNames().length, 0);
});
