# Agreement reconciliation proposal — review only

Status: UNAPPROVED PROPOSAL. Not learner-facing terms, a final agreement, counsel approval, publication or activation. This file does not replace learner-agreement-draft.md, assign a final version/hash, collect acknowledgment, change policy or modify runtime behavior.

## Basis and scope
DRAFT-2 section 13 and its guardian-consent release blocker conflict with acknowledgment-only-policy.md and the selected workflow: minimum age 16, no separately selected guardian step, own acknowledgment/comprehension and owner approval. The draft also omits current minimal self-reported age-evidence metadata from its record summaries. Below are exact proposed replacements/additions for later operator and counsel review. All other draft terms remain outside this proposal's changes.

## Proposed replacement for section 13

## 13. Eligibility and minors
The minimum enrollment age is 16. Applicants under 16 are ineligible and must not register or be approved. Eligible applicants must provide their own acknowledgment of the approved agreement, pass the approved comprehension check and await explicit owner approval. The currently selected enrollment workflow does not include a separate parent or guardian approval step. Enrollment approval does not authorize lab activity or award a certificate.

Eligibility is self-reported. The preparation branch records a confirmation that the learner meets the selected age policy, a server-assigned confirmation timestamp and the policy version; it does not independently verify age, identity or legal capacity. Legal sufficiency of the selected workflow for applicants aged 16 or 17 remains unresolved. Obtain counsel review of applicable requirements and implement any required changes before publication or enrollment activation. This draft does not establish that guardian involvement is legally unnecessary.

Restricted learners who provide fresh eligibility evidence remain restricted until separate owner reinstatement. Renewing evidence does not itself restore course access or lab permission. Never fabricate evidence or automatically backfill legacy eligibility.

## Proposed release-blocker replacement
Replace the existing guardian-consent verification-method/enforcement bullet with:

- Counsel review of the minimum-age-16 policy and the selected workflow for learners aged 16–17, including whether additional consent or safeguards are required and any corresponding implementation changes before activation.

## Proposed metadata additions
Add to section 9 after the enrollment-record summary:

The age-aware enrollment paths additionally record self-reported age-policy eligibility confirmation, its server-assigned timestamp and the policy version. This mechanism does not store a date of birth or an independent age-verification result. These records are personal enrollment metadata and must be covered by the approved privacy and retention/deletion policy.

Add to section 17 after the proposed-record-fields paragraph:

Age-policy eligibility confirmation, its authoritative timestamp and policy version are recorded separately by the age-aware workflow. Learner-provided age input is used for eligibility validation and is not stored as an exact-age column by this mechanism. Approval, restrictions and renewed evidence remain distinct records and decisions.

## Application and approval sequence
1. Review this exact proposal against the selected direction; approve edits to the draft separately. Committing this proposal is not approval to apply it.
2. Review counsel findings, privacy/retention schedules, final declaration, agreement-copy access and accessibility; retain all other release blockers.
3. Apply only separately approved draft changes, reconcile policy notes and clearly identify the unapproved revision. Do not silently alter an already acknowledged version.
4. Approve final text/effective date/version/hash and comprehension content separately from publication/insertion or activation.
5. Complete actual runtime/account/TLS/Discord verification and exact external-write approvals in ../deployment/certification-activation-checklist.md.

Credential rotation, actual owner/admin-channel identity and remaining runtime environment evidence remain unresolved. This proposal neither uses nor reproduces credentials and performs no production operation.
