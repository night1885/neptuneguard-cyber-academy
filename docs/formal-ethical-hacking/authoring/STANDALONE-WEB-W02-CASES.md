# W02 — independent boundary-analysis cases

Draft learner worksheet after [W02 teaching](STANDALONE-WEB-W02-TEACHING.md). All cases are fictional. No live application, database, browser or real account is supplied. No command execution is required or authorized.

For each case identify: data source and trust assumption; decision/interpreter; intended policy or invariant; supplied result; supported conclusion; missing evidence; repair goal; legitimate control; forbidden/edge control; and a limitation. Do not invent successful execution or a complete repaired implementation.

## A — same course, different owner

A trusted synthetic student belongs to course Blue. The draft is in Blue but belongs to another student. A toy decision checks only student role and course membership and returns True. Apply the fixture-specific policy from the teaching page. Propose policy-derived regression cases without hard-coding identities.

## B — deny everything

A proposed repair rejects every read and edit. A selected nonowner-denial test now passes. Explain why that observation cannot establish a correct repair. Supply at least one legitimate student and one legitimate instructor case using the stated fixture policy.

## C — punctuation versus authority

An offline synthetic query fails on an apostrophe-containing value. After the value-binding repair it returns the exact matching synthetic record. Explain the construction defect addressed, what the result says about literal values, and what additional trusted permission context a real application would need. Do not infer permission from the returned row.

## D — variable identifier

A developer proposes putting a user-chosen column name into a value placeholder and declaring all SQL construction safe. Explain the value/identifier distinction and a bounded fixed-allowlist design direction if dynamic selection is genuinely needed. No new dynamic query or identifier input is part of this exercise.

## E — preserve text, not selected markup

The intended paragraph text contains an ampersand and harmless em markup characters. A repair deletes angle brackets, causing the original text to change. Another repair encodes the supplied value at the fixed paragraph text boundary. State the required structure/text invariants and how legitimate text preservation differs from allowing selected formatting.

## F — same encoder, different destination

A later design moves the same value into a JavaScript block or URL. Its author cites the paragraph test results as proof of safety. Explain why those results no longer establish the relevant property. Request the exact destination/context and appropriate reviewed handling; do not add active payloads.

## G — tests passed, production claim

A learner shows a passing offline model suite and claims secure login, complete database isolation and browser-safe output across the application. List which narrower evidence could be supported and which claims require additional independent evidence. Distinguish parser structure observations from browser execution.

## Deliverable

Write a short finding for A and a repair/retest plan for E, then contrast the missing controls in C and F. Keep proposed tests separate from executed results and retain uncertainty. Use an approved private submission route only; if none exists, keep fictional notes locally. Paper answers do not grant practical permission, establish W02 completion or replace independent assessment.
