# Enrollment response deadlines — not database cancellation

The guarded routed handler now observes processing with a default ten-second response deadline. On expiry, it gives a private outcome-not-confirmed message and advises owner status review before resubmission. Late reply, editReply, deferReply, and showModal calls initiated by that handler after expiry are suppressed. An already in-flight Discord API call cannot be recalled.

The response deadline does not cancel the underlying operation, roll back a transaction, or retry a submission. The original attempt guard remains locked until the original handler promise settles. Other actions by the same learner are rejected as busy during that time. Original promise rejection is observed even after timeout; no second result is sent to the learner.

Five tests cover completion, early failure, lock preservation, late rejection, and integrated private timeout/late-response behavior. They are added but not executed at preparation time. Existing certification CI should include the new test file. Prior successful CI applies to earlier commits, not this change.

This is response handling, not durable crash recovery. A permanently unresolved operation can retain its lock until process restart. Restart also loses sessions and counters. Database query/connection timeouts, cancellation acknowledgment, status reconciliation after lost responses, monitoring without personal-input logging, and multi-instance coordination remain separate work. A timeout message is not proof that a request failed or succeeded.

The optional responseTimeoutMs factory argument is trusted developer configuration for testing and tuning, not learner input. Production timeout choices require controlled Discord and PostgreSQL validation. Existing session expiry, one-use tokens, owner approval, and enrollment gates remain unchanged.

This commit adds no start button or production agreement settings, applies no migration, publishes nothing, and does not merge, deploy, or enable enrollment.
