# Course-content retention policy and integration contract

This is a pure policy calculation, not an executor, scheduler, permission grant, access-policy change, or complete retention implementation. No runtime imports or live database/Discord calls are added.

## Confirmed triggers

Learner submissions, feedback, and saved reading positions remain in the course-content retention scope. A recorded course completion or administrator removal from that specific course starts a 24-hour retention window. A learner withdrawal request, enrollment revocation, leaving the Discord server, or temporary suspension does not start this clock. Certificate-verification records remain outside this course-content cleanup and require a separate long-term verification policy.

The deadline is the original event timestamp plus 86,400,000 milliseconds. Reinspection, retries, later views, and delayed cleanup must not move it. Evidence must match learner, course, and assignment timestamp to prevent applying an old course episode's event to another assignment. Eligibility alone never authorizes deletion. Preservation holds and unresolved preservation decisions block cleanup.

## Distinct from report access

The existing review core's submission-based access expiry is unchanged. Access expiry is not erasure, and retention eligibility is not an access grant. Changing REVIEW_POLICY.reportMs would not implement course-lifecycle retention and is not part of this batch. Report submission itself is not a retention trigger.

## Required implementation before activation

1. Persist an authenticated designated-administrator course-removal event and close access to that specific assignment. Derive completion events from recorded course completion. The policy function does not authenticate recordedBy or validate a reference against storage; trusted persistence must establish provenance.
2. Establish durable course/assignment bindings for report revisions, feedback, and saved positions. Do not infer assignment identity solely from a Discord ID and reusable course key.
3. Preserve the original qualifying event. Missing, inconsistent, or ambiguous lifecycle history must block cleanup, not silently choose a later event or substitute a submission timestamp.
4. Integrate a separately privileged, transactional database cleanup executor, related-record dependency checks, preservation review, durable cleanup receipts, and Discord-copy reconciliation. Certificate verification and unrelated courses must remain untouched.
5. Test completion, explicit administrator removal, scope isolation, holds, retries, re-enrollment, rollback, restart recovery, and external cleanup failures on disposable infrastructure before release.

The confirmed trigger set is implemented here, but durable event recording, removal access enforcement, deletion, and all associated startup/UI integration remain unimplemented by this batch. Do not describe this policy helper as completed retention or deploy the programme on this evidence alone.
