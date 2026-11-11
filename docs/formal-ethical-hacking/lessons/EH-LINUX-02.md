# EH-LINUX-02 — Understand file permissions

Draft, not published. Requires EH-LINUX-01 and its disposable guest workspace. Use your normal non-root account. No privilege escalation, system-file changes or cross-account testing is authorized.

## Outcomes
Interpret owner/group/other mode bits, make a narrow permission change to an owned file, and explain why mode bits alone do not prove confidentiality.

## Read the model
For a regular file, read permits reading contents, write permits modifying contents, and execute contributes to permission to execute it. Ownership, directory access, ACLs and other controls also matter. For a directory, read concerns listing names, write concerns directory entries, and execute concerns searching/traversing it. Deleting a file depends importantly on its containing directory, not merely on the file's write bit. This lesson changes only the regular file created in the preceding exercise.

In a basic long listing, the first character identifies file type and the following nine characters represent owner, group and other read/write/execute bits. A symbolic link points elsewhere; do not change permissions on an unfamiliar link. chmod can affect its target rather than the link itself. Never apply recursive permission changes to solve a problem you have not diagnosed.

## Inspect, change, inspect again
Confirm the guest identity and enter the exact workspace from EH-LINUX-01. Check that scope note.txt is the regular disposable file you created, not a link or unrelated document.
```sh
ls -l -- 'scope note.txt'
chmod u=rw,go= 'scope note.txt'
stat -c '%a %A' -- 'scope note.txt'
chmod u=r,go= 'scope note.txt'
stat -c '%a %A' -- 'scope note.txt'
cat -- 'scope note.txt'
chmod u=rw,go= 'scope note.txt'
```
Read the modes after each change rather than assuming success. u is the owner class, g the group class and o others; = sets the specified class permissions. The first change produces mode 600 and the second 400 on the fixture. In octal notation, read contributes 4, write 2 and execute 1 within each class. These numbers are a representation of mode bits, not a security score.

The owner's read permission explains why cat can still read after the second change. The final command restores owner read/write for later work. No write-denial test is claimed here: privileged execution and other environment differences can make simplistic demonstrations misleading. Do not switch to root or test against another person's files.

## Reasoning task
A learner says: 'The file is 600, therefore nobody else can ever obtain its contents.' Explain why that claim exceeds the observation. Consider privileged access, copies, backups, shared folders and additional access-control mechanisms. Do not attempt to access other accounts to prove the point.

Another learner proposes chmod 777 to fix a read error. Identify the unknowns that should be investigated first: correct file, path traversal, identity, ownership, existing mode and additional controls. State a least-privilege correction only when the cause and authority are established.

## Independent work
Create a new disposable note inside the same workspace. Make it owner-readable only, record its mode, explain the difference from owner read/write, and restore owner read/write. Do not modify the directory permissions or unrelated files. Explain one limitation of what your evidence demonstrates.

## Assessment
Evidence should show the intended regular file, actual mode observations, reasoning and final state. Do not submit sensitive file contents. Review for scope discipline and understanding, not just the presence of a chmod command. Formal grading remains pending rubric calibration.

## Sources and validation
GNU symbolic permissions: https://www.gnu.org/software/coreutils/manual/html_node/Setting-Permissions.html
GNU chmod behavior: https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html
Local sandbox checks observed 600 then 400 for the owned fixture. Access denial as a separate non-root user, ACL behavior and supported student guests were not tested.

## Reading-only follow-up — privilege-boundary reasoning
After the follow-up's stated prerequisite reading, use [Linux privilege boundaries](LINUX-PRIVILEGE-BOUNDARIES.md) to distinguish writable-object observations from evidence of a higher-authority consumer. Its four fictional investigation cases add no command execution or escalation permission. All original limits of this lesson remain unchanged; an authorized, validated privilege-escalation practical is still separate work.

## Expanded teaching: permissions are a model, not a confidentiality guarantee

All practical changes remain restricted to the owned regular disposable notes named in the existing exercise. Directory changes, cross-account testing, ACL changes, privilege escalation and recursive permission operations are not introduced. The scenarios below are FICTIONAL reading exercises.

### Ask who, which object and which operation

A permission question is incomplete without an actor, an object and an attempted operation. “Can access the file” might mean reading its contents, changing those contents, executing it, reaching its directory entry or removing that entry. These are different questions.

