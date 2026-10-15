import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';

export function evaluateCourseAccessReadiness(record, config) {
  const blockers = [];
  if (!config.enabled) blockers.push('Certification is disabled.');
  if (!record) return { authorized: false, readyForApproval: false, blockers: [...blockers, 'No enrollment record exists.'] };
  if (record.status !== 'approved') blockers.push('Enrollment is not approved.');
  if (typeof record.student_id !== 'string' || !record.student_id.trim()) blockers.push('Permanent student ID is missing.');
  if (!record.approved_by) blockers.push('Approver is missing.');
  if (!record.approved_at) blockers.push('Approval timestamp is missing.');
  const acknowledgmentBlockers = [];
  if (!hasCompleteAccountAcknowledgment(record)) acknowledgmentBlockers.push('Required Discord-account acknowledgment records are incomplete or invalid.');
  if (config.activeAgreementVersion && record.agreement_version !== config.activeAgreementVersion) acknowledgmentBlockers.push('Agreement version is not current.');
  if (config.activeAgreementSha256 && record.agreement_content_sha256 !== config.activeAgreementSha256) acknowledgmentBlockers.push('Agreement content hash is not current.');
  if (config.comprehensionCheck?.version && record.comprehension_check_version !== config.comprehensionCheck.version) acknowledgmentBlockers.push('Comprehension-check version is not current.');
  blockers.push(...acknowledgmentBlockers);
  return { authorized: blockers.length === 0, readyForApproval: Boolean(config.enabled && record.status === 'pending' && acknowledgmentBlockers.length === 0), blockers };
}
