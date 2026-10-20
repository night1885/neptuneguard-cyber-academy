# Legacy startup initialization hold

Repository preparation only: no deployment, production query, configuration/permission change, migration, deletion, or table drop is performed.

Inspection of index.js and certification-academy-application.js showed that the existing interaction hold did not cover the ClientReady callback: it still invoked initializeDatabase, whose legacy implementation creates learner_profiles, learner_module_progress, and learner_badges. Table creation is not itself evidence that learner rows were collected, and this review does not establish what happened in production.

The application factory now leaves that legacy initializer uncalled. It retains the existing callback configuration contract for compatibility, but provides no flag to reactivate it. The index.js legacy functions remain in source and are not declared removed or erased. Future removal/replacement and runtime restoration require separate review. Existing records/tables are not dropped, migrated, or read by this change.

Certification runtime attachment, course gating, the interaction retention hold, tracked login/interaction work, signal handling, draining, detachment, pool closure, and client destruction remain in place. Certification runtime schema readiness and lifecycle checks remain separate; this patch does not disable or bypass them. The connection log reports Discord connectivity and the legacy initialization pause, not complete academy readiness or enrollment activation.

Regression tests check zero initializer calls at ready, an initializer that would throw remaining uncalled, shutdown before queued ready work, continued blocking of legacy commands/buttons, and the existing resource-cleanup/login-failure behavior. These use mocked clients and callbacks; no live Discord session or database is contacted by this test file. The existing certification unit glob includes it without a workflow change. Passing CI is not production acceptance.

This boundary change does not lift the learner interaction hold, authorize progress/XP/badge tracking, publish an entry message, enable retention enforcement, approve final learner documents, merge, or deploy.
