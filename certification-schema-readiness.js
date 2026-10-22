import { createHash } from 'node:crypto';
import { validateManualReviewReadiness } from './certification-manual-review-readiness.mjs';

export const requiredEnrollmentColumns = Object.freeze(['discord_user_id', 'student_id', 'status',
  'agreement_version', 'acknowledgment_name', 'agreement_content_sha256', 'comprehension_check_version',
  'acknowledged_at', 'signature_method', 'signature_reference', 'learner_confirmed_read_at',
  'comprehension_passed_at', 'approved_by', 'approved_at', 'status_reason', 'updated_at',
  'age_eligible', 'age_declared_at', 'age_declaration_version']);

export async function validateCertificationSchema(pool) {
  const tables = (await pool.query(`SELECT
    to_regclass('certification_agreements') AS agreements,
    to_regclass('certification_enrollments') AS enrollments,
    to_regclass('certification_lab_requests') AS labs,
    to_regclass('certification_audit_events') AS audit`)).rows[0];
  if (!tables || ['agreements', 'enrollments', 'labs', 'audit'].some(name => !tables[name])) throw new Error('Certification schema is missing; apply reviewed migrations separately');
  const columns = new Set((await pool.query(
    'SELECT attname FROM pg_attribute WHERE attrelid=to_regclass($1) AND attnum>0 AND NOT attisdropped',
    ['certification_enrollments'])).rows.map(row => row.attname));
  if (requiredEnrollmentColumns.some(name => !columns.has(name))) throw new Error('Certification enrollment columns are incomplete; reviewed migrations 001–005 required');
  const constraints = (await pool.query(
    'SELECT conname, convalidated FROM pg_constraint WHERE conrelid=to_regclass($1)',
    ['certification_enrollments'])).rows;
  if (!constraints.some(row => row.conname === 'certification_account_acknowledgment_required' && row.convalidated === true)) throw new Error('Validated account acknowledgment constraint is required');
  const requirements = { certification_enrollments: ['certification_student_id_immutable'],
    certification_agreements: ['certification_agreement_immutable', 'certification_agreement_no_truncate'] };
  for (const [table, names] of Object.entries(requirements)) {
    const triggers = (await pool.query(
      'SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid=to_regclass($1) AND NOT tgisinternal', [table])).rows;
    if (names.some(name => !triggers.some(row => row.tgname === name && ['O', 'A'].includes(row.tgenabled)))) throw new Error('Required certification safeguard triggers are missing or disabled');
  }
}

export async function validateActiveEnrollmentAgreement(pool, config) {
  if (config.manualReviewEnabled === true) {
    if (!config.activeAgreementVersion) throw new Error('Manual review requires an active enrollment agreement');
    await validateManualReviewReadiness(pool);
  }
  if (!config.enrollmentSubmissionEnabled && !config.activeAgreementVersion) return;
  const row = (await pool.query('SELECT content, content_sha256 FROM certification_agreements WHERE version=$1', [config.activeAgreementVersion])).rows[0];
  if (!row || typeof row.content !== 'string' || row.content.length > 60000 ||
      row.content_sha256 !== config.activeAgreementSha256 ||
      createHash('sha256').update(row.content, 'utf8').digest('hex') !== config.activeAgreementSha256) throw new Error('Configured enrollment agreement is missing or its content hash does not match');
}
