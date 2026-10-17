import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleEnrollmentStatus } from './certification-enrollment-status.js';
import { createGuardedSubmissionHandler } from './certification-submission-guarded.js';

const learner = '1223123544301633568';
const owner = '1223123544301633567';
const guild = '1339276399390887956';
const config = { enabled: true, ownerId: owner };
function interaction(id = 'cert:submit:status', actor = learner, server = guild) {
  return { customId: id, user: { id: actor }, guildId: server, replies: [], deferred: false,
    isButton: () => true, isModalSubmit: () => false,
    async deferReply(options) { this.deferred = true; this.options = options; },
    async editReply(payload) { this.replies.push(payload); } };
}
function fixture(row = { status: 'pending', student_id: null }) {
  const calls = []; const pool = { async query(sql, params) { calls.push({ sql, params }); return { rows: row ? [row] : [] }; } };
  return { calls, pool };
}

test('learner checks only authenticated identity using a read-only private query', async () => {
  const f = fixture(); const i = interaction();
  await handleEnrollmentStatus(i, f.pool, config, guild);
  assert.deepEqual(f.calls[0].params, [learner]); assert.ok(f.calls[0].sql.startsWith('SELECT'));
  assert.equal(i.options.flags, 64); assert.deepEqual(i.replies[0].allowedMentions, { parse: [] });
  assert.match(i.replies[0].content, /Enrollment status: pending/);
  assert.match(i.replies[0].content, /Not issued or requires admin review/);
});

test('non-owner specified target is rejected without a query', async () => {
  const f = fixture(); const i = interaction(`cert:submit:status:${owner}`);
  await handleEnrollmentStatus(i, f.pool, config, guild);
  assert.equal(f.calls.length, 0); assert.equal(i.replies[0].content, 'Admin authorization is required to view a specified learner.');
});

test('owner may check a specified learner privately', async () => {
  const f = fixture(); const i = interaction(`cert:submit:status:${learner}`, owner);
  await handleEnrollmentStatus(i, f.pool, config, guild); assert.deepEqual(f.calls[0].params, [learner]);
});

test('disabled and wrong-guild contexts do not query records', async () => {
  const f = fixture();
  await handleEnrollmentStatus(interaction(), f.pool, { ...config, enabled: false }, guild);
  await handleEnrollmentStatus(interaction('cert:submit:status', learner, owner), f.pool, config, guild);
  assert.equal(f.calls.length, 0);
});

test('missing record is not reported as proof that submission failed', async () => {
  const f = fixture(null); const i = interaction(); await handleEnrollmentStatus(i, f.pool, config, guild);
  assert.match(i.replies[0].content, /No committed enrollment record/);
  assert.match(i.replies[0].content, /does not prove failure/);
});

test('unexpected statuses require admin review', async () => {
  const f = fixture({ status: 'unexpected', student_id: null }); const i = interaction();
  await handleEnrollmentStatus(i, f.pool, config, guild); assert.match(i.replies[0].content, /requires admin review/);
});

test('database errors are not exposed', async () => {
  const i = interaction(); const pool = { async query() { throw new Error('PRIVATE SQL details'); } };
  await handleEnrollmentStatus(i, pool, config, guild);
  assert.match(i.replies[0].content, /could not be confirmed/); assert.ok(!i.replies[0].content.includes('PRIVATE'));
  assert.match(i.replies[0].content, /Ask the admin to review before resubmitting/);
});

test('read deadline produces only one uncertainty response', async () => {
  let release; const pool = { query() { return new Promise(resolve => { release = resolve; }); } };
  const i = interaction(); await handleEnrollmentStatus(i, pool, config, guild, 5);
  assert.match(i.replies[0].content, /does not prove the submission failed/);
  assert.match(i.replies[0].content, /Ask the admin to review before resubmitting/);
  release({ rows: [{ status: 'pending' }] }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(i.replies.length, 1);
});

test('guarded route allows read-only status with new-submission gate off', async () => {
  const f = fixture(); const i = interaction();
  await createGuardedSubmissionHandler(f.pool, config, guild)(i);
  assert.match(i.replies[0].content, /Enrollment status: pending/);
  assert.equal(f.calls.length, 1);
});

test('submission guidance uses admin labels without renaming ownerId or removing uncertainty warnings', async () => {
  for (const file of ['certification-enrollment-status.js', 'certification-submission-interactions.js', 'certification-submission-guarded.js']) {
    const source = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bowner\b/i, file);
    if (file === 'certification-enrollment-status.js') assert.ok(source.includes('config.ownerId'));
    if (file === 'certification-submission-guarded.js') {
      for (const text of ['Its outcome is not confirmed.', 'Do not resubmit yet;', 'ask the admin', 'does not cancel database work or grant access.']) assert.ok(source.includes(text), text);
    }
  }
});
