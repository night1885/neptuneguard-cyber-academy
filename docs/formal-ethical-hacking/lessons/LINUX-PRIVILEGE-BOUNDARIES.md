# Linux privilege boundaries — from permissions to a defensible hypothesis

Draft supporting K02/K09 teaching. runtimeIntegration:false; publishable:false.
Not a canonical lesson, completed privilege-escalation pathway or permission to elevate.
Prerequisite reading: EH-LINUX-01 through EH-LINUX-05 and their original scope. This
package is reading/paper analysis only. It adds no command execution, host enumeration,
cross-account access, service restart, sudo use, special-mode change or exploit permission.

## The question changes after basic permissions

EH-LINUX-02 asks what a mode observation demonstrates. This lesson asks a different
question: can a lower-authority actor influence an operation performed with authority
that actor does not possess? A writable file is a fact to explain, not automatically a
privilege-escalation finding. A process named backup or root-helper is not proof of identity.

Write the proposed chain before choosing a tool:

    starting actor -> controlled input/object -> actual consumer -> consumer authority
                   -> reachable operation -> protected effect -> bounded evidence

Each arrow needs evidence. An absent arrow is an explicit unknown, not a reason to run
more intrusive commands. Permission to read teaching material never authorizes that test.

## Identity belongs to the operation

Linux processes have real, effective, saved and filesystem user/group IDs, plus
supplementary groups. Filesystem IDs normally track effective IDs but can differ.
Consequently a login name alone is not a complete description of an operation's authority.
Record which identity observation belongs to which process, operation, time and namespace.
Do not paste real account or host details into course submissions.

Linux capabilities split traditionally privileged operations into distinct units; effective
capabilities participate in kernel permission checks. A capability name on a file is not
by itself proof of the executed process's effective authority. Execution transitions,
bounding sets and namespace context matter. Likewise a set-user-ID mode observation is
not a complete exploitability result. Do not set these attributes to manufacture proof.
Consult the platform's actual documentation rather than assuming every guest matches a
current online manual. This lesson changes no credential or capability.

## What exactly can the starting actor control?

Distinguish reading contents, writing an existing inode, replacing a directory entry,
choosing an input path, choosing an argument and influencing executable search. These
are different authorities. File mode alone does not describe every path component, ACL,
mount, namespace or additional access control. A reported successful write is evidence
only for that identity/object/time, not every possible consumer's view of the path.

For a hypothetical replacement route, ask whether the containing directory permits the
specific replacement and whether sticky-bit, ACL or other restrictions apply. For an
argument route, ask whether the consumer treats the value as data, a path or executable
instructions. Do not infer shell interpretation just because a string resembles a command.
These questions are for supplied paper evidence here, not new filesystem probing.

## Connect control to the actual consumer

A schedule entry, service file or stale process listing can suggest a hypothesis. Establish
which configuration is effective, which exact path/input is consumed, whether the operation
is reached and which authority is in force at that point. A root-owned file is not the
same observation as a root-running consumer. A disabled or unreachable operation is not
an observed execution path. Do not restart a service to resolve uncertainty in this lesson.

For systemd, User=/Group= affect execution identity, and ExecStart/configuration determines
what is launched. Read the effective configuration and applicable execution rules in a
separately authorized assessment; the documentation includes prefixes and other details
that prevent treating one isolated directive as a complete security verdict. Absolute
paths can address one selection ambiguity but do not prove the selected file/dependencies
are protected from modification. An allowlisted command name alone similarly does not
establish safe argument or input behavior.

The earlier executable-search fixture demonstrates same-identity selection of fixed
helpers. It does not become a privilege-escalation demonstration by renaming a helper.
A new higher-authority consumer must be evidenced separately.

## State impact at the narrowest supported level

Examples of distinct claims: selected helper changed; privileged job consumed controlled
instructions; protected file changed; another identity was obtained. None automatically
proves the next. Data-only input may support an integrity concern without supporting code
execution. A privileged consumer does not justify claiming persistence, host takeover or
an unrestricted root shell. Do not create such effects to make a report more impressive.

Use these labels: supplied fictional fact, source-derived prediction, missing-link
hypothesis, observed bounded result, blocked or unattempted. The supplied cases cannot
produce a real observed result. A potential route deserves review even when exploitation
is not authorized, but its uncertainty must remain visible.

## Repair the relationship, not just the symptom

Propose the smallest justified change: separate untrusted writable data from executable
instructions, protect the consumed object and relevant directory entries, constrain
arguments/input semantics, or reduce the consumer's unnecessary authority. Identify which
arrow the repair removes. Do not prescribe chmod 777, recursive ownership changes or
blind removal of capabilities. Operational owners must review legitimate requirements.

A later approved retest needs both the forbidden influence case and the legitimate job,
verified effective configuration/identity, recovery plan and actual stored/output state.
A changed listing or successful service start alone is insufficient. No repair is applied
here; supported provisioning, isolation, authorized practical proof and recovery remain
future gates for the K09 pathway.

Complete [the investigation cases](LINUX-PRIVILEGE-CASES.md). Instructor author notes are
[separate](LINUX-PRIVILEGE-INSTRUCTOR.md); authoring limits are in
[the validation record](LINUX-PRIVILEGE-VALIDATION.md).

## Sources

Linux credentials: https://man7.org/linux/man-pages/man7/credentials.7.html
Linux capabilities: https://man7.org/linux/man-pages/man7/capabilities.7.html
systemd execution: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
systemd services: https://www.freedesktop.org/software/systemd/man/systemd.service.html
sudoers semantics: https://www.sudo.ws/docs/man/sudoers.man/

These references explain mechanisms, not this course's execution scope or certification
alignment. Version/platform details must be checked in a separately reviewed practical.
