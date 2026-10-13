import { EmbedBuilder } from 'discord.js';
import { hasCurrentAgeEligibility } from './certification-age-evidence.js';
import { hasCompleteTypedAcknowledgment } from './certification-acknowledgment.js';

const safe = value => String(value ?? 'Not recorded').replace(/[`*_~|<>@]/g, '').slice(0, 160);
function timestamp(value) {
  if (!(value instanceof Date) && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value))) return 'Not recorded or invalid';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : 'Not recorded or invalid';
}
export function buildOwnerLearnerRecord(row) {
  const restricted = ['suspended', 'revoked'].includes(row.status);
  const id = typeof row.student_id === 'string' && /^NG-PT-[A-Za-z0-9-]{1,80}$/.test(row.student_id) ? row.student_id : 'Not issued or requires review';
  return new EmbedBuilder().setColor(restricted ? 0xf59e0b : 0x14b8a6).setAuthor({ name: 'NEPTUNEGUARD | LEARNER REVIEW' }).setTitle('Student access record').setDescription('Inspect stored enrollment and evidence before using the controls below. This panel is read-only; status alone is not effective authorization.').addFields(
    { name: 'Enrollment record', value: `Discord ID: ${safe(row.discord_user_id)}\nPermanent ID: ${id}\nStored status: ${safe(row.status)}` },
    { name: 'Acknowledgment and comprehension', value: `Stored typed acknowledgment: ${hasCompleteTypedAcknowledgment(row) ? 'Complete according to stored evidence' : 'Incomplete — owner review required'}\nAcknowledgment time: ${timestamp(row.acknowledged_at)}\nReading confirmation: ${row.learner_confirmed_read_at ? 'Recorded (learner-confirmed)' : 'Not recorded'}\nComprehension evidence: ${row.comprehension_passed_at ? 'Recorded' : 'Not recorded'}` },
    { name: 'Agreement references', value: `Agreement version: ${safe(row.agreement_version)}\nComprehension version: ${safe(row.comprehension_check_version)}\nStored references are not a finding that current configuration matches.` },
    { name: 'Age eligibility evidence', value: `${hasCurrentAgeEligibility(row) ? 'Current-policy self-reported confirmation recorded' : 'Missing, invalid or outdated — owner review required'}\nSelf-report is not independent age verification. No raw age or acknowledgment name is displayed.` },
    { name: 'Original approval', value: `Approval time: ${timestamp(row.approved_at)}\nApproving owner recorded: ${/^\d{17,20}$/.test(row.approved_by || '') ? 'Yes' : 'No or invalid'}\nThis does not establish current access.` },
    { name: 'Action boundaries', value: `${restricted ? 'Enrollment remains restricted; renewal does not reinstate access. ' : ''}Owner review and backend checks still apply. Enrollment approval, reinstatement, lab authorization, and certificate issuance remain separate. No lab permission is restored by this panel.` }
  ).setFooter({ text: 'Private database snapshot • Refresh before acting • Controls revalidate changes' }).setTimestamp();
}
