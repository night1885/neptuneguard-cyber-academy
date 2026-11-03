# Networking foundations — bounded troubleshooting capstone

Draft assessment specification; not calibrated or published. Requires EH-NET-01 through EH-NET-03 and the existing home-lab exercises. Students provide their own two clean VMs. No academy-hosted target is provisioned. Community Learning is unchanged. This brief is not itself actual operational authorization or a supported-platform validation record.

## Objective and finish line
Your job is to explain whether the authorized learner can receive the expected HTTP response from the clean peer, and document a controlled service interruption. Complete the existing baseline -> stopped -> recovered observation sequence, stop the fixture, record the actual final state and produce the existing short report.

This combines the foundations already taught; it is not another tool-installation exercise, a vulnerability hunt or a full professional assessment. Predictions, genuine observations, interpretations and unresolved questions must remain distinguishable. A blocker report is a legitimate account of incomplete work, not proof that the practical objective was achieved.

## 1. Scenario and unchanged scope
| Item | Existing boundary |
|---|---|
| Learner | NG-Learner, 192.0.2.10 |
| Peer | NG-Peer, 192.0.2.20 |
| Topology | The reviewed student-owned NG-FOUNDATION two-VM internal network |
| Client endpoint | HTTP on TCP port 8000 of NG-Peer |
| Client actions | Only EH-LAB-04 GET / and HEAD / requests, within the four-request planned maximum below |
| Local inspection | Existing configuration and listener checks on your own two reviewed guests |
| Exclusions | New scans, DNS service/query work, packet capture, routing changes, internet connections, exploitation and credential testing |

Do not substitute another host, path, port or method. A reachable address, a course card or the ability to launch a tool does not replace the actual current approved brief. A DNS answer would not expand scope, and the literal-address requests do not need a target-hostname lookup.

Use the exact current bounded curl forms in EH-LAB-04, including its first-option -q, proxy bypass and connection/transfer time limits. Do not add redirect-following, retry options, extra URLs, browser navigation or an uncontrolled loop. Existing tool instructions are references, not a claim that the tools were run or the guest route was validated.

## 2. Establish readiness before consuming requests
1. Confirm actual current authorization, allowed time window, support/incident route and the approved evidence/recovery procedure. If mandatory details are missing, stop at planning; do not invent approval or contacts.
2. Identify both intended guests and the learner/peer terminal roles. Use the normal guest account and the reviewed prerequisite setup. An uncertain host/root/guest context is a blocker. Do not move these operations to the physical host or use elevated privileges to conceal a setup error.
3. Review both guests' adapters, exercise addresses and displayed IPv4/IPv6 routes using the existing lesson checks. Temporary addressing may need re-establishment only under the already reviewed setup procedure; this capstone does not authorize a new route or configuration workaround.
4. Confirm the recorded tool availability and versions through the approved provisioning route. Missing Python, curl or inspection tools require a blocker/recovery decision, not ad hoc installation or guest internet access.
5. Identify the exact disposable fixture and the applicable reset/evidence constraints before starting it. Do not serve a personal-files directory, shared folder, unrelated document or secret.

These are local preparation/inspection decisions. Do not add active probes or additional HTTP checks as an informal pre-flight. A diagram, a local route decision or a listener row does not alone prove isolation or remote reachability. Resolve discrepancies before making any practical request.

## 3. Keep the existing four-request ledger
The labels below are planning references inside the existing evidence index, not four extra assignments. Link each attempted request to its genuine E-label evidence in the EH-LAB-05 report format.

| Planned request | Source | Method/path and endpoint | Intended state |
|---|---|---|---|
| R1 | NG-Learner | GET / at 192.0.2.20:8000 | Original fixture running |
| R2 | NG-Learner | HEAD / at 192.0.2.20:8000 | Same original fixture running |
| R3 | NG-Learner | GET / at 192.0.2.20:8000 | After controlled stop and local listener check |
| R4 | NG-Learner | GET / at 192.0.2.20:8000 | After restarting only that same fixture and rechecking the listener |

