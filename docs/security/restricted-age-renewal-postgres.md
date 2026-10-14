# Restricted renewal — disposable PostgreSQL and role coverage

Authenticated routing at 884585a5da57f15a3b0bb9baf1a549eb1ae3ed13 passed unit and PostgreSQL 16/18 CI, but the database jobs had not exercised renewal. This new test patch requires its own exact-head results.

The new database suite uses a generated schema only in an explicitly configured loopback certification_test database, verifies the database/search path, applies reviewed source migrations in that disposable schema, and cleans up that schema. The original age-unaware factories seed synthetic legacy approval records only; they are not production renewal paths.

For suspended and revoked fixtures, real tests check blocked reinstatement before renewal, concurrent renewal producing one confirmation/audit event, preserved restricted status, ID, approval and acknowledgment fields, unchanged lab-request rows, idempotent timestamp behavior, and rollback of all renewal changes after an injected audit failure.

The existing explicit-opt-in restricted-role suite now exercises renewal under its non-owner login after the fixture admin removes synthetic eligibility evidence. Renewal leaves course authorization unavailable until a separate owner reinstatement. The lifecycle now expects six audit events: submission, approval, suspension, one renewal, reinstatement, and revocation. Existing role grants and privilege-denial checks are unchanged. Role creation/deletion remains limited to the dedicated disposable CI cluster; never run it on Render or a shared production cluster.

Both PostgreSQL matrix jobs explicitly include the new suite. Ordinary unit CI skips its database case without the test URL; a skip is not a database pass. These tests do not prove full production least privilege, tamper-proof eligibility, independent age verification, network-partition recovery, or live Discord behavior. Exact-head CI results are pending.

Owner renewal visibility, renewal-specific expiry/deadline checks, documentation/policy reconciliation, retention/legal decisions, and controlled release testing remain outstanding. This patch changes tests/workflow/docs only: no production migration, access restoration, configuration activation, publication, merge, or deployment is performed or authorized.
