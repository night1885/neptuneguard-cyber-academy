# Enrollment attempt guard — standalone prerequisite

certification-submission-attempts.js provides an in-memory per-learner concurrency lock and fixed-window counters. Defaults allow three session starts per minute and five submission attempts per fifteen minutes. Counters are consumed when an operation is admitted, even if it later fails. Busy actions are rejected rather than queued. Other learners can proceed independently.

Storage is bounded to 1000 actor records by default. Inactive, non-busy records expire after thirty minutes. The default clock is monotonic. A busy operation is never evicted to allow a second operation; unresolved operations therefore require operational timeout/cancellation design. No forced lock release is implemented.

Seven tests are added but have not yet been executed. Existing CI matches test-certification-*.mjs and should pick up the new suite. The four-suite backend runner is unchanged.

The guard is not imported by the Discord handler or router yet. Existing routing therefore does not enforce these new limits. After verifying tests, integrate it after feature, user, guild, and action validation and before any awaited session mutation. Apply the same per-user lock across start, navigation, form, cancellation, and send actions to avoid interleaving. Return private generic retry responses when admission is denied. Do not echo submitted names or answers.

These are development defaults, not a finalized abuse policy. Fixed windows can allow bursts at boundaries. Process-local counters reset on restart and do not coordinate multiple bot instances or prevent distributed abuse. Final controls, monitoring, and timeout behavior need review before activation.

This commit changes no routed behavior, adds no start button, applies no migration, and enables, merges, or deploys nothing.
