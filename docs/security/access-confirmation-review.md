# Access confirmation replay and expiry coverage

Owner router boundary commit 63f311b273a3924fd9188711515898dc0b82cde9 passed both unit and PostgreSQL CI runs before preparing this patch. This patch's CI results remain pending.

The access-action handler accepts an optional trusted clock for deterministic tests, defaulting to Date.now. Its five-minute expiry and 100-entry capacity are unchanged. Each authorized request reads the clock once for expiry cleanup and confirmation creation. The existing router uses the default clock; no environment-based override is added. Authorization and state-transition rules are unchanged.

Ten tests cover private form confirmation creation without database work, one successful use followed by rejected replay, concurrent duplicate clicks, non-owner clicks that do not consume an owner's token, cancellation, exact expiry boundary, handler recreation/restart invalidation, audit-write failure with token consumption, capacity and expired-entry reclamation, and invalid clock injection. The tests invoke the actual access handler and access-management service with a fake database and interactions. Existing CI includes them via its certification test glob.

Tokens are removed synchronously before awaiting confirmation work. Database failure does not make a token reusable. This is intentional replay protection, not proof that a failed or timed-out remote transaction never committed. Owners must inspect persisted status before starting another access change after uncertain outcomes. Tests check mocked audit rollback, not network partitions or remote commit ambiguity.

Confirmation records remain in memory and are lost on restart; they are not distributed across instances. Only the configured owner and guild may act. Running lab termination still requires a provider integration outside these database authorization changes. Real Discord permissions, database roles, TLS, policy approval, live shutdown/restart, and full learner/owner flow remain launch requirements.

No production migration, dashboard publication, merge, deployment, or enrollment activation is included.
