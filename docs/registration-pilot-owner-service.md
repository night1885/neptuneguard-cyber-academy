# Pilot owner-registration service checkpoint

Base: 15b2acc14db8c4f3bfe24558c393b86f9b579a47 on feature/registration-pilot.

Adds a shared internal pilot-context validator and applies the real committed pilot policy inside the owner registration service before database checkout. The service captures that policy at construction, checks the snapshotted owner on each request, and rejects unlisted targets before connect(). Existing registration SQL, duplicate handling and audit transaction behavior are unchanged.

This is not runtime wiring or an activatable pilot. The configuration loader/startup does not yet construct this pilot service context. Do not change production flags. No invited-submission service changes, learner publication, schema changes, role grants, retention changes or production records are included.

Fresh focused result: Node v20.20.1; 32 tests passed, zero failed, zero skipped. Tests use the actual committed createRegistrationPilotPolicy/createRegistrationPilotRouter and actual patched registration service, with an in-memory fake database connection. Router-to-service tests use a trusted callback shim, not the real registration UI or Discord SDK. Fake rollback behavior is not proof of PostgreSQL locking, privileges or rollback semantics. SQL absence checks and a fixture null student ID do not establish actual production schema defaults or ID behavior.

Pinned dependency fingerprints verified locally: core 9cd98e909ba4c36d9b578e87dbc226035d6e85bb; original owner service 5b23fbc0f019cafad0a876bccb3d085804e43406. The earlier core 160-test result remains separate; it is not rerun or summed into this 32-test result.

Remaining work: invited-submission target enforcement; real runtime/read-only-view composition; initial-console authorization suppression; pilot UI/entry instructions; regression fixture updates; assembled parser/guard/native-handler/SDK testing; disposable PostgreSQL acceptance; mode-aware preflight; and the separate invitation/audit-retention dependency. Commit, merge and activation are separate approvals. No repository CI or production acceptance is claimed.
