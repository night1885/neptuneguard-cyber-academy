# Current Administrator completion authorization

## Policy
Completion approval and certificate authorization require current Discord Administrator permission in the academy server. Instructor status, role names and past authorization are insufficient. Failed verification denies completion. Assignment and unrelated owner powers stay unchanged.

## Supported startup integration
The restored application now defaults to attachAdministratorCertificationRuntime. restoration.js retains its established ordinary-startup contract and separately selected synthetic UI-review override. The UI-review override still uses the original runtime; that isolated profile cannot enable courses. Existing certification/course flags, schema/privilege readiness and shutdown gates remain required. No flags or production settings are changed. Community Learning is unchanged.

The adapter composes ready managed navigation before constructing the completion backend/controller. The verifier closes over the trusted Discord client. The initial application console adds a generic admin-completion entry; visibility grants no authority. Current permission is checked before opening the form, requesting confirmation and recording completion. The form names the learner Discord ID and exact allowed course key. A separate actor/server-bound, expiring, single-use confirmation precedes mutation. The backend rechecks permission after database locks and records the actual acting admin in completion/audit metadata.

Legacy completion buttons are intercepted before the owner handler. Assignment and its confirmations remain delegated to owner-only controls. Old in-memory confirmations do not survive restart. The original exported lifecycle completeCourse API remains for older callers/tests; this is not a claim that every alternate entry point is integrated.

## Validation
The first startup integration revision failed existing executable-contract regressions. The correction restores that executable and changes only the restored application's default runtime import. Existing executable regression tests remain unmodified, including disabled/explicit UI-review behavior, client identity, router forwarding, configuration validation and token rejection. The new integration test verifies the new default dependency and retained override. Prior green results do not establish passing checks for this correction.

Verifier/UI/runtime tests use synthetic Discord contexts. Disposable PostgreSQL 16/18 tests exercise real transaction, retry and rollback behavior, not live Discord permissions. Exact-head CI, completed review findings and controlled Discord acceptance remain necessary.

## Limits and release gates
Discord permission reads and PostgreSQL commits are not atomic. Disposing controls blocks new admission but cannot undo committed work. No production migration, configuration change, Discord publication, merge, deployment or certificate issuance is authorized by this source batch. Certificate criteria, authorization records, generation and delivery remain unfinished separate work.
