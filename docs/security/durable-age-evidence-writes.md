# Durable age evidence — submission writer connected in branch source

Migration/helper CI at 55080fdd0fb69e5b6b0ac2c06fd96533a386f319 passed the unit and PostgreSQL 16/18 jobs before this patch. This writer patch requires its own exact-head CI verification.

The age-checked backend now owns its submission transaction instead of delegating to the age-unaware original factory. Reported age, identity, agreement/hash/check binding, reading confirmation, typed name, and comprehension are validated before checkout. A new pending request writes the trusted age-16-v1 policy, a true eligibility flag, and database NOW timestamp in the same transaction as acknowledgment and the enrollment audit event. Learner-supplied evidence fields are ignored. Exact age and birth date are not stored or added to audit details.

A matching legacy pending request with complete matching acknowledgment and no prior approval may receive fresh eligibility after an authenticated submission passes all checks. This preserves acknowledgment fields and pending status, records a separate self-report age-confirmation audit event, and grants no access. A current-evidence retry neither refreshes its timestamp nor duplicates the audit event. Restricted states and suspicious prior-approval fields require owner review.

Mock tests cover trusted values, legacy refresh, idempotency, audit rollback, and failed-rollback client disposal. Disposable PostgreSQL tests exercise actual migration 005, concurrent first submissions, one audit event, timestamp preservation, legacy acknowledgment preservation, and rollback of a new row after injected audit failure. CI now explicitly includes the writer suite in both database jobs; unit CI skips its database case without the test URL. Results for this patch are pending.

Owner approval/reinstatement and the private owner review display are NOT yet connected to hasCurrentAgeEligibility. Runtime readiness still needs migration-005 column checks, and restricted-role fixture coverage for this writer remains outstanding. Do not activate until those safeguards, document reconciliation, retention/legal decisions, and controlled live verification are complete.

The old low-level factory remains only for legacy fixtures and must not become a production entry point bypassing age checks. This patch modifies branch source and disposable CI only. No production migration, merge, deployment, configuration activation, agreement publication, or dashboard publication is performed or authorized.
