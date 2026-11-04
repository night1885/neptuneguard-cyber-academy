# EH-LAB-05 — Evidence interpretation and professional reporting

Draft; instructor calibration and evidence-handling policy remain pending. Requires EH-LAB-04. This lesson does not issue a certificate or grant broader testing permission. Community Learning is unchanged. No real learner collection or submission service is activated by this document.

## Objective and finish line
Produce a concise report that another authorized reviewer can understand and reproduce. Separate observations, interpretations and unresolved questions. Report a setup exercise honestly; do not manufacture a vulnerability finding to make it sound impressive.

Use the evidence from the already permitted exercises, complete the existing report structure and submission worksheet, check your claims and privacy, and identify unresolved issues. Finish with a report whose conclusions can be traced to genuine observations or explicitly labelled gaps. This is the existing reporting task, not a new technical practical or an instruction to repeat traffic or restore a VM.

A polished report cannot turn an unexecuted step into a completed practical. If work was blocked, document the blocker and the next authorized action. A blocker report is honest evidence of the limitation, not a substitute claim that the practical objective was achieved. Completing this entry sequence does not complete the comprehensive programme.

## 1. Gather only the evidence you actually have
1. Review the permitted exercise scope and the minimal records already obtained. Do not collect additional personal data, credentials or unrelated diagnostic output to make the report look comprehensive.
2. Distinguish actual observations, contemporaneous notes, predictions, fictional reasoning and material copied from documentation. Only the first two can describe what you actually observed, and their limitations still need explanation. A publisher example is not your transcript.
3. Identify the guest role, action/command, actual result and available time context for each useful item. If time was not recorded, say so. Do not invent a timestamp later, infer synchronized clocks or disguise a reconstructed narrative as an original capture. State timezone when time is relevant and actually known.
4. Select the smallest excerpt that supports the claim while retaining enough context to interpret it. Missing context is a limitation to disclose, not permission to fill in expected output.
5. Do not rerun a command merely to improve a screenshot unless the actual current scope and reviewer process authorize that action. This writing lesson does not itself renew practical permission.

Draft in an available accessible text editor or document tool. Plain text or Markdown is sufficient for drafting; no paid product, cloud account or new software installation is required by this lesson. Use only the actual approved submission format when one has been established. Do not upload evidence to a public converter, sharing service or repository to produce a more attractive document.

## 2. Build the existing seven-part report
The purpose is a readable chain from scope to method to evidence to conclusion. Another authorized reviewer should be able to understand what was done and its limits; the report itself does not authorize that reviewer to run tests.

### 1. Purpose and authorization
Identify the fictional/course exercise, student-owned guests, permitted actions and exclusions. Omit personal device identifiers. For the EH-LAB-04 work, keep the existing two guest roles, NG-FOUNDATION, the peer endpoint 192.0.2.20:8000, and GET / and HEAD / distinct from any earlier network setup checks.

State which current approved brief governed actual work, or state that authorization/execution was not established. A course card, enrolment or available tool is not a replacement brief. Do not broaden a successful root-path request into permission for other paths, ports or systems.

### 2. Environment
Record observed guest OS/version, architecture, relevant tool versions, topology and configuration. State that the academy did not host the lab. Keep the physical host distinct from each guest and the application endpoint distinct from the internal-network name.

Report actual selected values rather than the lesson's candidates or guessed course minimums. If a version, adapter configuration or resource allocation was not recorded, identify the gap. Do not attach a full host inventory just to fill it.

### 3. Method
List the bounded steps actually performed, not every step printed in the lesson. Separate setup, observation, controlled fault/stop and reset. Identify a failed, omitted or blocked step at its actual point in the sequence.

Use the actual invocation when it is available. Do not retroactively add an option, verification or safety check that was not used. For example, an earlier request without a documented first-option curl -q must not be presented as if it included that later command clarification. Record the limitation and obtain review rather than silently rewriting history or automatically repeating the request.

### 4. Evidence
Label relevant excerpts with guest role, command/action, recorded time where available and result. Use E01, E02 and so on, and refer to those labels from the analysis. Include actual failures and blockers that matter to the conclusion.

