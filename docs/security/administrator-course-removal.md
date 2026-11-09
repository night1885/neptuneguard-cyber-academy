# Administrator course removal: disabled implementation candidate

This batch adds a removal-aware service wrapping the existing course lifecycle, an immutable event migration candidate, and PostgreSQL 16/18 acceptance. It applies no migration or grants, removes no live learner, publishes no controls, and changes no startup configuration. Both enabled and courseRemovalEnabled must be true, and an explicit readiness provider is required. Pools remain caller-owned.

The designated owner is the currently supported administrator authority. Removal locks the shared enrollment before the exact course, requires prior approval and an open application, and records one assignment-bound original event plus one audit entry in a transaction. It does not mark the shared enrollment revoked or pretend removal is course completion. Retries return the original reference/time and 24-hour eligibility deadline. Eligibility is not deletion authorization. Commit/delivery or readiness failures can be ambiguous; inspect the same course before retrying.

The service denies removed-course authorization before and after the existing account/course validator, rejects reassignment/completion of a removed course, and leaves unrelated course grants intact. Its migration also blocks completion of a removed course at the database boundary and restricts parent course deletion while removal evidence remains. The stored course row is retained for identity and cleanup evidence.

## Integration limits and release gates

All course-access consumers must adopt the removal-aware service before any removal UI or mutation is enabled. The old lifecycle factory and direct SQL readers do not automatically gain its authorization checks. Existing dashboards/counts also need removal-aware presentation. Do not expose removeCourse independently and claim system-wide revocation. The review course-authorization facade currently whitelists the original lifecycle query; it needs reviewed removal-query and reader-privilege integration before using this service.

Runtime readiness must establish the exact schema/search path, expected database/login, limited privileges, server deadlines, and migration integrity. This wrapper is not itself a full database-profile verifier. Database tests use a disposable privileged fixture connection and do not establish production-role acceptance. Its mutation is restricted to the owner ID; broader administrators require a separately reviewed authority provider.

No course-end event is generated for suspension, enrollment revocation, a learner withdrawal request, or leaving Discord. Completion remains its recorded original completion event, not a removal. Certificate verification is not queried or erased.

Durable report/assignment bindings, consent/provisioning, content erasure, preservation review, cleanup receipts/recovery, removal-aware related-record dependency inventories, full runtime/UI integration, native Discord acceptance and release approval remain required. Migration 013 adds a new restricted parent dependency; existing retention executors must not bypass it. No deletion scheduler or executor is added by this batch.
