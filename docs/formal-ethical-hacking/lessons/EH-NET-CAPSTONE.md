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

## Expanded teaching: plan the evidence before spending the request budget

This supplement explains the existing capstone rather than adding a second run. All cases below are FICTIONAL reasoning exercises. The original authorization, setup, recovery, evidence-handling and draft-calibration limits remain unchanged.

### Treat the run as a bounded comparison

The capstone compares a baseline service state, an intentionally stopped state and a recovered state. The controlled intervention is stopping and restarting the same reviewed fixture. This is not a general availability test, vulnerability assessment or demonstration of every network-isolation property.

Write the question before the action: can the authorized learner obtain the expected response from the specified clean peer at the checked time, and what changes after the documented intervention? The answer must distinguish what was attempted from what was recorded. A detailed plan is not proof that its steps ran.

### Account for all four client requests

Use the following as a planning ledger, not as fabricated results:

| Planned slot | Existing permitted action | Evidence question |
|---|---|---|
| 1 | Baseline GET / | Did an actual response contain the expected fixture representation? |
| 2 | Baseline HEAD / | What status and metadata arrived without response content? |
| 3 | One GET / attempt after stopping | What was actually observed within the configured waiting bound? |
| 4 | One GET / after restarting the same fixture | Did the bounded recovered-state observation differ from the stopped state? |

A failed attempt still occupies an attempted slot; do not silently replace it with another until a success appears. If the sequence is blocked, stop and use the original requirement for an explicitly bounded recovery plan. The maximum is not a target to exhaust when the setup is already ambiguous.

Local configuration inspection does not become a fifth HTTP request merely because both support the report, but it must remain within the permitted two-guest inspection scope. Do not call a scan “inspection” to avoid the request budget. Supporting offline worksheets also do not replenish or enlarge the practical allowance.

### Prepare a state-and-evidence ledger

For each state, identify the guest context, relevant adapter/address/route observations, peer listener observation, permitted client action and result, relevant peer log if available, unresolved questions and final state. Use genuine evidence labels rather than copying an expected terminal transcript.

Record observations close to the action when policy permits. A response collected before the stop and a socket listing collected after it concern different times. Do not combine them as simultaneous facts. If times were not captured or clocks differ, state that limitation and preserve the actual sequence you can substantiate.

The minimum useful record is not necessarily a screenshot. A short redacted excerpt can support a precise claim more clearly than an image exposing unrelated windows. Keep evidence under the approved private handling process; do not use public course chat as an improvised collection route.

### Work an unexpected transition — FICTIONAL

A supplied paper scenario says the baseline response matched the fixture, but an HTTP response was still received after the supposed stop. The learner writes “the service was definitely stopped, so the network must have cached the response.”

That conclusion invents a cause. First distinguish the intended stop action from evidence of the actual process and listener state. The wrong terminal may have been used, the process may still be running, another responder may exist or the request context may differ. The existing observations must be reconciled before accepting any explanation.

The next step is not to issue repeated requests, kill arbitrary processes or contact other addresses. Stop the practical sequence when identity or state is uncertain. Preserve the relevant local observations and ask for the actual bounded recovery decision. A convincing-sounding hypothesis is not permission for another experiment.

### Explain the strength and limits of recovery evidence

A recovered-state response supports that a specified request received that response after the recorded restart. It does not prove every client recovered, no other service was affected or the environment is production-ready. Likewise, a timeout after stopping does not prove which device or mechanism caused the incomplete request.

Recovery and cleanup are separate claims. Restarting the fixture successfully does not establish that it was later stopped, the guests were shut down or the approved baseline was restored. Record the final state using the existing procedure. Do not erase review evidence in order to produce a tidy finish.

### Build a concise professional conclusion

Use four parts: objective, supporting observations, unresolved limitations and final state. Avoid replacing the objective with a security claim the exercise never tested. “The bounded fixture exchange was observed” is different from “the host is secure.”

If execution was blocked, explain where and why, which planned actions were not attempted, what remains known and what decision is needed next. A blocker can demonstrate useful reasoning without becoming a claim of successful completion. These distinctions do not introduce an automatic pass mark or a new learner-acceptance gate.

### Formative questions with explanations

1. Why is a repeat after an unsuccessful request not automatically free? The budget bounds attempted client actions, not only responses that look successful.
2. Can the offline case pack replace missing practical evidence? No. Its fictional records support reasoning but did not observe the learner's environment.
3. Why retain a contradictory stopped-state observation? It can reveal a wrong assumption about process, timing or identity. Editing it out would hide the diagnostic problem.
4. Does a recovered response prove final cleanup? No. Recovery and later final-state observations answer different questions.
5. Must a report identify one definite root cause? No. A sound report distinguishes supported conclusions from unresolved alternatives when the bounded evidence cannot decide.

Technical reading: the existing network, HTTP and reporting lessons and their cited RFCs. No new capstone execution, guest reproduction or assessor calibration is claimed by this supplement.
