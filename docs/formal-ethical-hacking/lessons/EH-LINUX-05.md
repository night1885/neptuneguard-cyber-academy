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


## Extended teaching: keep four evidence questions separate

The original exercise reuses the authorized NG-Peer fixture bound to 192.0.2.20:8000. It does not introduce a loopback replacement, another address, an additional client request or a network scan. Keep the existing lab boundary, empty fixture directory and foreground terminal unchanged.

Ask four separate questions: which process did I start; which local TCP listener is visible; can an authorized remote client reach the endpoint; and what application response does that client observe? This lesson supplies a narrow local observation for the second question and may supply process information relevant to the first. It does not, by itself, answer the two client-side questions.

An address-and-port match is useful correlation, not a complete identity proof. Relate it to the fixture you actually started, observation time and any visible process field. A Python executable name does not establish a particular web product, version, content root or authorization policy. Keep those claims out of the evidence unless another authorized observation actually supports them.

## Worked comparison: visible and unavailable process fields

In one hypothetical observation, the filtered listener row includes a process identity consistent with your fixture. You can record that local correlation and, if appropriate under the original instructions, use the already taught narrow process selection. Do not describe the row as proof that NG-Learner can connect.

In another hypothetical observation, the listener row is present but process information is unavailable. The defensible statement is that the filtered local socket observation was available while its process attribution was not. It is not “the socket has no owner.” Do not elevate privileges, change namespaces or collect unrelated command lines to force the missing field to appear.

A third outcome is no matching row. Record that result and its time. It may be consistent with the fixture having stopped or with an observation problem, but the row's absence alone does not identify a unique cause. Before any further action, compare the result with the actual foreground terminal and the original scope. Do not start another service to manufacture the expected output.

## Exercise: compare before and after the permitted shutdown

Use only the original filtered ss observation and the original Ctrl-C action in the fixture's own foreground terminal. In your worksheet, create separate before and after entries. State whether the matching local listener appeared, whether process information was visible and what the fixture terminal showed. Do not fill in an expected row as an actual result.

Explained answer: disappearance of the matching listener after the known fixture is stopped supports a time-bounded relationship between that fixture and the observed local listener. It does not prove permanent port availability, remote reachability or correct application authorization. An unexpected remaining listener requires uncertainty and clarification; it does not authorize termination of whichever process now owns the port.

If the port was already occupied before you started, the practical has a conflict rather than a successful fixture launch. Preserve minimal observations and follow the support route. A familiar port number does not establish that the owner is yours to stop.

## Troubleshooting the conclusion

Do not turn a missing process field into a privilege-escalation task. Do not turn a local listener observation into a scan. Do not turn an unexpected shutdown result into system-service management. Those responses change the authority and recovery requirements instead of answering the original narrow question.

For each conclusion, name its evidence level: process context, local socket state, remote transport observation or application response. Then list at least three unsupported claims, such as remote reachability, service version and enforcement of resource ownership. Keeping those limits explicit makes the report more useful than a broad “service is working” statement.

## Bounded human-led AI critique

Use only an invented listener row and a fictional before/after table for AI critique. Ask whether a conclusion exceeds the observations. Do not submit full host inventories or sensitive command-line data. Reject suggestions to scan, elevate privileges or stop unknown processes. The assistant can review wording; only the human learner interprets actual evidence and follows the approved practical scope.
