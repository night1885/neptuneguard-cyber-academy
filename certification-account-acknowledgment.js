import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';

export function hasCompleteAccountAcknowledgment(record) {
  return Boolean(record &&
    typeof record.discord_user_id === 'string' && /^\d{17,20}$/.test(record.discord_user_id) &&
    record.signature_method === 'discord_account' &&
    record.acknowledgment_name == null && record.signature_reference == null &&
    typeof record.agreement_version === 'string' && record.agreement_version.length > 0 &&
    record.agreement_version.length <= 100 &&
    typeof record.agreement_content_sha256 === 'string' && /^[a-f0-9]{64}$/.test(record.agreement_content_sha256) &&
    record.acknowledged_at && record.learner_confirmed_read_at && record.comprehension_passed_at &&
    typeof record.comprehension_check_version === 'string' && record.comprehension_check_version.length > 0 &&
    record.age_eligible === true && record.age_declared_at &&
    record.age_declaration_version === AGE_DECLARATION_VERSION);
}
