# Synthetic PostgreSQL review persistence slice

Test-only implementation-specific contract. Not an academy handler, migration,
identity adapter, permission grant, live evidence route or activation approval.
All fixture identities, scope and reports are fictional. Do not import or install
this fixture in academy runtime. The existing in-memory engines are unchanged.

## Scope and boundary
- New isolated PostgreSQL 16/18 CI services; Node 20/22, four matrix jobs.
- Exact explicit CI flag, GitHub Actions flag, loopback URL, disposable username,
  password/database/port, no URL options and no ambient DATABASE_URL fallback.
- Verify server identity/version and empty user-relation inventory before DDL.
  These are guardrails for the owned CI service, not proof a host is nonproduction.
- SQL stays here, not under migrations/. No application tables or real learner
  namespace are used. The only course/exercise/workspace values are demo fixtures.
- Fixed CI-only passwords are not deployment credentials. No secrets are imported.

## Persistent fixture contract
A server-generated UUID binds a record to a demo assignment tuple. Submitted
reports and feedback are nonblank plain text: at most 4096 PostgreSQL characters
and 8192 UTF-8 bytes each. No uploads, URLs fetched, Discord calls or modal UI.
The only review states are working, submitted, changes-requested and
review-recorded. Revision starts at zero and increments on each accepted mutation.
Review-recorded does not grant competency, progression, awards or practical access.

Learner assignment must currently be active. A reviewer needs an explicit active
record grant and cannot review their own record. The restricted worker can call
three public fixture functions; it cannot read/write tables, create objects or
call the internal authorization helper. SECURITY DEFINER functions have a fixed
protected search path and schema-qualified relations. The CI admin owns fixtures.

Actor arguments come from the test harness, NOT an authenticated Discord actor.
The worker can assert any fixture actor; SQL does not establish end-user identity.
No real identity, external-role consistency or live Discord privacy is claimed.

Record locks serialize mutation and authorization checks. Shared authority locks
hold database grant decisions until transaction end. A revocation that commits
before a blocked check resumes is observed. An operation already holding authority
locks can finish before a waiting revocation commits. This does not cancel an
external response or solve revocation between database commit and Discord delivery.

Submission/review retries are keyed by record, actor and request ID. SHA-256 of
the canonical JSON command detects changed payloads. Authorization precedes receipt
lookup. A replay returns the original mutation acknowledgement, not current state;
use a newly authorized read for current state. Record creation is not idempotent.
State, minimal audit metadata and receipt commit together; injected audit/receipt
failures must roll back all three. Caught fixture-function errors return a generic
unavailable response. Transport errors and SQL argument-parsing failures are not
adapted into learner messages; no learner-facing adapter is supplied.
The receipts store fingerprints and acknowledgements, not a second report body.
Deletion cascade is a fixture check, NOT an approved real retention/deletion policy.

## Validation and remaining gates
Prepared locally: JavaScript syntax checked with Node 20.20.1; all three offline
configuration-guard tests passed. The integration parent was deliberately filtered
out. Sixteen PostgreSQL subtests are authored but have NOT been executed; SQL
behavior and the four CI jobs remain unverified until the branch workflow runs.

Run the workflow for actual PostgreSQL execution. Offline configuration checks can
run without pg or a database:

    node --test --test-name-pattern=offline docs/formal-ethical-hacking/prototypes/synthetic-review-postgres/postgres.test.mjs

Separate-connection reads test committed persistence, not backup/restore, crash
recovery, durable audit export or connection-loss recovery. No such claim is made.
The existing real learner namespace remains excluded. Intake UI, trusted identity
binding, owner/reviewer policy, evidence/feedback rules, retention, deletion,
audit access, backup/restore and deployment require separate approval and tests.
No live database connection, Discord handler, publication, Render operation or
feature flag is added. Existing workflows, dependencies and runtime are unchanged.
