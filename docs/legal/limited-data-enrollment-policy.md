# Current learner-information policy — zero retention

Status: user-directed requirement, clarified October 17, 2026. Policy settled; implementation is not yet compliant. This is not a published learner agreement, legal-compliance certification, deletion record, or deployment authorization.

## Superseding instruction

Do not retain learner information. Do not reinterpret this instruction as merely excluding legal names or uploaded identity documents, and do not invent a retention period.

This supersedes this file's previous permission to retain Discord-linked profiles, course progress, quiz results, XP, badges, permanent student IDs, enrollment/access/approval status, acknowledgment/age timestamps, and learner-linked audit records. It also supersedes conflicting retention proposals in acknowledgment-only-policy.md, learner-agreement-draft.md, and historical rollout/security documentation. Those documents are historical inputs, not current authorization to retain information or activate enrollment.

Do not collect or retain legal names, actual ages, birth dates, addresses, email addresses, identity-document copies, signed-document uploads, or video recordings through enrollment. Prior document-storage and document-retention proposals remain retired.

Do not relocate learner records into Discord roles/messages, client-side tokens, exports, or another service and call that zero retention. Any proposed alternative must disclose what information exists, where it exists, who controls it, and whether it persists; it requires explicit review rather than an assumed exception.

Static curriculum, generic agreement text, and non-learner-specific configuration are separate from learner records. This instruction does not require deleting the course materials or source code.

## Existing policy decisions not silently waived

The minimum enrollment age remains 18, expressed through a Yes/No self-declaration rather than independent age verification. General class authorization, lab-specific authorization, and certificate awards remain separate. Registration or a declaration alone grants no access.

The user also requested admin-approved access for all existing academy courses. The currently implemented approval gate depends on retained enrollment records. That conflict must be resolved in an explicitly reviewed design; this document does not waive approval, admit learners automatically, or claim that the current gate implements zero retention.

## Implementation gap and release hold

The current application still writes learner profiles, path selection, progress, quiz outcomes, XP, badges, enrollment/approval metadata, permanent IDs, lab records, and learner-linked audit events. The policy correction does not stop those writes or erase existing data.

Permanent IDs, saved progress/badges, historical learner reports, and remembered account-specific approval/revocation cannot remain in their current database-backed form under this requirement. Removal or redesign must be presented explicitly; no feature is removed by this documentation commit.

Do not deploy or activate the current retained-record enrollment/course design as a zero-retention release. Do not present an agreement promising no retained information until implementation and operational verification support that statement.

## Required work

1. Inventory and prepare removal or redesign of learner-record write paths, including automatic /start profile creation, /begin path selection, lesson/quiz completion and rewards, registration, acknowledgment, approval, lab requests, and audit creation.
2. Review affected interfaces and authorization together. Disabling storage must not silently turn protected courses into unrestricted access or falsely report saved progress, permanent IDs, approval, or completion.
3. Review process-local sessions, application logs, exports, Discord messages, provider logs, backups, and recoverable copies. Their behavior has not been established as zero retention. Temporary processing necessary to handle an interaction must not be represented as no processing or no third-party data handling.
4. Prepare a separately approved cleanup procedure for existing records and copies, with exact targets, dependencies, operational effects, and verification. Stopping new writes is not proof of deletion. Do not infer a legal preservation exception, deletion completion, or backup-erasure capability from this policy statement.
5. Update learner-facing agreement/privacy language and deployment guidance to the verified implementation. Clearly distinguish Academy-controlled storage from platform/provider behavior that has not been independently verified.
6. Recheck automated tests, independent review, acceptance scope, and exact-head deployment readiness after the redesign.

## Action boundaries

This documentation change authorizes no application-code change, feature removal, database query of learner records, deletion, migration, environment/permission update, student notification, Discord publication, merge, deployment, or enrollment activation. Keep PR #11 in draft. No zero-retention implementation or cleanup success is claimed.
