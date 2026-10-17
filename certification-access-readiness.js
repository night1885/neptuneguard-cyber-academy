import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';

function acknowledgmentDetails(record) {
  const details = [];
  if (typeof record.discord_user_id !== 'string' || !/^\d{17,20}$/.test(record.discord_user_id)) details.push('Discord user ID is missing or invalid.');
  if (record.signature_method !== 'discord_account') details.push('Discord-account acknowledgment required.');
  if (record.acknowledgment_name != null || record.signature_reference != null) details.push('Historical identity fields need review.');
  if (typeof record.agreement_version !== 'string' || !record.agreement_version.length || record.agreement_version.length > 100) details.push('Agreement version is missing or invalid.');
  if (typeof record.agreement_content_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.agreement_content_sha256)) details.push('Agreement hash is missing or invalid.');
  if (!record.acknowledged_at) details.push('Agreement acknowledgment is missing.');
  if (!record.learner_confirmed_read_at) details.push('Reading confirmation is missing.');
  if (!record.comprehension_passed_at) details.push('Comprehension pass is missing.');
  if (typeof record.comprehension_check_version !== 'string' || !record.comprehension_check_version.length) details.push('Comprehension version is missing.');
  if (record.age_eligible !== true) details.push('Positive age-18 declaration is missing.');
  if (!record.age_declared_at) details.push('Age declaration timestamp is missing.');
  if (record.age_declaration_version !== AGE_DECLARATION_VERSION) details.push('Age declaration version is not current.');
  return details;
}

export function evaluateCourseAccessReadiness(record, config) {
  const blockers = [];
  if (!config.enabled) blockers.push('Certification is disabled.');
  if (!record) return { authorized: false, readyForApproval: false, blockers: [...blockers, 'No enrollment record exists.'] };
  if (record.status !== 'approved') blockers.push('Enrollment is not approved.');
  if (typeof record.student_id !== 'string' || !record.student_id.trim()) blockers.push('Permanent student ID is missing.');
  if (!record.approved_by) blockers.push('Approver is missing.');
  if (!record.approved_at) blockers.push('Approval timestamp is missing.');
  const acknowledgmentBlockers = [];
  if (record.status === 'pending' && record.student_id != null && (typeof record.student_id !== 'string' || !record.student_id.trim())) acknowledgmentBlockers.push('Pending permanent student ID is invalid; admin review required.');
  if (!hasCompleteAccountAcknowledgment(record)) {
    acknowledgmentBlockers.push('Required Discord-account acknowledgment records are incomplete or invalid.');
    acknowledgmentBlockers.push(...acknowledgmentDetails(record));
  }
  if (config.activeAgreementVersion && record.agreement_version !== config.activeAgreementVersion) acknowledgmentBlockers.push('Agreement version is not current.');
  if (config.activeAgreementSha256 && record.agreement_content_sha256 !== config.activeAgreementSha256) acknowledgmentBlockers.push('Agreement content hash is not current.');
  if (config.comprehensionCheck?.version && record.comprehension_check_version !== config.comprehensionCheck.version) acknowledgmentBlockers.push('Comprehension-check version is not current.');
  blockers.push(...acknowledgmentBlockers);
  return { authorized: blockers.length === 0, readyForApproval: Boolean(config.enabled && record.status === 'pending' && acknowledgmentBlockers.length === 0), blockers };
}
