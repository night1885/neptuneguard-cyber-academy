# Agreement document storage plan — retired

Status: RETIRED. No document-storage implementation is selected or authorized for the acknowledgment-only enrollment workflow.

The current policy is docs/legal/acknowledgment-only-policy.md. Learners acknowledge by typing their full name, complete required comprehension, and await explicit owner approval. Signed agreement uploads are not required and must not be collected by this workflow.

The earlier S3/KMS design and later Windows-local encrypted-storage proposal are superseded. Five-year and six-month uploaded-document retention periods no longer apply to this workflow. Historical design text remains available in Git history; it is not a current storage commitment.

Acknowledgment metadata still requires a separate access, retention, deletion, and legal-preservation policy. This document does not claim that no personal information is recorded.

No AWS resources or local vault are provisioned by this change. Existing files or records, if any, are not deleted by this documentation update. The runtime approval code and agreement draft still need the changes listed in the current policy before activation.
