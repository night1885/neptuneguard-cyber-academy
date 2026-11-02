# Linux foundations — instructor and authoring guide

Supporting staff draft for EH-LINUX-01, EH-LINUX-02 and EH-LINUX-03. Not a canonical lesson, learner grade, published assessment bank or release approval. It completes shared marking/troubleshooting guidance for existing scope; no new lesson ID, prerequisite edge, tool family, network action or privilege exercise is added.

Placement under authoring is organizational, not access control. Do not add this guide or student records to the learner-content allowlist. Do not store real learner submissions, names, passwords, host inventories or private feedback in this repository.

## Package and prerequisites
Use the clean, approved learner guest after EH-LAB-02. Learners need their normal non-root account, Bash and the GNU utilities specified by the existing lessons. Read [EH-LINUX-01](../lessons/EH-LINUX-01.md), [EH-LINUX-02](../lessons/EH-LINUX-02.md) and [EH-LINUX-03](../lessons/EH-LINUX-03.md) in order. These lessons prepare for later networking; they do not authorize it.

Aim: the learner can predict and explain local file/permission/diagnostic behavior, make narrow changes to owned disposable regular files, and communicate honest evidence. This is one foundation package inside K02, not complete Linux administration, escalation competence or certification readiness.

## How to teach without turning it into copying
1. Explain the model before running commands: shell arguments/paths; mode bits versus broader access; standard streams versus exit status.
2. Ask for a prediction, then let the learner observe the actual result.
3. Compare the result with that prediction and identify alternative explanations.
4. Reduce hints during the integrated task in EH-LINUX-03; do not paste a complete answer script for the learner.
5. Record interventions separately from independent performance. The programme's proposed coaching descriptions are not-observed, demonstrated-with-guidance, independent-on-familiar-task and independent-on-unfamiliar-task; they are not calibrated pass bands or a new grade schema.

The public worked commands already show intended observations. The independent task must use the learner's fresh names, actual context and reasoning. A matching string alone is not comprehension.

## Observation/marking criteria — no numeric pass mark
| Criterion | Evidence to look for | Do not accept as proof |
|---|---|---|
| Scope and context | Learner identifies approved guest, normal account and disposable workspace; stops when uncertain | Plausible-looking output copied from a host/root session |
| Arguments and paths | Explains filename grouping, options/arguments, relative path context and destination risk | Merely reproducing quote characters or prompt symbols |
| File comparison | Preserves the comparison status promptly and interprets silence in that program's context | Empty display means every command succeeded |
| Permission model | Interprets owner/group/other, observes 600 and 400 on the intended regular file, restores owner read/write | Mode 600 guarantees nobody can obtain the data; root write behavior proves normal-user enforcement |
| Diagnostic separation | Keeps useful output, error diagnostic and saved status distinguishable; explains an intentional missing-name case | Expected filename in output proves the entire listing succeeded |
| Status lifetime | Distinguishes the original saved status from a later command's status | Reporting only the final echo/printf status |
| Append/overwrite and pipeline reasoning | Explains the two stream reads and Bash's 0/1 pipeline observations without overgeneralizing | pipefail is universal or a complete error strategy |
| Evidence and independence | Actual observations versus predictions/uncertainty, minimal redacted excerpt, intervention record and final state | A memorized transcript, fictional output labelled actual, self-reported competence or automatic award |

Actual diagnostics and statuses must be interpreted for the approved implementation/locale. Never force a learner to copy the author's exact wording as their observation. Deliberately induced diagnostic failure can be the expected observation, not a failed learning outcome.

## Troubleshooting decisions within existing scope
| Situation | Appropriate next decision |
|---|---|
| Host/root/guest identity uncertain | Stop and return to the approved non-root guest; no sudo workaround |
| Workspace already exists | Inspect before reuse; select a fresh attempt name rather than overwrite evidence |
| Filename with spaces is not found | Check current directory, exact name and argument grouping using only owned local files |
| Tool/shell differs or a utility is absent | Use the actual reviewed setup/support route; no improvised download or installation |
| File is a link, unowned or unrelated | Stop; do not chmod its target or change directory/system permissions |
| Permission result differs | Recheck identity, target and observed mode; do not apply chmod 777 or recursive fixes |
| Earlier status was lost | Explain that loss and repeat only the bounded disposable demonstration if appropriate; do not fabricate the old status |
| Correct output appears alongside an error | Preserve both streams and status, then explain partial output versus overall command result |
| Private submission/support route missing | Keep a blocker report under the approved rules; no public-channel substitute |

## Worked coaching notes — fictional, not learner evidence
- 'You recorded useful output and a nonzero listing status. Explain why both can be correct observations for the same command.'
- 'Your mode observation is useful, but it does not establish confidentiality against privileged access, copies or backups.'
- 'The later successful printf does not recover the earlier command's status. Describe which status you saved and when.'
- 'Stopping at an uncertain machine identity was the correct safety decision. The technical steps remain unattempted, not silently passed.'

Use a new filename/content choice or explanation prompt for an independent repeat, without expanding the permitted operations. Do not claim unfamiliar-task independence when the instructor supplied the decision or exact answer.

## Authoring trace and remaining closure
| Existing teaching requirement | Evidence location / remaining work |
|---|---|
| Prerequisites/outcomes/technology | Explicit in the three existing lessons |
| Setup/context and bounded tool choices | EH-LAB-02 prerequisite; guest/non-root/Bash/GNU assumptions and existing help commands |
| Annotated demonstrations/expected observations | Existing guided blocks; selected local observations are recorded separately |
| Troubleshooting/manual validation | Tables above plus original inspect-change-inspect and saved-status instructions |
| Guided practice and reduced hints | Original worked examples followed by EH-LINUX-03's integrated independent brief |
| Evidence/reporting/final state | Student report headings in EH-LINUX-03; minimal private evidence and restored owned-file mode |
| Marking and interventions | Descriptive criteria above; independent human review and calibration still required |
| Accessibility/context clarity | Readable command/text route and guest/account labels; actual keyboard/usability/student-guest walkthrough still required |
| Remediation/retest | Narrow owned-file restoration and repeat after diagnosed mistakes; this is not a vulnerability-remediation or escalation lab |

Trace: contributes to X03/X05/X22/X23 and the foundation portion of K02. It does not close all of those programme requirements. Supported guest/hardware reproduction, independent academic review, assessor calibration, actual learner independence and the approved private submission process remain open. Do not publish or mark the programme complete from this package.

## Execution evidence is narrower than teaching acceptance
See [selected author execution](LINUX-FOUNDATIONS-EXECUTION-2026-11-01.json) and [validation history](../lessons/LINUX-FOUNDATIONS-VALIDATION.md). Six selected command contracts matched in a disposable local sandbox. Its toolchain is mixed GNU/uutils, not the prescribed supported student guest. No write-denial, ACL, cross-account, hypervisor, network, student usability or grade calibration test occurred. Keep those limitations alongside the output, not hidden in a test count.
