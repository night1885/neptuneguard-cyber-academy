# Networking foundations — bounded troubleshooting capstone

Draft assessment specification; not calibrated or published. Requires EH-NET-01 through EH-NET-03 and the existing home-lab exercises. Students provide their own two clean VMs. No academy-hosted target is provisioned.

## Scenario and scope
Your job is to explain whether the authorized learner can receive the expected HTTP response from the clean peer, and document a controlled service interruption. Only the EH-LAB-04 GET / and HEAD / requests to 192.0.2.20:8000 are permitted. Local configuration inspection on your own two guests is allowed. No new scan, DNS service, packet capture, routing change, internet connection, exploitation or credential testing is introduced.

## Practical sequence
1. Confirm current authorization, the correct guests and the intended topology. Resolve discrepancies before making practical requests.
2. Record minimal adapter, address and route evidence using the existing lesson checks. Explain any limitation rather than claiming these checks prove all isolation properties.
3. Prepare the exact empty-directory fixture from EH-LAB-04. Inspect the peer listener. Make one permitted GET and one permitted HEAD request with the existing bounded commands.
4. Stop the fixture using Ctrl-C in its actual terminal. Check the relevant local listener and make one permitted GET attempt. Record the real result without assuming a particular failure message.
5. Restart only the same fixture, recheck the listener and make one final permitted GET request.
6. Stop the server, record final state and shut down or preserve the guests according to the approved evidence/recovery procedure. Do not discard evidence needed for review.

This specifies four client requests at most during the planned run. Do not enter an uncontrolled retry loop. If setup fails, stop and submit a blocker report; further attempts require an explicit bounded recovery plan.

## Deliverables
- Scope statement and labelled two-VM topology.
- Configuration and tool-version summary without secrets or device identifiers.
- Evidence index with actual observations for baseline, stopped and recovered states.
- Explanation separating route decisions, listener state, transport observations and HTTP responses.
- Explanation of why target DNS resolution is not required by these literal-address requests.
- At least three limitations and any unresolved discrepancy.
- Final service/guest state and a short troubleshooting reflection.

Use the report structure in EH-LAB-05. Do not include personal files, password material, broad diagnostic dumps or unrelated terminal history. Use an approved private submission workflow; this repository is not the learner evidence store.

## Reviewer dimensions
Evaluate scope discipline, configuration understanding, authenticity of evidence, causal reasoning, reproducibility, privacy and recovery. A failed practical run with an honest explanation is different from successful completion, but it can still show useful reasoning. Neither a polished report nor a successful request alone establishes mastery.

Exact scoring, pass thresholds, resubmission and appeal rules remain pending calibration. No automatic enrolment, restricted-course access or award follows. Any breach must use the actual incident process, not an invented process in this draft.

## Batch validation state
EH-NET-01 through EH-NET-03 and this capstone were authored using RFC 4632, RFC 9293 and RFC 1034. The networking commands, route observations, HTTP transitions and full capstone were not executed in this authoring session. Earlier Linux sandbox checks are not networking validation.

Before release: reproduce on each supported guest/hypervisor route; check ordinary non-root operation and required tool availability; verify the request budget and failure cases; test accessibility and private evidence handling; calibrate assessor examples; register metadata and progression in a separately reviewed integration. Existing publication gates remain unchanged.

Source basis:
https://www.rfc-editor.org/info/rfc4632/
https://www.rfc-editor.org/info/rfc9293/
https://www.rfc-editor.org/info/rfc1034/
