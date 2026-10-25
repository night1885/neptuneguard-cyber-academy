# 3. Independent investigation and technical handover

Supporting draft task, not a calibrated exam, automatic grade or course-completion rule.
Read [the route](README.md). Use only the existing fictional in-process ownership/update
applications and their separately approved local execution context.

## Brief

A fictional maintainer claims: 'Course membership, SQL placeholders and stale-write
rejection prevent students accessing or changing another student's information.'
Investigate that claim separately for the read starter and update starter. A finding about
one factory is not automatically true of another factory or the repaired reference.

Start without instructor answers or a copied repair. Source access is part of this white-box
task; visible tests alone are not a causal finding. Record hints and reference access.

## Required evidence

1. System sketch separating path/body/header input, assumed trusted Actor, selected record,
   policy, transaction and returned data.
2. Two source-based hypotheses: disclosure and unauthorized property change. Give each a
   bounded counterexample, legitimate control and alternative explanation to reject.
3. Prediction table preserved before execution: facts, function/test anchor, expected branch,
   response and stored-state effect.
4. If separately permitted, exact source revision, named command, actual observation and
   intervention. Otherwise label source-predicted, BLOCKED or unattempted. Paper reasoning
   cannot substitute for practical execution evidence.
5. Minimal local repair or precise diff proposal if editing is not approved; do not weaken
   tests, hard-code actor names or disable all legitimate functionality.
6. Positive/negative retest matrix, technical finding and concise stakeholder summary.

## Paper variations, not new execution permissions

Reason about an unknown visitor with an owner-like subject; an instructor in another
course; literal text owner=student-b; expected_revision:true; stale revision reuse; and
repaired read policy combined with the starter writable-field factory. Distinguish identity
assumptions, role/course policy, object ownership, property policy, type and version.
Say not established when authentication or actual concurrency evidence is missing.

## Proposed investigation and handover workflow

This extension organizes the existing task; it does not activate an assessment rule or add
execution scope. Use the [blank report template](INVESTIGATION-REPORT-TEMPLATE.md) if the
reviewed task adopts it. It is a document layout, not an evidence collection service.

### 1. Fix the context before drawing conclusions
Record the exact starter/reference factory, source snapshot, object, operation and assumed
actor. Keep the read and update investigations separate. A test passing against a repaired
factory is not a reproduction against the starter. Source inspection without execution is
source-predicted, not observed. Missing approved setup remains BLOCKED, not an invitation
to manufacture a transcript or omit the unresolved stage.

### 2. Preserve the hypothesis before the result
Write the proposed causal condition, a bounded forbidden case, its nearest legitimate
control and the expected response/data/state difference. Name a competing explanation that
would lead to a different repair. Cite a function or stable code fragment rather than a
line number alone; edits can move lines. Keep the original prediction when correcting a
mistake so the reviewer can see the reasoning change. Do not fabricate a timestamp or claim
that an author result was your own earlier prediction.

### 3. Connect a local repair to both controls
If editing is separately permitted, identify the minimal source change and why it removes
the demonstrated inappropriate authority while preserving intended use. If editing is not
permitted, provide a precise proposal and label its retest unattempted. Keep unchanged
baseline tests and report actual assertion/import/error outcomes separately. Reject-all
and hard-coded identity fixes are not substitutes for the stated ownership/field rules.

### 4. Verify the effect the claim depends on
For reading, inspect status and returned data/metadata. For updates, inspect response and
stored fields/revision under the selected fixture. A stale-response status alone is not a
state comparison. Distinguish the explicit rollback injection from a post-commit read
failure: a generic 503 can accompany different stored outcomes. Those are selected local
failure-stage observations, not a tested production retry or durability policy.

### 5. Hand over a bounded technical and stakeholder account
The technical record should let a reviewer connect scope, source assumption, causal trace,
case, actual observation or blocker, repair, allowed/forbidden retests and unresolved claims.
The short stakeholder summary should explain the affected fictional operation and intended
repair without implying real-account exposure, a live endpoint, universal application
compromise or calibrated certification competence. Do not assign an unsupported severity
score merely because a test failed.

## Independence is a recorded condition, not a test result

These applications, references and detailed walkthroughs are visible teaching material.
Performance here can evidence work on a familiar task, with assistance/reference exposure
recorded. It cannot alone establish independent performance on an unfamiliar application.
A later original variant needs separate authoring, scope review and assessment calibration;
this extension does not claim such a variant was delivered or piloted.

Record whether explanations, test additions and repair decisions were made before or after
hints/reference inspection. Unknown assistance history stays unknown; an empty hint log is
not proof that no help occurred. A green suite does not establish source understanding, and
a well-reasoned blocker does not become practical execution. Keep reviewer judgments for
reasoning, execution and independence separate instead of hiding them in one total.

## Report and stop conditions

Report scope/revision, causal trace, prediction, permitted observation, legitimate control,
bounded impact, repair, retest status and uncertainty. Include no real identities, secrets,
submissions, device reports or instructor answers. No collection/storage endpoint is supplied.

Stop for changed/unreviewed source, missing prerequisites/support/private route, actual
credentials or any unexpected connection/target. Do not install, elevate or improvise
networking. No scanner, listener, account test, privilege escalation or external service
is added. Review must separate assisted/independent performance and predicted/observed
results. No numeric pass mark, enrollment, restricted access or award follows.
