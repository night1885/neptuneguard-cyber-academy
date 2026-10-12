# Enrollment routing — connected in feature-branch source, not enabled

This routing note supersedes the earlier statements that the submission handler was standalone and not imported by the router in discord-enrollment-sessions.md, discord-enrollment-test-checklist.md, and enrollment-submission-integration.md. Those describe earlier implementation checkpoints.

certification-router.js now constructs the submission handler and routes cert:submit: buttons and modal submissions before rejecting unsupported certification modals. Access management, learner lessons, owner approval, and directory routes remain unchanged.

## Not activation

No start button or entry message is added or posted. The separate enrollmentSubmissionEnabled flag and approved agreement/check settings are not added to the runtime configuration loader. Existing configuration therefore leaves submission unavailable. Both certification and submission gates, the configured guild, and handler validation remain required.

The route issues no automatic IDs, course or lab permission, or certificate. No agreement is published, migration applied, deployment performed, or existing record deleted.

## Verification

Four routing tests are added for disabled submission buttons, submission modal dispatch before generic rejection, unrelated modal rejection, and non-certification passthrough. They have not yet been executed. Existing CI runs test-certification-*.mjs and should include these tests on the new commit; check that commit's actual results before claiming success. The earlier CI success belongs to commit 0b7e3802620c1de3e0a2f478f76d3535ae5909cb, not this change.

Before activation, finish concurrency and abuse-control testing, real PostgreSQL migration/transaction verification, agreement publication/versioning safeguards, and agreement, age-eligibility, comprehension, and metadata-retention decisions. A gated source route is not an operational enrollment rollout.
