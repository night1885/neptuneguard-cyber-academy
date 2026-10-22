import { createHash } from 'node:crypto';
import { validateAgeDeclaration } from './certification-age-declaration.js';
import { registrationPilotPolicy } from './certification-registration-pilot-policy.js';
import { createManualReviewSnapshot, hasManualReviewAcknowledgment } from './certification-manual-review-data.mjs';

// Draft backend. Must be enabled only after reviewed schema and role readiness checks.
export function createManualReviewSubmission(pool, config, {
  createInvitationReader, createDiagnostic
} = {}) {
  if (config?.manualReviewEnabled !== true || (createInvitationReader !== undefined && typeof createInvitationReader !== 'function') ||
      (createDiagnostic !== undefined && typeof createDiagnostic !== 'function')) throw new Error('Explicit manual-review service configuration required');
  config = Object.freeze({ ...config });
  const policy = registrationPilotPolicy(config);
  const version = config.activeAgreementVersion, hash = config.activeAgreementSha256;
  const checkVersion = config.comprehensionCheck?.version;
  const template = createManualReviewSnapshot(config, config.comprehensionCheck?.correctAnswers);
  const guideConfig = { comprehensionCheck: { version: template.checkVersion,
    questions: template.items.map(item => ({ prompt: item.question })),
    correctAnswers: template.items.map(item => item.expectedAnswer) } };
  if (typeof version !== 'string' || !version.length || version.length > 100 ||
      typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Approved agreement configuration required');
  async function submit(studentId, input, invitedOnly) {
    const diagnostic = createDiagnostic ? createDiagnostic() :
      (await import('./certification-submission-diagnostics.mjs')).createSubmissionDiagnostic();
    const stage = value => diagnostic.setStage(value);
    try {
      stage('authorization');
      if (config.enabled !== true || (!invitedOnly && config.enrollmentSubmissionEnabled !== true)) throw new Error('Submission unavailable');
      if (policy) { if (!invitedOnly) throw new Error('General enrollment unavailable in pilot'); policy.assertTarget(studentId); }
      stage('submission_validation');
      if (typeof studentId !== 'string' || !/^[0-9]{17,20}$/.test(studentId) || !input || typeof input !== 'object' ||
          Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error('Invalid submission');
      const fields = new Set(['ageEligibility','acknowledgmentAccepted','confirmedRead','agreementVersion','agreementSha256','comprehensionCheckVersion','answers']);
      for (const key of Reflect.ownKeys(input)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (!fields.has(key) || !descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('Unsupported enrollment field');
      }
      stage('age_declaration');
      const declaration = validateAgeDeclaration({ ageEligibility: input.ageEligibility });
      stage('acknowledgment_validation');
      if (input.acknowledgmentAccepted !== true || input.confirmedRead !== true) throw new Error('Explicit acknowledgment and reading confirmation required');
      stage('version_validation');
      if (input.agreementVersion !== version || input.agreementSha256 !== hash || input.comprehensionCheckVersion !== checkVersion) throw new Error('Agreement or question version changed');
      stage('comprehension_validation');
      const snapshot = createManualReviewSnapshot(guideConfig, input.answers);
      stage('database_connect');
      const db = await pool.connect();
      let discard = false;
      try {
        stage('transaction_begin');
        await db.query('BEGIN');
        stage('agreement_verification');
        const agreement = (await db.query('SELECT content, content_sha256 FROM certification_agreements WHERE version=$1 FOR SHARE', [version])).rows[0];
        if (!agreement || typeof agreement.content !== 'string' || agreement.content_sha256 !== hash ||
            createHash('sha256').update(agreement.content, 'utf8').digest('hex') !== hash) throw new Error('Approved agreement unavailable');
        if (!invitedOnly) {
          stage('enrollment_update');
          await db.query(`INSERT INTO certification_enrollments(discord_user_id,status) VALUES($1,'awaiting_acknowledgment') ON CONFLICT(discord_user_id) DO NOTHING`, [studentId]);
        }
        stage('enrollment_lock');
        const row = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [studentId])).rows[0];
        if (!row) throw new Error('Enrollment record unavailable');
        if (row.status === 'pending') {
          if (!hasManualReviewAcknowledgment(row) || row.agreement_version !== version || row.agreement_content_sha256 !== hash ||
              row.comprehension_check_version !== checkVersion) throw new Error('Pending record requires owner review');
          stage('transaction_commit');
          await db.query('COMMIT');
          return { status: 'pending', alreadySubmitted: true };
        }
        stage('invitation_check');
        if (invitedOnly) {
          const factory = createInvitationReader || (await import('./certification-registration-invitation.js')).createRegistrationInvitationReader;
          if (!await factory(db, config).hasPendingInvitation(studentId)) throw new Error('Pending owner invitation required');
        }
        if (row.status !== 'awaiting_acknowledgment' || row.student_id != null || row.approved_by != null ||
            row.approved_at != null || row.acknowledgment_name != null || row.signature_reference != null) throw new Error('Historical enrollment requires owner review');
        stage('enrollment_update');
        await db.query(`UPDATE certification_enrollments SET status='pending', agreement_version=$2,
          agreement_content_sha256=$3, acknowledgment_name=NULL, signature_method='discord_account',
          signature_reference=NULL, acknowledged_at=NOW(), learner_confirmed_read_at=NOW(),
          comprehension_passed_at=NULL, comprehension_check_version=$4,
          comprehension_submitted_at=NOW(), comprehension_review_snapshot=$6::jsonb,
          age_eligible=TRUE, age_declared_at=NOW(), age_declaration_version=$5,
          status_reason=NULL, updated_at=NOW() WHERE discord_user_id=$1`,
          [studentId, version, hash, checkVersion, declaration.declarationVersion, JSON.stringify(snapshot)]);
        stage('audit_insert');
        await db.query(`INSERT INTO certification_audit_events(actor_discord_user_id,subject_discord_user_id,action,details)
          VALUES($1,$1,'enrollment_submitted',$2::jsonb)`, [studentId, JSON.stringify({
          agreementVersion: version, agreementSha256: hash, comprehensionCheckVersion: checkVersion,
          acknowledgmentMethod: 'discord_account', ageDeclarationVersion: declaration.declarationVersion,
          reviewMode: 'manual-review-v1', accessGranted: false })]);
        stage('transaction_commit');
        await db.query('COMMIT');
        return { status: 'pending', alreadySubmitted: false };
      } catch (error) {
        try { await db.query('ROLLBACK'); } catch { discard = true; }
        throw error;
      } finally { db.release(discard); }
    } catch (error) { try { diagnostic.report(error); } catch {} throw error; }
  }
  return Object.freeze({
    submitEnrollment: (studentId, input) => submit(studentId, input, false),
    submitInvitedEnrollment: (studentId, input) => submit(studentId, input, true)
  });
}
