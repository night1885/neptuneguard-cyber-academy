import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationRouter } from './certification-admin-router.js';
import { invitationPayload } from './certification-invitation-interactions.js';
import { PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const owner = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
const content = 'Short disposable invitation agreement.', hash = createHash('sha256').update(content).digest('hex');
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const controls = payload => (payload.components || []).flatMap(row => json(row).components);
function fixture(options = {}) {
  const queries = [], replies = [], modals = []; let status = options.status || 'awaiting_acknowledgment', invited = options.invited !== false, writes = 0;
  const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: options.general === true, activeAgreementVersion: 'v1', activeAgreementSha256: hash, comprehensionCheck: { version: 'v1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } };
  const query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql === PENDING_REGISTRATION_INVITATION_SQL) { assert.deepEqual(values, [student, owner]); return { rows: invited && status === 'awaiting_acknowledgment' ? [{ invited: 1 }] : [] }; }
    if (sql.startsWith('SELECT status')) return { rows: [{ status }] };
    if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.startsWith('SELECT * FROM certification_enrollments')) return { rows: sql.includes("status='approved'") ? [] : [{ status }] };
    if (sql.startsWith('UPDATE certification_enrollments')) { writes++; status = 'pending'; return { rows: [] }; }
    if (sql.startsWith('INSERT INTO certification_audit_events')) { writes++; return { rows: [] }; }
    if (sql.startsWith('INSERT INTO certification_enrollments')) assert.fail('Invited routing must not create enrollment records');
    if (!['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) assert.fail(`Unexpected SQL ${sql}`);
    return { rows: [] };
  };
  const pool = { query, async connect() { return { query, release() {} }; } };
  const route = createCertificationRouter(pool, config, guild);
  async function run(customId, options = {}) {
    const i = { customId, user: { id: options.actor || student }, guildId: options.guildId === undefined ? guild : options.guildId, deferred: false, replied: false,
      isButton: () => !options.modal, isModalSubmit: () => Boolean(options.modal), isStringSelectMenu: () => false,
      fields: { getTextInputValue: key => ({ age: 'Yes', read: 'AGREE', answer0: 'A' })[key] },
      async deferReply(p) { assert.equal(p.flags, 64); this.deferred = true; },
      async reply(p) { assert.equal(p.flags, 64); this.replied = true; replies.push(p); },
      async editReply(p) { assert.deepEqual(p.allowedMentions, { parse: [] }); replies.push(p); },
      async showModal(p) { modals.push(json(p)); } };
    assert.equal(await route(i), true); return replies.at(-1);
  }
  return { run, replies, modals, queries, writes: () => writes, revoke() { status = 'revoked'; invited = false; } };
}
const form = f => controls(f.replies.at(-1)).find(c => c.label === 'Open acknowledgment form').custom_id;
test('closed enrollment console offers invitation entry without granting course access', async () => {
  const f = fixture(); const payload = await f.run('cert:initial:home');
  const entry = controls(payload).find(c => c.custom_id === 'cert:invite:start'); assert.equal(entry.disabled, false); assert.equal(entry.label, 'Complete invited registration');
  assert.equal(controls(payload).find(c => c.custom_id === 'cert:learner:home').disabled, true); assert.equal(f.writes(), 0);
});
test('full router carries invitation buttons and modal to pending review, then removes invitation entry', async () => {
  const f = fixture(); await f.run('cert:initial:home'); await f.run('cert:invite:start');
  assert.ok(controls(f.replies.at(-1)).every(c => c.custom_id.startsWith('cert:invite:')));
  await f.run(form(f)); assert.match(f.modals[0].custom_id, /^cert:invite:send:/);
  await f.run(f.modals[0].custom_id, { modal: true }); assert.match(f.replies.at(-1).content, /request submitted/); assert.equal(f.writes(), 2);
  const pending = await f.run('cert:initial:status'); assert.equal(pending.embeds[0].fields[0].value, 'Pending admin review');
  assert.ok(!controls(pending).some(c => c.custom_id === 'cert:invite:start'));
  assert.equal(controls(pending).find(c => c.custom_id === 'cert:submit:start').disabled, true); assert.equal(controls(pending).find(c => c.custom_id === 'cert:learner:home').disabled, true);
});
test('untrusted awaiting and denied records do not expose usable invitation controls', async () => {
  for (const options of [{ invited: false }, { status: 'denied' }, { status: 'suspended' }, { status: 'revoked' }]) {
    const f = fixture(options), payload = await f.run('cert:initial:home'); assert.ok(!controls(payload).some(c => c.custom_id === 'cert:invite:start')); assert.equal(controls(payload)[0].disabled, true);
    await f.run('cert:invite:start'); assert.match(f.replies.at(-1).content, /pending registration/); assert.equal(f.writes(), 0);
  }
});
test('invitation token cannot cross into the ordinary registration namespace', async () => {
  const f = fixture(); await f.run('cert:invite:start'); const id = form(f);
  await f.run(id.replace('cert:invite:', 'cert:submit:')); assert.match(f.replies.at(-1).content, /unavailable/); assert.equal(f.modals.length, 0);
  await f.run(id); assert.equal(f.modals.length, 1); assert.equal(f.writes(), 0);
});
test('another learner and wrong server cannot use an invitation session', async () => {
  const f = fixture(); await f.run('cert:invite:start'); const id = form(f), count = f.queries.length;
  await f.run(id, { actor: owner }); assert.match(f.replies.at(-1).content, /another learner/);
  await f.run(id, { guildId: null }); assert.match(f.replies.at(-1).content, /unavailable/); assert.equal(f.queries.length, count); assert.equal(f.modals.length, 0);
});
test('revoked invitation fails at final submission without enrollment writes', async () => {
  const f = fixture(); await f.run('cert:invite:start'); await f.run(form(f)); f.revoke();
  await f.run(f.modals[0].custom_id, { modal: true }); assert.match(f.replies.at(-1).content, /could not be completed/); assert.equal(f.writes(), 0); assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
});
test('ordinary open registration retains its original entry and avoids invitation lookup', async () => {
  const f = fixture({ general: true }), payload = await f.run('cert:initial:home');
  assert.equal(controls(payload)[0].custom_id, 'cert:submit:start'); assert.equal(controls(payload)[0].disabled, false); assert.ok(!f.queries.some(q => q.sql === PENDING_REGISTRATION_INVITATION_SQL));
});
test('payload namespacing changes only component IDs and leaves originals untouched', () => {
  const original = { content: 'cert:submit:start', allowedMentions: { parse: [] }, components: [{ type: 1, components: [{ type: 2, custom_id: 'cert:submit:next:fixture', label: 'Next' }] }] };
  const result = invitationPayload(original); assert.equal(result.content, original.content); assert.equal(result.components[0].components[0].custom_id, 'cert:invite:next:fixture');
  assert.equal(original.components[0].components[0].custom_id, 'cert:submit:next:fixture'); assert.deepEqual(result.allowedMentions, { parse: [] });
});
