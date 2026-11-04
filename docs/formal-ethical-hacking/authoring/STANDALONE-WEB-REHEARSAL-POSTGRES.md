# Web rehearsal PostgreSQL adapter — source-only contract batch

Not a connected database, applied migration, deployed persistence layer or completed rehearsal. Existing core/lifecycle/startup and live services remain unchanged.

## Adapter and namespace

The new root standalone-web-rehearsal-postgres.mjs supplies read and compareAndSet behind an explicitly enabled reviewOnly/syntheticOnly/disposableReview profile. Default-off creation does not access the database provider. Enabled use requires a fixed guild ID, a 64-lowercase-hex contentRevision and a databaseName matching ng_web_review_ followed by 1–30 lowercase letters/digits/underscores. The rehearsal course identity remains standalone-web-review, not a production registration.

Queries use a fixed schema/table and value parameters for guild, actor, course and content revision. A first save uses INSERT with conflict-do-nothing; later saves use UPDATE with an expected-revision predicate. No returned row is treated as conflict; an exact next revision is required before reporting saved. bigint string results are accepted only within the bounded positive safe-integer representation. Returned pages remain entry/http only.

Each operation first checks current_database against the configured name. The query provider is trusted infrastructure and must consistently target that approved disposable database. This check is not an atomic same-connection identity/role/schema attestation across arbitrary pooled queries. A matching name/prefix does not itself prove a database is disposable or contains no real data. Configuration flags do not authenticate callers or enforce synthetic provenance.

contentRevision scopes stored rows but is not yet derived from or checked against loader bytes. The eventual composition must pin the actual approved content snapshot. A new snapshot currently selects a separate namespace; explicit stale-version presentation and old-version retention/deletion are still required.

## Unapplied schema candidate

The adjacent standalone-web-rehearsal-schema.sql is source material outside automatic migrations. It checks a review-name prefix, creates the fixed schema/table in a transaction, constrains identity/page/revision fields and revokes PUBLIC schema/table privileges. It creates no database, login, credential or runtime role and grants no worker privileges. It is not idempotent, a schema-drift verifier or an authorization policy.

No SQL was parsed or executed against PostgreSQL in this batch. Applying it requires a separately resolved, approved disposable database and owner identity; worker grants, isolation, schema readiness and cleanup require review. Do not run it on the academy or existing intake database merely because it is in the repository.

## Actual checks and limits

On 2026-11-01 local time, node --test standalone-web-rehearsal-postgres.test.mjs ran in a disposable local directory. Thirteen tests passed; zero failures/cancellations/skips. Scripted query responses exercised default-off/profile gates, namespace parameters, absent/read rows, bigint representation, wrong identity rejection, database-name mismatch, bound insert/update construction, conflict handling, malformed results, invalid revisions, generic query errors and no retry.

The SQL strings and adapter executed against a scripted query double only. This does not establish PostgreSQL syntax/semantics, actual atomic compare-and-set, transaction isolation, role permissions, schema compatibility, commit durability, multiple connections, true concurrent writers or process restart/crash recovery. Core/lifecycle suites, full-checkout regressions, SDK, CI, Discord and Render were not exercised in this batch.

A query error or timeout after a write can mean unknown commitment. Generic failure does not establish rollback; the adapter never retries automatically. Durable save reconciliation and authorization-at-write/revocation races remain unresolved. Compose only through reviewed lifecycle bounds before any approved connected test; the adapter itself creates no pool, deadline or drain manager and owns no pool closure.

## Next acceptance work

Validate the schema and adapter in an approved disposable PostgreSQL environment with separate owner/worker privileges; use synthetic rows only. Demonstrate first save, stale insert/update conflicts, cross-actor/guild/course/content isolation, actual new-process resume, concurrent writers and uncertain commit/recovery behavior. Then verify actual content pinning, retention/deletion and trusted identity composition before Discord/startup integration or live rehearsal.

No existing file, registry, startup, CI definition, package dependency, database, schema, permission, learner record, Discord message, Render configuration, deployment or award is changed by this source-only commit. Existing repository automation may run. This adds an adapter contract and candidate SQL, not proven durable persistence or release approval.
