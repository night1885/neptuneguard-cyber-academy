# Service discovery, HTTP observation and tool-result interpretation

Supporting consolidated-course draft, not a canonical ID or a published practical. This is a new, separate managed native-tool exercise. It does not broaden the existing LOOPBACK-HTTP-LAB helper's scope, request budget or prohibition on manually scanning its port. Use only the new verify_native.py process described here; do not point a scanner at another fixture, NG-Peer, the academy, a home network or a public target.

## Purpose and prerequisites
Distinguish a TCP observation, an HTTP response, a client process result and a verified security finding. Before running, have the reviewed local Python/tool route, permission for the owned loopback listener/client, ordinary-user context, support/recovery and appropriate private output handling. Missing tools are a limitation to record, not permission to install, elevate or change protections on a managed student computer.

The authoring CI uses an ephemeral Ubuntu runner to install curl/Nmap from its configured distribution repositories. That is explicit CI provisioning, not a validated student installer or a change to production. Its exact installed versions are recorded. Other student OS/architecture routes still require reproduction.

## Understand the layers
A listener can accept TCP without being the expected application. An open Nmap result means a service accepted connections from that observation point; it does not prove a vulnerability. A port number or banner is not authenticated product identity. A filtered result is an observation limitation under the scan conditions, not proof of a particular firewall policy.

An HTTP response supplies status, headers and selected content. A 404 can still be a completed application exchange. curl normally does not treat every HTTP error status as a failed process; the separate fail-with-body case intentionally changes that behaviour. Record the immediate process exit and HTTP status separately. The success of a later print command is not the request's exit code.

## Predict and run
Read verify_native.py and test_native.py in fixtures/native-observation. The helper accepts only --require-all-tools, never a host, port, URL, request path or credentials. It starts its own 127.0.0.1 listener on an OS-assigned port, sends four fixed curl cases, optionally scans that one known port with Nmap, closes the listener, then performs its own harmless-child process observation. It does not leave a server running for arbitrary browsing.

From a fresh disposable approved copy of that directory:

    python3 -B -m unittest -v test_native
    python3 -B verify_native.py

Record actual output and immediate exit status. Default mode reports Nmap unavailable honestly. It does not claim a scan passed. The CI command uses --require-all-tools so missing Nmap, curl or the Linux demonstration fails rather than silently skipping a required result. Neither mode authorises arbitrary commands or installation on a student's machine.

## Trace the selected commands
curl is invoked directly without a shell, with configuration disabled, proxy bypass, HTTP-only protocol, connection/overall timeouts and no redirect-following. GET / should return the fixed harmless body. HEAD / is separately tested to have no transmitted body and the corresponding representation length. curl's HEAD presentation contains headers; do not label those bytes an HTTP response body.

GET /missing returns 404 with process exit zero in the normal case. The fail-with-body variant retains the 404 body and reports a nonzero curl result. Do not confuse transport errors, HTTP errors and business-authorisation decisions.

Nmap, when installed, receives only -sT -Pn -n, selected retry/time bounds, one known port and 127.0.0.1. No service/version scripts, OS detection, subnet range or external hostname is provided. The XML parser checks target, connect/TCP scan, selected port and state. Its synthetic parser tests are not proof that Nmap executed; the report's executed field and actual XML identify that evidence separately.

## Independent exercise and handoff
Without changing target scope, predict which result would change if the fixed representation changed while TCP availability remained the same. Explain why a scanner cannot infer the portal's ownership policy from an open result. Do not alter the helper to discover unrelated listeners. Write a proposed separate two-VM observation plan with ownership, topology, expected controls and cleanup, but execute nothing beyond this brief.

Submit tool versions, command/target scope, actual HTTP/process observations, optional actual Nmap result or missing-tool limitation, cleanup evidence and one justified next assessment question. This is a narrow native observation practical, not comprehensive enumeration, production HTTP hardening, TLS/browser testing, physical-network isolation or completed professional competence.

Sources: https://curl.se/docs/manpage.html ; https://nmap.org/book/man-port-scanning-basics.html ; https://nmap.org/book/man-port-scanning-techniques.html .
