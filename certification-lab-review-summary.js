import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';

const safe = value => String(value ?? 'Not recorded').replace(/[`*_~|<>@]/g, '').slice(0, 100);
const timestamp = value => {
  if (!(value instanceof Date) && (typeof value !== 'string' || !value.trim())) return null;
  const milliseconds = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
};
const configured = value => typeof value === 'string' && value.trim().length > 0;
const present = value => configured(value);
const current = (configuredValue, storedValue) => !configured(configuredValue)
  ? 'Not configured; current-version match cannot be checked'
  : configuredValue === storedValue ? 'Matches configured value' : 'Missing or does not match configured value';

export function buildLabReviewSummary(request, enrollment, config, { now = Date.now() } = {}) {
  if (!request || typeof request !== 'object') throw new Error('Lab request required');
  if (!Number.isFinite(now)) throw new Error('Valid snapshot time required');
  const linked = Boolean(enrollment && typeof request.discord_user_id === 'string' &&
    /^\d{17,20}$/.test(request.discord_user_id) && enrollment.discord_user_id === request.discord_user_id);
  const learner = linked ? enrollment : null;
  const start = timestamp(request.starts_at), end = timestamp(request.expires_at);
  let window = 'Missing start or expiry; no complete window recorded';
  if (request.starts_at != null && request.expires_at != null) {
    if (start === null || end === null || end <= start) window = 'Invalid recorded start/expiry window';
    else if (end <= now) window = 'Recorded window has elapsed';
    else if (start > now) window = 'Recorded window is scheduled for the future';
    else window = 'Snapshot falls within the recorded window; this does not grant access';
  }
  const rulesAt = timestamp(request.rules_acknowledged_at);
  const rules = present(request.rules_version) && rulesAt !== null && rulesAt <= now
    ? 'Version and acknowledgment timestamp recorded; current lab-rules policy not verified'
    : 'Missing or invalid version/acknowledgment timestamp';
  const approvalAt = timestamp(learner?.approved_at);
  const courseRecord = learner?.status === 'approved' && present(learner.student_id) &&
    present(learner.approved_by) && approvalAt !== null && approvalAt <= now;
  return {
    title: 'Lab review — recorded prerequisites', color: 0xf1c40f,
    description: 'Read-only snapshot, not an approval decision or a full eligibility assessment. No authorization is granted or changed. No provider is contacted.',
    fields: [
      { name: 'Request', value: safe(request.request_id) },
      { name: 'Student Discord ID', value: safe(request.discord_user_id), inline: true },
      { name: 'Lab identifier', value: safe(request.lab_key), inline: true },
      { name: 'Stored request status', value: safe(request.status), inline: true },
      { name: 'Linked enrollment', value: linked ? `Stored status: ${safe(learner.status)}` : 'Matching enrollment not found; learner checks unavailable' },
      { name: 'Course approval record', value: courseRecord ? 'Approved status, permanent ID, actor, and timestamp recorded' : 'Missing or incomplete approved enrollment record' },
      { name: 'Account acknowledgment and age declaration', value: hasCompleteAccountAcknowledgment(learner) ? 'Required account acknowledgment and self-declared age 18+ records present; not independent verification' : 'Missing or incomplete account acknowledgment or positive age declaration' },
      { name: 'Agreement version', value: current(config.activeAgreementVersion, learner?.agreement_version) },
      { name: 'Agreement content hash', value: current(config.activeAgreementSha256, learner?.agreement_content_sha256) },
      { name: 'Comprehension version', value: current(config.comprehensionCheck?.version, learner?.comprehension_check_version) },
      { name: 'Lab rules acknowledgment', value: rules },
      { name: 'Recorded authorization window', value: window },
      { name: 'Not checked by this panel', value: 'Approved lab catalog, scope permissions, current lab-rules policy, provider health, and running-session status. Stored scope and private notes are not displayed. Approval remains unavailable here.' }
    ],
    footer: { text: 'Owner-only • Read-only • No approval • No provider calls' }
  };
}
