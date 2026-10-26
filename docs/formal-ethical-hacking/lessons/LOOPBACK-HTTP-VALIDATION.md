# Owned loopback HTTP — selected local execution

Draft author record after 9f354cf2ce5a0cc5a5e7938059c3d97ffa0a528f. Shared application_lab.py and application_repaired.py copies matched inspected Git blobs 828353b64c1340b7311f301d25f7b1303ad86a83 and a0bb23e66156599fe2c4f27480577b884827e8d0. No existing application/helper was changed for this transport check.

Actual local HTTP over TCP 127.0.0.1 was executed on Python 3.12.8 using OS-assigned ports, not mocked networking. The final 12-method test_loopback suite passed twice with status 0. A separate direct CLI run returned status 0 with four client attempts/four application calls and true owner_read, head_metadata, denied_body, method_guard, listener_closed, worker_joined and database_closed flags. No raw invented note body was printed in the CLI summary.

The suite checks owned binding, actual GET/HEAD and response length, selected denied/absent bodies, method/Allow, ignored invented header claims, out-of-contract path and budget rejection before connection, managed lifecycle state, a simulated factory-startup failure and both direct CLI/report and extra-argument contracts. This is selected coverage, not all HTTP semantics, fault injection or a zero-race proof.

Application/database creation, use and closure run in the worker thread; check_same_thread is not disabled. Accepted-socket and client I/O timeouts are present, but no comprehensive hostile-client/resource containment or interrupted-startup/forced-shutdown evaluation is claimed. Normal successful runs confirmed the owned socket was closed, the worker joined and the in-memory database closed; this is not a general host port scan or forensic cleanup claim.

The server uses the repaired read policy and stamps a fixed invented actor. Therefore this is not authentication, multiuser session security, TLS, protected production storage or a real-login test. Loopback is not an access-control boundary against other local processes. No external target, domain, real credentials, public bind, Render service, PostgreSQL migration, academy runtime, learner record, supported-student-VM route, full repository suite or GitHub CI was involved.

Canonical catalogue/prerequisites, existing foundation-network/request budgets, publication, Community Learning and learner state remain unchanged. The opt-in local listener activity needs its own approved student execution brief and supported setup; committing the source does not supply that permission.