Keep HTTP response status, local client exit status, server log entries and listener observations distinguishable. They are related evidence sources, not interchangeable measurements. An expected result printed in a lesson is not an observed result.

### 5. Findings and interpretation
For each material conclusion, identify the observation, its evidence label, the interpretation and its limit. Explain uncertainty and alternate explanations. A finding here can be a bounded behavior or unresolved setup issue; the assignment does not require a vulnerability.

Do not turn an advertised version into a confirmed exploitable weakness, a failed ping into proof of isolation, a listener row into proof of remote reachability, or a curl exit status into an HTTP status. If the evidence does not distinguish between explanations, retain the uncertainty instead of selecting the most dramatic one.

### 6. Recovery and limitations
Document the shutdown/reset actually observed, unresolved setup issues and what was not tested. Distinguish a created snapshot, a selected restore operation, an observed rollback and a verified post-restore configuration. Do not report all four merely because one occurred.

State the actual final state of the service and guests where observed. An instructed shutdown or planned reset is not an executed result. If a final check is missing, name it as missing rather than writing that the environment was left safe. Do not run a new reset or erase required evidence to repair the report after the fact.

### 7. Conclusion
State whether the exercise objective was supported by the available evidence, only partly observed or blocked, and why. Use ordinary language with the relevant evidence references; these descriptions are not automatic grading states.

Do not claim universal isolation, absence of vulnerabilities, production readiness, certification readiness or permission for additional testing. The conclusion should answer the actual limited objective rather than repeat the entire method.

## 3. Make evidence labels useful
Assign each included item a unique E label and use that same label consistently. The index is a map to the supplied excerpt, not proof that the event occurred. Do not give a fictional example an index entry among actual results without clearly separating it.

| Evidence-index field | What to write |
|---|---|
| Label | E01, E02 and so on; unique within this report |
| Origin | Relevant guest role and evidence type, without unrelated identifiers |
| Action/context | The actual command or action and the service/configuration state needed to interpret it |
| Time context | Recorded time/timezone if available and relevant; otherwise state what was not recorded |
| Result excerpt | Genuine minimal output or an honest blocker; no invented missing lines |
| Use and limitation | Which claim the item supports and what it cannot establish |
| Redaction note | What category was removed where relevant, without reproducing the sensitive value |

These fields explain the existing evidence index rather than require a second assessment or another submission artifact. A screenshot must have a purpose, not serve as decoration. Text can be more accessible and easier to review when it preserves the necessary context.

Do not crop away an error, remove a contradictory line, substitute a successful result or edit an HTTP/client status to improve the narrative. Redaction removes unnecessary sensitive information; it must not change the meaning of the result. Where a permitted excerpt omits relevant context, disclose the omission and resulting limitation.

## 4. Worked reasoning example — FICTIONAL
This expands the existing reasoning example. It supplies no executed command output, timestamp, grade or learner evidence. Do not copy it as your actual practical result.

Observation: a permitted request received a status line and headers from the clean peer.

Evidence connection: if this were an actual report, its genuine corresponding client excerpt would receive an E label and be cited here. The hypothetical observation in this paragraph is not that excerpt; there is no actual E01 capture supplied by the example.

Interpretation: an HTTP responder was reachable at that specified address and port during the check.

Limits: the stated observation does not include the complete body, client exit result, peer log correlation or later stopped-service check. Those must not be invented or described as completed. It does not establish internet isolation, application security, exclusive ownership of every address in the subnet or authorization for further testing.

Improved conclusion: the fictional observation supports the narrow claim that the permitted request received an HTTP response. The wider practical objective would need the other genuine observations required by the existing lesson.

Avoid: "The network is secure and the application has no vulnerabilities because the request worked." That conclusion exceeds the stated evidence. This is reasoning practice, not a transcript or assessor answer key.

