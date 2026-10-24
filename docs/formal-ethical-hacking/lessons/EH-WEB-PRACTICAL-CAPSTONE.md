# EH-WEB-PRACTICAL-CAPSTONE — Review, repair and retest

Draft assessment, not published or calibrated. Requires EH-WEB-04, EH-WEB-05 and EH-WEB-06. This integrates the learning tasks, not the software: the three fixtures remain separate local models. Proposed ID only; no runtime registration.

## Your assignment
Review three deliberately flawed teaching components, reproduce their bounded defects, explain the root causes, make narrow repairs and report what the regression results support. Use your own clean guest and synthetic data only. No academy-hosted environment is provided or required.

The components are: offline-authorization/policy.py, sql-parameterization/query_lab.py and html-text-encoding/render_lab.py, with their companion visible tests under docs/formal-ethical-hacking/fixtures. Do not combine them into a web application, connect them to a database service or import them into academy runtime.

## Scope agreement for the exercise
Permitted actions are reading the supplied source, running its local unit tests, editing personal disposable copies, adding bounded synthetic cases and inspecting your resulting diff. No real accounts, tokens, personal files, external requests, scans, browser payloads, network services, credential attacks or production data are in scope. Existing course-wide authorization and privacy controls still apply. This document is a draft specification, not a live permission grant.

Before starting, confirm the guest identity, normal account, Python availability and approved material-transfer route. Use separate directories for each fixture. Do not run a repository-wide test discovery command: the teaching suites intentionally fail before repair and are not academy application tests.

## Phase 1 — Baseline and predictions
Preserve an unchanged starter copy. Record its provenance and distinguish it from your working copy. Read each component and write a prediction for its visible tests before running them. A prediction is not execution evidence.

Run each suite from its own directory:
```sh
python3 -m unittest -v test_policy
python3 -m unittest -v test_query_lab
python3 -m unittest -v test_render_lab
```
These are three separate commands in three separate fixture directories, not a block to paste into one arbitrary directory. Capture each command's exit status promptly and label its result. Stop on an import or environment error and diagnose that blocker before claiming the intended defect was reproduced.

The authorization runner uses one unittest method containing 12 subcases. The SQL suite contains five test methods and the HTML suite six. Report these counting units distinctly rather than adding them into an unexplained test total.

## Phase 2 — Trace the boundaries
For each component identify the supplied input, trusted assumptions, intended decision or transformation, observed result and violated invariant. Keep these explanations separate:
- Policy: which subject may act on which resource under the fictional rules?
- SQL: where can a value alter the query structure?
- HTML: where can intended text become markup or change literal meaning?

Do not treat a SQL parameter as an authorization check, an HTML encoder as a universal sanitizer, or a policy Boolean as proof that a server enforces it. These components exercise different boundaries.

## Phase 3 — Repair and preserve legitimate behavior
Make the smallest principled change in each working copy. Keep the existing expectations intact. Do not hard-code fixture identities, suppress errors indiscriminately, strip legitimate text or deny every request simply to stop an unwanted outcome. Explain why the proposed change addresses the relevant boundary.

After repair, rerun the same visible tests. Add at least one independent case per component and predict it first. Your cases should use new synthetic values rather than merely rename an existing test. Keep HTML inert and SQL confined to read-only lookups in the supplied in-memory database.

Record which tests were unchanged, which were added and what was actually executed. A green visible suite alone is not independent mastery or proof of complete application security. The reviewer may ask you to explain a permitted variation within the same scope; no hidden learner surveillance or automated credential decision is introduced.

## Phase 4 — Report and handoff
Use WEB-PRACTICAL-REPORT-TEMPLATE.md. Include scope, environment, baseline, root causes, minimal diffs, regression results, independent cases and limitations. Keep evidence concise and distinguish authored expectations from your actual run.

State that these are intentionally vulnerable local fixtures. Do not claim that an academy service, browser session or live database was compromised. Do not invent severity scores, exploit chains, timestamps or successful runs. If blocked, submit a blocker report identifying exactly what was and was not completed.

Before cleanup, preserve only the evidence needed by the approved private assessment workflow. Remove only identified disposable exercise files when authorized; do not delete unrelated data or evidence required for review. No service needs to be left running.

## Assessment status
The accompanying rubric is a draft scoring aid, not an approved pass threshold. Accommodations, resubmissions, appeals and incident contacts need actual approved policy before release. Completion never automatically grants enrolment, restricted-course access or an award.

## Validation limits
The three starter/temporary-repair behaviors were checked individually in earlier authoring sessions as recorded in their validation files. This complete capstone, new student cases, novice workflow, private submission path and assessment calibration have not been executed. No new test run is claimed by this document. Hosting, production, Community Learning and course runtime are unchanged.
