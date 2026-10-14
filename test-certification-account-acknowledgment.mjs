import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';

const valid = () => ({
  discord_user_id: '123456789012345678', signature_method: 'discord_account',
  acknowledgment_name: null, signature_reference: null,
  agreement_version: 'agreement-2', agreement_content_sha256: 'a'.repeat(64),
  acknowledged_at: '2026-10-14T09:00:00Z', learner_confirmed_read_at: '2026-10-14T09:00:00Z',
  comprehension_passed_at: '2026-10-14T09:00:00Z', comprehension_check_version: 'check-2',
  age_eligible: true, age_declared_at: '2026-10-14T09:00:00Z', age_declaration_version: 'adult-18-v1'
});

test('accepts complete account acknowledgment without name or document', () => {
  assert.equal(hasCompleteAccountAcknowledgment(valid()), true);
});

for (const field of ['discord_user_id', 'signature_method', 'agreement_version', 'agreement_content_sha256', 'acknowledged_at', 'learner_confirmed_read_at', 'comprehension_passed_at', 'comprehension_check_version', 'age_eligible', 'age_declared_at', 'age_declaration_version']) {
  test(`reject missing ${field}`, () => {
    const record = valid();
    delete record[field];
    assert.equal(hasCompleteAccountAcknowledgment(record), false);
  });
}

for (const [field, value] of [
  ['age_eligible', false], ['age_eligible', 'yes'], ['age_eligible', 1],
  ['age_declaration_version', 'unknown'], ['signature_method', 'typed_name'],
  ['acknowledgment_name', 'Example'], ['acknowledgment_name', ''],
  ['signature_reference', 'document-reference'], ['signature_reference', ''],
  ['discord_user_id', 'invalid'], ['agreement_content_sha256', 'invalid'],
  ['agreement_version', ''], ['comprehension_check_version', '']
]) {
  test(`reject incompatible ${field}: ${JSON.stringify(value)}`, () => {
    assert.equal(hasCompleteAccountAcknowledgment({ ...valid(), [field]: value }), false);
  });
}

test('reject absent records and do not mutate valid records', () => {
  assert.equal(hasCompleteAccountAcknowledgment(null), false);
  assert.equal(hasCompleteAccountAcknowledgment(undefined), false);
  const record = Object.freeze(valid());
  assert.equal(hasCompleteAccountAcknowledgment(record), true);
});