## 5. Check privacy and preserve meaning
1. Remove credentials, private keys, unrelated personal data and unnecessary identifiers from the report and permitted excerpts. Do not reproduce a secret merely to explain that it was redacted.
2. Retain the non-sensitive context needed to assess the claim: guest role, relevant action, permitted lab endpoint, meaningful result and stated limitations. Redaction must not make one guest's result look like another's.
3. Inspect the actual report/export and the supplied excerpts before submission. Do not assume that making a visual change guarantees all sensitive information was removed. If you cannot produce an appropriately minimized approved format, stop and request guidance instead of using a public converter.
4. Handle any already-approved original records only under the actual access, retention and deletion policy. This lesson does not mandate collecting more raw data, create a new archive, set a retention period or promise deletion guarantees.
5. A scope breach or exposed secret requires the actual incident process, not merely a lower score or a quieter rewrite. If the route is missing, remain stopped; do not test exposed credentials, erase context to hide the event or publicly post it for help.

Instructor answers and personal submissions must not be placed in a public repository. The teaching document is not access control, private storage or a collection system. Do not email or publicly post sensitive evidence because the private workflow is unfinished.

## 6. Use the existing six reviewer dimensions
| Existing dimension | Observable review question | Targeted correction when unclear |
|---|---|---|
| Scope | Did every described practical action stay within the stated exercise? | Identify the exact brief/action mismatch; do not ask for extra testing to justify it |
| Reproducibility | Are the actual configuration and sequence sufficiently specific for an authorized reviewer to understand? | Add recorded details or name the missing information; do not guess values |
| Evidence | Do material claims point to relevant genuine observations? | Supply the already-approved relevant excerpt or narrow the unsupported claim |
| Reasoning | Are uncertainty and alternative explanations explicit? | Separate the observed fact from the proposed explanation and its limit |
| Privacy | Are unnecessary identifiers and secrets absent without misleading alterations? | Minimize the excerpt while preserving its evidential meaning; use the incident process where required |
| Recovery | Is the reported final state supported and are limitations acknowledged? | Identify the actual reset observation or state that the result was not recorded |

These remain review dimensions, not a calibrated pass mark. Numeric thresholds, assessor examples, resubmission rules and appeals must be approved before formal grading. Do not invent a score, deadline, number of permitted attempts or automatic progression rule from this draft.

Feedback should name the specific claim or evidence gap and request a bounded writing correction. Record when reasoning was revised after guidance rather than describing the coached result as an independent first attempt. A genuine practical blocker may remain unresolved after a well-written correction; report quality does not erase it.

## 7. Complete the existing submission worksheet
Use the same fields, expanded only with instructions for what belongs in each:

Title:
A concise description of this limited exercise, not a claimed penetration test of unrelated systems.

Scope and exclusions:
The current actual brief, permitted guest/actions and explicit boundaries; distinguish fictional-only work.

Environment and versions:
Observed guest/tool/topology details and any unknowns; no unnecessary host identifiers.

Steps actually completed:
The actual bounded sequence, including failures, omissions and blockers where they occurred.

Evidence index:
E labels and the minimal relevant supplied excerpts, with origins, available time context and limitations.

Observed facts:
Claims stated narrowly and linked to genuine evidence, not predictions or documentation examples.

Interpretations and alternatives:
Reasoned explanations, uncertainty and other causes the evidence does not exclude.

Unresolved issues:
Missing dependencies, checks or authority and the next permitted action; no invented successful completion.

Reset/final state:
What was actually stopped, shut down or restored and what remains unobserved.

Limitations:
Untested areas and conclusions the evidence cannot support.

Before submitting, read the conclusion against the evidence index, check that the method describes actual rather than intended steps, inspect redactions and confirm the actual private route and permitted format. If that workflow is not approved, do not collect or send real learner evidence through an improvised substitute.

Assessment completion, enrolment, restricted-course authorization and formal awards remain separate decisions. Reading, report submission or a polished document does not automatically establish practical readiness or grant an award.

## Authoring and release boundary
This expansion preserves EH-LAB-04 as the prerequisite, the single existing report task, its seven report sections, E-label approach, fictional reasoning example, six review dimensions and original worksheet fields. It adds no practical target, command, retest, collection service, canonical lesson ID, prerequisite edge, publication flag, runtime integration, Discord interaction, database change or deployment.

The authoring basis is the existing EH-LAB-05 and the preceding course exercise context. No real learner report was collected or assessed, no practical was rerun, and no full repository suite, privacy/access implementation, assessor calibration or independent teaching acceptance was performed for this batch. This is draft teaching guidance, not formal grading policy or learner-release approval.
