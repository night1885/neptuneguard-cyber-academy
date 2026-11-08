# Current Administrator completion authorization

## Policy
Completion approval and certificate authorization require the acting user's current Discord Administrator permission in the academy server. Instructor status, role names and previous authorization do not grant this authority. Unverifiable permission denies the action. Course assignment and unrelated owner operations remain unchanged.

## This batch
Adds an isolated verifier with fresh guild/member/role lookups and fail-closed handling, plus mocked regression tests discovered by the existing test-certification-*.mjs glob. No existing runtime imports or authorization checks are replaced. Tests are authored, not executed; mocked tests do not establish live Discord behavior.

## Required integration
Inject the trusted verifier from the Discord client into completion controls and the lifecycle service. Check at entry, confirmation and immediately before the completion mutation after acquiring database locks. Do not accept a caller-supplied boolean as authorization. Retain owner-only assignment, server/actor-bound expiring single-use confirmations, transaction rollback, immutable completion and audit records. Provide a completion-only entry without exposing unrelated student data or owner controls. Update dependent lifecycle/readiness/runtime fixtures and real PostgreSQL tests. Do not silently fall back to owner-ID authorization for completion.

Certificate authorization and issuance remain separate unverified functionality; this helper implements neither.

## Limits and release gates
Discord permission reads and PostgreSQL commits are not atomic. A successful check cannot guarantee permission remains unchanged afterward. Verify actual Discord SDK behavior and exact-head unit/PostgreSQL CI before release. No migration, configuration change, Discord publication, merge, deployment or certificate issuance is authorized by this source batch.
