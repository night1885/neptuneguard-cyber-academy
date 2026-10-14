import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredEnrollmentColumns, validateCertificationSchema } from './certification-schema-readiness.js';

const ageColumns = ['age_eligibility_confirmed', 'age_eligibility_confirmed_at', 'age_policy_version'];
function fixture(missing = []) {
  return { async query(sql) {
    if (sql.includes('AS agreements')) return { rows: [{ agreements: 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('pg_attribute')) return { rows: requiredEnrollmentColumns.filter(name => !missing.includes(name)).map(attname => ({ attname })) };
    if (sql.includes('pg_trigger')) return { rows: ['certification_student_id_immutable', 'certification_agreement_immutable', 'certification_agreement_no_truncate'].map(tgname => ({ tgname, tgenabled: 'O' })) };
    throw new Error('Unexpected readiness query');
  } };
}
test('all three minimal eligibility columns are required for readiness', async () => {
  for (const name of ageColumns) {
    assert.ok(requiredEnrollmentColumns.includes(name));
    await assert.rejects(validateCertificationSchema(fixture([name])), /001.*005/);
  }
  await assert.rejects(validateCertificationSchema(fixture(ageColumns)), /columns are incomplete/);
});
test('complete mocked schema with eligibility columns passes existing safeguard checks', async () => {
  await validateCertificationSchema(fixture());
});
