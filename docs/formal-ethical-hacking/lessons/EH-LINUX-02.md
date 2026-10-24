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
