# Consolidated composition, enrollment-reader and source acceptance candidate

This test-only batch combines the actual composition factory, core/controllers/browsers/runtime bridge, PostgreSQL store, removal-aware enrollment/course authorizer and Discord source-reader adapter. Source transport returns fictional bounded JSON Responses for the exact routes constructed by the real adapter. No native fetch, real token, Discord login, gateway or REST request is used. Listener attachment occurs only on an in-memory EventEmitter.

## Disposable fixture and separated privileges

The fixture requires GitHub Actions, the loopback formal_review_test control database on port 5432 with the formal_review_admin login, disabled certification and empty production database/token environment values. It creates one uniquely named database from template0, verifies its identity, installs fixture migrations 001-007, 013 and 012, then creates a fictional agreement and submits/approves/assigns a fictional learner through the actual services. The work binding uses the resulting permanent student ID rather than a scripted identity. The separate control database is not migrated.

Three unique worker logins separate review persistence, enrollment/course reads and metadata discovery. Course reads use the real lifecycle/account validator with removal checks enabled, public-qualified SELECT queries and reader-profile initialization. Metadata uses only the discovery columns, not report bodies or feedback. Reader permissions and server deadlines follow the existing restricted-reader fixtures. Tests assert metadata denial of evidence reads/deletion, enrollment-reader denial of removal timestamps/audit/deletion, and store-worker denial of enrollment reads. These fixture ACL assertions are not an independent production privilege audit.

## Consolidated assertions

The journey retains no automatic listener registration, privacy denial before selected-message retrieval, preview without writes, edited-source rejection, exact-text confirmation, one persisted report/receipt, digest fidelity, same-key retries without additional source retrieval, learner/reviewer discovery and reads, explicit feedback confirmation, unchanged deadlines, expiry denial, shutdown and borrowed pool survival.

It additionally changes only the disposable learner's enrollment status through fixture-admin SQL to test fresh real-reader revocation and restoration. That is not acceptance of a production revocation command. After the expiry check it fully disposes/drains the old composition, restores the fictional clock for a new instance and verifies persisted reads with recreated real adapters. Clock restoration never occurs in the old core. This tests component recreation, not trusted wall-clock recovery or a real process restart.

The actual administrator-removal service then records a course-specific event. Both learner and owner discovery/reads deny the removed course, report/review/operation counts remain unchanged, the enrollment and unrelated course remain intact, and retries preserve the original removal reference and 24-hour eligibility deadline. Eligibility is not deletion authorization; no content is erased.

## Remaining limits and execution

Exercise/reviewer authority, external readiness and verifyResources remain scripted providers; reading assignment is not practical authorization. HTTP snapshots and interactions are fictional, SDK builders only serialize payloads, and typed fields/in-memory sessions do not establish durable approved consent or restart-safe confirmation recovery. Restoring the injected clock does not move the database clock. No production preflight, live privacy evidence, work/channel provisioning, scoped erasure, native Discord or complete release acceptance is established here.

The existing sequential composition acceptance step runs this file on PostgreSQL 16/18 and requires zero skipped tests; no additional workflow is needed. This consolidated expansion is not claimed executed locally or passed at an uninspected future head. Cleanup drains all owned components, closes fixture-owned pools, drops only the unique fixture database, and drops only the unique fixture roles. No production migration/grant, startup wiring, listener, source collection, permission change, publication, merge or deployment is performed.
