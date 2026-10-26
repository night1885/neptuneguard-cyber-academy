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
