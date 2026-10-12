# Published agreement snapshots — proposed database safeguard

Migration 004 rejects UPDATE, DELETE, and TRUNCATE on certification_agreements. Existing rows are treated as published snapshots because that table stores version, content, content hash, and publication time. Corrections must be inserted with a new version instead of rewriting an acknowledged version. Applying the migration is separate from this source commit.

The new opt-in database test applies migrations 001–004 in a generated schema, seeds a fixture agreement, reapplies migration 004, verifies mutation and truncation rejection, and verifies insertion of a revised version without changing the original snapshot. It uses only a loopback database named certification_test and removes its generated schema afterward. The disposable PostgreSQL CI job now includes this test. No real learner agreement is published.

The new test has not yet been executed or verified. Prior PostgreSQL CI success applies to commit 9e26afe5e05c4e31e69f03c78bd51bca8f8ab204 and does not cover this migration. Check the new commit's database-job results separately.

Triggers are not a complete publication authorization or tamper-proof storage system. Database owners and privileged roles can drop tables, alter or disable triggers, or replace functions. Before rollout, use appropriate role separation and a reviewed publication process; do not grant the bot schema-owner or superuser privileges.

Snapshot immutability does not prove the stored hash matches the content at insertion; the submission backend separately verifies content hashes.

This is not a personal-enrollment-record retention decision. Learner metadata retention, deletion requests, lawful preservation, and agreement-text archival policies require separate decisions. No personal records are deleted by this migration.

Enrollment remains gated. No start button, production configuration, agreement publication, production migration, merge, deployment, or activation is authorized by this commit. CI may execute the tests only against its disposable service.
