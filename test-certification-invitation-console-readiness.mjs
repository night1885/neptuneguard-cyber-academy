import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationConfig } from './certification-config.js';
import { createInitialConsoleHandler } from './certification-initial-console.js';
import { PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const owner = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
const manifest = { agreementVersion: 'v1', agreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Type the instructed word.' }], correctAnswers: ['PRIVATE-ANSWER-KEY'] } };
const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', ACADEMY_OWNER_ID: owner };
const configured = () => loadCertificationConfig({ ...env, CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify(manifest) });
async function render(config, { status = 'awaiting_acknowledgment', invited = true } = {}) {
  const queries = [], replies = [];
  const pool = { async query(sql, values) {
    queries.push({ sql, values });
    if (sql === PENDING_REGISTRATION_INVITATION_SQL) return { rows: invited ? [{ invited: 1 }] : [] };
    assert.match(sql, /^SELECT/); return { rows: sql.startsWith('SELECT status') ? [{ status }] : [] };
  }, connect() { assert.fail('Console readiness must not write'); } };
  const handler = createInitialConsoleHandler(pool, config, guild);
  await handler({ customId: 'cert:initial:home', user: { id: student }, guildId: guild, isButton: () => true, isModalSubmit: () => false,
    async deferReply(p) { assert.equal(p.flags, 64); }, async editReply(p) { replies.push(p); } });
  return { queries, payload: replies.at(-1) };
}
const controls = payload => payload.components[0].toJSON().components;
test('actual default closed-enrollment config disables invitation entry and explains setup', async () => {
  const config = loadCertificationConfig(env), result = await render(config);
  assert.equal(controls(result.payload)[0].disabled, true); assert.equal(controls(result.payload)[0].label, 'Awaiting agreement setup');
  assert.equal(controls(result.payload).at(-1).disabled, true);
  assert.match(result.payload.embeds[0].fields[2].value, /admin must configure/);
  assert.ok(!result.queries.some(query => query.sql === PENDING_REGISTRATION_INVITATION_SQL));
});
for (const changes of [
  { activeAgreementVersion: undefined }, { activeAgreementSha256: 'invalid' }, { comprehensionCheck: undefined },
  { comprehensionCheck: { ...manifest.comprehensionCheck, questions: [] } },
  { comprehensionCheck: { ...manifest.comprehensionCheck, correctAnswers: [] } },
  { comprehensionCheck: { ...manifest.comprehensionCheck, questions: [{ prompt: '   ' }] } },
  { comprehensionCheck: { ...manifest.comprehensionCheck, correctAnswers: ['   '] } }
]) {
  test(`incomplete invitation form remains disabled ${JSON.stringify(changes)}`, async () => {
    const result = await render({ ...configured(), ...changes });
    assert.equal(controls(result.payload)[0].disabled, true); assert.match(result.payload.embeds[0].description, /admin must configure/);
    assert.ok(!result.queries.some(query => query.sql === PENDING_REGISTRATION_INVITATION_SQL));
  });
}
test('valid manifest loaded with general enrollment closed exposes only proven invitation and never answer keys', async () => {
  const config = configured(), result = await render(config);
  const entry = controls(result.payload)[0]; assert.equal(entry.custom_id, 'cert:invite:start'); assert.equal(entry.disabled, false);
  assert.equal(config.enrollmentSubmissionEnabled, false); assert.equal(result.queries.filter(query => query.sql === PENDING_REGISTRATION_INVITATION_SQL).length, 1);
  assert.doesNotMatch(JSON.stringify(result.payload), /PRIVATE-ANSWER-KEY/); assert.deepEqual(result.payload.allowedMentions, { parse: [] });
});
test('configured form does not replace the invitation provenance check', async () => {
  const result = await render(configured(), { invited: false });
  assert.equal(controls(result.payload)[0].disabled, true); assert.equal(controls(result.payload)[0].custom_id, 'cert:submit:start');
});
test('pending and restricted records keep their status guidance instead of agreement setup guidance', async () => {
  for (const status of ['pending', 'approved', 'denied', 'suspended', 'revoked']) {
    const result = await render(loadCertificationConfig(env), { status });
    assert.equal(controls(result.payload)[0].disabled, true); assert.doesNotMatch(result.payload.embeds[0].fields[2].value, /admin must configure/);
  }
});
