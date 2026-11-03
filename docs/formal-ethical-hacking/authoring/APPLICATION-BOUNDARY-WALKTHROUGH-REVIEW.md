# Application boundaries — walkthrough batch review

Draft authoring record, 2026-11-03. Not learner completion, authentication, complete application acceptance or deployment approval.

## Baseline and source review
Checkpoint: 8c67f3af6d7bc994c75a2ba961ce776e484b7862 on feat/fictional-reviewer-validation, draft PR #49. All 36 returned CI jobs at this head completed successfully. These job conclusions predate this proposed batch and are not individual test counts or student-platform evidence. Post-change CI requires a separate check.

| Reviewed source | Git blob |
|---|---|
| [Read-ownership lesson](../lessons/APPLICATION-OWNERSHIP-LAB.md) | c7815b63f1e2e107c3a81c6180998c3648d37a15 |
| [Update lesson](../lessons/APPLICATION-UPDATE-LAB.md) | 713a7077da67f8546aa836e4dcfc7bdd99aff9f4 |
| [Regression workshop](../lessons/AUTHORIZATION-REGRESSION-WORKSHOP.md) | b55f9e19862a33b3a0a249d4906fce4bb26504e7 |
| [Historical read validation](../lessons/APPLICATION-OWNERSHIP-VALIDATION.md) | 4dd722a2d0c0d6471839a6df79017ce87fa931c7 |
| [Historical update validation](../lessons/APPLICATION-UPDATE-VALIDATION.md) | 519b8c81379308293344ac1b98a441b1e43a43a8 |
| [Historical regression validation](../lessons/AUTHORIZATION-REGRESSION-VALIDATION.md) | 2f7baccc9e9e09f95e6a3133f34ae12fa4f71a06 |
| [Boolean starter](../fixtures/offline-authorization/policy.py) | 767a9b2c1638eab9ae8c1a3b62ee25c66d30f0d8 |
| [Base matrix](../fixtures/offline-authorization/test_policy.py) | 4f41460d3c378f42c544bdacabdec99a6414ba39 |
| [Optional supplement](../fixtures/offline-authorization/test_regression_workshop.py) | 426c71c9e7ca67c9eb5dfc1e29f29ede6bc3173e |

Three lesson transcriptions and three Boolean fixture/test transcriptions were Git-blob verified before local processing. Supporting validation records were read from GitHub and are unchanged. Application package filenames were inspected, but its implementation, additional suites and loopback code were not independently reverified or executed in this batch. This is not a full-diff inventory or independent branch security review.

## Teaching changes and preservation
The read walkthrough separates assumed identity, parameterized lookup, owner enforcement and returned bytes. The update walkthrough separates row authority, editable fields, revision checks, stored state and response timing. The optional Boolean workshop clarifies what a counterexample failure says about the selected tests and what it cannot say about an application.

Only these three teaching documents and this authoring record change. Every original lesson byte is retained around the additions, including commands, code blocks, prerequisites, policies, expected counts, independent tasks and optional status. No test, fixture, marking key, canonical entry, learner command, grade threshold, request budget, runtime/publication flag, reader profile, Community Learning, database or deployment setting changes. The optional loopback exercise remains separately gated and was not run.

## Selected Boolean-policy execution
Python 3.12.8 on POSIX in a root author sandbox, not an approved ordinary-account student guest. Each invocation used fresh private temporary copies. Only the trusted-record Boolean fixture was executed; no WSGI application, SQLite handler or real identity was involved.

| Temporary variant and named suite | Methods | Decision examples | Assertion failure events | Exit |
|---|---|---|---|---|
| Original starter, base plus supplement | 7 | 20 | 4 | 1 |
| Narrow ownership repair, base plus supplement | 7 | 20 | 0 | 0 |
| Deny-all counterexample, base plus supplement | 7 | 20 | 6 | 1 |
| Allow-all counterexample, base plus supplement | 7 | 20 | 14 | 1 |
| Instructor-action regression, base only | 1 | 12 | 0 | 0 |
| Instructor-action regression, base plus supplement | 7 | 20 | 1 | 1 |

All six invocations had zero test errors and zero reported skips. The selected instructor regression passed the base examples but was detected by the supplement. Failure events include subtest failures and are not counts of independently discovered vulnerabilities. This is selected counterexample coverage, not a complete mutation score or exhaustive policy proof.

The temporary ownership repair retained the action/course/state/instructor restrictions. The instructor counterexample removed only the repaired instructor branch's read-only restriction. No temporary variant was installed, committed or deployed as policy.py, and no test expectation was weakened. These observations do not replace a learner's independent cases or genuine guest results.

## Distinct historical evidence levels
The read validation describes earlier in-process WSGI/in-memory SQLite checks with 20 application methods and two CLI methods; the update record describes 27 reused requirements and two CLI methods, including selected simulated rollback. Those results remain historical and were not rerun here. Reused expectations are not new independent coverage. A passing CLI contract can verify the defective demo's expected failure without establishing a secure starter.

None of the Boolean runs establishes response-body enforcement, transaction/commit behaviour, real concurrent writers, durable failure recovery, authentication, CSRF, browser/HTTP framing, transport or endpoint deployment. A simulated rollback and a stale sequential revision check do not solve response-loss reconciliation or prove distributed consistency.

## Text checks and remaining gates
Local assertions verified baseline lesson hashes, recovery of original lesson text by removing only additions, unchanged fenced code/commands, retained prerequisite paragraphs, balanced fences and simple relative links against the inspected source inventory. Link checks are not a Markdown renderer or semantic prerequisite audit. The downloadable author-check record includes selected runner outputs, source identities and text-check details; it is not automatically another committed artifact.

No application/CLI/loopback suite, listener, client request, live database, migration, real identity, account, production data, Discord publication, merge or deployment was used. Full-checkout authoring execution, current-batch CI, supported provisioning/transfer and ordinary-account guests, actual private evidence/support/recovery procedures, accessibility and learner/assessor calibration remain open.