This is four explicit client-request attempts at most during the planned run, not a requirement to force four successes. A failed or timed-out attempt still belongs in the ledger; do not erase it from the budget because no useful response arrived. The request count is not a packet count.

Local status prints and permitted configuration/listener inspections do not create an extra HTTP allowance. Record an unattempted request as unattempted. If setup fails or an unexpected state prevents safe continuation, stop and submit a blocker report. Further attempts need an explicit bounded recovery plan through the actual approved process; this lesson does not silently grant them.

## 4. Perform the existing practical sequence
### Baseline — requests R1 and R2
Prepare the exact clean empty-directory fixture from EH-LAB-04 on NG-Peer. Run only its specified server, bound to the peer's lab address, and keep its actual terminal visible. Use a separate peer terminal for local listener inspection and the learner terminal for requests.

Inspect the relevant peer listener. If the address, port, serving directory or configuration is unexpected, stop before requesting. Do not bind to all interfaces, change ports, disable the firewall or kill an unidentified process to obtain a convenient baseline.

Make one permitted GET and one permitted HEAD with the existing bounded commands. Preserve the actual response/diagnostic, immediate client exit status and relevant peer log context. Distinguish the HTTP status from the curl process status and a response header from transferred body content. Do not invent a packet-level handshake or require identical headers across separate requests.

### Controlled stop — request R3
Use Ctrl-C in the actual peer fixture terminal. Recheck the relevant local listener, then make one permitted GET attempt. Record the real result without assuming a particular refusal, timeout or diagnostic message.

A stop command alone is not evidence that the service stopped. If an unexpected listener or response remains, record the discrepancy and stop for reviewed troubleshooting rather than terminate arbitrary processes or expand requests. A nonresponse alone does not prove network isolation.

### Controlled recovery — request R4
Only while the reviewed state and authorization remain clear, restart the same fixture from the same reviewed disposable directory on the same peer address and port. Recheck the listener and make one final permitted GET request.

Compare the actual recovered observation with the original baseline. A restart instruction is not an observed recovery, and a successful final request cannot retroactively make a failed or unrecorded earlier stage successful. If recovery fails, report that unresolved result; do not add a fifth request or another target to improve the report.

### Final state
Stop the server and record the relevant final local state. Shut down or preserve the guests according to the actual approved evidence/recovery procedure. Keep required minimal evidence before removing the disposable fixture or restoring a baseline. Do not discard unrelated work or erase evidence needed for review. A planned shutdown, reset or snapshot restore must not be described as executed unless observed.

## 5. Turn observations into bounded conclusions
| Evidence source | Question to address | Limit to preserve |
|---|---|---|
| Guest adapter/address/route records | Did the recorded setup match the intended topology and destination path? | These selected checks do not establish every isolation, filtering or forwarding property |
| Peer listener observation | What local endpoint was listening at that stage? | A local listener does not establish a remote response or the whole service's identity/security |
| Client HTTP result and exit status | What did this exact allowed attempt return or fail to return? | Application status and local client status are not interchangeable; one result does not identify every failure cause |
| Peer request log | What evidence connects the client's permitted action with the fixture's observation? | Correlation is not a complete wire trace; do not assume clocks were synchronized |
| Stopped/recovered comparison | What changed in the recorded service states and request results? | A predicted contrast is not an observed contrast, and other unexplained changes remain limitations |
| Final-state observation | What was actually left stopped, running, shut down or unresolved? | A reset plan is not proof it was executed or that all recovery risks are closed |

Explain why target DNS resolution is not required by these literal-address requests. Name uncertainty when the evidence does not distinguish causes. Do not call an open port, advertised version or HTTP error a vulnerability without a justified affected condition and impact; this capstone does not require such a finding.

Do not change output, suppress contradictory results, reconstruct missing timestamps as contemporaneous records or turn a fictional scenario into practical evidence. If an evidence item is missing, narrow the claim and state the gap.

