# Current age evidence for fresh owner approval — branch integration

The transactional writer at 73639ff089396febea421a9d4be54b85b8a78e24 passed unit and PostgreSQL 16/18 CI before this patch. This new approval patch requires its own exact-head verification.

The actual certification router now uses createAgeCheckedCertificationService for fresh pending enrollment approval. The service checks owner identity before checkout, locks the enrollment row, requires complete typed acknowledgment and current self-reported age evidence before issuing/preserving the permanent ID, and writes approval plus audit in the same transaction. The audit records the trusted policy version and self_report method, not exact age. Direct owner approval buttons cannot bypass the backend evidence check.

The private owner review SELECT includes the minimal evidence fields. It labels self-reported 16+ eligibility, shows policy and confirmation time, and disables confirmation when acknowledgment or eligibility is incomplete. This is not independent age verification. No message is published by changing source.

Existing approved records remain idempotent and ordinary existing course authorization is unchanged; this patch does not retroactively revoke approved access or invent evidence. Suspension/revocation/reinstatement still use the existing access-management service. Reinstatement eligibility enforcement and handling of existing approved/suspended/revoked records remain separate work before activation. The original low-level approval factory remains for old fixtures and must not be used as a production bypass of the routed service.

Unit tests cover missing/false/wrong-policy/malformed evidence, successful approval, owner authorization, audit rollback, idempotent existing approval, private review-button state, and routed direct-button rejection. Disposable PostgreSQL coverage tests rejection of legacy pending requests and concurrent approval of the new writer's complete record with one ID and approval audit. CI explicitly includes the suite in both database jobs. These are synthetic fixtures, not production permissions or live transport evidence. Results for this patch are pending.

Migration-005 readiness and restricted-role coverage, reinstatement safeguards, document reconciliation, retention/legal decisions, and full controlled live testing remain outstanding. No production migration, configuration change, publication, merge, deployment, or activation is performed or authorized.
