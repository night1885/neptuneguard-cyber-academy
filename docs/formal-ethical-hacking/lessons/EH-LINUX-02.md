# EH-LINUX-02 — Understand file permissions

Draft, not published. Requires EH-LINUX-01 and its disposable guest workspace. Use your normal non-root account. No privilege escalation, system-file changes or cross-account testing is authorized. Community Learning is unchanged. This document is not actual lab authorization, a validated guest route or a grading service.

## Outcomes
Interpret owner/group/other mode bits, make a narrow permission change to an owned file, and explain why mode bits alone do not prove confidentiality.

## Your task and finish line
Inspect the existing owned regular file scope note.txt, apply the existing owner read/write -> owner read-only -> restored owner read/write sequence, and record the actual modes. Complete the existing two reasoning prompts and the new-note independent task. Finish with owner read/write restored and an explanation of what was and was not demonstrated.

The guided changes concern only scope note.txt. The independent task changes only its separately created disposable note in the same workspace. Do not change directory modes, other accounts, ownership, ACLs, services or system configuration. Streams and pipelines remain in EH-LINUX-03; an escalation practical is not part of this lesson.

## 1. Read the permission model before changing anything
For a regular file, read permits reading contents, write permits modifying contents, and execute contributes to permission to execute it. An execute bit is not a claim that the contents are a safe or valid program. No execution-bit experiment is required here.

The ordinary mode classes describe the owner, file group and others. They are not a list of individually authenticated people or an absolute confidentiality guarantee. Ownership, directory access, ACLs, privileged access and other controls can affect the real result. Do not add the class bits together and treat the total as a security score.

| Object | Read concerns | Write concerns | Execute concerns |
|---|---|---|---|
| Regular file | Reading its contents | Modifying its contents | Permission contributing to execution |
| Directory | Listing names | Changing directory entries | Searching/traversing the directory |

This distinction explains why a file's write bit is not the whole rule for deleting that file. Its containing directory, traversal and additional controls also matter. This is conceptual teaching, not permission to test deletion or change directory modes. A read-only regular file is not automatically undeletable or protected from every other access path.

### Read a basic long listing
In the existing ls -l view, the first character identifies the object type. A regular file begins with -, a directory with d and a symbolic link with l. The following nine ordinary permission positions are three groups: owner rwx, group rwx and other rwx. A dash in a permission position means that particular bit is not set. Other indicators and controls can require additional interpretation.

A symbolic link points elsewhere. Do not change permissions on an unfamiliar link: GNU chmod follows command-line symbolic-link operands to their pointed-to files. A familiar filename is not enough to identify the safe target. Never use recursive permission changes to solve an unexplained problem.

## 2. Understand the tools and permitted effects
| Tool/notation | Role in this lesson | Limit |
|---|---|---|
| Existing guest/account and path checks | Confirm the intended ordinary guest session and exact workspace | A prompt or hostname alone is not authorization |
| ls -l | Inspect the named file's type, owner and ordinary permission display | Not a complete effective-access or confidentiality audit |
| chmod | Change the selected owned file's permission bits | Changes state; do not apply it to links, directories or unrelated data |
| u, g, o | Select owner, group and other classes | Classes do not name every possible privileged actor or stored copy |
| = | Set the selected class permissions to exactly the stated ordinary permissions | Not the same operation as adding one bit with + |
| stat -c '%a %A' | Display numeric and symbolic mode information for the selected object | Shows metadata, not a completed write-denial test |
| cat | Read the invented fixture text locally | Readback does not prove no one else could obtain it |

Use the prescribed Bash/GNU guest route and local tools. A different implementation's matching output is not approval to substitute it silently. Missing tools, uncertain identity or a mismatched workspace are provisioning/review blockers, not reasons to install packages, switch accounts or use sudo.

## 3. Pre-flight — identify the exact owned regular file
1. Reuse EH-LINUX-01's guest/account orientation and enter the exact disposable workspace recorded there. If that lesson used a fresh alternate directory name, use the recorded name rather than a guessed default. Do not paste these operations into the host terminal.
2. Confirm the ordinary account, location and intended file before any change. If you are root, ownership is uncertain or the file belongs to another account, stop and use the approved support process. Do not change ownership or escalate to make the demonstration work.
3. Inspect only the existing named fixture:

```sh
ls -l -- 'scope note.txt'
```

