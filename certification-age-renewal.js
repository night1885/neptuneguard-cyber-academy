import { createHash } from 'node:crypto';
import { normalizeAcknowledgmentName, hasCompleteTypedAcknowledgment } from './certification-acknowledgment.js';
import { requireEligibleCertificationAge } from './certification-age-eligibility.js';
import { CERTIFICATION_AGE_POLICY_VERSION, hasCurrentAgeEligibility } from './certification-age-evidence.js';

export function createCertificationAgeRenewal(pool, config) {
  const enabled = config.enabled === true && config.enrollmentSubmissionEnabled === true;
  const version = config.activeAgreementVersion; const hash = config.activeAgreementSha256;
  const checkVersion = config.comprehensionCheck?.version;
  const key = Array.isArray(config.comprehensionCheck?.correctAnswers) ? [...config.comprehensionCheck.correctAnswers] : [];
  const configured = typeof version === 'string' && version.length > 0 && version.length <= 100 &&
    typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) &&
    typeof checkVersion === 'string' && checkVersion.length > 0 && checkVersion.length <= 100 &&
    key.length >= 1 && key.length <= 3 && key.every(answer => typeof answer === 'string' && answer.length > 0 && answer.length <= 100);

  async function renewEligibility(studentDiscordId, input) {
    if (!enabled) throw new Error('Eligibility renewal is disabled');
    if (!configured) throw new Error('Approved agreement and comprehension configuration required');
    if (typeof studentDiscordId !== 'string' || !/^\d{17,20}$/.test(studentDiscordId)) throw new Error('Invalid learner Discord ID');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid eligibility renewal');
    requireEligibleCertificationAge(input.reportedAge);
    const name = normalizeAcknowledgmentName(input.typedName);
    if (input.confirmedRead !== true) throw new Error('Explicit reading confirmation required');
    if (input.agreementVersion !== version || input.agreementSha256 !== hash || input.comprehensionCheckVersion !== checkVersion) throw new Error('Agreement or comprehension version changed; start again');
    if (!Array.isArray(input.answers) || input.answers.length !== key.length || !key.every((answer, index) => input.answers[index] === answer)) throw new Error('Comprehension check did not pass');
    const db = await pool.connect(); let discard = false;
    try {
      await db.query('BEGIN');
      const agreement = (await db.query('SELECT content, content_sha256 FROM certification_agreements WHERE version=$1 FOR SHARE', [version])).rows[0];
      if (!agreement || typeof agreement.content !== 'string' || agreement.content.length > 60000 || agreement.content_sha256 !== hash || createHash('sha256').update(agreement.content, 'utf8').digest('hex') !== hash) throw new Error('Approved agreement content is unavailable or changed');
      const row = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [studentDiscordId])).rows[0];
      if (!row || !['suspended', 'revoked'].includes(row.status)) throw new Error('Restricted enrollment requires owner review; this renewal does not create or change enrollment status');
      if (!row.student_id || !row.approved_by || !row.approved_at || !hasCompleteTypedAcknowledgment(row) || row.acknowledgment_name !== name || row.agreement_version !== version || row.agreement_content_sha256 !== hash || row.comprehension_check_version !== checkVersion) throw new Error('Matching prior approval and acknowledgment require owner review before renewal');
      if (hasCurrentAgeEligibility(row)) {
        await db.query('COMMIT'); return { status: row.status, alreadyConfirmed: true };
      }
      await db.query('UPDATE certification_enrollments SET age_eligibility_confirmed=true, age_eligibility_confirmed_at=NOW(), age_policy_version=$2, updated_at=NOW() WHERE discord_user_id=$1', [studentDiscordId, CERTIFICATION_AGE_POLICY_VERSION]);
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1,$1,'age_eligibility_renewed',$2::jsonb)`, [studentDiscordId, JSON.stringify({ agePolicyVersion: CERTIFICATION_AGE_POLICY_VERSION, method: 'self_report', enrollmentStatus: row.status })]);
      await db.query('COMMIT'); return { status: row.status, alreadyConfirmed: false };
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({ renewEligibility });
}
