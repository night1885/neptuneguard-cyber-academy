# Learner agreement storage plan

Status: PROPOSED — not provisioned or verified. This plan accompanies docs/legal/learner-agreement-draft.md; it does not activate that draft or certify legal compliance.

Operator: neptuneguard, Massachusetts, United States. Contact: eadred@neptuneguard.com.

## Selected direction
Use private Amazon S3 storage with SSE-KMS using a customer-managed key. Use PostgreSQL for document references, review status, approval timestamps, retention eligibility, and audit metadata rather than public file links. AWS account, region, bucket names, key, roles, and budget require separate approval.

## Access and encryption requirements
- Block public access and do not publish document URLs in Discord channels.
- Require HTTPS and verify encryption configuration and key permissions.
- Separate application upload, reviewer read, deletion, and legal-hold privileges using least privilege.
- Use authenticated staff review with individual identities, MFA, and documented access authorization.
- Enable CloudTrail S3 data events for object reads, writes, and deletions; protect the audit destination separately.
- Keep names out of object keys; use opaque document identifiers.
- Do not put credentials, private download URLs, or signed documents in source control or ordinary application logs.

## Proposed submission flow
1. Authenticate the learner and bind an upload session to their Discord account and agreement version.
2. Record typed-name acknowledgment separately from signed-document review. Both are required.
3. Issue a short-lived, narrowly scoped upload authorization for a unique object. Treat signed URLs as bearer credentials; they are not inherently single-use.
4. Hold uploads in a restricted review area. Validate actual file type and size, scan for malware, record a checksum and exact object version, and prevent substitution after review.
5. An authorized reviewer checks signature presence, learner details, readability, and agreement version. Upload success is not signature verification.
6. Accept the document only after review. Enrollment remains pending until comprehension and other required records are complete and the owner approves.
7. Authorized reads go through the review application; do not expose permanent public URLs.

## Retention and disposal
- Approved signed agreements: five calendar years from enrollment approval, subject to applicable legal requirements.
- Pending signed documents: temporary review storage; pending-application closure deadlines still require a policy decision.
- Unsigned uploads: discard following review, subject to lawful preservation requirements.
- Denied, withdrawn, or closed-without-approval applications: delete signed documents after closure unless preservation is legally required.
- Other records, including metadata and audit logs: use separately approved schedules; do not assume the document schedule covers them.
- Record approval-based retention eligibility in PostgreSQL. Do not calculate it solely from upload age.
- A reviewed deletion worker must check record state, retention eligibility, and legal holds, then reconcile deletion results.
- Address object versions, replicas, temporary files, failed multipart uploads, backups, and recovery copies. A versioned delete marker alone is not evidence that all document versions were removed.
- S3 lifecycle rules may assist cleanup but must not replace application decisions about approval-based dates and legal holds.

## Legal holds and Object Lock
Do not apply a blanket five-year lock to incoming uploads. That could prevent disposal of unsigned or unapproved documents. Assess S3 Object Lock separately for approved records and legal preservation. Choose governance or compliance mode only after legal and operational review; do not assume locked records are freely deletable. Authorize, document, and review holds, and reassess deletion eligibility when holds end.

## Implementation gates
- Approve AWS account, region, resources, billing, and budget alerts.
- Review IAM, KMS policies, storage-provider terms, privacy notice, and legal requirements.
- Implement private upload and review endpoints; do not collect documents before they are ready.
- Add schema fields or tables for both typed acknowledgment and reviewed document evidence; the current generic signature fields do not establish this workflow.
- Test unauthorized access, URL expiration, replay and overwrite attempts, file validation, malware handling, version binding, retention, legal holds, and complete deletion.
- Verify encryption, public-access blocking, access audit events, and backup behavior in a controlled environment.
- Approve final agreement and storage policy separately before learner activation.

## Costs
Budget for S3 storage and requests, downloads where applicable, KMS key and request costs, CloudTrail data events and log storage, and upload/review application operation. No cost estimate or paid resource has been approved.

## Review sources
- KMS encryption: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- S3 audit events: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html
- Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- Pricing: https://aws.amazon.com/s3/pricing/
