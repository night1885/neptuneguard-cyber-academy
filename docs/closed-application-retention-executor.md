# Closed-application retention executor - staged backend

Checkpoint: October 19, 2026, commit 038de757501f65cc56a51a0cebbdba5160d01334. All five reported CI jobs passed after a one-character unit-test syntax correction. This is repository/disposable-fixture evidence, not production activation or legal-compliance certification.

## Scope and admission

certification-retention-closed-application.js exports an explicit library factory only. enabled defaults to false. It has no runtime route, environment activation flag, scheduler, CLI, or production grant bundle. It explicitly rejects the academy application login and requires a separately configured direct restricted executor identity, database/schema, owner actor and preservation-review provider.

One invocation considers one explicit Discord-linked application. It rereads and locks current state, requires complete denied/withdrawn/abandoned closure metadata with no issued ID or prior approval, and reuses the approved three-business-day America/New_York calculator. Course assignments, linked labs, unfamiliar foreign keys, unexpected linkage/deletion behavior, delete triggers and rewrite rules block deletion. Only the guarded parent DELETE is supplied; course, lab and audit rows are not deleted.

## Preservation and operational limits

The injected review provider must return an actor/subject/category/closure-bound allow decision, reference, and current validity timestamps. Missing, held, expired or mismatched decisions block execution. The five-minute maximum decision validity is a proposed authorization-freshness bound, not a new record-retention period. No approved production preservation register, reviewer process or provider is established by this code. The fixture allow provider must never become a production default.

The conservative parent SHARE ROW EXCLUSIVE lock can block enrollment writes and needs workload review before activation. Lock, statement and idle-transaction limits are set; a 15-second query-admission deadline is not a guaranteed whole-operation cancellation deadline. The preservation callback has a bounded wait and receives an AbortSignal, but cancellation remains cooperative. Pool connection bounds remain the caller's responsibility.

No automatic retry is installed. A COMMIT acknowledgment failure can be ambiguous even after a rollback attempt: inspect current state before retrying, and do not claim no deletion merely because an error was returned. No new deletion audit event or durable review record is written; the reference is returned without logging. Resolve operational evidence and its retention separately.

## Evidence and remaining work

The unit suite exercises authorization, eligibility/dependency/preservation rejection, failures and cleanup. The PostgreSQL 16/18 step uses isolated loopback certification_test schemas and disposable roles to exercise deletion/preservation, concurrent invocation, blocked dependencies and excess privileges, pre-commit rollback and rejected administrative identity. Test-only fixture creation, grants and cleanup are not production changes or a production grant recipe.

Shared completed-enrollment deletion, independent audit expiry with exact timestamps/IDs, scheduling/retries/alerts, a production preservation process, provider/log/backup handling, exact live credentials/permissions and target-environment acceptance remain outstanding. Activation, live queries/deletion, grants, configuration changes, publication, merge and deployment each need separate approved scope. Current instructor deployment remains outside this backend change.
