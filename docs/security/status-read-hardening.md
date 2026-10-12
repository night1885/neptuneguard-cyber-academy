# Enrollment status read guard

The runtime's guarded enrollment route now limits status SELECT operations to five attempts per authenticated actor per 60-second fixed window. Owner reads share the owner's budget across learner targets. Authorization and guild checks occur before guarded database work. Invalid actions do not consume read capacity.

Each actor may have only one in-flight status query. A handler instance allows at most 16 concurrent status queries and stores at most 1,000 actor entries; it rejects rather than evicting active or unexpired entries when full. Expired idle entries are reclaimed. Rejected or failed queries consume an attempt.

The guard covers the actual query promise, not just the Discord response deadline. A timed-out response therefore does not release query concurrency until the underlying query settles. Late settlement must not produce a second reply. Private responses distinguish busy, rate-limited, and capacity-limited conditions without exposing database errors. No database writes or access grants are added.

These are per-handler, in-memory limits, not distributed limits. They reset on process restart and cannot cancel database queries, enforce server-side statement timeouts, or bound unrelated write operations. A permanently stuck query retains its slot and fails closed. Server-side statement, lock, and connection timeouts and deployment-wide limits remain separate hardening work. Calling the low-level status handler directly bypasses the route guard; runtime routing must use createGuardedSubmissionHandler.

The new test file is included by the existing certification CI glob. CI success must be verified for the exact commit; it is not established when preparing this patch. No production activation, migration, dashboard publication, merge, or deployment is included.
