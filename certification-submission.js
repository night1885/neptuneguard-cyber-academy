import { createHash } from 'node:crypto';
import { validateAgeDeclaration } from './certification-age-declaration.js';
import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';
import { createRegistrationInvitationReader } from './certification-registration-invitation.js';

export function createCertificationSubmission(pool, config) {
  const enabled = config.enabled === true && config.enrollmentSubmissionEnabled === true;
  const version = config.activeAgreementVersion;
  const hash = config.activeAgreementSha256;
  const checkVersion = config.comprehensionCheck?.version;
  const key = Array.isArray(config.comprehensionCheck?.correctAnswers) ? [...config.comprehensionCheck.correctAnswers] : [];
  const configured = typeof version === 'string' && version.length > 0 && version.length <= 100 &&
    typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) &&
    typeof checkVersion === 'string' && checkVersion.length > 0 && checkVersion.length <= 100 &&
    key.length > 0 && key.length <= 3 && key.every(value => typeof value === 'string' && value.length > 0 && value.length <= 100);

  async function submit(studentDiscordId, submission, invitedOnly) {
    if (invitedOnly ? config.enabled !== true : !enabled) throw new Error('Enrollment submission is disabled');
    if (!configured) throw new Error('Approved agreement and comprehension configuration required');
    if (typeof studentDiscordId !== 'string' || !/^\d{17,20}$/.test(studentDiscordId)) throw new Error('Invalid student Discord ID');
    if (!submission || typeof submission !== 'object' || Array.isArray(submission) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(submission))) throw new Error('Invalid enrollment submission');
    const allowed = new Set(['ageEligibility', 'acknowledgmentAccepted', 'confirmedRead', 'agreementVersion', 'agreementSha256', 'comprehensionCheckVersion', 'answers']);
    for (const field of Reflect.ownKeys(submission)) {
      const descriptor = Object.getOwnPropertyDescriptor(submission, field);
      if (!allowed.has(field) || !Object.hasOwn(descriptor, 'value')) throw new Error('Unsupported enrollment field');
    }
    const declaration = validateAgeDeclaration({ ageEligibility: submission.ageEligibility });
    if (submission.acknowledgmentAccepted !== true || submission.confirmedRead !== true) throw new Error('Explicit agreement acknowledgment and reading confirmation required');
    if (submission.agreementVersion !== version || submission.agreementSha256 !== hash || submission.comprehensionCheckVersion !== checkVersion) {
      throw new Error('Agreement or comprehension version changed; start again');
    }
    if (!Array.isArray(submission.answers) || submission.answers.length !== key.length || !key.every((answer, index) => submission.answers[index] === answer)) throw new Error('Comprehension check did not pass');
    const db = await pool.connect();
    let discard = false;
    try {
      await db.query('BEGIN');
      const agreement = (await db.query('SELECT content, content_sha256 FROM certification_agreements WHERE version=$1 FOR SHARE', [version])).rows[0];
      if (!agreement || typeof agreement.content !== 'string' || agreement.content_sha256 !== hash || createHash('sha256').update(agreement.content, 'utf8').digest('hex') !== hash) throw new Error('Approved agreement content is unavailable or changed');
      if (!invitedOnly) await db.query(`INSERT INTO certification_enrollments (discord_user_id, status) VALUES ($1,'awaiting_acknowledgment') ON CONFLICT (discord_user_id) DO NOTHING`, [studentDiscordId]);
      const row = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [studentDiscordId])).rows[0];
      if (!row) throw new Error('Enrollment record unavailable');
      if (invitedOnly && !await createRegistrationInvitationReader(db, config).hasPendingInvitation(studentDiscordId)) throw new Error('Pending admin registration invitation required');
      if (row.status === 'pending') {
        if (!hasCompleteAccountAcknowledgment(row) || row.agreement_version !== version || row.agreement_content_sha256 !== hash || row.comprehension_check_version !== checkVersion) throw new Error('Existing pending request requires owner review');
        await db.query('COMMIT');
        return { status: 'pending', alreadySubmitted: true };
      }
      if (row.status !== 'awaiting_acknowledgment' || row.student_id || row.approved_by || row.approved_at || row.acknowledgment_name != null || row.signature_reference != null) throw new Error('Existing enrollment requires owner review; submission cannot change access or remove historical identity fields');
      await db.query(`UPDATE certification_enrollments
        SET status='pending', agreement_version=$2, agreement_content_sha256=$3,
            acknowledgment_name=NULL, signature_method='discord_account', signature_reference=NULL,
            acknowledged_at=NOW(), learner_confirmed_read_at=NOW(), comprehension_passed_at=NOW(),
            comprehension_check_version=$4, age_eligible=TRUE, age_declared_at=NOW(),
            age_declaration_version=$5, status_reason=NULL, updated_at=NOW()
        WHERE discord_user_id=$1`, [studentDiscordId, version, hash, checkVersion, declaration.declarationVersion]);
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1,$1,'enrollment_submitted',$2::jsonb)`,
        [studentDiscordId, JSON.stringify({ agreementVersion: version, agreementSha256: hash, comprehensionCheckVersion: checkVersion, acknowledgmentMethod: 'discord_account', ageDeclarationVersion: declaration.declarationVersion, ageEligibility: true })]);
      await db.query('COMMIT');
      return { status: 'pending', alreadySubmitted: false };
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({
    submitEnrollment: (studentDiscordId, submission) => submit(studentDiscordId, submission, false),
    submitInvitedEnrollment: (studentDiscordId, submission) => submit(studentDiscordId, submission, true)
  });
}
