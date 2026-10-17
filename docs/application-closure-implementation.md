# Application closure implementation — staged schema and service

Status: repository preparation only. No migration is applied to a live database, no live application is closed/deleted, and no runtime route, button, or scheduler is installed by this change.

## Schema

Migration 006 adds nullable application_closed_at, application_closed_by, and application_closed_as fields after migrations 001-005. Existing records receive no closure time; a denied status alone is not explicit closure. No inactivity timer is inferred.

A closure requires complete metadata, a denied/withdrawn/abandoned category, valid Discord actor-ID syntax, the non-authorizing denied status, and no student ID. Recorded closure fields cannot be reset/replaced. Closed rows cannot become pending/approved or acquire student IDs under the proposed checks. No reopening/correction procedure is added.

The denied status is an internal compatibility representation. Future UI must distinguish withdrawn/abandoned categories and denial without explicit closure. Historical denials are not automatically converted.

## Owner-authorized transaction

certification-application-closure.js exports a staged service requiring enabled certification, the configured owner actor, valid subject ID, and an explicit supported category. It does not import environment variables or connect itself to production routes. Actor-ID syntax alone does not prove authorization.

The service locks the enrollment row, checks closure columns before writes, and permits new closure only from awaiting_acknowledgment, pending, or denied with no issued ID or previous approval metadata. Issued-ID/formerly approved cases require separate design/review; no retention treatment is guessed.

A new closure sets the denied status, records closure fields, and inserts a minimal application_closed audit event in the same transaction. It preserves existing denial reason text and does not modify labs. Audit failure rolls the transaction back; rollback failure discards the connection. No deletion occurs.

Same-category retries return the stored closure and original computed deadline without rereading the clock or creating another audit event. Conflicting categories are rejected. Database row locking serializes competing closure requests. The clock dependency is trusted server/test configuration, never an untrusted request timestamp.

## Precision and eligibility

Closure timestamps use explicit millisecond precision within the pure calculator's supported UTC input years, 1970-9998. The schema rejects sub-millisecond values rather than silently moving a deadline earlier. The service uses its trusted clock rather than assuming PostgreSQL NOW() has millisecond precision; the closure audit event uses that same explicit timestamp.

applicationDeletionEligibleAt applies the approved America/New_York, next-three-Monday-Friday rule, excluding the closure date but not holidays. It returns the first instant after the third counted local date. The service returns eligibility as information; it does not store a deletion job or guarantee execution at that instant.

## Tests and remaining gates

Schema, service, and lifecycle tests are wired into the PostgreSQL 16/18 CI matrix. Integration tests require an explicit loopback certification_test database, reject URL overrides, verify actual database/search path, and create/drop random isolated schemas. Restricted-login tests additionally require CERTIFICATION_TEST_ALLOW_ROLE_DDL=true and create/drop a uniquely named disposable role; no production role is modified. Without the required configuration the corresponding integration groups skip, which is not database acceptance. Service unit tests run without a database. New test coverage is not a claim of passing CI until the relevant commit executes.

Coverage includes authorization/input rejection, lock/update/audit order, retries/conflicts, invalid state, rollback/cleanup, concurrent closures, real audit failure, preservation of rows, approval-versus-closure races, resubmission and invitation rejection after closure, and non-recreation by admin registration. Race tests allow either legitimate winner and require one successful transition; they do not claim to exhaust every scheduling interleaving.

Restricted-role coverage checks the actual login identity, non-superuser privileges, closure/retry capability without deletion permission, immutable closure metadata, and rollback when audit INSERT is unavailable. Shared worker UPDATE permission does not itself enforce the identity of the human admin: server-side owner authorization remains required.

The current startup validator checks migrations 001-005 and can pass without closure columns. A negative test documents that the staged closure service then fails before writes; it does not fix startup readiness. Closure-specific column, validated-constraint, enabled-trigger, and privilege readiness must be implemented and tested before exposing closure routes.

Live owner confirmation UI/routes, per-course completion/shared-record handling, deletion selection and dry-run review, dependency handling, scheduling/retries/alerts, audit expiry, provider/backup handling, and target-environment acceptance remain outstanding. No production grants, cascades, environment updates, notifications, agreement publication, merge, deployment, or activation are included.
