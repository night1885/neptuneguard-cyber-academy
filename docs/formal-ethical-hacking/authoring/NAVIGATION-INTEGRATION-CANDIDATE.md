# Default-off first-practical navigation candidate

Source-only candidate based on inspected main 8758b8b87e6f7eb69abb263bfacfde2b4906cda8. Not wired into startup, published, deployed or live accepted. This branch is separate from intake-recovery PR #36 and does not depend on or merge it.

## Package and local evidence
Three modules provide a read-only service-response authorizer, an allowlisted local draft-content loader and a distinct fnv: interaction handler. All remain unconnected. Navigation defaults off and additionally requires explicit draft-preview permission, bounded configuration, readiness and trusted providers. Report submission, review and receipt-discovery actions are absent. No progress, exercise permission or award follows from reading.

The exact candidate ran locally under Node 20.20.1: 38 tests passed, zero failed or skipped. Coverage includes composed mapper/controller/file-loader traversal, private entry and same-message updates, cross-actor/message/guild/channel rejection, current authorization and membership checks, revocation, expiry, re-entry/disposal, bounds/timeouts, serialization, local-file containment and Unicode chunk preservation. Tests use mocked Discord interactions and authorization responses and temporary document files. This is not committed-head CI, real database authorization, actual lesson-rendering review or live Discord acceptance. Earlier test runs are not additive coverage. Self-review corrected copied-provider behavior and strengthened mutation assertions before the final run. No independent review is claimed.

Run from a trusted checkout: node --test formal-first-journey-navigation.test.mjs

## Content and existing-runtime boundaries
The loader permits only START-HERE.md, EH-LAB-00/01/02, EH-LINUX-01/02/03 and EH-LAB-03/04/05. No authoring or instructor document is in its allowlist. It reads bounded local text, never fetches a URL or executes Markdown/commands. At repository root its default local root resolves the existing docs tree; tests supply temporary roots. Text chunk preservation does not establish code-fence layout, link behavior, accessibility or continuation safety on real lessons. Those need review before any delivery. Path containment assumes a trusted stable checkout, not an adversarial filesystem sandbox.

Existing certification-course-navigation.js uses a student-ID modal and is not reused or replaced. Existing registered-course rendering and COURSE_SECTION_KEYS remain unchanged. The adapter wraps getCourseAuthorization(actor, course), expecting student_id/course_key; it does not create assignments, approve accounts, add a course key or bypass the service's current-approval checks. Formal-course allowlist/schema compatibility and actual authorization must be separately reviewed before connecting a real service. The mapper tests prove response-shape handling only.

## Transport and lifecycle limitations
Guild membership is read through the SDK-shaped interaction, but the tests mock that SDK. Private entry uses ephemeral deferral; controls bind actor/guild/course/channel/message and normal navigation updates the same message. Expired/stopped sessions require fresh entry. This is in-memory navigation, not durable recovery. Session expiry does not delete previously delivered messages or implement report retention. TTL/capacity/timeouts are explicit candidate bounds, not approved live settings.

Queue acknowledgment timing, actual ephemeral metadata, API failures and real permission surfaces need SDK/staging validation. Transport operations are not atomically revocable: revocation/expiry after the last check or during an accepted external edit cannot be called a distributed guarantee or erasure. Hung transport calls can block the bounded queue. Provider timeouts suppress late local results but do not cancel external work.

## Authorization boundary
No existing source file, SQL, registry, manifest, dependency, workflow, startup import, environment flag, Community Learning route or publication status is changed. Existing application regression suites and GitHub CI have not run for this new candidate. No complete first-learner journey is claimed. Evidence/reviewer policy, support contacts, production persistence, copy deletion and recovery retention, exercise authorization, hardware reproduction, accessibility, staging and activation remain separate gates. Do not enable this candidate merely to try it.

This commit authorizes source review only: no PR, merge, deployment, Render operation, database connection/mutation, Discord publication, real learner content, collection or deletion. Repository automation may react to commits, but no separate workflow dispatch is requested. Further writes and live actions require separate exact approval.
