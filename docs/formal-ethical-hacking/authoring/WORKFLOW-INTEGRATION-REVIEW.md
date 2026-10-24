# Formal learner workflow — application integration inspection

Source-only inspection at commit e2413bda5c699821f7ec75a764f87bbc7487bc02. No application, Discord session, database connection, migration or production configuration was executed or inspected through a live service. The formal course remains draft-not-published and runtimeIntegration:false. Architecture remains undecided-discord-or-web; this review does not select it.

## Existing code is not the same as formal-course integration
The repository contains an existing Discord course runtime and read-only teaching renderer. The formal ethical-hacking curriculum has not thereby acquired a private evidence-submission, saved-progress or reviewer-feedback workflow. Scope all conclusions below to the inspected source files, not the complete application or deployed behavior.

| Inspected root file | Observed source behavior | Integration limit |
|---|---|---|
| certification-student-entry.js | Decorates eligible /start responses with an initial-console entry component after caller prerequisite/profile checks | Existing command entry is not the intended formal-course learner navigation; do not assume it grants course or lab access |
| certification-course-runtime.js | Reads an explicit course feature flag; builds a catalog; checks configured guild, member identity and Verified role in the inspected catalog path | Catalog visibility explicitly does not grant course assignment; this is not a formal-course publication adapter |
| certification-course-navigation.js | Uses actor/guild/course-bound in-memory sessions, bounded expiry, role reads and course authorization checks before and after rendering | Course entry uses a student-ID modal; that conflicts with the intended no-modal formal learner flow and cannot be silently reused |
| certification-student-course-renderer.js | Produces lesson/lab/practice pages with button controls and explicit read-only/no-saved-progress/no-awards wording | It implements no saved progress or formal evidence review; practice feedback is not a stored grade |
| certification-section-identity.js | Treats student-ID confirmation as supplemental to Discord identity and can check a course-specific authorizer | A typed student ID is not a standalone credential; replacement identity handling requires its own reviewed contract |
| certification-manual-review-submission.mjs | Draft enrollment service validates agreement/comprehension input, uses enrollment transactions and records accessGranted:false in an audit event | It is not a lab-evidence submission service; do not place exercise evidence into enrollment answers or repurpose those tables without design review |

## Source references
The inspected Git blob hashes were:

- certification-student-entry.js: b70d38b75e4213c1547adb1a7f32fd72bb7c317b
- certification-course-runtime.js: 1ab14f0e2ef00e30b4932db3662fbeb00067a0fb
- certification-course-navigation.js: ddd443d52c1b82a12762d35a83d79380e4e01793
- certification-student-course-renderer.js: d468e1423fd68501f3203bbae9b4e30ed5df9e6a
- certification-section-identity.js: 1da75e23f3a858e5d5f3f55567fcf227a5f56b7f
- certification-manual-review-submission.mjs: 7de5cb4178b364a5918f1fa222bcea67a9fdd71b

These references identify reviewed text. They are not evidence that the modules, their tests or their configured services ran successfully. Other routes, permissions, persistence code and deployments remain outside this inspection.

## Requirements that need explicit work
1. Decide the formal workspace architecture through a separate approved decision. If Discord is selected, preserve the required private, button-driven, in-place learner navigation without learner slash-command navigation or modal entry.
2. Specify trusted identity and current per-course authorization adapters before rendering protected material or accepting records. Do not substitute a Verified role, typed student ID or possession of a button token for the full authorization decision.
3. Define a private first-journey record and review lifecycle separately from enrollment, course assignment, lab permission and awards. Use the accompanying [workflow contract](FIRST-JOURNEY-WORKFLOW-CONTRACT.md) as a proposed boundary, not an implemented API.
4. Specify evidence handling, access, retention, deletion, supported submission types and size limits before collecting real learner data. Do not create a public-channel fallback or store unrestricted URLs/files in enrollment fields.
5. Review persistence transactions, revision conflicts, idempotency, audit minimization and revocation behavior before any migration or handler is activated.
6. Implement and execute the contract tests in the chosen stack with synthetic data, then run reviewed integration tests. Reproduce the actual private learner/reviewer journey before claiming it works.

## What may be reused only after review
Source patterns for explicit flags, configured-guild checks, neutral mention handling, bounded sessions, current authorization checks and fail-closed responses may inform a new design. This is not approval to copy the complete existing router or identity modal. Existing read-only promises and unrelated learning paths must remain intact. Community Learning is excluded from this work.

The inspected navigation commonly defers a reply and then edits that response. That alone does not prove the desired single in-place private workspace across navigation actions; interaction and expiry behavior need an explicit design and execution test. Private presentation alone also does not prove private storage.

## Current result
This batch supplies an integration map and proposed acceptance contract only. No runtime code, schema, feature flag, architecture value, existing course registration, production service or learner record is changed. No end-to-end implementation, production security assurance or readiness percentage should be inferred.
