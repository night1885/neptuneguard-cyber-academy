# Review decision and learner status batch — NOT VALIDATED FOR ACTIVATION

Baseline: 3e16abfe66736a36e7fe8f70a9a6a9fd7d227988. This additive candidate does not integrate runtime adapters, modify old source files, expose Discord UI, install live SQL or deploy.

Adds current review state and bounded (50 per report) request acknowledgements. Commands accept only changes-requested/review-recorded and bounded nonblank feedback. Review revision is separate from submission revision. Identical authorized replays return the original metadata acknowledgement; changed payload or stale expected review revision returns SQLSTATE 40001. No acknowledgement contains feedback/body. Learner status is metadata-only and learner-scoped; review-recorded is not approval, a grade or an award.

Record/report locks serialize mutations. The existing reviewer_read guard is invoked after both locks. The learner status guard checks current authority, report expiry/hash and report-review digest binding. PostgreSQL trusts the authenticated service to supply actor identity; these argument checks do not provide cryptographic Discord authentication. Current worker identity/privilege verification, connection limits and generic error handling must be implemented in the future application adapter before wiring these functions into a listener.

Retention is not just a foreign-key cascade: an added report-body-redaction trigger deletes review feedback/state AND replay metadata in the same transaction as the existing due operation, even while external source deletion is pending. Parent deletion also cascades. This preserves the original report deadline; it does not guarantee physical erasure at an exact wall-clock instant, purge logs/backups, or remedy a stalled retention worker. Installing the trigger changes database behavior and needs explicit approval. No existing dispatch source is rewritten.

The candidate test is default-off and disposable-only. Fixtures must be committed to be visible to separate worker connections and are explicitly cleaned up; never run against connected staging/production. Four CI jobs use only fixture credentials, a read-only workflow token and sequential database suites. The prior CI workflow is unchanged. This new workflow runs only on its own branch/path and review-decision marker.

Local checks: JavaScript syntax, default-off skip, workflow YAML parse and source structure checks only. No PostgreSQL parser/server was available. No real SQL pass is claimed. Real CI, independent security review, application adapters, feedback presentation, tracked retention-aware delivery and separately approved live activation remain gates.

Prepared real-database coverage: 27 scenarios, including simultaneous writers, revocation of a blocked write, grant/report expiry across observed write lock waits, and feedback/replay erasure before external deletion. Whitespace-only feedback is rejected. These scenarios have NOT run locally.
