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

Schema tests and service transaction tests run in the PostgreSQL 16/18 CI matrix. Integration tests require an explicit loopback certification_test database, reject URL overrides, verify actual database/search path, and create/drop random isolated schemas. Without the test URL those integration groups skip; that is not database acceptance. Service unit tests run without a database. No new passing results are claimed before CI executes.

Tests cover pre-connection authorization/input rejection, lock/update/audit order, retries/conflicts, invalid stored state, rollback/connection cleanup, concurrent identical/conflicting closures, real audit-failure rollback/retry, and preservation of enrollment/lab rows. Approval-versus-closure races, existing submission/registration behavior after closure, schema-readiness integration, and restricted-role coverage still require verification before deployment.

Live owner confirmation UI/routes, per-course completion/shared-record handling, deletion selection and dry-run review, dependency handling, permissions, scheduling/retries/alerts, audit expiry, and provider/backup handling remain outstanding. No grants, cascades, environment updates, notifications, agreement publication, merge, deployment, or activation are included.
