# Protected course navigation — staged controller

Status: repository preparation only. No runtime routes, feature flags, live data/configuration, migrations/grants, completion controls, deletion, merge, deployment, or activation are changed by this patch. A separately reviewed non-tracking renderer is required; this patch does not restore student course delivery by itself.

The controller uses a separate cert:course namespace for entry, modal submission, and session pages, avoiding collisions with the existing training-readiness section's challenges. Curriculum keys come from the registry mapping. Entry still requires the account-bound permanent ID and specific active course. The configured guild, fetched member identity, and Verified role are checked for course interactions. Role and page reads have bounded actor-based rate/concurrency guards.

An in-memory session binds actor, guild, course, verified student ID, and expiration. Opening another course does not authorize the first course or replace its scope. Re-entering the same course invalidates that actor's older session for that course. Sessions last at most five minutes and have a configurable capacity capped at 1000; expiration is enforced on use, with expired records purged on later course interactions. No saved lesson progress or provider activity tracking is introduced.

Every protected page reads current specific-course authorization before rendering and again before delivery. Completion, suspension/revocation, changed permanent ID, database errors, and expired sessions deny the request. Checks occur at specific times; they do not make a database read and Discord delivery atomic, retract already displayed content, or guarantee erasure of provider copies.

The trusted renderPage callback receives only courseKey, a bounded cursor, and a session-bound button-ID builder. Output controls must remain within that same session namespace; legacy activity controls, URL buttons, and unbounded payloads are rejected. The callback must validate curriculum/module/page bounds and must not persist progress or invoke legacy handlers. Rendering is not course completion or a certificate award.

The controller supports disposal, which invalidates sessions and drops the login-handler reference. Future runtime integration must stop admission and drain admitted requests before ending the database pool. Disposal does not undo a committed operation or promise instantaneous memory erasure.

Unit tests cover fresh page reads, course independence, completion before ID submission and after session creation, account/server isolation, expiration, student-ID change, Verified-role removal, database failure, post-render rechecks, legacy-control rejection, capacity, disposal, and malformed/copied interactions. No new passing CI is claimed before execution.

Still required: non-tracking student renderer/content completeness review, course schema/privilege readiness, default-off runtime integration, confirmed assignment/completion UI, combined PostgreSQL acceptance, retention deletion/provider handling, final release review, and target-environment acceptance. Existing default routes remain unchanged.
