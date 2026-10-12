# Routed enrollment guard integration — not activation

The router now uses createGuardedSubmissionHandler from certification-submission-guarded.js. This supersedes the earlier standalone-only statement in enrollment-attempt-guard.md. The underlying session handler remains independently testable, but routed cert:submit: interactions pass through the guard.

For enabled submission in the configured guild, syntactically valid actions are admitted under one per-user lock before session processing begins. Start and send limits apply; navigation, form opening, and cancellation use the same lock without consuming start/send counters. Malformed actions and wrong interaction types are delegated to existing handler validation. Wrong-guild, disabled, and invalid-identity contexts do not acquire a guard record. Private generic responses describe busy or rate-limited admission without echoing personal input.

Three integration tests cover start limits before additional database queries, concurrent same-user starts with independent other-user progress, and disabled submission. They are added but have not yet been executed. Prior successful CI checks apply to guard prerequisite commit 0c68fbd856ec56bf169659d4ec21946f4382d9c7, not this integration. Check the new commit's CI results separately.

The guard remains process-local. Unresolved operations retain their lock; safe timeout/cancellation handling and multi-instance coordination remain outstanding. Existing backend and interaction tests do not replace real PostgreSQL concurrency verification or live Discord validation.

No start button or production agreement/check settings are added. Existing runtime configuration keeps submission unavailable. No migration, publication, merge, deployment, activation, or record deletion is performed.
