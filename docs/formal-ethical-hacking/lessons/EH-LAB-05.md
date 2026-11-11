# EH-LAB-05 — Evidence interpretation and professional reporting

Draft; instructor calibration and evidence-handling policy remain pending. Requires EH-LAB-04. This lesson does not issue a certificate or grant broader testing permission.

## Objective
Produce a concise report that another authorized reviewer can understand and reproduce. Separate observations, interpretations and unresolved questions. Report a setup exercise honestly; do not manufacture a vulnerability finding to make it sound impressive.

## Report structure
1. Purpose and authorization: identify the fictional/course exercise, student-owned guests, permitted actions and exclusions. Omit personal device identifiers.
2. Environment: guest OS/version, architecture, relevant tool versions, topology and configuration. State that the academy did not host the lab.
3. Method: list the bounded steps actually performed, not every step printed in the lesson.
4. Evidence: label excerpts with guest role, command/action, recorded time and result. State timezone if time is relevant; do not invent timestamps after the event.
5. Findings and interpretation: distinguish observed behavior from a proposed explanation. Explain uncertainty and alternate explanations.
6. Recovery and limitations: document shutdown/reset, unresolved setup issues, and what was not tested.
7. Conclusion: state whether the exercise objective was supported by evidence. Do not claim universal isolation, absence of vulnerabilities or production readiness.

## Evidence labels
Use E01, E02 and so on, and refer to those labels in the analysis. A screenshot should have a purpose, not serve as decoration. Prefer the smallest useful excerpt. Redact credentials and unrelated personal data while preserving the information needed to assess the claim. Never alter a result to make it look successful.

Fictional examples must say FICTIONAL. A written scenario answer is not executed practical evidence. If execution was blocked, submit an honest blocker report and the next authorized action instead of a fabricated transcript.

## Worked reasoning example — FICTIONAL
Observation: a permitted request received a status line and headers from the clean peer. Interpretation: an HTTP responder was reachable at that specified address and port during the check. Limitations: this does not establish internet isolation, application security, exclusive ownership of every address in the subnet or authorization for further testing. This is reasoning practice, not a transcript of a real run.

## Draft reviewer criteria
- Scope: every practical action remains within the stated exercise.
- Reproducibility: the described configuration and sequence are sufficiently specific.
- Evidence: claims point to relevant, genuine observations.
- Reasoning: uncertainty and alternative explanations are explicit.
- Privacy: unnecessary identifiers and secrets are absent.
- Recovery: the reported final state is supported and limitations are acknowledged.

These are review dimensions, not a calibrated pass mark. Numeric thresholds, assessor examples, resubmission rules and appeals must be approved before formal grading. A scope breach or exposed secret requires the actual incident process, not merely a lower score. Instructor answers and personal submissions must not be placed in a public repository.

## Submission worksheet
Title:
Scope and exclusions:
Environment and versions:
Steps actually completed:
Evidence index:
Observed facts:
Interpretations and alternatives:
Unresolved issues:
Reset/final state:
Limitations:

Use only an approved private submission channel. This Markdown document is not a collection system. Do not email or publicly post sensitive evidence because a private workflow is unfinished. Assessment completion, enrolment, restricted-course authorization and formal awards remain separate decisions.

## Teaching expansion: make every conclusion traceable

A professional report is an argument supported by evidence, not a collection of impressive screenshots. In this foundation exercise, an honest statement of limited protocol observations is stronger than an invented vulnerability. The original private-submission and incident-handling requirements remain unchanged.

### Build a claim-evidence chain

For each conclusion, identify the observation, the evidence label, the interpretation, a reasonable alternative explanation and the limit of the claim. This forces a distinction between “the peer returned this response” and “the entire environment is secure.” The first can be bounded by time, method and destination. The second would require evidence this exercise does not collect.

A method section describes what you actually did. A plan describes what you intended. An observation describes what you recorded. Keep these categories separate. If a prerequisite was blocked, do not write the remaining procedure in past tense as though it happened.

Use an evidence index that tells the reviewer why each excerpt exists. A useful entry contains the label, guest role, action, minimal result and the claim it supports. Record event time and timezone when available. If timing is missing or clocks disagree, preserve that uncertainty instead of inventing an exact chronology.

### Worked mini-report — FICTIONAL, paper analysis only

Purpose: reason about the bounded clean-peer HTTP exercise. This example contains no executed evidence and must not be submitted as a completed practical.

