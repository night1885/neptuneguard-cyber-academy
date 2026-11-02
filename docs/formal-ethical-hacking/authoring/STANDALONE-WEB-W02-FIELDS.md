# W02 extension — object, field and revision decisions

Draft learner teaching, not practical authorization or completed W02. No other preparation-course enrollment is required. Read the W02 walkthrough; shared practical prerequisites remain subject to separate in-course equivalence review. Use invented data only.

## Object authority does not imply field authority

An owner may be permitted to edit a draft yet forbidden to change its owner, course or grade. Copying every client-supplied key into an internal record can expose properties beyond the caller's authority. Copying the record first may preserve the original but does not establish the editable-field policy.

The [EH-WEB-08 dictionary fixture](../lessons/EH-WEB-08.md) permits only title and body. Empty updates are allowed. Any unknown or protected key rejects the whole update, even if its value equals the current value. Successful updates return a separate dictionary; the source stays unchanged. These rules assume well-formed flat dictionaries and do not define a complete value schema or nested-object isolation.

Worked fictional request: title is legitimate but grade is also supplied. Under this exact contract the operation is rejected as a whole, not partially applied and not silently filtered. A denylist of today's sensitive names would leave future unknown fields writable; the intended rule is an explicit editable set.

## Keep different fixture contracts distinct

The [application update extension](../lessons/APPLICATION-UPDATE-LAB.md) is a different, in-process model. Its editable field is text, not title/body. It separately checks owner/course/draft authority, permitted fields and expected revision. Do not copy one fixture's field set into another or infer a universal endpoint policy.

Worked fictional sequence: revision 0 accepts one permitted text edit and advances to 1; a later write expecting 0 conflicts rather than overwriting that edit. Sequential stale-write rejection is not evidence of concurrent-writer correctness or idempotency after a lost response. A separately simulated commit failure is not a real failed-disk test. Success must not be presented before the selected transaction completes.

Bound SQL values do not decide which fields or objects a caller may modify. An owner property in a changes object requests a field operation; the literal text 'owner=someone' inside an allowed text value is a different input. Trace data structure and operation, not just suspicious words.

## Practice and limits

Complete the [field cases](STANDALONE-WEB-W02-FIELD-CASES.md) on paper. Later practicals retain their original reviewed guest/tooling, material transfer, prerequisites and scope. No PATCH request, database service, runtime migration or real learner record is authorized. The application extension simulates requests and uses in-memory SQLite; it is not an authenticated deployed API.

For later approved work, record actual baseline, narrow repair, unchanged expectations, legitimate/forbidden/conflict cases, in-memory stored state and limits. No fixtures run or change in this batch. Independent variants, supported setup, calibration, privacy and release review remain open.
