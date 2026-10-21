# Staged protected personal-submission adapter

Base: 0eb565eabab6e31b68824a67a7d54502110f3c8a. Both provenance acceptance jobs and all thirteen reported checks passed; the informational marker separately reported pg16_initial_ready. The marker is not itself acceptance.

This patch adds an optional trusted-code invitation-reader factory dependency to createCertificationSubmission. The default remains the existing legacy reader, so existing two-argument callers are not switched. An invalid factory is rejected at construction. Request payload fields still cannot supply a factory; the existing submission allowlist and all personal safeguards remain in place.

The separately named createProvenanceInvitedSubmission adapter snapshots trusted configuration, pins createProvenanceInvitationReader, and exposes only submitInvitedEnrollment. It reuses the actual existing agreement-hash checks, row locks, age declaration, reading/acknowledgment/comprehension validation, pending-only update, audit append and rollback logic. There is no audit fallback or general-submission method on this adapter. Duplicate/legacy records are not promoted by this change.

Fresh local evidence: seventeen unit tests passed, zero failed/skipped, using fake database transactions and modeled trigger clearing. The actual committed age, completeness, policy and invitation modules reproduce their pinned hashes. Tests cover a marked/no-audit request through the actual transaction implementation, unmarked/wrong-owner/historical-state denial, personal safeguards before checkout, unsupported factory input, captured inviter, audit rollback and preservation of the default legacy-reader behavior. These are NOT PostgreSQL, SDK, session or real-user consent acceptance.

Existing UI/status/session/runtime callers remain on the old services. This is a backwards-compatible dependency seam plus a staged adapter, not the completed application cutover. Real PostgreSQL personal-submission-after-audit-deletion, concurrent requests, audit rollback/retry, legacy denial and privilege-loss cases still require explicit database CI wiring and results.

An additional integration prerequisite is agreement row-lock privilege: the transaction uses SELECT FOR SHARE on the immutable agreement. PostgreSQL requires UPDATE privilege on at least one selected-table column as well as SELECT for row locking. Existing provenance readiness does not check that agreement permission; include it in the final combined startup/readiness review and tests. Do not infer full transaction readiness from the scoped catalog marker alone. No new agreement grant or production SQL is performed here.

PR #15 stays draft and activation-blocked. No production query, migration, grant, backfill, environment change, entry publication, runtime caller switch, merge, deployment or pilot activation is authorized.
