# Web foundations — locate the failure layer

Draft paper lesson after the code-reading worksheet. This uses invented data only and performs no parsing, file access or network action. It is not a production input validator, evidence importer or learner-status adapter.

## Parsing is not validation

A parser can accept syntactically well-formed JSON whose values do not meet the application's contract. Decide the contract first, then distinguish file access, byte/text handling, syntax, parsed shape, field types and domain rules. A rejection at one layer is not proof that every later condition was checked.

Worked fictional contract: client_exit must be a true integer between 0 and 255. A string containing 0 is not silently converted; True is not accepted as an exit status in this teaching contract. Python's Boolean/integer relationship makes a permissive integer-instance check insufficient for that deliberate distinction. These limits describe the teaching helper, not universal native-tool output.

Worked counterexample: True could pass a permissive integer-instance check and a 0–255 range check. A true-integer type requirement rejects it. By contrast, a Boolean in a 100–599 HTTP-status field can fail the range anyway, so that rejection alone does not prove the strict-type condition caused the result. Choose counterexamples that isolate the reason.

## Trace a case before proposing a fix

For each fictional case, identify the earliest relevant failure layer and what remains untested:
- The adjacent file is missing.
- The input bytes are invalid UTF-8.
- An object has an unclosed delimiter.
- A parsed record lacks a required field.
- client_exit is True, or the string 0, or -1.
- Two records have the same ID.
- A valid collection is empty.

An empty valid collection can support a zero-observation summary; it is not a clean security assessment. Distinguish duplicate record IDs from duplicate textual JSON keys: a decoder may discard earlier key occurrences before later dictionary validation sees them.

## Boundary tests and debugging

For a maximum of 12 records, propose cases with 0, 12 and 13 otherwise-valid records. Explain why rejection of 13 alone does not prove that 12 is accepted. For a byte bound, likewise distinguish exact-boundary acceptance from oversize rejection. Keep every other contract condition valid when isolating one boundary.

On paper, change the true-integer type rule to the permissive instance rule. Predict which invented case could expose the difference. Do not change expected results to disguise the mutation. Explain why passing those examples would not prove correctness for arbitrary hostile input or every resource condition.

## Shared teaching and later execution

Read [PY-F2](../lessons/PYTHON-FOUNDATIONS-02.md) with its original PY-F1 setup and teaching prerequisites. It describes the reviewed helper's precise shape, bounds and fixed error-reporting route; do not infer those guarantees for arbitrary programs. Expected failures belong on the specified rejection path; unexpected programming errors must not be concealed as success.

No supplied fixture is modified or executed here. Approved guest/tooling, reviewed source transfer, independent variants and actual test evidence remain necessary for later practice. Instructor criteria: contract-first reasoning, layer separation, discriminating counterexamples, adjacent valid/invalid boundaries and bounded claims. This worksheet does not establish complete programming competence or W00 completion.
