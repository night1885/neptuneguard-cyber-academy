# EH-LINUX-05 — Relate a listener to its process

Draft practical, not published. Requires EH-LINUX-04, EH-LAB-04 and EH-NET-02. Use only the existing clean peer fixture on your authorized internal student-built lab. Proposed ID only.

## Outcomes
Distinguish a process, local listener, remote observation and application response. Explain why process visibility may be incomplete and why stopping an unknown process is not valid troubleshooting.

## Reuse the known fixture
Confirm the approved lab boundary and exact peer address before starting. On NG-Peer, start only the empty-directory Python HTTP fixture from EH-LAB-04, bound to 192.0.2.20:8000, in a visible foreground terminal. Do not run a service from personal files, enable another adapter or bypass a firewall.

If the port is already in use, do not terminate the owner. The existing process might not be your fixture. Preserve minimal observations and resolve the conflict through the actual support procedure. No system-service management or privilege escalation is introduced.

In a second terminal on the same peer and normal account inspect:
```sh
ss -ltnp 'sport = :8000'
```
-l selects listening sockets, -t TCP, -n numeric output and -p process information where visible. The filter limits the local-port view to 8000; it does not scan the network. Do not use ss -K, change namespaces or elevate privileges to obtain more data. Tool availability and exact supported versions need validation.

## Correlate with care
Compare the local address, port and any displayed process identity with the fixture you actually started. Process information can be restricted or absent. That is a visibility limitation, not proof that no process owns the socket. If a relevant PID is visible, use only a narrow ps selection of that observed PID as taught in EH-LINUX-04. Do not mistake a thread identifier, unrelated row or stale PID for the fixture.

The executable name may be Python rather than the name of a web product. A process name alone does not establish the full application, version, working directory or safety. Command-line and environment dumps are not required and may expose sensitive data. Keep evidence minimal.

A local listener demonstrates local socket state at observation time. It does not by itself establish reachability from NG-Learner, HTTP correctness, intended authorization or network isolation. Existing bounded client exercises can provide different evidence under their own scope, but no new requests or Nmap scans are authorized by this lesson.

## Compare before and after shutdown
Use Ctrl-C in the fixture's actual foreground terminal to stop it. Re-run the same filtered ss observation. Record the real result and final state. Do not kill a process simply because its name or port resembles the example.

If the process remains but the listener disappears, or a listener remains unexpectedly, describe the observation without inventing a unique cause. Timing, other processes and incomplete visibility can require clarification. Do not restart unknown daemons or repeatedly change service state to force the expected answer.

## Processes are not service units
The manually started fixture is a process, not automatically a registered system service. Service managers can supervise processes, restart them and track units, but this lesson does not inspect or modify their configuration. Starting or stopping a system unit would require different authority and recovery planning.

## Deliverables and limits
Provide the exact local observation, its relationship to the known fixture, any unavailable process fields, before/after differences and at least three unsupported conclusions. Do not claim remote reachability or service remediation from local listener output alone.

Use PROCESS-SERVICE-WORKSHEET.md and the approved private evidence workflow. No two-VM listener/process exercise was executed in this authoring batch. Supported-guest reproduction, privacy/accessibility review and assessor calibration remain pending.

Source: https://man7.org/linux/man-pages/man8/ss.8.html
