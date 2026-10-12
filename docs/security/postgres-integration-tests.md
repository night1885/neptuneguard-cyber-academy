# Disposable PostgreSQL integration tests — opt-in, not executed

The new test-certification-postgres.mjs suite uses real pg connections and migrations 001–003. It is skipped unless CERTIFICATION_TEST_DATABASE_URL is set. A skipped integration suite is not a database verification pass.

When explicitly enabled, the suite accepts only a loopback PostgreSQL URL whose database path is exactly /certification_test and has no query-string overrides. It also checks current_database() before creating anything. These guards reduce accidental targeting; they do not replace an operator's verification that the server, credentials, and database are disposable.

Each of five subtests creates a uniquely named schema, restricts application search_path to that schema, applies migrations inside it, and finally drops only that generated schema with CASCADE. All fixture records and audit-failure triggers are in the generated schema. The database must already exist. The test role needs schema-creation permissions in that dedicated test database, not production credentials. An interrupted process can leave a temporary schema requiring separately reviewed cleanup.

## Coverage

- Migration reapplication and required enrollment columns.
- Permanent student-ID immutability.
- Concurrent submissions and concurrent approvals, with single audit events and one permanent ID.
- Submission audit failure rolling back the new enrollment row.
- Approval audit failure preserving pending status and allowing retry.
- Suspension audit failure rolling back both course and lab authorization changes.

## Running later

From a checkout with locked project dependencies installed, provision a disposable local PostgreSQL server and a dedicated database named certification_test. Set CERTIFICATION_TEST_DATABASE_URL through the local environment, then run:

```sh
node --test test-certification-postgres.mjs
```

No database URL or credentials are committed. Do not paste production secrets into chat or logs. Existing CI has no test-database configuration added by this commit, so the new suite normally skips there until an isolated database job is separately approved. The four-suite backend runner is unchanged.

These database tests have not been executed. Their addition does not certify migration compatibility, concurrency, or rollback until an enabled run passes. Live Discord transport, agreement version immutability, session recovery, and multi-instance coordination remain separate verification tasks.

This commit does not run database tests, apply production migrations, provision infrastructure, connect to a database, publish content, merge, deploy, or enable enrollment.
