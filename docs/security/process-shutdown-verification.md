# Disposable process shutdown coverage — fixture correction pending

The entry-point integration at f9e9d1ecf72ed9e4a8078d29c952bf53931f880f passed both unit and PostgreSQL CI runs before this test batch. Both unit-test runs for 8c7e57b3692a733b9af457cea371961dab2a2a44 failed. Source inspection identified a generated-script escaping defect: a normal outer template interpreted newline escapes inside quoted child JavaScript. This patch uses String.raw to preserve them and adds a Node syntax check of the generated script. The correction's CI results are not yet established; it must not be represented as a successful process verification until they pass.

Coverage now consists of one generated-script syntax regression test and four process-level tests. Children run the actual academy application wrapper with fake Discord, database, and certification runtime objects. Their environment contains only NODE_ENV=test, not inherited bot credentials or database URLs. No login contacts Discord and no SQL executes. An interval keeps children alive until shutdown.

Two process tests send real SIGTERM or SIGINT only to disposable child PIDs and check cleanup markers and exit zero. Login rejection checks cleanup and exit one. Stuck work checks the controller deadline exits one without claiming successful pool and Discord closure. Parent watchdogs kill stalled fixture children. Process signal tests are skipped on Windows; CI uses Ubuntu. The existing certification CI glob includes all five tests.

Generated-script diagnostics include only bounded stderr from the credential-free fixture. These tests do not establish live bot, real database connection, actual certification runtime, transport-delivery, restart, or remote transaction-outcome behavior. Markers are synthetic and the stuck test uses a shortened test-only deadline.

This correction changes test code and documentation only. No production process is signaled and no runtime behavior, production migration, merge, publication, deployment, or enrollment activation is changed. Live shutdown/restart checks and persisted-outcome review remain required before launch.
