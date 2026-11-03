# Evidence and modelling walkthrough review — 2026-11-03

Draft authoring record, not learner completion, incident evidence, legal custody or release approval.

## Baseline and scope
Source checkpoint: f8d1e1b7e91e8d7984ed176b576ef03f494beda0 on feat/fictional-reviewer-validation, PR #49. All 36 returned CI jobs at this head completed successfully. Those job conclusions predate this proposed batch, are not individual test counts and do not establish student-platform reproduction or permission to merge/deploy. Post-change CI needs a separate check.

Reviewed four lessons, four supporting documents and two tiny synthetic fixtures at this checkpoint:

| Source | Git blob |
|---|---|
| [EH-EVIDENCE-01](../lessons/EH-EVIDENCE-01.md) | 12070604637c424e87979f6ed2f55fab3f892042 |
| [EH-EVIDENCE-02](../lessons/EH-EVIDENCE-02.md) | bf2663d9b846fac04b1f8062d4be565ebfed1eca |
| [EH-MODEL-01](../lessons/EH-MODEL-01.md) | dc32b5e69d0a3c0f779bf671af9f698eed773dcc |
| [EH-MODEL-02](../lessons/EH-MODEL-02.md) | 2a69ceff8634c11bca0568d3bf524d0416f0bb58 |
| [Timeline worksheet](../lessons/LOG-TIMELINE-WORKSHEET.md) | 97c2451742713db84a4fd3d359bf36241e110efd |
| [Handoff worksheet](../lessons/EVIDENCE-HANDOFF-WORKSHEET.md) | 101eaa172ffafd24653fae1e5c6471819aacce38 |
| [Fictional brief](../lessons/THREAT-MODEL-SCENARIO.md) | ee57e0185e9a02195e5fb2a99846c57ef3e78392 |
| [Traceability worksheet](../lessons/THREAT-TEST-TRACEABILITY.md) | a7898826f5ceb843988b546f897b89973aaf8ce3 |
| [Synthetic events](../fixtures/log-analysis/events.jsonl) | bd302a9e244c10e0bf2622f2ad3079aa573abf1d |
| [Synthetic sample](../fixtures/evidence-integrity/sample.txt) | 79a2fe5784dc63de71cd818512e145e9a550c14d |

The four lesson transcriptions and both fixture transcriptions were Git-blob verified before local processing. Supporting documents were read from GitHub and remain unchanged. This selected review does not cover the accumulated PR's complete diff or security posture.

## Teaching additions and unchanged requirements
- EH-EVIDENCE-01 connects source preservation, duplicate comparison, timestamp normalization and claims to the existing worksheet.
- EH-EVIDENCE-02 separates source/copy/derivative comparisons and actual handling from a merely proposed handoff.
- EH-MODEL-01 connects supplied fact labels, flows, trust assumptions and the change card without supplying a completed model.
- EH-MODEL-02 distinguishes six paper case designs from execution and keeps oracles, unknowns and authority explicit.

Only the four lesson documents and this record change. Original text, Python program, prerequisites, independent tasks, case counts and deliverables remain intact. No new learner command, dataset, fixture, completed marking key, test runner, grading threshold, real target or permission is added. Existing supporting records/worksheets, catalogue, manifests, reading profiles, runtime/publication flags and Community Learning are unchanged.

## Selected offline author checks
Python 3.12.8 on POSIX in the author sandbox, whose effective UID was zero rather than an ordinary student account:

1. Parsed the pinned JSONL with json, checked the nine required fields and parsed 18 offset-aware timestamp values. Observed nine raw records and eight distinct event IDs, one identical repeated L02 and no conflicting repeat. Parsed event-time and collection-time order differed. This is a supplied-data observation, not a malformed-input/conflict mutation suite, clock-synchronization check, incident finding or complete independent learner answer.
2. Extracted the unchanged Python program from the verified EH-EVIDENCE-02 source and ran it in a private temporary directory with the pinned 77-byte sample. Exit status was zero; source and initial-copy SHA-256 values matched, the deliberate derivative contained 97 bytes with a different digest, and the source remained unchanged. A separate author-only second invocation encountered the ordinary existing-working-file guard with exit status one; both files remained unchanged by that refused invocation. This negative control does not change the learner's run-once instruction or establish symlink/race safety.
3. Local text assertions verified all original lesson text could be recovered by removing only the additions, fenced code remained unchanged, prerequisite paragraphs remained unchanged, code fences were balanced and simple relative Markdown links resolved against the reviewed batch inventory.

The downloadable author-check record contains computed digests, selected outputs, source identities and text-check details; it is not automatically an additional committed repository artifact. Earlier lesson-specific validation documents retain their historical scope. These checks are not the full repository runner, Markdown rendering/accessibility audit or supported-guest validation. No new-batch CI result is claimed here.

## Remaining limits and gates
No network request, real log collection, production acquisition, real transfer, access grant, retention/deletion operation, modelled application, mitigation or modelled test execution occurred. Hashes do not establish provenance, factual truth or legal admissibility. UTC conversion does not establish clock accuracy or precise causality. The Cedar scenario remains paper-only and is not the academy architecture.

Ordinary-account guest/provisioning/transfer reproduction, actual private evidence handling and support processes, assessor/learner calibration, accessibility and independent branch review remain open. There is no live Discord publication, database change, merge or deployment in this batch.