Confirm it is the regular disposable file you created, not a directory, symbolic link or unrelated document. Record the actual relevant mode/type/ownership observations without publishing unnecessary account names. If the file is absent or unfamiliar, resolve the earlier workspace problem rather than create replacement data and claim it is the original.

4. Predict each proposed mode and its meaning before running the change. Predictions and the table below are not actual output. Execute one command at a time and inspect its result; do not continue through a failure just because the next printed command exists.

## 4. Inspect, change, inspect again
### Step A — owner read/write only
Run the existing narrow change and its metadata check:

```sh
chmod u=rw,go= 'scope note.txt'
stat -c '%a %A' -- 'scope note.txt'
```

u=rw sets the owner class to read and write. The comma separates the next mode clause; go= sets group and other ordinary permissions to none. There are no spaces inside the symbolic mode. These are command arguments, not a numerical score or an instruction to edit the file contents.

For this clean regular fixture, the expected ordinary mode is 600, with the basic symbolic display -rw-------. Record the actual observation. If it differs, the change fails or additional state is unexplained, stop and investigate within the approved process rather than broaden the permissions.

### Step B — owner read-only
Run the existing second change and check:

```sh
chmod u=r,go= 'scope note.txt'
stat -c '%a %A' -- 'scope note.txt'
cat -- 'scope note.txt'
```

The expected ordinary mode is 400, with the basic symbolic display -r--------. The owner still has read permission, which explains why a correctly configured ordinary owner session can read the fixture. Observe your own result rather than copy the expected text.

This is not a write-denial test. Do not attempt to overwrite, delete or execute the note, switch to another account or become root to prove a point. A successful read as root in an author sandbox cannot validate ordinary-account access enforcement. Additional environment/control differences also require care when interpreting results.

### Step C — restore and verify owner read/write
Use the existing restoration and explicitly inspect its result:

```sh
chmod u=rw,go= 'scope note.txt'
stat -c '%a %A' -- 'scope note.txt'
```

Confirm the actual final 600 ordinary mode rather than assume the last chmod succeeded. The final stat readback makes restoration observable; it does not add a new permission change. If restoration fails, record the blocker and request the approved correction instead of applying a broad recursive command.

### Relate symbolic and numeric forms
Within each ordinary class, read contributes 4, write 2 and execute 1. Owner read/write is 4 + 2 = 6; owner read-only is 4. Group and other have zero ordinary bits in this exercise.

| Intended state | Owner | Group | Other | Expected numeric mode |
|---|---|---|---|---|
| Initial narrow owner read/write setting | rw- | --- | --- | 600 |
| Owner read-only setting | r-- | --- | --- | 400 |
| Restored owner read/write | rw- | --- | --- | 600 |

These are expected mode representations for the selected fixture, not captured results, proof of absolute confidentiality or a required starting mode before Step A. Record the original mode separately if relevant; do not invent one to match the table.

## 5. Interpret only what the observations support
The sequence observes selected mode bits and local readback. It does not enumerate every access mechanism, demonstrate write denial, encrypt the contents or revoke existing copies. A permission change is not evidence that every backup, shared path or privileged consumer is inaccessible.

Keep four things separate in your explanation: the identified target, the command actually used, the metadata/result actually observed and the inference justified by that observation. An expected mode printed in documentation is not your execution evidence. Neither a familiar file listing nor a successful final command proves that all earlier steps were correct.

If a permissions error occurs, preserve the minimal relevant observation and review identity, correct path, file type, ownership, current mode, directory traversal and additional controls. Do not use chmod 777 as a generic repair. This lesson authorizes no directory, ACL, ownership or cross-account experiment to investigate those possibilities.

## 6. Existing reasoning tasks
A learner says: 'The file is 600, therefore nobody else can ever obtain its contents.' Explain why that claim exceeds the observation. Consider privileged access, copies, backups, shared folders and additional access-control mechanisms. Do not attempt to access other accounts to prove the point.

Another learner proposes chmod 777 to fix a read error. Identify the unknowns that should be investigated first: correct file, path traversal, identity, ownership, existing mode and additional controls. State a least-privilege correction only when the cause and authority are established.

These remain the existing two reasoning prompts, not additional practical targets. Use evidence and clearly identified unknowns rather than invent a successful access-control test. Distinguish explaining a possible cause from receiving permission to test it.

