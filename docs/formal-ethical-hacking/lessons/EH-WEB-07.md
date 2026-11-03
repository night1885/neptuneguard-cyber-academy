# EH-WEB-07 — Check filesystem boundaries as paths, not strings

Draft offline practical, not published. Requires EH-WEB-06, EH-LINUX-01 and the Python bridge in EH-WEB-04. This is authoring material, not activated runtime progression. Students use their own clean guest.

## Outcomes
Explain why a textual prefix is not a directory boundary, resolve a path before structural comparison, reproduce a symbolic-link case and identify the limits of a check-then-use design.

## Task and finish line
Trace the supplied path decision, reproduce the bounded sibling-prefix defect, make the component-aware repair and rerun the unchanged suite. Add the same legitimate-path and sibling-prefix cases. Finish with a diagram of the test-owned workspace, genuine results including skips, a minimal diff and a precise explanation of the stable-filesystem assumption. Do not turn a returned path into a claim that file contents were read.

## Scope and setup
Use only path_lab.py and test_path_lab.py in a disposable directory. The test suite creates its own temporary workspace with synthetic files and removes it afterward. A directory called outside in a test means outside the chosen allowed base but still inside that test-owned workspace. No personal or system-file content is read. No web request, hosted service or real application is involved.

Python 3.9 or later is required for the suggested is_relative_to API; author checks used 3.12.8. This is not a validated student-platform matrix. No pip, sudo or network access is required. Obtain course files through the approved offline material-transfer process. Stop if setup is unavailable instead of bypassing host policy.

Read the files before running. Do not replace fixture roots with your home directory, system directories, shared folders or real application paths. Do not introduce concurrent filesystem mutation, hard links, mount changes or platform-specific bypass experiments.

## Trace the decision
The function rejects absolute input, joins a requested relative path to an allowed base, resolves existing paths strictly, then compares their string representations. It returns a Path object or raises an exception. It does not open or return file contents and does not check which user owns a record.

A name such as allowed-extra begins with the characters allowed, but is not inside a sibling directory named allowed. Textual startswith therefore expresses the wrong invariant. Resolving dot segments does not by itself fix a mistaken containment comparison.

A symbolic link is a filesystem reference to another path. resolve follows the link and eliminates parent components in this exercise. The relationship must be checked on the resolved path, not merely on the original spelling. Python's is_relative_to method is a path relationship operation; used on unresolved paths it does not independently resolve symbolic links or eliminate parent traversal for you.

### Read the seven-method observer
The reviewed source package is fixtures/path-containment relative to the formal course directory. The tests create allowed, its nested child, a similarly named sibling and an outside.txt marker inside a private temporary workspace. The predicate returns a Path or raises; the synthetic marker contents are not opened by resolve_candidate.

The seven methods distinguish normal/nested returns, parent escape, sibling-prefix rejection, absolute-input rejection, a missing-path exception and a symlink-to-sibling case. assertRaises is a successful expected observation when the required exception occurs; a missing expected exception is an assertion failure. FileNotFoundError from strict resolution is not the same as the explicit ValueError policy denial. Do not weaken strict=True to conceal the distinction.

For each case, trace original input -> absolute-input gate -> resolved candidate/base -> containment decision -> returned path or exception. is_relative_to is a component relationship, not an independent symlink resolution step or a race-free open. A base-itself result is allowed by this contract; it is not proof of a regular file or ownership. Do not add file reads, races, mounts or host-policy changes to strengthen the demonstration.

## Predict and reproduce
In the fixture directory run:
```sh
python3 -m unittest -v test_path_lab
result=$?
printf 'test status=%s\n' "$result"
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

## Selected author recheck — batch EH-WEB-07 through 09
Source checkpoint 0d1e0f44eb234dabcf9a1a39104c251be33bf5e6. All six component/test sources were Git-blob verified. This lesson's starter exited 1 across 7 methods with 2 assertion failures and no test errors. A temporary reference passed the unchanged suite; that reference plus two author-only examples for the existing independent-case categories passed 9 methods. The two starter failures were sibling-prefix and symlink-to-sibling; symlink creation was available. Skips on other platforms still mean untested behaviour.

Across the batch, nine separate suite invocations ran in private temporary directories under Python 3.12.8 on POSIX, with no reported skips and unchanged original expectations. These are author checks, not independent learner results. The sandbox used effective UID zero, not the required ordinary student account. The downloadable batch record supplies source identities, commands, output and limits; it is not automatically a repository artifact or CI result. No temporary repair or author-edge module is installed or published with this update.

Supported guest/transfer/editor and Bash status-capture validation, filesystem races/cross-platform naming, nested/value schemas, real authorization/persistence, complete content inspection/storage/serving, browser/HTTP behaviour, full repository checks and assessor calibration remain untested here. Prior validation records retain their scope. Only lesson teaching changes: fixtures/tests, prerequisites, policies, independent tasks, optional links, catalogue, reading profiles and runtime/publication flags remain unchanged. No new permission, service, target, grade threshold, activation or deployment is added.
