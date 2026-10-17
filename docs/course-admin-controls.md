# Owner course lifecycle controls — default-off integration

Status: repository preparation only. No live feature flag, data/configuration, migration/grant, course assignment/completion, deletion, credential award, merge, deployment, or activation is performed by this patch.

The readiness-gated owner controller provides a private per-student course panel, explicit multi-course assignment selection, and separate completion review. Panel/selection actions perform SELECT inspection only. It accepts registry course keys rather than learner names, uploads, grades, or free-text personal data. The assignment UI deliberately requires a reviewed catalog of at most 25 courses; catalog expansion and retired/unmapped assignments require review rather than silent remapping.

Every change requires a random single-use confirmation bound to configured owner, server, numeric student ID, action, and copied exact course keys. Prompts expire after five minutes, are invalid after restart, and have a 100-prompt cap. Expired prompts are purged on later authorized interactions; this does not promise timed memory erasure. Cancellation does not call the mutation service. The backend locks/rechecks current records, enforces current acknowledgment for assignment, and records each real change with its audit event.

Completion can be reviewed for previously approved suspended/revoked enrollments without reinstatement. Existing completed records are not reopened. Backend retries remain idempotent. All-assigned-courses-complete is displayed only as an informational condition, not final deletion permission or a certificate. Generic errors direct the owner to review current state; an acknowledgment/transport error is not proof that no transaction committed.

Managed navigation combines the real protected renderer/navigation with these owner controls. The existing default-off course runtime invokes admin handling before learner navigation and decorates owner student-detail responses with an entry while respecting component limits. Existing restoration/closure paths and default-off behavior remain. No flag is set in this commit. Disposal invalidates pending controls and protected sessions; startup failure cleans up already-created navigation.

Unit tests cover read-only preview, exact target binding, copied selection values, confirmation/replay, authorization, cancel/expiry, completed/suspended records, output component limits, sanitized failure, and cleanup. Existing real PostgreSQL suites verify underlying gates/transactions; combined runtime acceptance including these controls is still required. New passing CI is not claimed before execution.

Keep live enablement off pending combined acceptance, curriculum safety/completeness review, actual retention deletion/provider handling, final documents/configuration, and separate deployment approval.
