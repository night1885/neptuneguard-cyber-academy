export function normalizeAcknowledgmentName(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error('Invalid typed acknowledgment name');
  const name = value.trim().normalize('NFC');
  if (!name || name.length > 200) throw new Error('Typed acknowledgment name must contain 1–200 characters');
  return name;
}

export function hasCompleteTypedAcknowledgment(record) {
  if (!record || record.signature_method !== 'typed_name' || !record.agreement_version ||
      !record.acknowledged_at || !record.learner_confirmed_read_at || !record.comprehension_passed_at) return false;
  try {
    normalizeAcknowledgmentName(record.acknowledgment_name);
    return true;
  } catch { return false; }
}
