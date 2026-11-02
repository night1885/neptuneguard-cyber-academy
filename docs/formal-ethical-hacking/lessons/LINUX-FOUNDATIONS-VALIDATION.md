# Linux foundations — validation record

Draft batch: EH-LINUX-01 through EH-LINUX-03. Additive documentation only; no runtime registration, publication, hosting or Community Learning changes. The existing home-lab manifest and its release gates are unchanged.

## Sequence
EH-LAB-00 -> EH-LAB-01 -> EH-LAB-02 -> EH-LINUX-01 -> EH-LINUX-02 -> EH-LINUX-03 -> EH-LAB-03 -> EH-LAB-04 -> EH-LAB-05. This is a proposed reading order, not an implemented progression rule. The Linux lessons use an offline clean guest and disposable local files. They do not expand network authorization.

## Executed local checks
Executed in this authoring session in an isolated temporary directory, with Bash invoked using --noprofile --norc. Environment reported GNU bash, version 5.3.9(1)-release (x86_64-pc-linux-gnu). Five of five checks passed:

1. Quoted filename creation, copy, comparison and readback: recovered the expected authorized lab note.
2. Explicit permission transitions: stat observed 600 then 400; owner read/write restored.
3. Separate output/error streams: GNU ls returned 2 for one present and one absent filename; both capture files were nonempty.
4. Pipeline status: false piped into cat produced status 0 without pipefail and 1 with pipefail.
5. Append/overwrite: observed first and second lines, then replacement-only contents.

These checks validated the bounded command behaviors, not every explanatory claim or the full interactive lesson. An accompanying downloadable JSON execution record was generated during authoring; it is not automatically a repository artifact or CI run.

## Not validated
- Supported guest distributions and versions, novice usability or accessibility.
- Non-root cross-account access-denial behavior, ACLs or other security controls.
- Hypervisor installation, image verification, networking or isolation.
- Every independent student task or the full lesson sequence.
- Formal rubric calibration, private submission integration or release readiness.

## Before release
Reproduce commands as an ordinary account on each supported guest. Test expected mistakes without harming unrelated data. Capture original screenshots and clear recovery instructions. Confirm tool availability, shell assumptions, privacy and submission policies. Review the proposed reading order and register lesson metadata only through a separately reviewed integration. A passing local check grants no student access or formal award.

## Source basis
https://www.gnu.org/software/bash/manual/bash.html
https://www.gnu.org/software/bash/manual/html_node/Redirections.html
https://www.gnu.org/software/coreutils/manual/html_node/Setting-Permissions.html
https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html

## 2026-11-01 — package authoring review and selected recheck

The preceding five-check record is preserved historical text from source commit c0b4f2ff686bebb02e2aabdf67e93cec84edbbf1. It is not relabelled as today's complete lesson execution. This addition reviews the three actual lesson bodies, strengthens only EH-LINUX-03's independent brief and supplies shared instructor/marking/troubleshooting guidance. EH-LINUX-01, EH-LINUX-02, the catalogue/prerequisite graph, learner runtime and Community Learning are unchanged. No new canonical ID or execution permission is added.

Six selected command contracts matched in fresh private temporary directories with Bash --noprofile --norc, a minimal PATH and C locale. The [explicit scripts/results/tool versions](../authoring/LINUX-FOUNDATIONS-EXECUTION-2026-11-01.json) accompany this documentation batch; only those scripts were executed.

| Selected contract | Observed local result |
|---|---|
| Quoted filename/copy/comparison | Identical invented contents; comparison status 0 |
| Owned regular-file mode changes | 600 then 400, contents readable, restored 600 |
| Present-plus-absent listing | Useful output and a separate diagnostic; captured status 2 |
| Append then overwrite | Two lines before, replacement only afterward |
| Bash pipeline status | 0 without pipefail, 1 with pipefail in the demonstration |
| Instructor status-preservation example | Saved earlier status 2, later successful-command status 0 |

Important implementation limit: Bash 5.3.9, cp from GNU coreutils 9.7 and cmp from GNU diffutils 3.12 were reported, but chmod/stat/ls/cat reported uutils coreutils 0.8.0. This mixed authoring environment is NOT the prescribed supported GNU student guest. Matching a selected behavior does not authorize silently replacing that guest/tool route. The older record did not pin all these utility versions; do not infer that it used the same implementation set.

No ordinary-account enforcement, write denial, ACL, other-account access, student VM/hypervisor, hardware route, beginner/keyboard usability, independent student performance or assessor calibration was tested. The author sandbox's effective-UID flag is recorded; it cannot substitute for the non-root learner requirement. Script exit 0 does not mean every demonstrated subcommand succeeded: intentional nonzero statuses are part of the observation.

The shared staff guide is authoring/LINUX-FOUNDATIONS-INSTRUCTOR.md. Its placement is not access control and it must not be exposed through learner navigation. No complete answer script, runtime grader, pass mark, progress update or award is created. The instructor criteria require independent review/calibration and the actual private evidence policy before use with learners.

Authoring contribution only: X03/X05/X22/X23 and the foundation portion of K02. It does not close complete Linux administration, privilege escalation, a whole-programme milestone or course release. Full-checkout authoring checks and CI were not executed for this batch; no new CI framework/workflow is introduced. Publication, supported-platform reproduction and separate deployment/activation gates remain open.
