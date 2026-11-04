# EH-WEB-08 — Restrict which properties an update may change

Draft offline practical, not published. Requires EH-WEB-04, EH-WEB-07 and the Python reading bridge. This is authoring material, not activated runtime progression. Student-built clean guests remain the environment.

## Outcomes
Explain mass assignment, separate object-level authority from editable-field policy, reproduce protected-field changes and test an explicit allow-list repair.

## Task and finish line
Trace the supplied current/changes dictionaries, reproduce the protected-field acceptance, implement the exact title/body allow-list and rerun the unchanged suite. Complete the existing title-only and mixed-new-field cases plus the paper authorization explanation. Finish by separating field acceptance, value validation, object authority and persistence. No API or additional practical is created.

## Scope and preparation
Use only update_lab.py and test_update_lab.py in a fresh disposable directory. The fixture works on synthetic Python dictionaries in memory. It has no HTTP endpoint, database, authentication, real record or persistent state. Do not connect it to a service or import the starter into academy runtime.

Python 3 with unittest is required; author checks used 3.12.8, not a validated student-platform matrix. No pip, sudo or network access is needed. Read both files and obtain them through the approved course-material transfer procedure. If setup is unavailable, report the blocker instead of bypassing device or network policy.

## Understand the boundary
The current dictionary represents an internal record. The changes dictionary represents proposed client-controlled updates. Python's update method copies every supplied key/value into the destination dictionary, replacing existing values or adding new fields. That convenience does not decide which fields a caller should control.

Mass assignment becomes a security problem when input can initialize or change properties outside the caller's authority. The local model illustrates the mapping mistake; it does not demonstrate a real API compromise. OWASP recommends dedicated input objects or explicit field allow-lists, alongside separate authorization.

## Exact fictional policy
For this narrow operation, only title and body are editable. owner_id, state, grade and any unknown field must be rejected, even if the proposed value equals the current value. An empty update is allowed. A mixture of allowed and forbidden keys is rejected as a whole. The original dictionary must remain unchanged; successful updates return a separate dictionary.

The exercise assumes well-formed flat dictionaries and does not set value-type, length, Unicode or nested-object validation rules. Do not invent a complete schema from these field names. A real endpoint needs an explicit value schema and lifecycle/object authorization as well.

### Read the eight-method observer
The reviewed source package is fixtures/field-policy relative to the formal course directory. Its eight methods cover a legitimate title/body result, empty input, unchanged source/separate result, protected owner/grade/state fields, whole-operation mixed rejection and an unknown future field. A copied dictionary can leave the original unchanged while still returning an impermissibly changed internal property; those are separate conditions.

Trace supplied keys -> complete editable-set check -> permitted copy/update or ValueError. Key presence matters even if the proposed value is unchanged. Do not accept a request merely because the resulting sensitive value looks harmless. If mixed input is rejected, preserve the original; do not silently apply title and ignore the forbidden field. A rejection assertion can stop before a later source-preservation assertion, so explain what the actual failed method reached.

The copy is shallow and the policy assumes flat well-formed dictionaries. Passing field tests does not validate nested inputs, lengths/types, object ownership, HTTP mapping or a database transaction. Keep those missing layers in the paper explanation rather than implementing them here.

## Predict and reproduce
Read each visible test and predict its result. From the fixture directory run:
```sh
python3 -m unittest -v test_update_lab
result=$?
printf 'test status=%s\n' "$result"
```
Capture actual output and exit status. The starter accepts fields outside the stated policy. Explain how its return value changes, and why copying the source dictionary does not fix the protected-property problem. Do not submit the author's local output as your own.

## Repair with an explicit editable set
Before constructing a successful result, check all supplied keys against exactly the permitted title/body set. Reject the operation with ValueError if any key is outside it. Preserve legitimate updates and the unchanged-source behavior. Keep visible test expectations intact.

Do not block only the known sensitive field names: a future internal field could otherwise become writable by default. Do not silently discard forbidden keys in this exercise, because that would contradict its explicit rejection policy. Other application contracts may choose differently; the required behavior must be specified and tested rather than guessed.

The mixed-input test's atomicity concerns this in-memory operation only. It does not prove database transactions, concurrent updates, rollback or distributed consistency. A shallow copy is sufficient for the fixture's scalar values but does not isolate arbitrary nested mutable objects.

## Test independently
Add one legitimate title-only update and one request containing an allowed key plus a new forbidden key. Predict results before running. Also explain, on paper, why a correctly allow-listed update could still be unauthorized if it targets another student's record. Do not combine this mapper with the earlier policy fixture and claim you have built a secure API.

## Optional paper extension — API authorization boundaries
Use the fictional [API authorization case pack](API-AUTHORIZATION-CASEPACK.md) and [blank worksheet](API-AUTHORIZATION-WORKSHEET.md) to compare object-, property- and function-level decisions. The case pack uses the same explicit whole-request rejection rule for mixed editable/forbidden keys. It adds no live target, practical permission, required deliverable or new prerequisite. No API is implemented or tested, and the existing fixture and test expectations are unchanged.

## Deliverables and limits
Submit the field policy, actual baseline and repaired results, minimal diff, independent cases and limitations. Distinguish accepting a field name from validating its value, authorizing a resource and persisting a change. None of those controls substitutes for the others.

Use synthetic values only and the approved private evidence workflow. Formal grading, learner calibration, offline transfer validation and supported-guest reproduction remain pending. No deployment or automatic access decision follows.

Source: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html
See FIELD-POLICY-VALIDATION.md for local author checks.

## Selected author recheck — batch EH-WEB-07 through 09
Source checkpoint 0d1e0f44eb234dabcf9a1a39104c251be33bf5e6. All six component/test sources were Git-blob verified. This lesson's starter exited 1 across 8 methods with 5 assertion failures and no test errors. A temporary reference passed the unchanged suite; that reference plus two author-only examples for the existing independent-case categories passed 10 methods. The five starter failures concerned owner, grade, state, mixed rejection and unknown-field rejection; added author examples covered title-only and a mixed new forbidden key.

Across the batch, nine separate suite invocations ran in private temporary directories under Python 3.12.8 on POSIX, with no reported skips and unchanged original expectations. These are author checks, not independent learner results. The sandbox used effective UID zero, not the required ordinary student account. The downloadable batch record supplies source identities, commands, output and limits; it is not automatically a repository artifact or CI result. No temporary repair or author-edge module is installed or published with this update.

Supported guest/transfer/editor and Bash status-capture validation, filesystem races/cross-platform naming, nested/value schemas, real authorization/persistence, complete content inspection/storage/serving, browser/HTTP behaviour, full repository checks and assessor calibration remain untested here. Prior validation records retain their scope. Only lesson teaching changes: fixtures/tests, prerequisites, policies, independent tasks, optional links, catalogue, reading profiles and runtime/publication flags remain unchanged. No new permission, service, target, grade threshold, activation or deployment is added.