The basic owner/group/other bits provide a useful model for ordinary access checks. They do not inventory every applicable control or privileged capability. Avoid treating permission classes as independent votes that can simply be added together; the relevant class depends on process identity and the file's ownership/group context, with additional mechanisms potentially affecting the outcome.

The original listing and stat observations describe the fixture's reported state. They do not demonstrate another user's actual access, nor does this lesson authorize creating another account to obtain that demonstration. Reasoning about a boundary and testing it across accounts are separate activities.

### Decode the two modes already used

The three octal digits represent owner, group and other permission bits. Within each digit, read contributes four, write two and execute one. Mode 600 gives owner read/write with no group/other permissions in those ordinary bits. Mode 400 gives owner read only in the same model.

In u=rw,go=, the equals operation sets the named classes rather than merely adding one permission to an unknown starting state. Explicitly naming the classes helps make the intended ordinary-bit result clear. Read the resulting mode after the change, because typing a command is not evidence that it succeeded.

In the original sequence, cat can still read the fixture after the change to 400 because owner read remains. The final change restores owner read/write for later work. This is not a claim that a write-denial test was performed, and it is not a promise that privileged processes are denied.

### Files and directories answer different questions

A file's write bit concerns modification of its contents. A directory's permissions concern operations involving its entries and traversal. Removing a name is consequently not answered by looking only at that file's mode. Other controls, including restricted-deletion behavior, can matter as well.

FICTIONAL case: a report claims a note cannot be removed because the note is owner-read-only. The claim lacks evidence about the containing directory and applicable controls. Correct the report by separating contents modification from removal of a directory entry. Do not change directory modes or attempt deletion to demonstrate the distinction in this lesson.

Likewise, being able to list a name is not identical to being able to open the named object. Path components and the object itself can impose different requirements. A read error should lead to a bounded diagnosis, not an automatic broad permission change.

### Links make object identity important

A symbolic link is a reference to another path. GNU chmod normally acts on the target of a symbolic link supplied as a command-line operand rather than changing the link's own mode. A familiar-looking filename therefore does not establish that the intended disposable regular file is the object being changed.

Inspect the fixture as directed before modifying it. If it has unexpectedly become a link or its identity is otherwise unclear, stop. Quoting the name preserves argument boundaries; it does not neutralize an unexpected reference. Do not create links to personal or system files to experiment with this behavior.

### Worked least-privilege diagnosis — FICTIONAL

A learner cannot read a file and proposes mode 777. The proposed change bundles several permissions without establishing which operation failed, whose access was checked or whether this is the intended object. It can broaden access without fixing a wrong path or a different applicable restriction.

A defensible analysis identifies the normal guest account, exact path, expected ownership, ordinary mode, object type and relevant error. State which evidence is missing. Apply only a documented authorized correction after the cause is established; otherwise submit a blocker. This is a decision framework, not permission to alter additional controls.

### Why 600 is not encryption

Mode bits do not transform file contents into ciphertext. Copies, backups, snapshots, privileged access and host integrations are separate considerations. Even a correctly configured fixture can have an earlier copy elsewhere. A claim about one object's ordinary permissions must not become a claim about every copy of its contents.

An appropriate conclusion is “the fixture reported mode 600 after the authorized change,” accompanied by the actual observation and context. “Nobody else can ever obtain this information” is not supported by that evidence.

### Exercises and explained answers

1. Why does cat still read the fixture at 400? The owner's read bit remains set; the exercise removes owner write, not owner read.
2. Is 777 a repair for any permission error? No. It grants broad ordinary permissions without diagnosing identity, path, object type or other controls.
3. Does a mode observation prove another account was denied? No. It records configuration, not an executed cross-account access test.
4. Does making one copy 600 protect every backup? No. The claim concerns that object and applicable controls, not all copies or storage locations.
5. A fixture unexpectedly appears as a symbolic link. Should you proceed because its name is correct? No. Stop and resolve object identity; the operation may affect a different target.

For independent work, retain the original create/change/observe/restore procedure only. Record the final state genuinely; do not replace a failed observation with the expected octal value.

Technical reading: GNU Coreutils, Setting Permissions, Mode Structure and chmod invocation. ACLs, cross-account denial and supported-guest behavior remain outside the demonstrated practical.
