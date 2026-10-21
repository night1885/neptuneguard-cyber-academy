# Active-invitation provenance: staged storage foundation

Approved design: retain the registering owner's Discord ID only as active-invitation provenance, independently of audit-event retention. Clear this new live field when the invitation is consumed or closed. Existing audit, approver and closure metadata keep separate rules; provider/backups are not covered by that clearing claim.

Migration 009 adds nullable registration_owner_id with no default/backfill. Its invoker trigger protects active provenance and target identity, rejects later promotion of NULL provenance, and clears the field transactionally when status leaves awaiting. The field is not authentication: an owner-authorized service must supply it. The writer and invitation reader have NOT been switched; the old reader STILL depends on audit history. PR #15 remains draft and activation-blocked.

## CI correction after 8ce0c30bdae91b9ed9ae7948fb9928d28e6c2466

Nine existing checks passed; both dedicated provenance jobs failed. Source review found a fixture setup defect: migration 008 explicitly requires public.certification_lab_requests, whereas this fixture isolates its tables in a generated schema. Applying 008 there stops setup before 009 can be exercised. Job-log web retrieval failed and the available connector reported statuses, not log text; this is a source-based diagnosis, not a claim to have read the failure trace or excluded further failures.

The corrected storage fixture applies actual migrations 001-007 and 009. Public-lab-only migration 008 is outside this isolated fixture's scope; its production guard is unchanged. Migration 009, production ordering instructions, runtime, grants and CI workflow are unchanged. This storage test is not acceptance of the complete production migration sequence.

The existing nine subtests and all their assertions remain intact: legacy/unmarked NULL state; restricted login; storage surviving fixture audit deletion; immutability/retargeting; clearing on non-awaiting transitions; separate approval/closure metadata; rollback; no provenance restoration; privilege/format bounds; replay/default refusal. Only the unrelated 008 entry is removed from fixture setup. Dedicated PostgreSQL 16/18 jobs must establish the corrected result.

Fresh local evidence: syntax check passed and eight unsafe-target/opt-in probes refused before pg import without sentinel-value disclosure. No-URL run: zero passed, zero failed, one root skipped. No local PostgreSQL execution or new database pass is claimed. The generated disposable-schema/login boundary, explicit loopback certification_test target, role-DDL opt-in and cleanup are unchanged.

Next: obtain green storage CI, then implement the owner-registration writer/invitation-reader cutover with schema/trigger/column-privilege readiness and actual submission-after-audit-cleanup coverage. Legacy rows require a separate review plan, not automatic backfill. No production query, migration/grant/backfill, settings change, learner entry, merge, deployment or pilot activation is authorized here.
