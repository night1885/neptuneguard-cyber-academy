import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachCertificationRuntime } from './certification-runtime.js';

const guildId = '1339276399390887957';
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(enabled) {
  const client = new EventEmitter();
  client.isReady = () => false;
  let created = 0;
  let ended = 0;
  const runtime = attachCertificationRuntime(client, {}, guildId, {
    CERTIFICATION_ENABLED: String(enabled),
    CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
    CERTIFICATION_DATABASE_URL: 'postgresql://cert_fixture:fixture@localhost/certification_test',
    CERTIFICATION_DATABASE_TLS: 'disable'
  }, {
    createPool() {
      created++;
      return {
        async query() { assert.fail('These event-gating tests must not query the database'); },
        async end() { ended++; }
      };
    }
  });
  return { client, runtime, created: () => created, ended: () => ended };
}

function menu(customId, replies) {
  return {
    customId, values: ['overview'],
    isButton: () => false,
    isModalSubmit: () => false,
    isStringSelectMenu: () => true,
    async reply(payload) { replies.push(payload); }
  };
}

test('runtime admits certification dropdowns while startup is pending and replies privately', async () => {
  const f = fixture(true);
  const replies = [];
  try {
    f.client.emit('interactionCreate', menu('cert:admin:section', replies));
    await tick();
    assert.equal(replies.length, 1);
    assert.equal(replies[0].flags, 64);
    assert.match(replies[0].content, /unavailable/);
  } finally { await f.runtime.detach(); }
  assert.equal(f.ended(), 1);
  assert.equal(f.client.listenerCount('interactionCreate'), 0);
});

test('runtime leaves unrelated dropdowns untouched', async () => {
  const f = fixture(true);
  const replies = [];
  try {
    f.client.emit('interactionCreate', menu('academy:existing', replies));
    await tick();
    assert.equal(replies.length, 0);
  } finally { await f.runtime.detach(); }
  assert.equal(f.ended(), 1);
});

test('explicitly disabled runtime creates no pool or listeners and ignores dropdowns', async () => {
  const f = fixture(false);
  const replies = [];
  try {
    assert.equal(f.runtime.enabled, false);
    assert.equal(f.created(), 0);
    assert.equal(f.client.eventNames().length, 0);
    f.client.emit('interactionCreate', menu('cert:admin:section', replies));
    await tick();
    assert.equal(replies.length, 0);
  } finally { await f.runtime.detach(); }
  assert.equal(f.ended(), 0);
});
