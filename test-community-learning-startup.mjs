import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachNativeCommunityRuntime } from './community-learning-startup.mjs';
const guildId = '111111111111111111', roleId = '222222222222222222';
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({ roleExists = true, failure = false } = {}) {
  const state = { pools: 0, checked: 0, closed: 0, config: null };
  const client = new EventEmitter(); client.isReady = () => false;
  client.guilds = { async fetch(id) { assert.equal(id, guildId); return { id, roles: { async fetch(role) { assert.equal(role, roleId); return roleExists ? { id: roleId, guild: { id: guildId } } : null; } } }; } };
  const env = { COMMUNITY_LEARNING_ENABLED: 'true', GUILD_ID: guildId, VERIFIED_ROLE_ID: roleId,
    COMMUNITY_DATABASE_URL: 'postgresql://academy_community_learning:fixture-only@database.example/academy',
    CERTIFICATION_DATABASE_URL: 'postgresql://cert_reader:fixture-only@database.example/academy' };
  const dependencies = { createPool(config) { state.pools++; state.config = config; return { on() {}, async end() { state.closed++; } }; },
    async verifyDatabase(pool, database) { assert.equal(database, 'academy'); state.checked++; if (failure) throw new Error('fixture private detail'); return { ready: true }; } };
  return { state, client, env, dependencies };
}
test('disabled native startup creates no pool or event listeners', async () => {
  const f = fixture(); f.env.COMMUNITY_LEARNING_ENABLED = 'false';
  const runtime = attachNativeCommunityRuntime(f.client, guildId, f.env, f.dependencies);
  assert.equal(f.state.pools, 0); assert.equal(f.client.eventNames().length, 0); await runtime.detach();
});
test('native wiring pins TLS, database, login, pool limits and search path', async () => {
  const f = fixture(), runtime = attachNativeCommunityRuntime(f.client, guildId, f.env, f.dependencies);
  assert.equal(f.state.config.ssl.rejectUnauthorized, true); assert.equal(f.state.config.max, 2); assert.ok(f.state.config.options.includes('search_path=pg_catalog,public,pg_temp'));
  f.client.emit('clientReady'); await tick(); assert.equal(runtime.ready, true); assert.equal(f.state.checked, 1);
  await runtime.detach(); assert.equal(f.state.closed, 1);
});
test('wrong host, wrong database, shared login, and non-loopback TLS disable fail before pool creation', () => {
  for (const mutate of [env => env.COMMUNITY_DATABASE_URL = 'postgresql://academy_community_learning:fixture-only@other.example/academy',
    env => env.COMMUNITY_DATABASE_URL = 'postgresql://academy_community_learning:fixture-only@database.example/other',
    env => env.COMMUNITY_DATABASE_URL = env.CERTIFICATION_DATABASE_URL, env => env.COMMUNITY_DATABASE_TLS = 'disable']) {
    const f = fixture(); mutate(f.env); assert.throws(() => attachNativeCommunityRuntime(f.client, guildId, f.env, f.dependencies)); assert.equal(f.state.pools, 0);
  }
});
test('database readiness failure or missing Verified role never opens the runtime', async () => {
  for (const options of [{ failure: true }, { roleExists: false }]) {
    const f = fixture(options), runtime = attachNativeCommunityRuntime(f.client, guildId, f.env, f.dependencies);
    f.client.emit('clientReady'); await tick(); assert.equal(runtime.ready, false); await runtime.detach(); assert.equal(f.state.closed, 1);
  }
});
