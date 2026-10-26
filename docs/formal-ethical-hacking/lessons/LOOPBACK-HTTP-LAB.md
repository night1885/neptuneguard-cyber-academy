# Repaired application over owned loopback HTTP

Draft K04/K05/K14 supporting practical after [the in-process ownership lesson](APPLICATION-OWNERSHIP-LAB.md). Unlike that lesson, this helper opens an actual short-lived local TCP listener and sends fixed HTTP requests. It is a separate opt-in scope, not permission for new requests to NG-Peer, the academy or another service. No canonical registration, deployment or authentication implementation is introduced.

## Setup and explicit effects
Use application_lab.py, application_repaired.py, loopback_lab.py and test_loopback.py from fixtures/application-ownership together in a fresh disposable approved ordinary-user guest workspace. Python 3 with sqlite3/wsgiref and permission for this owned local listener/client must already exist through the approved setup/material route. Author checks used Python 3.12.8 locally only. Missing permission, tools, supported setup, support/recovery or private evidence handling means BLOCKED; do not install, elevate, disable protection or reconnect as a workaround.

The unchanged reviewed helper binds only 127.0.0.1 and requests port 0 so the OS selects an available port. It accepts no command-line host, port, path, credentials or other arguments. Its client uses the resulting owned listener and fixed paths/methods only. No public interface, port forwarding, externally supplied URL, proxy, redirect-following, scanner or persistent-server mode is provided. Do not edit these constraints or manually browse/scan for the ephemeral port.

Loopback binding is not authentication, complete host isolation or protection from other local processes. The server stamps the same invented ALICE actor onto every request; that is a test assumption, never an acceptable real login mechanism. No real secret or private learner data belongs in this fixture. The repaired read policy is selected; the deliberately defective starter is not served. The original module is imported only for shared fixture code/records.

## Thread and transport model
The application, in-memory database and reference server are created inside one worker thread. Application calls and database closure occur in that thread, preserving SQLite's default same-thread connection rule rather than disabling it. The client runs separately and makes sequential HTTP exchanges, not concurrent-writer tests. A small server subclass assigns a fixed server name without a hostname lookup in its bind setup; accepted-socket/client I/O use selected timeouts. These are reference-server teaching choices, not a production availability/HTTP-hardening design.

The client permits GET/HEAD/POST only to /notes/note-a, /notes/note-b and /notes/missing, with at most six client attempts per session. Only two fixed invented header values are available for the header-claim test. This is a test-owned client guard, not enforcement against every other local process. Quiet request logging and count summaries are not an implemented audit/evidence service.

## Predict and run the managed demonstration
Read all four files first. In the disposable fixture directory:

```sh
python3 -B loopback_lab.py
result=$?
printf 'loopback demo=%s\n' "$result"
```

The demo starts its own listener, runs four fixed client attempts, then shuts the server down and closes its database. It is not a command to leave a server running. Expected observations: owner GET returns the invented own note; HEAD has no body and the corresponding representation length; the nonowner record has 404 with no note; the unsupported POST has 405/Allow. The report should show synthetic true, owned-loopback-http, four client_attempts, four handled calls and seven true checks, with exit 0. Record your actual result or blocker instead of copying that expectation. Capture status immediately; the final printf has its own status and is not a CI gate. -B is not a sandbox.

Client attempt count and application handled count measure different sides; equality for this fixed run is selected corroboration, not general traffic attribution. A failed startup or unverifiable cleanup must not be reported as a completed run. Blocking I/O timeouts do not prove overall process/resource containment, and an unresponsive handler or local interference can still require the actual support/recovery process. No fallback bind or extra probe is authorised.

## Run the named transport suite

```sh
python3 -B -m unittest -v test_loopback
result=$?
printf 'loopback tests=%s\n' "$result"
```

The correct reviewed helper should pass 12 methods (ten transport/lifecycle/guard methods plus two CLI methods). Methods contain multiple conditions; this is not twelve total requests or exhaustive HTTP coverage. Separate fixtures use separate ephemeral listeners/databases. Some guarded tests start a listener but make no client connection. The CLI report test runs the managed four-attempt demo; the extra-argument test must reject before starting that demo.

One method simulates startup failure by making the fixture factory fail; it does not demonstrate every network/resource failure. The budget test changes the test-owned counter and verifies rejection before connection, rather than sending unnecessary requests. Cleanup checks inspect the managed socket's closed descriptor, worker termination and database-closure record. They do not reconnect to a released port, which might be reused, or claim every host listener is absent.

## Instructor questions and deliverable
Explain what is newly verified compared with in-process WSGI calls and what remains an assumption. Why does fixed ALICE context not test a login? Why does a 404 need a body check? Why is HEAD length not transferred content? Why is a successful owned bind not evidence about a physical LAN? Why is a joined worker not proof of cleanup after a crash or forced termination?

Submit scope/version, predictions, genuine demo/test results or blockers, client/server-count interpretation, cleanup evidence and limitations. Do not submit real account/host details or invent a curl transcript. No automatic progression, private-evidence workflow, grade, award or production grant follows. See [validation](LOOPBACK-HTTP-VALIDATION.md). TLS, browser/proxy behaviour, real authentication, supported student hardware, malicious local clients, crash durability and full deployment/security testing remain outside this selected check.

Sources: https://docs.python.org/3/library/wsgiref.html and https://docs.python.org/3/library/http.client.html and https://docs.python.org/3/library/sqlite3.html .
