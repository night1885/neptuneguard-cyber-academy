# Migration-005 readiness and restricted-role integration

Approval integration at 377bbf85290d6d54420597e8d178d2dd3f886b8b passed the unit and PostgreSQL 16/18 jobs before this patch. New exact-head results are pending.

Enabled certification readiness now requires all three minimal age-evidence columns, reporting migrations 001–005 when required columns are missing. No migration is applied automatically. Disabled certification still does not create its pool or run readiness. These checks inspect required column names and existing safeguard-trigger enabled states, not a full type/default/constraint/function fingerprint, server-generated timestamp provenance, or role audit.

A new unit suite removes each age column from mocked catalogs and verifies failure. The real PostgreSQL readiness suite now verifies failure after migrations 001–004 and success after 005, while retaining missing-trigger, agreement-hash, missing-column, and missing-table cases.

The existing opt-in restricted-role fixture now applies 005 and uses the current age-aware writer and approval service. It checks persisted current evidence through the restricted login while retaining the existing FOR SHARE privilege demonstration, agreement mutation rejection, audit/DDL denial checks, five-event lifecycle count, and permanent-ID preservation. Existing fixture grants are unchanged. This is evidence for that synthetic role and schema, not production least-privilege certification or tamper-proof eligibility records. Enrollment UPDATE remains a real write privilege.

The role suite can create/drop cluster-wide roles only in its dedicated disposable CI cluster with explicit role-DDL opt-in. Never run it against a shared production cluster or Render database. URL/name guards alone do not establish isolation.

Reinstatement in this fixture still calls the existing age-unaware access-management service; this patch does not verify or implement age-evidence enforcement on reinstatement or change existing approved access. Those remain separate decisions/integration before activation. Document reconciliation, retention/legal decisions, full raw-report/security review, actual target TLS/grants, and controlled live testing also remain outstanding.

This patch changes branch readiness code and tests only. No production migration, role provisioning, configuration activation, publication, merge, or deployment is performed or authorized.
