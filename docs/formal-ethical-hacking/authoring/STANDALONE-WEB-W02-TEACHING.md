# W02 — ownership, query values and output context

Draft learner walkthrough, not published or assessed. W02 is a planning label, not a canonical lesson ID. Read the W01 teaching and obtain reviewed foundation support as needed. No CPTS, OSCP or GPEN enrollment/completion is required. These pages do not satisfy existing practical prerequisites automatically or authorize execution.

## Aim and investigation method

Identify the subject and data source, trace the value to a decision or interpreter, state the intended invariant, predict a counterexample, then review a narrow repair and legitimate/forbidden regression cases. Distinguish supplied facts, actual observations and uncertainty. The three boundaries below need different controls; one green suite or one control cannot stand in for all three.

## 1. Ownership is part of the decision

In the shared offline authorization model, trusted synthetic subject/resource records supply identity, course, owner and state. Those records are trusted test inputs, not an implemented login or authoritative database lookup. A Boolean result does not itself prevent data retrieval or modification.

Fixture-specific policy: a student may read/edit only their own draft in an enrolled course; no student action on submitted records; an instructor may read draft/submitted records only in an assigned course, and may not edit/delete; anonymous subjects, unknown roles/states and unlisted actions are denied. This deliberately narrow policy is not an academy production rule.

Worked fictional trace: the subject has a student role and the correct course, but the draft belongs to another student. Role and course checks alone omit the ownership boundary. A repair must preserve legitimate owner access and instructor rules while denying the nonowner. Denying every action would hide the defect by breaking intended behavior.

Use [EH-WEB-04](../lessons/EH-WEB-04.md) for the actual local policy exercise. Its starter is intentionally defective; its original suite has one unittest method with 12 subtest cases, not 12 independent test methods. Preserve expected decisions and distinguish an assertion failure from a setup/import problem. Never import the teaching policy into runtime.

## 2. SQL values must not become query structure

SQL is interpreted structure. If an application places input into the SQL string before parsing, input can alter that structure rather than remain only a value. A literal apostrophe can also expose incorrect construction without proving unauthorized access.

For the existing in-memory SQLite fixture, keep statement structure fixed and pass the owner value separately through a placeholder and parameter tuple. A one-item Python tuple needs its comma. String concatenation, formatting or f-string interpolation is not parameter binding. Placeholders bind values, not arbitrary table/column identifiers.

Worked fictional comparison: after a proper bound-value repair, an apostrophe-containing name is treated literally and an unknown value produces no matching rows under the fixture contract. That does not supply business authorization: accepting an arbitrary exact owner string can still be the wrong application access rule. Query construction and permission decisions are separate boundaries.

Use [EH-WEB-05](../lessons/EH-WEB-05.md) and its SQL reading support when needed. The fixture uses only synthetic rows in SQLite memory. Do not point it at a real database, add destructive queries, install a server or reinterpret its tests as a remote exploit.

## 3. Output handling depends on the destination

For a value intended as text inside a fixed HTML paragraph, preserve the fixed structure and encode the supplied value for that text context. Escaping the entire document or stripping selected tags does not express the same invariant. Encoding displays markup-like input as text; sanitization permits a separately reviewed subset of markup and is a different operation.

Worked fictional input: the inert text 'A & B <em>draft</em>' is intended to remain exactly that text, not create an em element. The observer should find only the fixed paragraph structure and the original decoded text. Structure changes in a string parser are not proof of JavaScript execution, browser compromise or a production XSS finding.

Use [EH-WEB-06](../lessons/EH-WEB-06.md). Its Python HTMLParser observer is not a browser DOM or JavaScript engine. HTML text encoding is not a universal treatment for JavaScript, CSS, URLs or every attribute. Moving a value to another context requires a new boundary analysis.

## Evidence and practical gates

Complete the [paper cases](STANDALONE-WEB-W02-CASES.md) first. Later approved repair work should record policy/invariant, prediction, actual baseline, minimal repair diff, unchanged expected results, legitimate and forbidden retests, remaining limits and final state. Keep all identities and content synthetic.

The shared practical chain retains its original guest/tooling/material-transfer prerequisites, including EH-WEB-04's EH-WEB-CAPSTONE requirement. A reviewed standalone equivalence/in-course route must be established before execution; these pages neither waive that requirement nor require another prep-course enrollment. Missing supported setup/provisioning stays blocked. Do not reconnect an isolated guest as a workaround.

This batch runs no fixture, changes no test or permission, and establishes no independent practical competence. Field-update policy teaching, independent variants, supported-guest reproduction, assessment calibration and release review remain open; this is not complete W02 coverage or OSWE readiness.