Scope: the stated NG-Learner and NG-Peer exercise, GET / and HEAD / on peer TCP port 8000. No other paths, methods, targets or vulnerability tests.

Fictional evidence index:
- E01: a peer-local listener observation naming the intended address and port.
- E02: a client GET / response containing status 200 and the fixed exercise text.
- E03: a peer log excerpt for the corresponding GET /.
- E04: a post-stop listener observation with no matching listener shown by the selected check.
- E05: the permitted post-stop request did not obtain an HTTP response within its configured bound.

Analysis: E02 supports receipt of an HTTP response for the bounded request. E03 is consistent with the peer handling a matching request, but correlation still depends on the accuracy of the recorded context. E04 and E05 are consistent with the observed post-stop state. E05 alone does not prove why the request failed or demonstrate internet isolation.

Conclusion: the fictional records support a narrow comparison of running and stopped service observations. They do not establish comprehensive isolation, absence of vulnerabilities or production readiness. No actual outcome is claimed by this paper example.

Notice that the mini-report does not create a severity score. An HTTP teaching fixture answering its permitted request is not automatically a vulnerability finding.

### Repair an overclaim — FICTIONAL

Initial sentence: “The lab is secure because the server stopped responding.”

Improved sentence: “After the documented stop action, the permitted client request did not receive an HTTP response within its configured time bound. The peer-local listener check showed no matching listener in the captured output. These observations describe the checked state; they do not prove the absence of other services or external paths.”

The improvement identifies the intervention, observations and limits. It also avoids naming a specific network failure cause that was not established. In a real report, insert the genuine evidence labels and results rather than borrowing this wording when it does not match your run.

### Write a useful blocker report

A blocker report should include the intended bounded step, the actual obstacle, relevant non-sensitive evidence, what you did not attempt, the final state and the next authorized decision needed. It should not contain a request to bypass managed-device policy or weaken the network boundary.

FICTIONAL example: “The peer did not have the intended temporary address after reboot. I did not start the HTTP server or send client requests. Both guests are shut down. I need clarification on the supported address-configuration route before continuing.” This is useful even though no HTTP transcript exists: it prevents a reviewer from confusing an unattempted action with a failed service test.

### Privacy, provenance and redaction

Retain only the evidence necessary for the approved review. Where policy permits retaining an original, distinguish it from a redacted presentation copy and describe the redaction without exposing the removed secret. Never change a failed result into a successful one, remove a decisive discrepancy, or crop away context needed to assess the claim.

If a secret appears, do not assume making a redacted screenshot resolves the incident. Stop further collection and follow the actual incident and retention process. Do not place originals or personal submissions in this repository. If the approved private handling route is unavailable, report that blocker rather than collecting material into an improvised public channel.

### Human-led AI review — FICTIONAL material only

Before consulting an AI system, manually mark the unsupported claims in the fictional mini-report and the overclaim above. Then, if an approved AI tool is available, provide only those fictional paragraphs with this instruction:

“Review this FICTIONAL reasoning exercise. For each conclusion, identify the stated supporting observation, an unsupported inference and a narrower defensible wording. Do not invent evidence, timestamps, commands or outcomes. Do not suggest additional targets or practical actions.”

Compare its response with your own analysis. Reject any suggestion to infer full isolation from a timeout, assign a vulnerability severity from a banner, fabricate missing evidence or broaden scope. Record one accepted language improvement and one rejected inference with reasons. If AI is unavailable, perform the same comparison manually; the learning objective is evidence reasoning, not use of a particular product.

AI output is a proposal to assess, not evidence that a practical ran and not authorization. Do not upload real logs, identities, credentials, private instructor material or device information for this exercise.

### Review questions with explanations

1. The worksheet has no HTTP output because setup was blocked. Must you fill the gap? No. Mark the action not attempted and explain the blocker. Invented output would misrepresent the method and evidence.
2. A screenshot is genuine but contains a password. Is genuineness enough? No. Scope, privacy and incident obligations still apply; do not distribute it through an improvised channel.
3. AI confidently says a timeout proves isolation. Should you accept it? No. Confidence does not supply missing evidence or exclude alternative explanations.
4. A reviewer cannot follow a conclusion back to an excerpt. What should improve? Add or correct the evidence reference, narrow the claim, or explicitly state that the conclusion remains unsupported. Do not create a retroactive observation.

These explanations are formative learner feedback, not private assessor keys, a numerical pass mark or a new grading system.
