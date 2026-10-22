import { randomUUID } from 'node:crypto';

const references = new WeakMap();
const stages = new Set([
  'authorization', 'configuration', 'submission_validation', 'age_declaration',
  'acknowledgment_validation', 'version_validation', 'comprehension_validation',
  'database_connect', 'transaction_begin', 'agreement_verification',
  'enrollment_lock', 'invitation_check', 'enrollment_update', 'audit_insert',
  'transaction_commit', 'interaction'
]);
const sqlStates = new Set(['23502', '23503', '23505', '23514', '42501',
  '40001', '40P01', '55P03', '57014', '08006', '08001', '53300']);
const constraints = new Set([
  'certification_account_acknowledgment_required',
  'certification_acknowledgment_hash_format',
  'certification_active_registration_owner',
  'certification_application_closure_complete',
  'certification_enrollments_agreement_version_fkey',
  'certification_enrollments_check', 'certification_enrollments_status_check',
  'certification_enrollments_pkey', 'certification_enrollments_student_id_key',
  'certification_typed_name_required', 'certification_audit_events_pkey'
]);
const objectLike = value => value !== null &&
  (typeof value === 'object' || typeof value === 'function');
function ownString(error, key) {
  try {
    const field = objectLike(error) && Object.getOwnPropertyDescriptor(error, key);
    return field && Object.hasOwn(field, 'value') && typeof field.value === 'string'
      ? field.value : undefined;
  } catch { return undefined; }
}

// One tracker per attempt. Never attach metadata to raw errors or serialize them.
export function createSubmissionDiagnostic({ log = record => console.error(record) } = {}) {
  const correlationId = randomUUID();
  let stage = 'interaction';
  let reported = false;
  return Object.freeze({
    setStage(value) { stage = stages.has(value) ? value : 'interaction'; },
    report(error) {
      if (objectLike(error) && references.has(error)) return references.get(error);
      if (reported) return correlationId;
      reported = true;
      if (objectLike(error)) references.set(error, correlationId);
      const code = ownString(error, 'code');
      const constraint = ownString(error, 'constraint');
      const record = {
        event: 'certification_submission_failed', correlationId, stage,
        category: sqlStates.has(code) ? 'database' : 'unexpected',
        ...(sqlStates.has(code) ? { sqlState: code } : {}),
        ...(sqlStates.has(code) && constraints.has(constraint) ? { constraint } : {})
      };
      try { log(Object.freeze(record)); } catch { /* Logging must not affect cleanup. */ }
      return correlationId;
    }
  });
}

export function submissionFailureReference(error) {
  return objectLike(error) ? references.get(error) : undefined;
}
