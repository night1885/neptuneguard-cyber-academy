# Disposable PostgreSQL CI — configured, results not yet verified

The certification workflow now has a separate certification-postgres-tests job. It provisions a PostgreSQL 16 service container with a database named certification_test, accessible on the runner's loopback port 5432. The committed username/password are disposable fixture credentials for that service, not production secrets. No production or Discord secrets are referenced.

The job checks out the repository without persisted checkout credentials, installs locked dependencies with lifecycle scripts disabled, requires CERTIFICATION_TEST_DATABASE_URL, and runs only test-certification-postgres.mjs. Existing workflow contents:read permission remains unchanged. The existing certification-unit-tests job remains intact and normally skips the opt-in database suite because it has no test URL.

The real database job permits the approved test suite to create generated schemas, apply migrations 001–003 inside them, write fixture enrollments and audit records, inject audit failures, and remove those generated schemas with CASCADE. The service database is disposable; it is not an application deployment or production migration. The job does not start the bot or publish any Discord message.

The workflow triggers on feature-branch pushes and pull requests to main, so committing this change may start CI and consume runner minutes. Job and workflow cancellation can interrupt schema cleanup, but the service is ephemeral and no cleanup against another database is authorized. The job has a ten-minute timeout.

This configuration has not yet been run or verified at preparation time. Check certification-postgres-tests for the exact new commit; a green unit-test job alone is insufficient. Inspect the database job output to ensure the five subtests actually ran rather than skipped. Passing this integration suite would support the tested migrations, concurrency, and rollback cases, not live Discord behavior or overall release readiness.

This note supersedes the earlier statement in postgres-integration-tests.md that CI has no test-database configuration. Local tests still require an explicitly configured disposable database. Enrollment gates, start messages, production agreement/check settings, runtime activation, merge, and deployment remain unchanged.
