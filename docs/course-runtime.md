# Course runtime composition — default off

Status: repository code preparation only. No feature flag is set, no live data/configuration or provider state is changed, and no migrations/grants, assignments/completions, deletion, entry-message publication, merge, deployment, or activation occur in this patch.

CERTIFICATION_COURSES_ENABLED accepts only the strings true or false and defaults to off. Explicit enablement requires certification enabled, the existing validated current agreement manifest, and a valid VERIFIED_ROLE_ID. Invalid/incomplete enablement fails before pool creation. Default-off preserves existing routing and does not require migration 007 or a role ID for unused course delivery.

The course wrapper composes around the selected base router, including the optional application-closure wrapper and restoration section-login protections. Startup awaits base initialization, then the course readiness-gated navigation/renderer, before existing Discord startup checks and runtime admission succeed. Failure leaves the runtime unavailable. No migrations or grants run automatically.

When enabled, private learner/enrollment panel responses can include a course catalog entry within component limits, with an explicit distinction between enrollment-level checks and individual course assignments. Catalog pages show registry metadata only and require current server verification. Listing a course does not assign it or grant teaching-content access. Course entry goes through the separate ID modal and course-specific protected navigation.

The existing enrollment-level getCourseAuthorization API remains for base enrollment/readiness flows; it is not used as fallback by the new course teaching routes. This patch does not reconnect legacy academy handlers or authorize their progress/XP writes. The training-readiness introduction remains separate from curriculum courses.

Shutdown disposes course navigation and the base wrapper, stops admission, and uses the runtime's existing startup/interaction drain before ending the pool. A readiness result arriving after disposal is disposed rather than activated. In-flight admitted operations follow existing drain behavior; this is not a claim of retracting already displayed content.

Tests cover strict/default-off configuration, manifest/role prerequisites, startup ordering, private catalog entry, current-role catalog checks, restoration protection, wrapper composition, disposal during startup, and pool shutdown. Existing PostgreSQL suites cover actual course readiness/service/navigation. No new passing CI is claimed before execution; full combined runtime/PostgreSQL and target-environment acceptance remain necessary.

Keep the feature off pending curriculum completeness/safety review, owner-confirmed assignment/completion UI, retention enforcement/provider review, final documents/configuration, and separate deployment approval. No automatic course assignment, course completion, grading, or certificate issuance is added here.
