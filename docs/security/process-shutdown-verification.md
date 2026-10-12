# Disposable process shutdown coverage

The entry-point integration at f9e9d1ecf72ed9e4a8078d29c952bf53931f880f passed both unit and PostgreSQL CI runs before preparing this batch. This batch adds four process-level tests; its own CI results remain pending at preparation time.

Tests spawn the current Node executable with the actual academy application wrapper and injected fake Discord, database, and certification runtime objects. Child environments contain only NODE_ENV=test, not inherited bot credentials or database URLs. Fake login never contacts Discord. Fake database callbacks perform no SQL. An explicit interval keeps each child alive until shutdown.

Two tests deliver real SIGTERM or SIGINT only to the child PID and verify orderly cleanup markers and exit zero. A login-rejection test verifies cleanup and exit one. A stuck-work test verifies the controller's deadline exits one without claiming the shared pool and Discord were closed. Parent-side watchdogs kill disposable children that exceed the test deadline. Tests are skipped on Windows; CI uses Ubuntu. The existing certification test glob includes the file.

These tests exercise actual process signals, process exit, and application-controller wiring. They are not live bot, PostgreSQL connection, certification runtime, transport-delivery, restart, or remote transaction-outcome tests. Cleanup marker output is synthetic. The stuck fixture uses a shortened test-only deadline, not a change to the default runtime deadline.

No production process is signaled, no secrets are supplied, and no runtime behavior is modified by this commit. Live shutdown/restart checks and persisted-outcome review remain required before launch. No migration, merge, publication, deployment, or enrollment activation is included.
