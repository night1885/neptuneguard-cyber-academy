# Current enrollment policy decision — acknowledgment only

Status: implementation requirement; not a published learner agreement and not an enrollment activation.
Operator: neptuneguard, Massachusetts, United States.
Contact: eadred@neptuneguard.com.

## Superseding decision
The learner reads the approved agreement, types their full name to acknowledge it, confirms reading, completes the required comprehension check, and submits an enrollment request for explicit owner approval. Acknowledgment does not automatically grant access or lab authorization. Reading confirmation is self-reported, not independently proven.

Signed-document uploads are no longer required and must not be collected by this workflow. There is no uploaded-agreement document retention. Prior cloud/S3 and Windows-local document-storage proposals and their five-year or six-month document-retention schedules are retired.

This decision supersedes the conflicting requirements in docs/legal/learner-agreement-draft.md, including mandatory uploaded signatures, document review, upload-related declaration wording, and signed-document storage and retention. That DRAFT-1 agreement must not be published or presented for acknowledgment. A revised agreement must remove those requirements and retain the nonconflicting training rules and legal-review safeguards before activation.

## Acknowledgment metadata is separate
The proposed application still needs the learner's Discord ID, typed name, agreement version and content hash, acknowledgment and learner-confirmed-read timestamps, comprehension result, approval record, and permanent student ID if issued. These are personal enrollment records, not uploaded documents. Their access, retention, deletion, and lawful preservation policy remains undecided. Do not infer zero metadata retention or reuse a retired document-retention schedule.

## Required code changes before use
- Record typed-name acknowledgment and the exact approved agreement version without an upload.
- Validate comprehension using an approved server-side question set.
- Update enrollment approval and reinstatement validation so a signed-upload reference is not required for this acknowledgment-only method.
- Preserve owner approval, transactional auditing, permanent IDs, and separate lab authorization.
- Review database constraints and migration compatibility. Do not fabricate document references to satisfy old validation.
- Add tests for incomplete acknowledgment, non-owner approval, malformed submissions, agreement-version changes, and denied or suspended access.
- Revise learner-facing agreement and privacy wording and settle age eligibility and metadata retention.

## Scope
This policy document changes no code, database, Discord message, or deployed service. No migration, deletion of existing records, signature collection, or activation is authorized by this documentation commit. Legal enforceability and compliance are not certified.
