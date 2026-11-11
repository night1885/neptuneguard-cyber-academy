# EH-WEB-08 — Restrict which properties an update may change

Draft offline practical, not published. Requires EH-WEB-04, EH-WEB-07 and the Python reading bridge. Proposed ID only, not runtime registration. Student-built clean guests remain the environment.

## Outcomes
Explain mass assignment, separate object-level authority from editable-field policy, reproduce protected-field changes and test an explicit allow-list repair.

## Scope and preparation
Use only update_lab.py and test_update_lab.py in a fresh disposable directory. The fixture works on synthetic Python dictionaries in memory. It has no HTTP endpoint, database, authentication, real record or persistent state. Do not connect it to a service or import the starter into academy runtime.

Python 3 with unittest is required; author checks used 3.12.8, not a validated student-platform matrix. No pip, sudo or network access is needed. Read both files and obtain them through the approved course-material transfer procedure. If setup is unavailable, report the blocker instead of bypassing device or network policy.

## Understand the boundary
The current dictionary represents an internal record. The changes dictionary represents proposed client-controlled updates. Python's update method copies every supplied key/value into the destination dictionary, replacing existing values or adding new fields. That convenience does not decide which fields a caller should control.

Mass assignment becomes a security problem when input can initialize or change properties outside the caller's authority. The local model illustrates the mapping mistake; it does not demonstrate a real API compromise. OWASP recommends dedicated input objects or explicit field allow-lists, alongside separate authorization.

## Exact fictional policy
For this narrow operation, only title and body are editable. owner_id, state, grade and any unknown field must be rejected, even if the proposed value equals the current value. An empty update is allowed. A mixture of allowed and forbidden keys is rejected as a whole. The original dictionary must remain unchanged; successful updates return a separate dictionary.

The exercise assumes well-formed flat dictionaries and does not set value-type, length, Unicode or nested-object validation rules. Do not invent a complete schema from these field names. A real endpoint needs an explicit value schema and lifecycle/object authorization as well.

## Predict and reproduce
Read each visible test and predict its result. From the fixture directory run:
```sh
python3 -m unittest -v test_update_lab
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

## Expanded teaching: decide what may change before deciding what does change

This supplement uses only the existing in-memory dictionary fixture. It adds no endpoint, database, schema experiment or new fixture code. The predictions come from reading the starter and are not your execution results.

### Read the starter as a copy followed by a merge

The starter makes a copy of the current record and then applies every supplied key and value to that copy. Two facts follow. The original dictionary is not modified, because the work happens on a copy. But the merge accepts any key, so a caller can replace a protected value or add a field that did not exist.

Copying protects the source from mutation; it does not decide which fields are the caller's to change. Those are separate properties, and the fixture's tests check both. A repair that only improves copying would leave the protected-field problem untouched.

### Turn the policy into a precise rule

Write the editable set explicitly: title and body. Then restate each policy sentence as a testable condition. Every supplied key must belong to the set. A forbidden key is rejected even when its proposed value equals the current value, because the rule is about which fields a caller may address, not about whether the value changes. An empty update is allowed and returns a separate dictionary. A request mixing allowed and forbidden keys is rejected as a whole, with the original left unchanged.

These are the fixture's rules, not a universal API contract. OWASP describes the underlying idea: restrict bindable fields with dedicated input objects or explicit allow-lists, and treat a block-list as fragile because a new or overlooked sensitive field remains writable.

### Why an allow-list differs from a block-list in practice

Consider a record that later gains an internal field. Under a block-list that names owner_id, state and grade, the new field is writable until someone remembers to add it. Under an allow-list of title and body, the new field is rejected by default. The difference is the default outcome for the unknown case, which is the case that matters over time.

The same reasoning explains why silently discarding forbidden keys contradicts this exercise. Discarding turns a rejected request into a partially applied one and hides the attempt. The fixture's policy chooses whole-request rejection with a clear error, so your repair should do exactly that. A different application might choose another contract, but it must be specified and tested, not guessed.

### Predict the visible behavior

Before running, classify the supplied tests. A title-only change should succeed and leave the original untouched. A body-only change likewise. An empty change should return an equal, separate dictionary. A request naming a protected field should raise ValueError, including when the value matches the current one. A request that adds an unknown field should be rejected. A mixed request should be rejected and leave the original unchanged.

Explain why the mixed-request outcome is described as atomic in this model: no partial result escapes. That statement concerns this in-memory operation. It says nothing about database transactions, concurrent updates or rollback in a real system.

### Separate four different questions

A real update involves several independent checks, and this fixture exercises only one. Is the field name allowed? Is the value acceptable in type, length and content? Is this caller authorized to change this particular record? Is the change persisted correctly? A correct allow-list answers the first question only.

Hold the second and third questions apart explicitly. A request that changes only title can still be unauthorized if it targets another learner's record, which is the lesson EH-WEB-04 taught. OWASP notes that field restrictions do not replace authorization for the requested object and operation. Do not combine this mapper with the earlier policy fixture and describe the result as a secure API.

### Mind the limits of the copy

The fixture's values are scalars, so a shallow copy is enough. If a value were a nested mutable object, the copy would share it with the original and a later change could alter both. That situation is outside the exercise, but it is a good reminder that independence of copies depends on the data. Flat, well-formed dictionaries are an explicit assumption here.

### Independent cases, reasoned first

For the title-only case, state the expected returned dictionary and that the source stays equal to its starting value. For the mixed case, state the exception and that the source is unchanged. Then answer on paper why a correctly allow-listed update to another student's record would still be wrong, and which control would stop it.

### Bounded human-led AI review

Write your own list of editable fields first. If an approved assistant is available, provide only the tiny synthetic function and the field policy, and ask it to identify the default behavior for an unknown key and what the repair leaves unaddressed. Reject suggestions to add a schema you did not specify, to drop keys silently or to attach the function to a service. Manual review satisfies the same objective, and no real records should be supplied.

### Formative questions with explained answers

1. Does copying the dictionary solve mass assignment? No. It protects the source but accepts every key.
2. Why reject a forbidden key whose value is unchanged? The rule governs which fields may be addressed.
3. Why is an allow-list safer than a block-list? Unknown fields are denied by default.
4. Does the allow-list authorize the update? No. Object-level authorization is separate.
5. What does atomic mean here? No partial result escapes this in-memory operation, and nothing more.

Technical basis: OWASP Mass Assignment Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html . No new test run, API behavior, learner-platform reproduction or assessor calibration is claimed by this supplement.
