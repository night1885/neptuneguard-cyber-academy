# Detached access/content adapters — reviewed composition

Draft maintainer milestone. runtimeIntegration:false; publishable:false.
Baseline f11cbe945a66c438077a3840edd331085ea240cf. No bot listener, command, entry button,
database connection, migration or live Discord call is created. navigation.mjs is unchanged.

## Source findings

certification-service.js returns student_id for enrollment eligibility, not a selected-course
grant. certification-course-sections.js delegates course checks to certification-course-
lifecycle.js: its read requires active assignment, current approved account acknowledgment
and no application closure, returning student_id/course_key. The existing navigation also
requires a configured Verified role but uses modal entry; that entry is not copied here.

course-registry.js contains Linux/SOC courses, not formal Ethical Hacking. The supplied
formal-ethical-hacking identifier is a proposed REVIEW route, not a registered production
key. No registration or cross-course fallback is added. Today's allowed-key provider cannot
authorize it. The real course-key/assignment integration still needs review and approval.
Source blobs: service c20fe44b8f3a00542017b4443bd9d32820d077e1; lifecycle
0a4b08cf615aabe76fe7389f2516b74b217d097b; sections
f364236a64f8da8e2dfe05682b11d5d8d82b8c1a; registry
56c38631b3d2527698fdd60fac1f9f0add166bba. Source inspection is not policy execution.

## Trusted read contract

createAccessAdapter defaults off. Enabled use requires explicit guild/course/role IDs and
trusted readMember(actorId,guildId), readCourseGrant(actorId,courseId) providers. Context
accepts exactly actorId/guildId/courseId. A current member must match actor/guild and return
exact true for the configured role; the exact grant shape is {student_id,course_key}, with
a nonblank student id up to 128 characters and the configured course. Null, enrollment-only,
wrong-course, array and unexpected shapes deny. Membership is read again after the grant.
A Verified role alone does not grant access. No positive result is cached or student id
returned to the renderer. Providers must enforce fresh authoritative identity/assignment/
account policy for the supplied actor; an exact-shaped object does not authenticate itself.

Each provider read has a 400 ms default wait limit (100–1000 ms range), up to three reads
per adapter call. The controller has its own outer deadline. Errors/timeouts deny without
details; timeout does not cancel underlying work. Providers must be read-only. External
identity consistency and the final check-to-delivery race remain unproven.

## Bounded review content and composition

createContentAdapter accepts a matching schemaVersion:1 draft-review-only bundle with
runtimeIntegration:false/publishable:false and 1–20 unique learner/reading pages. Each page
has a simple title and nonempty text up to 1600 characters. Snapshot render requests accept
exact courseId/page with an in-range integer and return bounded text with a draft/page marker.
No filesystem read, URL fetch, arbitrary message payload or client page object is accepted.
Tags are shape controls, NOT secret detection: maintainers must semantically review text.
The three supplied pages cover workspace scope, preparation and evidence status, not an
imported full curriculum or instructor-answer store.

createReviewWorkspace composes the unchanged controller and adapters, derives page count
from the bundle and defaults off before using providers/content. It attaches no handler
and supplies no production reader. No slash commands, modals or public fallback are added.

## Actual validation

    node --test adapters.test.mjs

34 NEW adapter/composition tests passed on Node v20.20.1, with zero failures, cancelled tests
or skips. Three new modules were syntax-checked and imported by real Node processes. The
controller copy matched Git blob ac027f8e40c7d4436b174e7273b0397d6b4f68bc. These tests
used synthetic SDK/member/grant objects, NOT a database, gateway/API or executed existing
lifecycle/acknowledgment policy. Original navigation tests were NOT rerun: this is not a
68-test combined run, full checkout, CI result or live Discord integration.

Coverage includes scoped readers; membership/role/grant mismatch; enrollment-only rejection;
provider errors/timeouts/revocation/no-cache; bundle bounds/mutation isolation/category
rejection; private entry/in-place Next; post-render revocation; wrong actor; restart and
expiry. The synthetic student id was absent from reading responses; no general privacy,
accessibility or evidence-retention assurance is implied.

## Before runtime integration

Approve the formal course registration and authoritative adapters; validate SDK serialization,
real private entry/acknowledgement, token/restart/revocation behavior, content provenance,
accessibility and staging scope. Evidence/reviewer persistence, retention/deletion and audit
remain separate. No runtime/production flag, enrollment, learner record, progress, lab access,
course completion, award or Community Learning change is included.
