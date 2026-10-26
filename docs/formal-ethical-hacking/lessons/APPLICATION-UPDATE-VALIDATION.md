# Application updates — bounded local validation

Draft author record following 4aaef347d8eb9a0a41c038087bc2732153e6034e. Two base source copies matched inspected Git blob identifiers 828353b64c1340b7311f301d25f7b1303ad86a83 and a0bb23e66156599fe2c4f27480577b884827e8d0. Python 3.12.8 ran selected tests in temporary author directories with in-process WSGI/byte streams and per-fixture in-memory SQLite only.

| Suite | Methods | Assertion failures | Test errors | Exit |
|---|---|---|---|---|
| Overbroad-field starter | 27 | 3 | 0 | 1 |
| Text-only reference | 27 | 0 | 0 | 0 |
| Exact CLI contracts | 2 | 0 | 0 | 0 |
| Reference plus CLI | 29 | 0 | 0 | 0 |

The reference inherits the same 27 requirements using a different factory; this is reused, not independent duplicate coverage. Starter symptoms concern owner/course/state changes. Other selected checks cover legitimate revision increments, denied identities/operations, stored state, malformed body/encoding, version bounds, stale sequential updates, body limit, literal text versus properties, selected HEAD/Allow behaviour, dependency errors and schema-field restrictions.

The commit-failure test wraps the fixture connection: after the attempted write it explicitly rolls back and raises a synthetic sqlite3.OperationalError. The observed generic 503, unchanged row/revision and absence of the injected error text verify this selected simulation, not a real OS/disk failure or every transaction/response failure mode. Responses are sent after the transaction context exits. Seed and revision-schema setup are committed before exercise writes.

CLI tests execute both exact script names from unrelated temporary working directories. They assert report presence and selected stored-state observations, starter exit 1/final revision 2, reference exit 0/final revision 1, and both extra-argument rejections with empty stdout/status 2. The helpers themselves start no server or external process; test orchestration starts local Python only.

Not validated: actual authentication, network/HTTP framing or browser, real concurrent writers/locks, production database/migration, crash durability, full hostile-input handling, supported guest/media/transfer, accessibility execution, formal assessment calibration, full repository suite or GitHub CI. The synthetic actor remains an assumption, not a credential. Existing canonical count/prerequisites, network scopes, runtime/publication, Community Learning and learner state remain unchanged.
