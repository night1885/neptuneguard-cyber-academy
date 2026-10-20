# Approved eligibility and retention decisions — October 17, 2026

Status: operator decisions recorded from explicit conversation approvals. Documentation and non-destructive calculation preparation only; not a published learner agreement, deletion authorization for existing records, implemented scheduler, or deployment approval.

## Approved eligibility

Learners must be 18 or older and personally answer Yes to the eligibility declaration. Enrollment does not collect actual age, birth date, government ID, legal name, signed documents, or video. The declaration is self-reported eligibility, not independently verified age or identity.

## Approved retention and triggers

| Category | Approved period and trigger |
| --- | --- |
| Approved enrollment/access records | Retain until course completion; completion ends the associated course access and triggers deletion of its enrollment/access record, subject to the approved shared-record rule below. |
| Denied, withdrawn, or abandoned applications | Delete three business days after explicit admin closure. |
| Administrative audit events | Delete three calendar months after each event occurs. |

Audit events remain a separate category: deleting an enrollment/access record does not mean all learner-linked audit information disappears at the same time. Their approved three-month schedule must be explained in final privacy wording. No retired five-year signed-document schedule is reinstated.

## Approved operational definitions

- The designated academy admin confirms course completion. Viewing the last lesson does not automatically establish completion.
- Completing one course ends that course's access. Delete a shared enrollment/access record only after all of the student's active courses are complete.
- The admin explicitly closes denied, withdrawn, or abandoned applications. No automatic inactivity timer is approved.
- Application deadlines use America/New_York. Exclude the closure date and count the next three Monday-Friday dates. Weekends are excluded; holidays are not excluded. The deadline is the end of the third counted date. The calculator returns the first instant of the following local date as the deletion-eligibility boundary, avoiding deletion during the third business day.
- Audit deadlines are three calendar months after the event timestamp in UTC, preserving its time of day. If the corresponding day does not exist in the destination month, use that month's last valid day. Do not substitute 90 days.

These approved definitions supersede older unresolved-definition summaries in related draft documents. They do not establish implemented completion tracking, application closure, or deletion enforcement.

## Calculation-only preparation

certification-retention-deadlines.js provides pure deadline functions. It accepts Date objects or explicit-offset ISO timestamps at millisecond precision in the documented supported range, returns new Date objects, and does not access a database, read environment variables, schedule work, or delete data. Tests cover weekends, timezone/date boundaries, daylight-saving transitions, the no-holiday-exclusion rule, and calendar-month clamping. Passing these tests is not a production deletion acceptance test.

## Remaining implementation and review items

- Implement and verify authorized admin completion/closure events and the per-course versus shared-enrollment data model. Do not infer completion from a model response or an unverified button.
- Review related records, foreign keys, and deletion ordering. Do not automatically cascade-delete unrelated lab records or audit events before their applicable schedule.
- Specify scheduling, database timestamp precision, retries, failure alerts, restricted permissions, and a reviewable dry-run procedure. The pure calculators do not select records or guarantee execution at a deadline.
- Review applicable preservation obligations and proposed exceptions separately; no legal-hold workflow is established here.
- Verify active-storage deletion and provider, log, backup, versioned/recoverable-copy handling. Do not promise immediate or universal erasure. No numerical schedule for unrelated data is inferred.

## Next document and release steps

Reconcile the learner-agreement draft and privacy notice with these decisions, distinguish approved intentions from verified capabilities, and review the exact final text before publication. Keep credentials and server-side answer keys out of repository policy files.

No SQL, database migration, deletion job, environment update, Discord publication, learner notification, merge, or deployment is performed or authorized by this change. Existing records have not been deleted.
