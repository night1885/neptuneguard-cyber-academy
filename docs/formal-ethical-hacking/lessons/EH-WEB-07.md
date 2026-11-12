# EH-WEB-07 — Check filesystem boundaries as paths, not strings

Draft offline practical, not published. Requires EH-WEB-06, EH-LINUX-01 and the Python bridge in EH-WEB-04. Proposed ID only; no runtime registration. Students use their own clean guest.

## Outcomes
Explain why a textual prefix is not a directory boundary, resolve a path before structural comparison, reproduce a symbolic-link case and identify the limits of a check-then-use design.

## Scope and setup
Use only path_lab.py and test_path_lab.py in a disposable directory. The test suite creates its own temporary workspace with synthetic files and removes it afterward. A directory called outside in a test means outside the chosen allowed base but still inside that test-owned workspace. No personal or system-file content is read. No web request, hosted service or real application is involved.

Python 3.9 or later is required for the suggested is_relative_to API; author checks used 3.12.8. This is not a validated student-platform matrix. No pip, sudo or network access is required. Obtain course files through the approved offline material-transfer process. Stop if setup is unavailable instead of bypassing host policy.

Read the files before running. Do not replace fixture roots with your home directory, system directories, shared folders or real application paths. Do not introduce concurrent filesystem mutation, hard links, mount changes or platform-specific bypass experiments.

## Trace the decision
The function rejects absolute input, joins a requested relative path to an allowed base, resolves existing paths strictly, then compares their string representations. It returns a Path object or raises an exception. It does not open or return file contents and does not check which user owns a record.

A name such as allowed-extra begins with the characters allowed, but is not inside a sibling directory named allowed. Textual startswith therefore expresses the wrong invariant. Resolving dot segments does not by itself fix a mistaken containment comparison.

A symbolic link is a filesystem reference to another path. resolve follows the link and eliminates parent components in this exercise. The relationship must be checked on the resolved path, not merely on the original spelling. Python's is_relative_to method is a path relationship operation; used on unresolved paths it does not independently resolve symbolic links or eliminate parent traversal for you.

## Predict and reproduce
In the fixture directory run:
```sh
python3 -m unittest -v test_path_lab
```
Capture the actual status promptly. Predict ordinary nested paths, parent traversal, absolute input, a nonexistent target, a similarly named sibling and a symbolic link into that sibling. Explain why a missing-path exception differs from an explicit outside-base rejection.

The test may skip symbolic-link creation where the platform does not permit it. Record any skip as untested behavior, not a pass. Do not elevate privileges or change host policy to remove a skip.

## Repair the invariant
Keep the absolute-input rule and strict resolution. Replace the string-prefix decision with a path-component-aware relationship check on the resolved candidate and resolved base. The exercise policy accepts the base itself or an existing descendant; it does not claim to enforce file type or per-user authorization.

Keep visible expectations unchanged. Do not reject every path or special-case the fixture names. Rerun the suite and add one legitimate path case and one additional sibling-prefix case, keeping all objects inside the test-owned workspace. Explain each expected result before execution.

## Why this is not a production file-access solution
The model assumes a stable filesystem while it checks paths. A path can change after validation and before a later open. This exercise does not test or solve time-of-check/time-of-use races, mount behavior, hard-link policy, permission changes or all operating-system naming rules. Returning a resolved path does not establish a race-free capability to read that file.

For real software, consider whether server-controlled resource identifiers can avoid arbitrary client paths at all, and review the actual operating-system file-opening and permission model. This lesson does not supply a universal secure-open implementation. Do not deploy the repaired teaching function as one.

Containment is also distinct from authorization: a file inside a directory may still belong to someone else or be inappropriate to disclose. Connect this limitation to EH-WEB-04 without combining the fixtures into an application.

## Deliverables
Submit scope, a workspace diagram, actual baseline and repaired results, skipped cases, minimal diff, added synthetic tests and limitations. Use only the approved private evidence workflow. Do not report file-content access or a production traversal exploit when you have only demonstrated a local decision error. Formal rubric calibration, student-platform reproduction and accessibility review remain pending.

Sources:
https://docs.python.org/3/library/pathlib.html
https://community.owasp.org/attacks/Path_Traversal

See OFFLINE-PATH-VALIDATION.md for the local author-check record.

## Expanded teaching: ask where a path really points, then compare it as a path

This supplement stays within the original disposable workspace. It adds no new filesystem experiment, hard link, mount or race. The fixture reads no personal or system content, and the predictions below come from reading the source, not from your run.

