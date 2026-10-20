# Enrollment retention preview — read-only first stage

Status: proposed repository preparation. No live learner-record query, deletion, scheduler, migration/grant, environment update, notification, publication, merge, or deployment is performed by this change.

The preview requires a separately supplied valid owner ID, explicit previewEnabled=true, the matching owner actor, and an explicit supported Date cutoff. It is not attached to a runtime button, scheduler, or environment flag. It returns data to the caller without logging, exporting, or persisting reports. Future presentation/export requires its own reviewed scope.

Scope is closed denied/withdrawn/abandoned applications and shared approved-access enrollments with a nonempty, fully admin-confirmed completed course set. Application timing uses the existing approved three-business-day New York calculator. Shared timing starts at the last recorded course completion; no extra retention period is invented. Active courses, no assigned courses, or denial without explicit closure are not completion/closure evidence. Suspended/revoked shared records may satisfy completion timing without reinstatement. Inconsistent or imprecise evidence is flagged for review.

The reader queries minimal enrollment/access metadata, aggregate course evidence, and lab dependency counts in a REPEATABLE READ READ ONLY transaction. It does not read agreement bodies, names, quiz answers, saved progress, lab scope, status reasons, or audit-event contents. Millisecond-precision confirmation evidence is checked before timestamps are used; this stage does not round audit timestamps or evaluate their separate three-calendar-month schedule.

Any linked lab record blocks a timing candidate because no lab-record retention schedule is inferred. Unfamiliar foreign keys referencing enrollment/course tables conservatively block candidates for dependency review, even if the child table might be empty. Known course children require explicit, separately reviewed deletion ordering; no cascade is authorized. Catalog checks are not exhaustive proof of every indirect dependency, provider copy, or preservation requirement.

Reports distinguish not_due, review_required, blocked, and timing_candidate. A timing candidate is not approved for deletion. Every report states executionAuthorized=false, preservationReviewed=false, providerCopiesVerified=false, and auditEventsEvaluated=false. A future executor must re-read/lock and revalidate records and obligations; this preview is not an executable deletion plan.

Pages default to 100 and cap at 250 enrollments, using an explicit keyset cursor. A page is not presented as a complete scan when more records or a preceding cursor exist. Each call has its own consistent database snapshot; multiple pages are not a single historical snapshot. The as-of Date is a timing cutoff applied to current snapshot records, not reconstruction of historical database state.

Tests cover boundary timing, missing closure evidence, dependency blockers, input/owner rejection before connection, rollback cleanup, real SELECT-only PostgreSQL login, unchanged enrollment/course/lab/audit records, pagination, and unfamiliar foreign keys. CI runs on PostgreSQL 16/18 using disposable loopback certification_test schemas/roles. Skipped integration is not acceptance; no new passing result is claimed before CI executes.

Next stages remain audit-expiry preview with explicit timestamp precision, reviewed preservation/dependency handling, actual restricted deletion execution, scheduling/retries/failure reporting, provider/backup verification, and release acceptance. No existing historical records are assumed erased.
