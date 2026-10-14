# Agreement document storage plan — retired

Status: RETIRED. No uploaded-document storage implementation is selected or authorized for acknowledgment-only enrollment.

The recorded workflow is in ../legal/acknowledgment-only-policy.md: typed full name, explicit reading confirmation, comprehension, pending request and separate owner approval. Signed agreement uploads are not required and must not be collected. Older S3/KMS and Windows-local encrypted-vault proposals and their five-year/six-month uploaded-document schedules remain retired; Git history is historical design evidence, not a current storage commitment.

The preparation branch implements acknowledgment metadata and age-aware access paths. This supersedes this note's older statement that runtime approval still needed conversion away from uploads; it does not close runtime security or deployment review. Final learner-facing agreement, electronic intent/copy-delivery/accessibility and privacy controls still need review and approval. DRAFT-2 section 13 contains a guardian-policy conflict identified in the policy note; neither this retirement note nor code resolves legal sufficiency. Do not publish the draft.

Discord ID, typed name, agreement/hash/timestamps, comprehension, self-reported eligibility evidence, approval/audit and permanent IDs are personal enrollment metadata. No uploaded-document retention does not mean zero personal-data retention. Metadata access, retention/deletion, lawful preservation and backup handling require separately approved schedules; do not reuse retired upload schedules.

No AWS resources, local vault, retention job or deletion mechanism is provisioned by this documentation update. Existing files/records, if any, are not deleted. Production role/TLS/storage controls and release approvals remain in ../deployment/certification-activation-checklist.md.
