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