### Read the starter as a sequence of decisions

The starter performs four steps. It resolves the base strictly, so a missing base is an error. It rejects absolute input. It joins the requested relative path to the base and resolves that candidate strictly, so a missing target also raises an error. Finally it compares the two resolved paths as text and raises a rejection error if the text test fails.

Strict resolution follows symbolic links and removes parent components, and it raises an operating-system error when a path does not exist. Without strict mode, resolution goes as far as it can and appends the remainder without checking it. Python's documentation describes resolve as the method that eliminates parent components and follows symbolic links. That is why the order matters: the comparison should be made after resolution, on the resolved forms.

### Why the text comparison expresses the wrong invariant

The intended invariant is that the candidate is the base or lies below it in the directory tree. A text prefix test asks something different: do the leading characters match? A sibling named allowed-extra begins with the same characters as a base named allowed, so the text test accepts it even though it is not below the base.

A path-aware relationship check compares components, not characters. Python's is_relative_to returns true when one path is the other or lies beneath it, and the documentation notes that it is string-based and does not access the filesystem or treat parent segments specially. That is a reason to apply it to already resolved paths, not a reason to skip resolution. Using it on unresolved input would lose exactly the link and parent-component handling the exercise teaches.

### Predict the outcome for each class of input

Before running, classify each test input. A nested relative path that exists should be accepted. A parent traversal that resolves outside the base should be rejected. Absolute input should be rejected by the early rule. A target that does not exist should raise the operating-system error from strict resolution, which is a different outcome from the explicit outside-base rejection. The sibling with the shared prefix should be rejected after the repair. A symbolic link whose target lies in that sibling should also be rejected, because the check is applied to the resolved destination.

Write why the second and fourth outcomes differ: one is the function refusing a path that exists, the other is the filesystem reporting that nothing exists. They tell a reviewer different things and should not be merged in a report.

### Handle skips honestly

Creating a symbolic link may be refused on some platforms or accounts. A skipped test did not run its assertion. Record it as untested, and do not describe the link behavior as verified. Do not raise privileges or alter host policy to remove the skip. If your environment cannot create links, your report should say so and rely on the other cases.

### Choose added cases for the boundary

Your legitimate case should confirm that a real descendant is still accepted, since a repair that rejects everything fails the policy. Your sibling case should use a different shared-prefix name than the one in the fixture and keep every object inside the test-owned workspace. For each, write the expected result and the reason before running.

Resist adding exotic platform cases. Case-insensitive filesystems, alternate naming forms, hard links and mount points each have their own behavior and are outside this lesson's scope.

### What containment does and does not establish

Returning a resolved path says the path was inside the chosen base at the moment of the check. It does not open the file, and it does not guarantee the path will still refer to the same object later. A path can change between a check and a later open. That gap is a time-of-check to time-of-use problem, and the exercise does not test or solve it.

Containment is also separate from authorization. A file below the base may still belong to a different learner or be inappropriate to disclose. When real software must serve files, a stronger design avoids client-supplied paths altogether by using server-controlled identifiers that map to stored objects, combined with the operating system's own permission model. This is a paper design question, not a secure-open implementation or a request to build one.

### Keep the claim at its level

Your finding is that a local decision function used the wrong comparison. It is not a demonstration that file contents were read or that a production service was traversed. Report accordingly, and do not describe the repaired function as a secure file-access solution.

### Bounded human-led AI review

Draw your own diagram of the base, the sibling and the link first. If an approved assistant is available, give it only the tiny synthetic function and a description of the workspace layout. Ask which comparison is textual, which is structural and what the repair leaves unproven. Reject suggestions to test real directories, add concurrency, change host permissions or deploy the function. A manual walkthrough meets the same objective.

### Formative questions with explained answers

1. Why does allowed-extra pass a prefix test for allowed? The characters match even though the directory is a sibling.
2. Why resolve before comparing? Links and parent segments change where a path actually points.
3. Is a missing-target error the same as an outside-base rejection? No. One is a filesystem report, the other a policy decision.
4. Does a skipped link test show the link case passes? No. It means the case was not exercised.
5. Does containment prove a file is safe to disclose? No. Authorization and race conditions are separate questions.

Technical basis: Python pathlib documentation, https://docs.python.org/3/library/pathlib.html , and the OWASP path traversal reference cited above. No new filesystem test, platform reproduction or assessor calibration is claimed by this supplement.
