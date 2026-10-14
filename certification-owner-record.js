import { EmbedBuilder } from 'discord.js';
import { hasCurrentAgeEligibility } from './certification-age-evidence.js';
import { hasCompleteTypedAcknowledgment } from './certification-acknowledgment.js';

const safe = value => String(value ?? 'Not recorded').replace(/[`*_~|<>@]/g, '').slice(0, 160);
function timestamp(value) {
  if (!(value instanceof Date) && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value))) return 'Not recorded or invalid';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not recorded or invalid';
  const seconds = Math.floor(date.getTime() / 1000);
  return `<t:${seconds}:f> · <t:${seconds}:R>`;
}
function nextStep(row) {
  if (['suspended', 'revoked'].includes(row.status)) return 'Next step: review current eligibility and the restriction before considering separate owner reinstatement. Renewal alone cannot restore access.';
  if (row.status === 'pending') return 'Next step: use Review acknowledgment to inspect the request before any approval. Missing or outdated evidence requires review; pending status grants no access.';
  if (row.status === 'awaiting_acknowledgment') return 'Next step: acknowledgment is still required. Review the learner workflow before attempting approval; this record is not an approved enrollment.';
  if (row.status === 'approved') return 'Next step: check current eligibility and stored evidence before relying on approved status. Use Refresh record or Check enrollment snapshot when the result may have changed.';
  if (row.status === 'denied') return 'Next step: review the denial through the approved operator process. This panel does not reopen a denied request or grant access.';
  return 'Next step: this record requires owner review.';
}
export function buildOwnerLearnerRecord(row) {
  const restricted = ['suspended', 'revoked'].includes(row.status);
  const id = typeof row.student_id === 'string' && /^NG-PT-[A-Za-z0-9-]{1,80}$/.test(row.student_id) ? row.student_id : 'Not issued or requires review';
  return new EmbedBuilder().setColor(restricted ? 0xf59e0b : 0x14b8a6).setAuthor({ name: 'NEPTUNEGUARD | LEARNER REVIEW' }).setTitle('Student access record').setDescription(`${nextStep(row)}\n\nThis panel is read-only; status alone is not effective authorization.`).addFields(
    { name: 'Enrollment record', value: `Discord ID: ${safe(row.discord_user_id)}\nPermanent ID: ${id}\nStored status: ${safe(row.status)}` },
    { name: 'Acknowledgment and comprehension', value: `Stored typed acknowledgment: ${hasCompleteTypedAcknowledgment(row) ? 'Complete according to stored evidence' : 'Incomplete — owner review required'}\nAcknowledgment time: ${timestamp(row.acknowledged_at)}\nReading confirmation: ${row.learner_confirmed_read_at ? 'Recorded (learner-confirmed)' : 'Not recorded'}\nComprehension evidence: ${row.comprehension_passed_at ? 'Recorded' : 'Not recorded'}` },
    { name: 'Agreement references', value: `Agreement version: ${safe(row.agreement_version)}\nComprehension version: ${safe(row.comprehension_check_version)}\nStored references are not a finding that current configuration matches.` },
    { name: 'Age eligibility evidence', value: `${hasCurrentAgeEligibility(row) ? 'Current-policy self-reported confirmation recorded' : 'Missing, invalid or outdated — owner review required'}\nSelf-report is not independent age verification. No raw age or acknowledgment name is displayed.` },
    { name: 'Original approval', value: `Approval time: ${timestamp(row.approved_at)}\nApproving owner recorded: ${/^\d{17,20}$/.test(row.approved_by || '') ? 'Yes' : 'No or invalid'}\nThis does not establish current access.` },
    { name: 'Action boundaries', value: `${restricted ? 'Enrollment remains restricted; renewal does not reinstate access. ' : ''}Owner review and backend checks still apply. Enrollment approval, reinstatement, lab authorization, and certificate issuance remain separate. No lab permission is restored by this panel.` }
  ).setFooter({ text: 'Private database snapshot • Refresh before acting • Controls revalidate changes' }).setTimestamp();
}
