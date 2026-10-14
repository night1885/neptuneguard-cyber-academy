# Contextual access PostgreSQL verification

New integration coverage uses an explicitly configured loopback-only certification_test database and a random isolated schema. It applies migrations 001–005 inside that schema, seeds synthetic acknowledgments using the age-aware submission/approval APIs, then drives mocked Discord interactions through the real router and transactional access service.

Coverage includes contextual record/form/token/navigation, pending denial without an issued student ID, cancellation without writes, simultaneous same-token confirmation/replay, stale independent confirmations, suspension and lab-request revocation, revocation, reinstatement preserving permanent IDs and original approval/acknowledgment/eligibility evidence without restoring labs, missing-eligibility rejection, and enrollment/lab/audit rollback after an injected audit failure. Form issuance snapshots prove no enrollment/lab/audit changes before confirmation.

The PostgreSQL 16/18 workflow explicitly includes the new file; the unit wildcard skips the database case without the test URL. Exact-head CI is pending. This is real database execution with synthetic Discord transport, not live Discord, provider session termination, production migrations, role/TLS verification, or runtime shutdown verification. The existing external-write and release gates remain open.
