# Render deployment preflight — inspected, not deployed

## Candidate and verification status

Deployment-handoff commit 740b018749621a04238992678db7e7682a1c6521 passed both unit and PostgreSQL CI runs before this target inspection. This patch adds PostgreSQL 18 to disposable CI alongside 16 and requires new exact-head checks. The major-version matrix does not pin the provider's exact minor build. No additional product feature or production migration is introduced.

## Render inventory inspected

Workspace: My Workspace (tea-db1p6jp42hec73dnfs4g). Academy worker: neptuneguard-cyber-academy (srv-db1ula3tqb8s73bcqdc0), Oregon, one instance, repository night1885/neptuneguard-cyber-academy, branch main. Automatic deploy is off; build/start settings are npm install and npm start. No academy staging/preview service appeared in the inspected list. The separate discord-code-verification-bot service was not changed.

The current live deploy reported by Render is dep-db66idvlk1mc73c423c0, a manual deploy of 5bc2f33bf80dba3ea4fee800e77c594c4252f9e3, titled Add eight-module SOC Analyst and Incident Response course. Record it as the rollback candidate. A live deploy status is not a completed functional smoke test or a tested rollback. No deployment was triggered.

## Database inspection

Candidate database resource: neptuneguard-cyber-academy-db (dpg-db1touu7bikc73bl9vhg-a), available in Oregon. The inventory shows an external IPv4 allowlist of 0.0.0.0/0. This needs target-environment review; no allowlist change was made. The worker's DATABASE_URL binding was not retrieved and association is not proven by the resource name alone.

An explicitly approved read-only metadata query returned database_name=neptuneguard_cyber_academy_db and server_version=18.6 (Debian 18.6-1.pgdg12+2). The inspection connection's role was neptuneguard_cyber_academy_db_user, with rolsuper=false, and pg_stat_ssl reported TLS for this inspection session. These facts do not identify the running worker's role, validate its permissions/TLS, or prove certificate-verification policy. The inventory had reported databaseUser=neptune_db; do not assume those two reported roles are interchangeable.

learner_profiles, learner_module_progress, and learner_badges resolved through to_regclass. certification_agreements, certification_enrollments, certification_lab_requests, and certification_audit_events did not resolve on the inspection connection's search path. This does not prove no such tables exist in another schema. No learner or audit contents were read, and no tables, roles, grants, or settings were changed.

## Next gates

- Verify unit CI and both PostgreSQL matrix versions for the exact candidate commit.
- Complete the branch/raw-report review and resolve the worker's actual database binding, privileges, TLS, environment flags, auto-deploy behavior, and rollback configuration without exposing secret values.
- Explicitly choose isolated staging or the existing production worker with certification disabled; no choice has been authorized by the metadata inspections.
- Approve a flag/configuration update separately if needed, retaining both certification flags false for an initial disabled rollout. Review possible service restart/deployment side effects of configuration changes before performing them.
- Approve merge and deployment separately for the resolved service and exact candidate/configuration.
- Review schema/migration ownership and restricted credentials before any certification activation. The unresolved certification tables do not authorize automatically applying migrations.

The disposable role-DDL suite runs only on independent GitHub Actions PostgreSQL containers. It must never run against this Render database. No production migration, environment update, network-rule change, resource creation, merge, deployment, dashboard publication, or enrollment activation is included in this patch.
