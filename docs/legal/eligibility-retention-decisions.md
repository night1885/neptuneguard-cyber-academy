# Approved eligibility and retention decisions — October 17, 2026

Status: operator decisions recorded from explicit conversation approvals. Documentation only; not a published learner agreement, deletion authorization for existing records, implemented scheduler, or deployment approval.

## Approved eligibility

Learners must be 18 or older and personally answer Yes to the eligibility declaration. Enrollment does not collect actual age, birth date, government ID, legal name, signed documents, or video. The declaration is self-reported eligibility, not independently verified age or identity.

## Approved retention and triggers

| Category | Approved period and trigger |
| --- | --- |
| Approved enrollment/access records | Retain until course completion; completion ends access and triggers deletion of the associated enrollment/access record. |
| Denied, withdrawn, or abandoned applications | Delete three business days after closure. |
| Administrative audit events | Delete three calendar months after each event occurs. |

The user explicitly confirmed the course-completion access-ending/deletion trigger and the event-occurrence starting point for audit retention. No retired five-year signed-document schedule is reinstated. No numerical schedule for unrelated data is inferred.

Audit events remain a separate category: deleting an enrollment/access record does not mean all learner-linked audit information disappears at the same time. Their approved three-month schedule must be explained in the final privacy wording.

## Definitions still required before implementation

- Define the authoritative completion event and who may confirm or correct it. Opening the last page, a model response, or an unverified completion button is not established here as that event.
- Define course scope for students taking multiple courses. Review whether a shared Discord-linked enrollment/permanent ID supports other active courses before deleting any shared record.
- Define what closes an application, including how an application becomes abandoned; no automatic inactivity duration is selected here.
- Select the timezone, business-day counting rule, and holiday calendar for the three-business-day deadline.
- Specify calendar-month deadline arithmetic and timezone for audit expiry. Do not silently substitute 90 days for three calendar months.
- Review related records, foreign keys, and deletion ordering. Do not automatically cascade-delete unrelated lab records or audit events before their applicable schedule.
- Specify safe scheduling, retries, failure alerts, permissions, and a reviewable dry-run procedure. No actual deletion implementation has been verified.
- Review applicable preservation obligations and proposed exceptions separately; this document does not establish a legal-hold workflow.
- Verify active-storage deletion and provider, log, backup, versioned/recoverable-copy handling. Do not promise immediate or universal erasure.

## Next document and release steps

These decisions resolve the age choice and the three selected retention periods; earlier statements that those choices remain wholly undecided are superseded. Other agreement, privacy, and implementation questions remain open.

Reconcile the next learner-agreement draft and privacy notice with these decisions, distinguish approved intentions from verified capabilities, and review the exact final text before publication. Keep credentials and server-side answer keys out of repository policy files.

No SQL, database migration, deletion job, environment update, Discord publication, learner notification, merge, or deployment is performed or authorized by this documentation change. Existing records have not been deleted.
