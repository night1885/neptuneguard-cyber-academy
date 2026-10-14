# Migration and database preflight review — unresolved release gates

Reviewed migration source at 83588e076debcb70b299bfff05d7a1fefba4e24c. This is a scoped source/catalog review, not full security approval, legal approval or production execution. No learner rows were read and no production SQL writes were performed.

## Migration inventory
- 001: four certification tables (agreements, enrollments, lab requests, audit events), audit BIGSERIAL sequence, three indexes, permanent-student-ID preservation function/trigger.
- 002: typed acknowledgment name and conditional name constraint.
- 003: captured agreement hash and comprehension version; hash-format constraint.
- 004: published-agreement mutation rejection function and update/delete/truncate triggers.
- 005: self-reported eligibility flag/time/policy version and completeness constraint; absent evidence is three NULL fields, not false.

Each file contains its own BEGIN/COMMIT. Objects are referenced without an explicit schema prefix. IF NOT EXISTS does not establish that a pre-existing object has the required structure. The target schema/search_path, executing migration owner, order 001–005, existing-object compatibility, backups, rollback procedure and post-migration readiness checks must be explicitly reviewed. Do not simply wrap these transaction-bearing files in a presumed outer all-or-nothing transaction. No automatic legacy conversion or eligibility backfill is authorized.

These files contain no runtime account creation or grants. They do not separate table ownership from runtime credentials. An account able to alter tables/functions/triggers can undermine the immutability design; production role/default privileges and memberships therefore remain a separate gate.

## Privilege review requirements
The historical restricted-role note records a SELECT FOR SHARE agreement dependency and tested UPDATE(version) column privilege with enabled immutable triggers. That privilege is still real write privilege, not SELECT-only protection. Do not copy the fixture as a production grant script. Review actual locking SQL, enabled triggers, function privileges, non-owner runtime identity, PUBLIC defaults, memberships and scope of enrollment/lab/audit/sequence privileges. Audit mutation/deletion, enrollment deletion, schema creation and safeguard disabling must not be accidentally permitted.

The historical note's heading still says its correction is pending; newer whole-suite green conclusions do not replace an exact fixture/source and raw-log review. Reconcile that note separately without claiming production least privilege.

## Read-only Render inspection
Confirmed workspace: My Workspace, tea-db1p6jp42hec73dnfs4g. Inspected candidate database resource: dpg-db1touu7bikc73bl9vhg-a, database neptuneguard_cyber_academy_db. Catalog results showed PostgreSQL 18.6, public academy tables learner_profiles/learner_module_progress/learner_badges, and no certification relations. This does not prove the worker's actual connection binding or approve this database for certification.

The connector's session role was neptune_db and effective role neptuneguard_cyber_academy_db_user. The effective role owned those tables/public schema and had CREATEDB/CREATEROLE/schema CREATE. neptune_db was a member of that role; both had pg_read_all_stats and pg_signal_backend memberships. These observations are not evidence of a separate restricted certification runtime account.

The inspection transaction was read-only and used TLS 1.3 with TLS_AES_256_GCM_SHA384/256 bits. This does not establish worker TLS, certificate verification or its effective role. A later aggregate session query found no matching application sessions at that moment; absence is not proof of disconnection or another database.

Render inventory listed 0.0.0.0/0 external IP allowance for both workspace databases. Review network access; this does not establish authentication bypass or publicly readable data. No allowlist change was made.

## Worker source/configuration findings
Last inspected live deployment was 117f17e0a3c952cc9e91e8d7ab23d79f5e903900 on academy worker srv-db1ula3tqb8s73bcqdc0, tracking main with auto-deploy off. Its Render build command was npm install rather than CI's npm ci --ignore-scripts. Review the build difference without assuming this record authorizes a change.

The deployed index.js uses DATABASE_URL and explicitly selects ssl=false when RENDER is true; otherwise it selects rejectUnauthorized=false. Actual URL options and environment values remain unverified, so do not infer current wire encryption from source alone. Startup also runs academy CREATE TABLE IF NOT EXISTS and logs into Discord; it is not read-only preflight.

Available Render tools do not expose a read-only environment-variable retrieval method. Worker binding, flags, explicit certification URL and TLS settings remain blocked on non-secret operator configuration evidence or an approved diagnostic mechanism. Do not use an environment write as a read workaround, expose credentials, or restart merely to obtain evidence.

## Next gates
- Resolve actual worker binding and non-secret configuration evidence.
- Select and approve certification database/schema and migration owner separately from a restricted runtime account; no paid provisioning is authorized.
- Complete privilege/TLS/network/backup and exact migration execution review.
- Reconcile remaining historical security notes and the unapproved agreement age-policy conflict.
- Obtain controlled live verification and distinct merge/migration/deployment/publication/activation approvals.

See ../deployment/certification-activation-checklist.md. This review record changes documentation only and does not close the above gates.
