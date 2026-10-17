import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGuardedSubmissionHandler } from './certification-submission-guarded.js';
import { PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const owner = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
const content = 'Short disposable agreement.', hash = createHash('sha256').update(content).digest('hex');
function fixture(options = {}) {
  const queries = [], replies = [], modals = []; let eligible = options.eligible !== false, writes = 0;
  const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: false, activeAgreementVersion: 'v1', activeAgreementSha256: hash, comprehensionCheck: { version: 'v1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } };
  const query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql === PENDING_REGISTRATION_INVITATION_SQL) return { rows: eligible ? [{ invited: 1 }] : [] };
    if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.startsWith('SELECT * FROM certification_enrollments')) return { rows: [{ status: eligible ? 'awaiting_acknowledgment' : 'revoked' }] };
    if (/^UPDATE|^INSERT/.test(sql)) writes++;
    return { rows: [] };
  };
  const pool = { query, async connect() { return { query, release() {} }; } };
  const handler = createGuardedSubmissionHandler(pool, config, guild, { invitedOnly: options.invitedOnly ?? true });
  async function run(id, extra = {}) {
    const { modal = false, actor = student, guildId = guild, inputs = {} } = extra;
    const interaction = { customId: id, user: { id: actor }, guildId, deferred: false, replied: false,
      isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: key => ({ age: 'Yes', read: 'AGREE', answer0: 'A', ...inputs })[key] },
      async deferReply(p) { assert.equal(p.flags, 64); this.deferred = true; },
      async reply(p) { assert.equal(p.flags, 64); this.replied = true; replies.push(p); },
      async editReply(p) { assert.deepEqual(p.allowedMentions, { parse: [] }); replies.push(p); },
      async showModal(p) { modals.push(p.toJSON()); } };
    return handler(interaction);
  }
  return { run, queries, replies, modals, writes: () => writes, revoke() { eligible = false; } };
}
function formId(f) { return f.replies.at(-1).components[0].toJSON().components.find(c => c.label === 'Open acknowledgment form').custom_id; }
test('explicit invitation mode completes acknowledgment while general enrollment stays closed', async () => {
  const f = fixture(); await f.run('cert:submit:start'); assert.equal(f.queries[0].sql, PENDING_REGISTRATION_INVITATION_SQL); assert.equal(f.writes(), 0);
  await f.run(formId(f)); assert.equal(f.modals.length, 1);
  await f.run(f.modals[0].custom_id, { modal: true }); assert.match(f.replies.at(-1).content, /request submitted/); assert.equal(f.writes(), 2);
  assert.equal(f.queries.filter(q => q.sql === PENDING_REGISTRATION_INVITATION_SQL).length, 2);
  assert.ok(!f.queries.some(q => q.sql.startsWith('INSERT INTO certification_enrollments')));
});
test('ordinary mode remains unavailable with no invitation or agreement lookup', async () => {
  const f = fixture({ invitedOnly: false }); await f.run('cert:submit:start'); assert.match(f.replies.at(-1).content, /unavailable/); assert.equal(f.queries.length, 0);
});
test('missing invitation blocks agreement display and creates no record', async () => {
  const f = fixture({ eligible: false }); await f.run('cert:submit:start'); assert.match(f.replies.at(-1).content, /pending registration/); assert.equal(f.queries.length, 1); assert.equal(f.writes(), 0); assert.deepEqual(f.replies.at(-1).components, []);
});
test('revocation after agreement display is rechecked at transactional submission', async () => {
  const f = fixture(); await f.run('cert:submit:start'); await f.run(formId(f)); f.revoke();
  await f.run(f.modals[0].custom_id, { modal: true }); assert.match(f.replies.at(-1).content, /could not be completed/); assert.equal(f.writes(), 0); assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
});
test('session belongs to its learner and server', async () => {
  const f = fixture(); await f.run('cert:submit:start'); const form = formId(f), count = f.queries.length;
  await f.run(form, { actor: owner }); assert.match(f.replies.at(-1).content, /another learner/); assert.equal(f.modals.length, 0);
  await f.run(form, { guildId: null }); assert.match(f.replies.at(-1).content, /unavailable/); assert.equal(f.queries.length, count); assert.equal(f.writes(), 0);
});
test('negative age declaration and cancellation do not write enrollment', async () => {
  const f = fixture(); await f.run('cert:submit:start'); await f.run(formId(f)); await f.run(f.modals[0].custom_id, { modal: true, inputs: { age: 'No' } });
  assert.match(f.replies.at(-1).content, /requires age 18/); assert.equal(f.writes(), 0);
  const canceled = fixture(); await canceled.run('cert:submit:start'); const cancel = canceled.replies.at(-1).components[0].toJSON().components.find(c => c.label === 'Cancel').custom_id;
  await canceled.run(cancel); assert.match(canceled.replies.at(-1).content, /Canceled/); assert.equal(canceled.writes(), 0);
});
