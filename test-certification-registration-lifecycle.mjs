import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationRouter } from './certification-admin-router.js';
import { createCertificationService } from './certification-service.js';
import { PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const owner = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333';
const content = 'Disposable registration lifecycle agreement.', hash = createHash('sha256').update(content).digest('hex');
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const controls = payload => (payload.components || []).flatMap(row => json(row).components);
function fixture({ invited = false, blockedDM = false } = {}) {
  let row = null, audits = [], snapshot = null, connections = 0, releases = 0;
  const queries = [], notifications = [];
  const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: !invited, activeAgreementVersion: 'v1', activeAgreementSha256: hash,
    comprehensionCheck: { version: 'check1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } };
  const result = rows => ({ rows });
  async function query(sql, values) {
    queries.push({ sql, values });
    if (sql === 'BEGIN') { assert.equal(snapshot, null); snapshot = structuredClone({ row, audits }); return result([]); }
    if (sql === 'COMMIT') { snapshot = null; return result([]); }
    if (sql === 'ROLLBACK') { if (snapshot) { row = snapshot.row; audits = snapshot.audits; } snapshot = null; return result([]); }
    if (sql === PENDING_REGISTRATION_INVITATION_SQL) {
      assert.deepEqual(values, [student, owner]);
      return result(row?.status === 'awaiting_acknowledgment' && audits.some(audit => audit.action === 'student_registered_by_owner' && audit.actor === owner && audit.subject === student) ? [{ invited: 1 }] : []);
    }
    if (sql.startsWith('SELECT content')) return result([{ content, content_sha256: hash }]);
    if (sql.startsWith('SELECT status FROM certification_enrollments') || sql.startsWith('SELECT * FROM certification_enrollments') || sql.startsWith('SELECT discord_user_id, status, student_id FROM certification_enrollments')) {
      assert.deepEqual(values, [student]);
      return result(row && (!sql.includes("status='approved'") || row.status === 'approved') ? [structuredClone(row)] : []);
    }
    if (sql.startsWith('INSERT INTO certification_enrollments')) {
      assert.deepEqual(values, [student]); const created = row === null;
      if (created) row = { discord_user_id: student, status: 'awaiting_acknowledgment', student_id: null, approved_by: null, approved_at: null, acknowledgment_name: null, signature_reference: null };
      return result(created && sql.includes('RETURNING') ? [structuredClone(row)] : []);
    }
    if (sql.startsWith('UPDATE certification_enrollments') && sql.includes("SET status='pending'")) {
      assert.ok(row); assert.equal(row.status, 'awaiting_acknowledgment'); assert.equal(values[0], student);
      Object.assign(row, { status: 'pending', agreement_version: values[1], agreement_content_sha256: values[2], comprehension_check_version: values[3],
        signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded',
        comprehension_passed_at: 'recorded', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: values[4] });
      return result([]);
    }
    if (sql.startsWith('UPDATE certification_enrollments') && sql.includes("SET status='approved'")) {
      assert.equal(row?.status, 'pending'); assert.equal(values[0], student); assert.equal(values[2], owner);
      Object.assign(row, { status: 'approved', student_id: values[1], approved_by: values[2], approved_at: 'recorded' }); return result([]);
    }
    if (sql.startsWith('INSERT INTO certification_audit_events')) {
      const action = ['student_registered_by_owner', 'enrollment_submitted', 'enrollment_approved'].find(action => sql.includes(`'${action}'`));
      assert.ok(action); audits.push({ action, actor: values[0], subject: action === 'enrollment_submitted' ? values[0] : values[1],
        details: JSON.parse(values[action === 'enrollment_submitted' ? 1 : 2]) }); return result([]);
    }
    assert.fail(`Unexpected lifecycle SQL: ${sql}`);
  }
  const pool = { query, async connect() { connections++; return { query, release(discard) { assert.equal(discard, false); releases++; } }; } };
  const route = createCertificationRouter(pool, config, guildId), service = createCertificationService(pool, config);
  async function run(customId, options = {}) {
    const replies = [], modals = [];
    const interaction = { customId, user: { id: options.actor || student }, guildId: options.server === undefined ? guildId : options.server, deferred: false, replied: false,
      isButton: () => !options.modal, isModalSubmit: () => Boolean(options.modal), isStringSelectMenu: () => false,
      fields: { getTextInputValue(key) {
        const fields = { discord_user_id: student, age: 'Yes', read: 'AGREE', answer0: options.wrongAnswer ? 'WRONG' : 'A' };
        assert.ok(Object.hasOwn(fields, key)); return fields[key];
      } },
      client: { users: { async fetch(id) {
        assert.equal(id, student); if (blockedDM) throw new Error('PRIVATE-DM-DETAIL');
        return { async send(payload) { notifications.push(payload); } };
      } } },
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); },
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
      async editReply(payload) { replies.push(payload); }, async showModal(payload) { modals.push(json(payload)); }
    };
    assert.equal(await route(interaction), true); return { replies, modals };
  }
  return { run, queries, notifications, service, get row() { return row; }, get audits() { return audits; },
    assertReleased() { assert.equal(releases, connections); assert.equal(snapshot, null); } };
}
async function registerByOwner(f) {
  const opened = await f.run('cert:register:open', { actor: owner }); assert.equal(opened.modals[0].custom_id, 'cert:register:submit');
  const submitted = await f.run('cert:register:submit', { actor: owner, modal: true }); assert.equal(f.row, null);
  const confirm = controls(submitted.replies[0]).find(control => control.custom_id.startsWith('cert:register:confirm:'));
  await f.run(confirm.custom_id, { actor: owner });
  assert.equal(f.row.status, 'awaiting_acknowledgment'); assert.equal(f.row.student_id, null); assert.equal(f.notifications.length, 0);
}
async function acknowledge(f, invited, wrongAnswer = false) {
  const console = await f.run('cert:initial:home');
  const entry = controls(console.replies[0]).find(control => control.custom_id === (invited ? 'cert:invite:start' : 'cert:submit:start'));
  assert.ok(entry); assert.equal(entry.disabled, false);
  const agreement = await f.run(entry.custom_id);
  const form = controls(agreement.replies.at(-1)).find(control => control.label === 'Open acknowledgment form'); assert.ok(form);
  const opened = await f.run(form.custom_id); assert.equal(opened.modals.length, 1);
  return f.run(opened.modals[0].custom_id, { modal: true, wrongAnswer });
}
for (const invited of [false, true]) {
  test(`${invited ? 'admin-invited' : 'self-application'} lifecycle requires acknowledgment and separate approval before issuing one permanent ID`, async () => {
    const f = fixture({ invited });
    if (invited) await registerByOwner(f);
    assert.equal(await f.service.getCourseAuthorization(student), null);
    const submitted = await acknowledge(f, invited); assert.match(submitted.replies.at(-1).content, /request submitted/);
    assert.equal(f.row.status, 'pending'); assert.equal(f.row.student_id, null); assert.equal(f.notifications.length, 0);
    assert.equal(await f.service.getCourseAuthorization(student), null);
    const review = await f.run(`cert:enrollment:review:${student}`, { actor: owner });
    const approval = controls(review.replies[0]).find(control => control.custom_id === `cert:enrollment:approve:${student}`);
    assert.ok(approval); assert.equal(approval.disabled, false); assert.equal(f.row.student_id, null);
    const approved = await f.run(approval.custom_id, { actor: owner }); assert.match(approved.replies.at(-1).content, /Enrollment approved/);
    const permanentId = f.row.student_id; assert.match(permanentId, /^NG-PT-[a-f0-9-]{36}$/); assert.equal(f.row.status, 'approved');
    assert.deepEqual(await f.service.getCourseAuthorization(student), { student_id: permanentId });
    assert.equal(f.notifications.length, 1); assert.deepEqual(f.notifications[0].allowedMentions, { parse: [] });
    assert.ok(f.notifications[0].content.includes(permanentId));
    const panel = await f.run('cert:learner:home'); assert.equal(panel.replies[0].embeds[0].title, 'NeptuneGuard — Student home');
    assert.equal(panel.replies[0].embeds[0].fields.find(field => field.name === 'Student ID').value, permanentId);
    const audits = f.audits.length, writes = f.queries.filter(query => /^(INSERT|UPDATE)/.test(query.sql)).length;
    const repeated = await f.run(approval.custom_id, { actor: owner }); assert.match(repeated.replies.at(-1).content, /Already approved/);
    assert.equal(f.row.student_id, permanentId); assert.equal(f.notifications.length, 1); assert.equal(f.audits.length, audits);
    assert.equal(f.queries.filter(query => /^(INSERT|UPDATE)/.test(query.sql)).length, writes);
    assert.equal(f.audits.filter(audit => audit.action === 'enrollment_approved').length, 1); f.assertReleased();
  });
}
for (const options of [{ actor: student }, { actor: owner, server: null }, { actor: owner, server: '444444444444444444' }]) {
  test(`approval rejects unauthorized context without database access ${JSON.stringify(options)}`, async () => {
    const f = fixture(); const denied = await f.run(`cert:enrollment:approve:${student}`, options);
    assert.match(denied.replies[0].content, /Admin authorization/); assert.equal(f.queries.length, 0); assert.equal(f.row, null); f.assertReleased();
  });
}
for (const invited of [false, true]) {
  test(`incorrect comprehension cannot advance ${invited ? 'invited' : 'self'} registration`, async () => {
    const f = fixture({ invited }); if (invited) await registerByOwner(f);
    const submitted = await acknowledge(f, invited, true); assert.doesNotMatch(submitted.replies.at(-1).content, /request submitted/);
    assert.ok(f.row === null || f.row.status === 'awaiting_acknowledgment');
    assert.ok(!f.audits.some(audit => audit.action === 'enrollment_submitted')); assert.equal(f.notifications.length, 0);
    assert.equal(await f.service.getCourseAuthorization(student), null); f.assertReleased();
  });
}
test('admin registration without learner acknowledgment cannot be approved', async () => {
  const f = fixture({ invited: true }); await registerByOwner(f);
  await assert.rejects(f.run(`cert:enrollment:approve:${student}`, { actor: owner }), /Complete current account acknowledgment/);
  assert.equal(f.row.status, 'awaiting_acknowledgment'); assert.equal(f.row.student_id, null);
  assert.ok(!f.audits.some(audit => audit.action === 'enrollment_approved')); assert.equal(f.notifications.length, 0); f.assertReleased();
});
test('failed notification does not undo committed approval or issue a second ID on retry', async () => {
  const f = fixture({ blockedDM: true }); await acknowledge(f, false);
  const approved = await f.run(`cert:enrollment:approve:${student}`, { actor: owner });
  assert.match(approved.replies[0].content, /DM delivery failed. Enrollment remains approved/);
  assert.doesNotMatch(approved.replies[0].content, /PRIVATE-DM-DETAIL/);
  const permanentId = f.row.student_id; assert.deepEqual(await f.service.getCourseAuthorization(student), { student_id: permanentId });
  await f.run(`cert:enrollment:approve:${student}`, { actor: owner });
  assert.equal(f.row.student_id, permanentId); assert.equal(f.audits.filter(audit => audit.action === 'enrollment_approved').length, 1);
  assert.equal(f.notifications.length, 0); f.assertReleased();
});
