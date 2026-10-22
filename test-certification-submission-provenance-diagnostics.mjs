import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createProvenancePilotHandlers } from './certification-provenance-pilot-handlers.js';
import { createRegistrationPilotPolicy, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';
import { PROVENANCE_INVITATION_SQL } from './certification-registration-provenance.js';

const student = '111111111111111111';
const owner = '222222222222222222';
const guildId = '333333333333333333';
const agreement = 'Synthetic provenance diagnostic agreement.';
const hash = createHash('sha256').update(agreement).digest('hex');
const settings = { enabled: true, ownerId: owner, guildId,
  adminChannelId: '444444444444444444', studentIds: [student] };

function fixture({ failUpdate = false, failRollback = false } = {}) {
  const queries = [], releases = [], replies = [], logs = [];
  let connects = 0, modal;
  const failure = Object.assign(new Error('PRIVATE_RAW_MESSAGE'), {
    code: '23514', constraint: 'certification_account_acknowledgment_required',
    detail: 'PRIVATE_DETAIL', query: 'PRIVATE_QUERY', answers: ['PRIVATE_ANSWER']
  });
  const row = { discord_user_id: student, registration_owner_id: owner,
    status: 'awaiting_acknowledgment', student_id: null,
    approved_by: null, approved_at: null, acknowledgment_name: null, signature_reference: null };
  async function query(sql, parameters, transaction = false) {
    queries.push({ sql, parameters, transaction });
    if (sql === PROVENANCE_INVITATION_SQL) {
      assert.deepEqual(parameters, [student, owner]);
      return { rows: [{ invited: 1 }] };
    }
    if (sql.startsWith('SELECT content')) return { rows: [{ content: agreement, content_sha256: hash }] };
    if (sql.startsWith('SELECT * FROM certification_enrollments')) return { rows: [row] };
    if (sql.startsWith('UPDATE certification_enrollments')) {
      if (failUpdate) throw failure;
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO certification_audit_events')) return { rows: [], rowCount: 1 };
    if (sql === 'ROLLBACK' && failRollback) throw new Error('PRIVATE_ROLLBACK');
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
    throw new Error('Unexpected fixture query');
  }
  const writePool = {
    query: (sql, parameters) => query(sql, parameters),
    async connect() {
      connects++;
      return { query: (sql, parameters) => query(sql, parameters, true),
        release(discard) { releases.push(discard); } };
    }
  };
  const readPool = { async query() { throw new Error('Unexpected status-view query'); } };
  const config = { enabled: true, enrollmentSubmissionEnabled: false, ownerId: owner,
    adminChannelId: settings.adminChannelId, activeAgreementVersion: 'synthetic-v1',
    activeAgreementSha256: hash, registrationPilotEnabled: true,
    registrationPilotPolicy: createRegistrationPilotPolicy(settings),
    comprehensionCheck: { version: 'synthetic-check', questions: [{ prompt: 'Synthetic question?' }],
      correctAnswers: ['PRIVATE_ANSWER'] } };
  const handlers = createProvenancePilotHandlers({ readPool, writePool, config, guildId });
  const route = createRegistrationPilotRouter({ settings, ...handlers,
    readViews: async () => { throw new Error('Unexpected admin route'); } });
  function interaction(customId, isModal = false, actor = student) {
    return { customId, guildId, user: { id: actor }, deferred: false, replied: false,
      isButton: () => !isModal, isModalSubmit: () => isModal, isStringSelectMenu: () => false,
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); },
      async editReply(payload) { replies.push(payload); },
      async followUp(payload) { replies.push(payload); },
      async showModal(payload) { modal = payload; },
      fields: { getTextInputValue: key => ({ age: 'Yes', read: 'AGREE', answer0: 'PRIVATE_ANSWER' })[key] }
    };
  }
  async function submit() {
    assert.equal(await route(interaction('cert:invite:start')), true);
    for (let page = 0; page < 40; page++) {
      const buttons = replies.at(-1).components[0].components;
      const next = buttons.find(button => /^cert:invite:(next|form):/.test(button.custom_id));
      assert.ok(next, 'Native invitation adapter must preserve an actionable pilot button');
      assert.notEqual(next.disabled, true);
      assert.equal(await route(interaction(next.custom_id)), true);
      if (modal) break;
    }
    assert.ok(modal, 'Acknowledgment modal must be reached');
    assert.match(modal.custom_id, /^cert:invite:send:/);
    assert.equal(await route(interaction(modal.custom_id, true)), true);
  }
  return { route, interaction, submit, queries, releases, replies, logs,
    get connects() { return connects; } };
}

for (const failRollback of [false, true]) {
  test(`native provenance pilot reports one sanitized failure; rollback failure=${failRollback}`, async () => {
    const f = fixture({ failUpdate: true, failRollback });
    const original = console.error;
    console.error = record => f.logs.push(record);
    try { await f.submit(); } finally { console.error = original; }
    assert.equal(f.logs.length, 1);
    const diagnostic = f.logs[0];
    assert.equal(diagnostic.event, 'certification_submission_failed');
    assert.equal(diagnostic.stage, 'enrollment_update');
    assert.equal(diagnostic.sqlState, '23514');
    assert.equal(diagnostic.constraint, 'certification_account_acknowledgment_required');
    assert.match(diagnostic.correlationId, /^[a-f0-9-]{36}$/);
    assert.ok(f.replies.at(-1).content.includes('Reference: ' + diagnostic.correlationId));
    assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE|111111111111111111|222222222222222222/);
    assert.doesNotMatch(f.replies.at(-1).content, /PRIVATE|23514|enrollment_update/);
    assert.equal(f.connects, 1);
    assert.deepEqual(f.releases, [failRollback]);
    assert.ok(f.queries.some(item => item.sql === 'ROLLBACK' && item.transaction));
    assert.equal(f.queries.some(item => item.sql === 'COMMIT'), false);
    assert.equal(f.queries.some(item => item.sql.startsWith('INSERT INTO certification_audit_events')), false);
    assert.ok(f.queries.some(item => item.sql === PROVENANCE_INVITATION_SQL && !item.transaction));
    assert.ok(f.queries.some(item => item.sql === PROVENANCE_INVITATION_SQL && item.transaction));
  });
}

test('native provenance pilot success commits and emits no diagnostic', async () => {
  const f = fixture();
  const original = console.error;
  console.error = record => f.logs.push(record);
  try { await f.submit(); } finally { console.error = original; }
  assert.deepEqual(f.logs, []);
  assert.deepEqual(f.releases, [false]);
  assert.equal(f.queries.filter(item => item.sql === 'COMMIT').length, 1);
  assert.equal(f.queries.some(item => item.sql === 'ROLLBACK'), false);
  assert.equal(f.queries.filter(item => item.sql.startsWith('INSERT INTO certification_audit_events')).length, 1);
  assert.match(f.replies.at(-1).content, /Enrollment request submitted for admin review/);
});

test('native pilot router rejects a non-allowlisted learner before database access', async () => {
  const f = fixture();
  const original = console.error;
  console.error = record => f.logs.push(record);
  try { await f.route(f.interaction('cert:invite:start', false, '555555555555555555')); }
  finally { console.error = original; }
  assert.deepEqual(f.queries, []);
  assert.equal(f.connects, 0);
  assert.deepEqual(f.logs, []);
  assert.match(f.replies.at(-1).content, /No operation was admitted/);
});