## 6. Existing deliverables — one short report
- Scope statement and labelled two-VM topology.
- Configuration and tool-version summary without secrets or device identifiers.
- Evidence index with actual observations for baseline, stopped and recovered states.
- Explanation separating route decisions, listener state, transport observations and HTTP responses.
- Explanation of why target DNS resolution is not required by these literal-address requests.
- At least three limitations and any unresolved discrepancy.
- Final service/guest state and a short troubleshooting reflection.

Use the existing report structure in EH-LAB-05; the request ledger belongs inside that report's method/evidence index rather than a new submission. For each attempted R-label, show the state, actual action, available time context, genuine result, associated evidence label and limit. Do not attach an entire personal command history to fill a gap.

Keep the report readable for another authorized reviewer. Explain abbreviations and guest roles, identify which steps were completed/blocked/not attempted, and state what additional authority or setup would be needed before any proposed follow-up. Use a conclusion supported by the actual evidence, not a desired outcome.

Do not include personal files, password material, broad diagnostic dumps, unnecessary host paths or unrelated terminal history. Use the actual approved private submission workflow only after its access, format, collection and retention rules exist. This repository and Markdown brief are not learner evidence storage or access control.

## 7. Existing reviewer dimensions and feedback
Evaluate the same seven dimensions: scope discipline, configuration understanding, authenticity of evidence, causal reasoning, reproducibility, privacy and recovery.

| Dimension | Observable review focus |
|---|---|
| Scope discipline | Exact endpoint/methods and request ledger respect the current brief and four-attempt planned maximum |
| Configuration understanding | Learner explains relevant topology, addresses, route and listener observations without confusing their roles |
| Authenticity of evidence | Material claims point to genuine excerpts; predictions, missing items and guided interventions remain identifiable |
| Causal reasoning | Baseline/stopped/recovered explanations separate observed changes, alternate causes and unresolved questions |
| Reproducibility | Actual selected tools, relevant configuration and bounded sequence are clear without disclosing secrets |
| Privacy | Evidence is minimal and redacted without changing its meaning or exposing unrelated data |
| Recovery | Actual final service/guest state is recorded, and unverified reset/recovery claims are not accepted as completed |

A failed practical run with an honest explanation is different from successful completion, but it can still show useful reasoning. Neither a polished report nor a successful request alone establishes mastery. Review the learner's own decisions and explanations; record assistance separately rather than call a coached result independent performance.

Feedback should identify the exact missing observation, scope issue or unsupported inference and request a bounded correction. Do not turn a writing correction into permission for additional traffic or force a learner to bypass isolation to obtain successful output. A breach or exposed secret must use the actual incident process, not an invented process or merely a reduced score.

Exact scoring, pass thresholds, resubmission and appeal rules remain pending calibration. No automatic enrolment, restricted-course access, progression or award follows. The later EH-WEB-01 practical has its own prerequisites and request limit; this capstone does not pre-authorize it or carry unused requests into it.

## Batch validation state and release boundary
The earlier capstone validation statement remains historical: networking commands, route observations, HTTP transitions and the full capstone were not executed in that authoring session. This expansion likewise executed no fixture, HTTP request, guest command, service interruption/restart or complete two-VM run. Earlier Linux sandbox checks and repository CI are not networking-practical validation.

Before release: reproduce on each supported guest/hypervisor route; check ordinary non-root operation and required tool availability; verify the four-request budget and controlled failure/recovery cases; test accessibility and private evidence handling; calibrate assessor examples; implement metadata/progression only through separately reviewed integration. Existing publication gates remain unchanged.

Source basis remains RFC 4632, RFC 9293 and RFC 1034, interpreted alongside the existing EH-LAB-03/04/05 and EH-NET-01/02/03 course material:
https://www.rfc-editor.org/info/rfc4632/
https://www.rfc-editor.org/info/rfc9293/
https://www.rfc-editor.org/info/rfc1034/

This changes only the existing capstone brief. It adds no canonical lesson, prerequisite edge, request allowance, target, service, DNS permission, reading-profile entry, runtime integration, publication flag, Discord handler, database change or deployment. No full repository suite, independent student assessment or assessor calibration was performed for this authoring expansion.