## 7. Existing independent work
Create a new disposable note inside the same workspace. Make it owner-readable only, record its mode, explain the difference from owner read/write, and restore owner read/write. Do not modify the directory permissions or unrelated files. Explain one limitation of what your evidence demonstrates.

Use a fresh identified filename and invented non-sensitive content. Check the target is your regular file before each change. Preserve actual initial/read-only/restored observations as applicable; a copied guided transcript does not demonstrate an independent result. Record any guided correction separately from an independent first attempt.

Do not turn this task into a denial, deletion, execution or other-account test. A missing prerequisite or unresolved target identity is a reason to stop, not use elevated privileges. Leave the identified files and restored owner read/write state for the next lesson and review.

## 8. Evidence, feedback and next-lesson gate
Evidence should show the intended regular file, actual mode observations, reasoning and final state. Do not submit sensitive file contents or unnecessary usernames/group details. Minimal relevant redacted text is acceptable; screenshots are not mandatory.

| Existing assessment focus | Evidence/explanation to look for |
|---|---|
| Scope and target | The ordinary guest account's owned regular fixture in the existing disposable workspace, not a link or unrelated object |
| Mode interpretation | Correct owner/group/other grouping and explanation of the selected symbolic/numeric modes |
| Actual changes | Recorded observations distinguished from predictions and documentation examples |
| Reasoning | Explicit limits, including why mode 600 is not absolute confidentiality and why broad repair is unjustified |
| Independent work | The separately identified disposable note and actual read-only/restored observations |
| Final state | Observed owner read/write restoration and any unresolved blocker |

Review for scope discipline and understanding, not just the presence of a chmod command. Feedback should identify the specific incorrect class, unsupported inference or missing observation and request a bounded correction. Do not ask for an out-of-scope access test to make the explanation look stronger. Formal grading remains pending rubric calibration; no numeric threshold, resubmission count or automatic progression rule is established here.

Use only the approved private evidence route after access, collection and retention policies exist. This document supplies no collection system. Keep fictional predictions, actual results and guided revisions distinct. A truthful partial record is reviewable but does not establish that a missing restoration or prerequisite was completed.

Proceed with EH-LINUX-03 only through the actual course review process and its stated prerequisites. Keep the existing workspace and identified files; no recursive deletion, reset, runtime completion, award or expanded permission is granted by reading or submitting this lesson.

## Sources and selected validation limits
GNU symbolic permissions: https://www.gnu.org/software/coreutils/manual/html_node/Setting-Permissions.html
GNU chmod behavior: https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html

The earlier Linux foundations validation records are unchanged. For this expansion, five selected contracts matched in private temporary author fixtures: main mode sequence 600 -> 400 -> 600 with final readback; local cat readback at mode 400; unchanged main-file contents across changes; selected independent-note 400 -> 600 mechanics with unchanged contents; and unchanged containing-directory mode plus unchanged unrelated author-sentinel mode/content. The sentinel was author-only test support, not a new learner exercise.

Bash --noprofile --norc ran with a minimal PATH and C locale. Bash reported 5.3.9, while chmod, stat and cat reported uutils coreutils 0.8.0. The sandbox's effective UID was zero. These selected metadata/content checks are not the prescribed ordinary-account GNU learner environment, independent student performance or a write-denial result. The separately downloadable scripts/results record is not automatically a repository artifact or CI run.

Non-root enforcement, other-account access, ACLs, symbolic-link behavior, directory access enforcement, privilege escalation, supported guest/hardware reproduction, the complete interactive lesson, full repository checks and assessor calibration were not tested for this expansion. Publisher documentation supports the explanations, not a claim that these release gates are complete.

## Reading-only follow-up — privilege-boundary reasoning
After the follow-up's stated prerequisite reading, use [Linux privilege boundaries](LINUX-PRIVILEGE-BOUNDARIES.md) to distinguish writable-object observations from evidence of a higher-authority consumer. Its four fictional investigation cases add no command execution or escalation permission. All original limits of this lesson remain unchanged; an authorized, validated privilege-escalation practical is still separate work.

## Authoring boundary
This changes only the existing EH-LINUX-02 teaching. It preserves EH-LINUX-01 as its prerequisite, the owned-file mode sequence, original reasoning prompts, original independent task and reading-only follow-up. No canonical lesson ID, prerequisite edge, network target, runtime integration, publication flag, private-data adapter, Discord handler, database change or deployment is introduced. Supported-platform validation, independent review, rubric calibration and actual private-delivery policies remain open before learner release.
