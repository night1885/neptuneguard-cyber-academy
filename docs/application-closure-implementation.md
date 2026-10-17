# Application closure implementation — staged schema only

Status: proposed repository preparation. No migration has been applied to a live database by this change. No live application is closed or deleted, and no runtime route, button, or scheduler is added.

## Scope

Migration 006 adds nullable application_closed_at, application_closed_by, and application_closed_as fields to certification_enrollments after migrations 001-005. Existing records receive no closure timestamp. A denied status alone is not an explicit closure, and no inactivity timeout is inferred.

A complete closure requires all three fields, a denied/withdrawn/abandoned category, a Discord actor ID with valid syntax, the existing non-authorizing denied status, and no issued student ID. Recorded closure fields cannot be reset/replaced. A closed row cannot become pending/approved or acquire a student ID without violating the proposed checks. No reopening/correction procedure is added. Issued-ID and formerly approved cases require separate design/review; this stage does not guess their retention treatment.

The denied status is an internal compatibility representation, not a claim that withdrawn or abandoned learners were denied. Future presentation must show application_closed_as and distinguish explicit closure from denial without closure. These nullable fields do not automatically convert historical denials.

Actor-ID syntax is not authorization. A future closure service must verify the configured academy owner, validate input, lock the enrollment row, record the closure and corresponding audit event in one transaction, roll back on failure, and handle retries without changing the original deadline. Existing approval/submission routes and schema-readiness checks require integration tests against migration 006 before deployment.

## Precision and deadline

Explicit closure timestamps must use millisecond precision in the calculator's supported UTC input-year range, 1970-9998. Reject sub-millisecond values rather than silently truncating database timestamps into an earlier deadline. The future service must set an explicit timestamp and must not rely on a PostgreSQL NOW() value having millisecond precision.

Pass the recorded timestamp to applicationDeletionEligibleAt. It uses the approved America/New_York, next-three-Monday-Friday rule, excludes the closure date, and does not exclude holidays. Eligibility is the first instant after the third counted local date. No eligibility timestamp is stored or executed by this migration.

## Tests and operational boundaries

The dedicated integration test runs only with an explicit loopback certification_test database, rejects URL overrides, verifies the actual database/search path, uses a random isolated schema, and cleans that schema up. The PostgreSQL 16/18 CI matrix includes it. Without the test URL, the integration test is skipped; a skipped test is not a passing database acceptance test.

Tests exercise preservation of existing enrollment, lab, and audit rows; migration reapplication; three closure categories; precision and incomplete/invalid metadata; and resistance to closure reset/reopening. No passing result is claimed before CI executes.

No grants, cascades, or deletion routines are introduced. Lab foreign keys remain unchanged. Per-course completion/shared-enrollment handling, authorized closure actions/UI, deadline selection, dry-run review, restricted deletion permissions, dependency handling, scheduling/retries/alerts, audit expiry, and provider/backup verification remain outstanding. Full retention enforcement is not implemented by this stage.

Commit approval is not approval to apply this migration, publish agreements, change environment settings, notify learners, merge, deploy, or activate enrollment.
