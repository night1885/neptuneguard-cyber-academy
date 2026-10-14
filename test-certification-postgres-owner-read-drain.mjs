import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setImmediate as tick, setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { createCertificationDatabasePool } from './certification-database-pool.js';
import { createGuardedOwnerReads } from './certification-owner-read-guard.js';
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567'; const guild = '1339276399390887956';
function interaction() { return { customId: 'cert:console:overview:0', user: { id: owner }, guildId: guild, deferred: false, replies: [], isButton: () => true, isModalSubmit: () => false, async deferReply(options) { this.deferred = true; this.options = options; }, async reply(payload) { this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); } }; }
test('real PostgreSQL pool close waits for timed-out owner reads on success and statement failure', { skip: !databaseUrl, timeout: 30000 }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol)); assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const observer = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: '-c statement_timeout=5000' });
  try {
    assert.equal((await observer.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    for (const failLate of [false, true]) {
      const pool = createCertificationDatabasePool({ connectionString: databaseUrl }, { max: 1, statementTimeoutMs: failLate ? 1000 : 3000, lockTimeoutMs: 50 }); let closing; let queryDone = false; let closed = false; let calls = 0; let lateError;
      try {
        const tag = `cert_drain_${randomUUID().replaceAll('-', '')}`; await pool.query("SELECT set_config('application_name',$1,false)", [tag]);
        const handle = createGuardedOwnerReads(async i => {
          calls++; await i.deferReply({ flags: 64 });
          try { await pool.query('SELECT pg_sleep($1)', [failLate ? 2 : 1]); } catch (error) { lateError = error; throw error; } finally { queryDone = true; }
          await i.editReply({ content: 'Late database result' }); return true;
        }, { enabled: true, ownerId: owner }, guild, { responseTimeoutMs: 20 });
        const first = interaction(); await handle(first); assert.equal(queryDone, false); assert.equal(first.options.flags, 64); assert.equal(first.replies.length, 1); assert.match(first.replies[0].content, /result is not confirmed/); assert.deepEqual(first.replies[0].allowedMentions, { parse: [] });
        let sleeping = false;
        for (let attempt = 0; attempt < 10; attempt++) { const result = await observer.query("SELECT COUNT(*)::int AS count FROM pg_stat_activity WHERE application_name=$1 AND state='active' AND wait_event='PgSleep'", [tag]); if (result.rows[0].count === 1) { sleeping = true; break; } await delay(10); }
        assert.equal(sleeping, true);
        const busy = interaction(); await handle(busy); assert.equal(calls, 1); assert.match(busy.replies[0].content, /still processing/);
        closing = pool.end(); void closing.then(() => { closed = true; }); await tick(); assert.equal(closed, false); assert.equal(queryDone, false);
        await closing; await tick(); assert.equal(closed, true); assert.equal(queryDone, true); assert.equal(first.replies.length, 1); assert.equal(first.replies[0].embeds.length, 0); assert.equal(first.replies[0].components.length, 0);
        if (failLate) assert.equal(lateError?.code, '57014'); else assert.equal(lateError, undefined);
      } finally { if (!closing) closing = pool.end(); await closing; }
    }
  } finally { await observer.end(); }
});

// This covers the real pool and read guard with synthetic transport, not runtime
// process signals, network partitions, or live Discord. No persistent data is written.
