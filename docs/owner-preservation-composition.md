# Owner preservation adapter/executor composition tests

This test-only batch imports the actual owner-only review adapter and all three staged retention executors. SQL and trusted clearance storage responses are fixtures, not real PostgreSQL operations or an operational clearance store. No production source, configuration, runtime binding, scheduler, Discord controls, credentials, roles or grants are changed.

The 42 planned cases cover each executor accepting its correctly scoped owner-reviewed clearance, blocking non-owner execution before connection, and refusing missing, wrong-reviewer, wrong-server, stale-evidence, held, uncertain, preservation-required, revoked, expired, unavailable, timed-out or disabled review. Every blocked review must cause rollback with no DELETE query. Success checks category-specific delete counts/order and exact target timestamp/bigint bindings.

Unlike the adapter's existing shape tests, these tests pass its actual result through each executor's own preservation checks. Fixture records are constructed from independent expected target evidence rather than blindly treating callback input as an approval. Each lookup asserts the expected policy, owner, server, database, schema and category-specific binding.

Preparation status: Node syntax check passed locally; these new composition cases have NOT been executed locally because the repository dependency files are not installed in this preparation environment. Execution must be verified in repository CI after the separately approved commit. Existing adapter tests previously passed 48 local cases, and all ten reported checks at f0108634c030725f5fbb3f6111b2b1240369c01d succeeded (including two age-declaration runs). Those results are not execution evidence for this new file.

Run the new suite with node --test test-certification-preservation-composition.mjs. It is named for existing certification unit discovery. Separate PostgreSQL 16/18 executor acceptance remains distinct evidence and does not establish an atomic storage/revocation workflow for clearances. Authenticated issuance, durable storage, concurrent revocation/consumption and production acceptance remain release blockers.
