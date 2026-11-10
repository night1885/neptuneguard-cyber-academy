# Assignment binding identity schema candidate

## Scope and status

Migration 014 is an unactivated source candidate. PostgreSQL execution and acceptance have not been established for this candidate. It is not wired into the acceptance workflow by this commit. Do not apply it to production or interpret existing green CI as acceptance of this migration.

The table links each work ID to at most one learner/course assignment timestamp. Composite foreign keys require the learner and course to match both the work row and the referenced assignment. Updates are rejected using the existing immutable-record trigger. Parent work and assignment deletion are restricted while a binding exists. No rows are created, no previous work is backfilled, and no worker privileges are granted. Multiple work rows may legitimately reference the same assignment.

## Deliberately not proved

This schema does not prove that the enrollment is approved, the assignment is currently active, the work was created after assignment, the work is unexpired, collection consent exists, or the inserting actor is authorized. It does not prevent a sufficiently privileged actor from deleting and reinserting a binding. Trusted provisioning and narrowly scoped database privileges remain required.

No insert-time eligibility query is presented as ongoing authorization. Provisioning must coordinate concurrent revocation, completion and removal with lifecycle mutations. Runtime must reauthorize every protected operation and deny unbound work when enforcement is introduced. Historical work must not be bound by guessing from the current assignment.

## Required next acceptance

Use guarded disposable PostgreSQL 16 and 18 databases. Test exact association, work/assignment learner and course mismatches, unknown work, wrong timestamp, duplicate work binding, update rejection, restricted parent deletion, worker privilege boundaries, transaction rollback and unchanged existing records. Integrate these tests into zero-skip acceptance before claiming database acceptance.

Then separately implement atomic provisioning, runtime enforcement, deadline and eligibility checks, concurrent lifecycle tests, and the disposition of existing unbound work. Inventory both new restricted parent dependencies in scoped erasure, preservation and reconciliation before release. Revocation denies access; it is not automatic deletion permission.

This commit changes no runtime, startup, UI, Discord resources, live database, deployment configuration, publication, merge or release authorization.
