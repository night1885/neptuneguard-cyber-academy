# Application closure interface — staged async router

Status: repository preparation only. The current runtime continues to use its existing router. No Discord message is published and no live database action, environment change, migration/grant, merge, deployment, or activation is performed by this change.

createClosureEnabledAdminRouter explicitly awaits the readiness-gated closure service before constructing the existing admin router. It adds an Application closure entry to eligible owner-context student detail responses when a component row is available. Opening this entry and choosing a category perform SELECT inspection only. The closure panel distinguishes a recorded denied/withdrawn/abandoned closure from an internal denied status and displays the existing closure deadline where applicable.

Owner and configured-guild checks run before closure queries. The interface presents the exact numeric Discord subject and selected category, with separate Confirm closure and Cancel buttons. It accepts no learner names, uploads, free-text reason, or client-supplied closure timestamp. The actual service locks/rechecks the record when confirmed; viewing the panel does not approve closure. Previously approved or issued-ID records are not eligible.

A random confirmation token binds owner, guild, subject, and category. Tokens expire after five minutes, are consumed before invoking the service, and are invalid after restart. At most 100 pending tokens are held in memory; expired tokens are purged on subsequent authorized closure interactions. This is not a promise of immediate timed memory erasure. Another user/server cannot consume a valid owner's token. Cancellation does not invoke the service.

The service records closure and audit atomically. The result shows the recorded timestamp and deletion eligibility, not a deletion completion claim. Errors use a generic status-review message: a transport/commit acknowledgment error is not proof that the database remained unchanged. Review current state before retrying. Tokens cannot be replayed; a fresh same-category confirmation can rely on the backend's idempotent retry behavior.

Unit tests cover factory/readiness failure, entry rendering and component limits, authorization, read-only preview, bound confirmation, cancellation, expiration/restart, replay, ineligible/stale records, capacity, and sanitized errors. Existing readiness and service integration suites test the real database gates and transactions separately. New passing CI is not claimed before execution.

The current runtime constructs routers synchronously, so this async factory must not be substituted directly into its existing createRouter callback. A separately reviewed runtime integration must await readiness before admitting interactions and preserve the restoration-router section-login protections. This patch does not add an environment flag, replace startup routing, or expose a closure action in the running bot.

Target-environment acceptance, explicit enablement, course-completion/shared-record handling, deletion enforcement, provider/backup verification, final documents, and deployment remain separate work.
