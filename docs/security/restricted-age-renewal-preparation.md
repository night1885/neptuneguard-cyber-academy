# Restricted-state eligibility renewal backend — not routed yet

This standalone backend prepares fresh self-reported eligibility confirmation for suspended/revoked learners. It requires both existing certification/submission gates, valid learner identity, reported age 16+, typed name, explicit reading confirmation, current approved agreement/hash/check binding, and passing comprehension. The future authenticated Discord caller must derive the learner ID from the interaction, not a submitted target field.

Inside a transaction it verifies the agreement snapshot and locks the existing enrollment. Only suspended/revoked records with a permanent ID, prior approval, and complete acknowledgment matching the presented agreement/check may renew. Changed terms, mismatched names, missing approval/legacy metadata, other statuses, or absent records require owner review; this API does not create enrollment or silently replace agreement acknowledgment.

The only enrollment writes are the true eligibility flag, database NOW timestamp, trusted age-16-v1 policy, and updated_at. Audit details include policy, self_report method, and unchanged enrollment status, never exact age or birth date. Repeated current-evidence requests preserve the timestamp and avoid another audit event. Audit failure rolls back; failed rollback discards the client. An uncertain remote outcome still requires persisted-status review.

Status, ID, approval fields, acknowledgment, and lab records are unchanged. Renewal does not restore course access, lab access, or an active session. Owner reinstatement remains separate and checks current evidence. This backend is not an independent age-verification mechanism.

Six mocked unit tests are prepared; exact-head CI has not yet been checked. Real PostgreSQL concurrency/rollback and restricted-role coverage for renewal, authenticated one-use Discord session routing, abuse controls, private replies, and owner renewal visibility remain follow-up work. No button or entry message is published by this patch.

The new backend is not yet imported by the runtime/router, so the legacy restricted-state renewal gap is not closed until routing and verification are complete. Retention/legal decisions and agreement/checklist reconciliation remain outstanding. No production migration, configuration change, access restoration, merge, deployment, publication, or activation is performed or authorized.
