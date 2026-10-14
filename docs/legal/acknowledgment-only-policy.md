# Current enrollment policy decision — acknowledgment only

Status: recorded operator direction and branch implementation summary, not a published learner agreement, legal approval or enrollment activation.
Operator: neptuneguard, Massachusetts, United States.
Contact: eadred@neptuneguard.com.

## Selected workflow
The learner reads the approved agreement, types their full name, explicitly confirms reading, completes approved comprehension and submits a pending enrollment request for owner approval. Reading confirmation and age eligibility are self-reported, not independently proven. Submission does not grant a permanent student ID, course access, lab permission or certificate. Enrollment approval, lab authorization and certificate awards remain separate.

Signed-document uploads are not required and must not be collected by this workflow. Earlier S3/cloud and Windows-local document-storage proposals and their five-year/six-month uploaded-document retention periods are retired. Existing records, if any, are not deleted by this decision.

## Recorded age-policy selection
The selected minimum enrollment age is 16; under-16 registration is prohibited. No separate parent/guardian approval step is selected in the current workflow. Eligible learners still need their own acknowledgment, comprehension and explicit owner approval. This records the previously selected direction, not a new policy change or a finding of legal sufficiency for ages 16–17. Counsel review remains a release gate and may require changes before use.

## Agreement conflict — publication blocked
learner-agreement-draft.md is currently DRAFT-2, not the retired DRAFT-1 wording referenced in earlier versions of this policy note. DRAFT-2 removes signed-upload requirements but section 13 and its guardian-consent release blocker still require a guardian step that conflicts with the selected workflow above. Neither draft is approved for acknowledgment/publication.

Do not present that draft as final, imply its guardian control is implemented, or infer legal sufficiency from the absence of that control in code. Reconcile the draft against the selected direction through an exact-text approval and counsel review before assigning a final version/hash or collecting acknowledgment. This documentation batch deliberately does not edit learner-facing agreement terms.

## Personal metadata and unresolved retention
The branch records authenticated Discord ID, typed name, agreement version/hash, acknowledgment and confirmed-read timestamps, comprehension result/version, approval/access audit records and permanent ID when issued. Age-aware paths add eligibility confirmation, its server timestamp and policy version, not birth date or independent verification. These are personal records, not uploaded documents.

Access, retention/deletion, backup expiry and lawful-preservation schedules remain undecided and require approval. Do not infer zero retention or reuse retired document-retention periods. Do not fabricate document references or eligibility evidence to satisfy old records, and do not bulk-backfill or automatically restore access.

## Implemented in preparation branch; not production sign-off
The branch has typed-name/version/hash validation, server-side comprehension validation, owner approval, age-aware submission/approval/reinstatement, transactional auditing, permanent-ID preservation and separate lab authorization. Automated tests cover incomplete acknowledgment, actor/guild boundaries, version changes, restrictions, replay and rollback. These tests use synthetic approved-content fixtures; they do not approve real agreement/comprehension content or verify every proposed consent/copy-delivery requirement.

Latest inspected preparation snapshot: 1c36b634616b6e66d148d597807d61430fa18923; unit and PostgreSQL 16/18 job conclusions succeeded in Actions run 38519432098. This policy-note commit requires its own exact-head CI check. Raw-log/security review and controlled live verification remain incomplete. See ../deployment/certification-activation-checklist.md for full gates.

## Before use
- Reconcile DRAFT-2 age wording and approve final agreement, effective date, immutable version/hash with legal review.
- Approve privacy notice, metadata/audit/progress/lab/incident schedules and actual providers/access/backup/deletion controls.
- Approve comprehension content/key/version and verify electronic intent, attribution, agreement-copy access and accessibility in the real learner flow.
- Review migrations 001–005, legacy remediation, actual restricted account/TLS and live Discord permission/response behavior.
- Separately approve exact merge, migration, deployment/configuration, entry publication and activation.

This document performs no migration, deletion, signature collection, record change, publication, activation or production operation. Legal enforceability/compliance is not certified.
