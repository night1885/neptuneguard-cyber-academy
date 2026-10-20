# Consolidated course acceptance and release checkpoint

Status: automated acceptance preparation, not a production release. This batch makes no live data/configuration or provider changes, enables no live flags, and performs no live migrations/grants, assignments/completions, deletion, publication, merge, or deployment.

## Consolidated scope

The acceptance suite runs the actual certification runtime, restoration router, course/optional closure wrappers, readiness gates, owner controls, section ID verification, non-tracking renderer, lifecycle backend, and PostgreSQL migrations together. Discord is simulated without client login or channel publication. Pool provisioning and a trusted controllable clock are fixture adapters; readiness and lifecycle mutations are not successful stubs.

Every fixture requires an explicit loopback certification_test URL and the role-DDL opt-in, verifies actual database/login/search path, uses random schema/role names, and cleans up the owned runtime pool before dropping its schema/role. Fixture agreement and comprehension values are explicitly fictional, not production configuration.

## Acceptance matrix

- Owner student record to private assignment panel and explicit course selection.
- Read-only preview, cancellation, owner/server binding, and single-use confirmation/replay rejection.
- Separate active assignments before ID-confirmed student entry.
- Lessons, practice instructions, hints, and practice feedback without saved progress tables or new activity/audit events.
- Completion of one course invalidates its old session while another course remains accessible.
- Completion of all assigned courses preserves the shared enrollment/ID/audit history; no deletion or certificate is implied.
- Audit failures roll back assignment and completion; fresh confirmations retry safely.
- Suspension after preview blocks stale assignment confirmation; administrative completion does not reinstate enrollment.
- Account isolation, Verified-role withdrawal, wrong IDs, and expiration deny protected content.
- Missing migration blocks enabled startup; default-off works without the course migration.
- Optional closure and course controls coexist for pending enrollment without issuing IDs or assigning courses.

The PostgreSQL 16/18 matrix runs this as a separately named step, making combined-course failures easier to locate. The suite prints the computed curriculum content-gap report for release review. A skipped integration suite is not acceptance, and passing results are not claimed until the relevant commit runs.

## Release gates still open

- Confirm this combined suite and all regression checks pass on the exact release commit; investigate rather than weaken unexpected failures.
- Review curriculum gaps/safety and any additional lab authorization restrictions. The report is not independent pedagogical/safety approval.
- Implement reviewed retention selection/dry-run, dependency-safe deletion, audit expiry, scheduling/retries/failure handling, and required preservation behavior. All-complete alone is not final deletion permission.
- Verify active-store and provider/log/backup/recoverable-copy handling without promising universal erasure.
- Approve final agreement/privacy/check text, immutable publication/hash, manifest, and actual target runtime credentials/permissions.
- Separately approve migration/grant application, merge/deployment, feature enablement and any entry-message publication; perform target-environment/live Discord acceptance with a reviewed rollback plan.

After the automated course checkpoint passes, remaining engineering should focus on retention enforcement, not further interface expansion absent a demonstrated defect or requirement.
