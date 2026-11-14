# Consolidated Bug Bounty integration candidate

This candidate registers exactly one Bug Bounty reading identity and adds its separate reader dispatch. It preserves the existing Ethical Hacking reader and does not alter legacy course data, environment flags, progress, grades, certificates, source lessons, staging or the verification bot.

The original authoring manifest remains pinned and historical; reader-source-lock.json identifies the new draft reader and advisory prerequisite map. The unchanged original lesson bodies are still served in full. No source-text certification or live-practical success is claimed by registration.

Shared catalog registration intentionally also exposes Bug Bounty to the existing course-request, owner-assignment and administrator-completion allowlists. Existing approval/confirmation and current-assignment checks must remain controlling. This does not assign or complete a course automatically. The source schema accepts a bounded general course key; no migration is added or applied.

Only the catalogue contract test's expected key list is extended. Existing assertions and tests are otherwise retained. The native test uses the installed SDK and actual dispatch/lifecycle/navigation modules. The new PostgreSQL test uses temporary tables in an explicitly restricted disposable CI database; existing migrated-schema tests are also required by the workflow.

The CI job is restricted to the content branch, matching paths and a commit message containing [bug-bounty-integration]. It uses Node 20/PostgreSQL 16 and Node 22/PostgreSQL 18, a locked npm installation without lifecycle scripts, empty production/bot connection variables and no deployment steps. Required tests must have zero failures and zero skips. The workflow retains failures as evidence rather than masking them.

Local baseline evidence: seven reader/content suites passed through the byte-exact native card converter, including every reachable view. The earlier duplicate Start/module control ID has been fixed. Native SDK/database tests are syntax-checked; their CI results remain pending at integration-commit time. The inactive reader, source lock and gated workflow were committed in b2b6ee814918313599955310ee278a985ee63ad6. This commit adds the shared wiring and tests; it is not a deployment.

This change is scoped to repository integration and disposable CI. PR creation, merge and deployment require their own exact-action confirmations and passing release checks. No payout or learner acceptance is a release gate. No live target, scanner, login or disclosure activity is included.
