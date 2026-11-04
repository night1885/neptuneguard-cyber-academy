# EH-WEB-PRACTICAL-CAPSTONE — Review, repair and retest

Draft assessment, not published or calibrated. Requires EH-WEB-04, EH-WEB-05 and EH-WEB-06. This integrates the learning tasks, not the software: the three fixtures remain separate local models. This is authoring material, not activated runtime progression. Community Learning is unchanged.

## Your assignment and finish line
Review the same three deliberately flawed teaching components, reproduce their bounded defects, explain the root causes, make narrow repairs and report what the regression results support. Use your own clean guest and synthetic data only. No academy-hosted environment is provided or required.

Complete the existing four phases, preserve the original visible expectations, add at least one independent case per component and hand off the existing concise report with actual results and limitations. A passing local suite is one observation, not a finding of whole-application security, independent mastery or completion of the comprehensive programme.

The components are offline-authorization/policy.py, sql-parameterization/query_lab.py and html-text-encoding/render_lab.py, with their companion visible tests under docs/formal-ethical-hacking/fixtures. Do not combine them into a web application, connect them to a database service or import them into academy runtime.

## Scope agreement for the exercise
Permitted actions are reading the supplied source, running its local unit tests, editing personal disposable copies, adding bounded synthetic cases and inspecting your resulting diff. No real accounts, tokens, personal files, external requests, scans, browser payloads, network services, credential attacks or production data are in scope. Existing course-wide authorization and privacy controls still apply. This document is a draft specification, not a live permission grant.

Before starting, confirm the guest identity, normal account, Python availability and approved material-transfer route. Use separate directories for each fixture. Do not run a repository-wide test discovery command: the teaching suites intentionally fail before repair and are not academy application tests. Do not install packages, elevate privileges or reconnect an isolated guest as a workaround for missing prerequisites.

| Existing source package | Working component and companion test | Fixture boundary |
|---|---|---|
| fixtures/offline-authorization | policy.py and test_policy.py | Synthetic trusted records; Boolean permission decision, not authentication or actual data enforcement |
| fixtures/sql-parameterization | query_lab.py and test_query_lab.py | Exact-value lookups in the reviewed three-row in-memory SQLite setup, not a database server or business-authorization layer |
| fixtures/html-text-encoding | render_lab.py and test_render_lab.py | Inert paragraph-text generation and parser observations, not a browser, sanitizer or script-execution environment |

These source-package paths are relative to the formal course directory. The learner runs the reviewed disposable local copies produced by the approved offline transfer, not an arbitrary master checkout. The table adds no fixture or third-party dependency. Optional bridges/workshops remain subject to their own instructions and do not replace this capstone's required independent case work.

## Phase 1 — Baseline and predictions
Preserve an unchanged starter copy. Record its provenance and distinguish it from your working copy. Read each component and write a prediction for its visible tests before running them. A prediction is not execution evidence. If the supplied working copy is already repaired, do not label its green result as a reproduced starter defect; resolve source/version provenance before making that claim.

Run each suite from its own corresponding disposable directory. These are separate invocations, not one block for an arbitrary directory:

### Authorization copy
```sh
python3 -m unittest -v test_policy
result=$?
printf 'test status=%s\n' "$result"
```

### SQL copy
```sh
python3 -m unittest -v test_query_lab
result=$?
printf 'test status=%s\n' "$result"
```

### HTML copy
```sh
python3 -m unittest -v test_render_lab
result=$?
printf 'test status=%s\n' "$result"
```

Confirm the directory before each invocation. Save the runner's status immediately; another command could replace $?. The later printf reports the saved status and has its own result. Do not use a successful final print or pipeline program as proof that a previous suite passed.

Stop on an import or environment error and diagnose that blocker before claiming the intended defect was reproduced. Distinguish that situation from the deliberately unsafe SQL case reaching SQLite and producing its expected query error. The prerequisite lessons describe the relevant baseline categories; do not treat every nonzero result as either the same defect or a provisioning failure.

| Original suite | Counting unit to preserve | Baseline distinction to explain |
|---|---|---|
| test_policy | One unittest method containing twelve subtest cases | A returned Boolean can differ from the fictional policy expectation |
| test_query_lab | Five unittest methods | A SQL execution error and a returned wrong result are different observations |
| test_render_lab | Six unittest methods using a shared assertion helper | Parsed structure and decoded text can violate different invariants; a failed assertion can prevent later comparisons in that method |

Report these units distinctly rather than adding them into an unexplained total. After adding cases, report the actual discovered method/subtest structure. Do not count helpers, unexecuted functions, optional suites or author records as additional tests that the learner ran. Preserve the relevant real output or an explicit blocker; never copy expected failures into a fabricated transcript.

## Phase 2 — Trace the boundaries
For each component identify the supplied input, trusted assumptions, intended decision or transformation, observed result and violated invariant. Keep these existing explanations separate:
- Policy: which subject may act on which resource under this fixture's fictional rules?
- SQL: where can a value alter the query structure instead of remaining exact data?
- HTML: where can intended text become markup or change literal meaning?

Use a small per-component input -> operation -> observation diagram or equivalent text in the existing report. Do not draw the three components as one running request pipeline: they are not connected software. The policy model's trusted subject does not authenticate a SQL owner string, and the SQL rows are not fed into a browser by these fixtures.

A root-cause explanation must connect the supplied code and observed invariant, not merely name a vulnerability category. Keep a setup error, the model's deliberate defect and an unsupported hypothesis distinct. If a fact is missing, state the gap and narrow the conclusion.

Do not treat a SQL parameter as an authorization check, an HTML encoder as a universal sanitizer or a policy Boolean as proof that a server enforces it. These components exercise different boundaries. The actual application/HTTP/database/browser integration evidence does not exist simply because all three local suites were run.

## Phase 3 — Repair and preserve legitimate behavior
Make the smallest principled change in each working component copy. Keep the existing expectations intact. Do not hard-code fixture identities, suppress errors indiscriminately, strip legitimate text or deny every request simply to stop an unwanted outcome. Explain why the proposed change addresses the relevant boundary.

| Component | Repair property to explain | Shortcut that does not establish it |
|---|---|---|
| Policy | Preserve the intended allowed and denied decisions using the fixture's actual relationships and context | Deny all, special-case visible labels or rewrite expected decisions |
| SQL | Keep the statement's structure fixed and bind the owner as a separate exact value while preserving legitimate results | Always return no rows, remove punctuation or keep interpolating a value into SQL |
| HTML | Keep the fixed paragraph structure and preserve the original decoded text through context-appropriate output encoding | Escape the whole document, discard text or treat every context as paragraph text |

These are the boundaries already taught in EH-WEB-04/05/06, not completed repair implementations. Use each fixture's stated policy/contract rather than transfer a rule or technique blindly from another component. Keep original starter provenance and a minimal diff for the working change. Do not deploy or import the teaching repair into the academy.

After repair, rerun the same visible tests from the same corresponding directories and preserve their genuine results. Add at least one independent case per component and predict it first. Your cases should use new synthetic values rather than merely rename an existing test. Keep HTML inert and SQL confined to read-only lookups in the supplied in-memory database.

The capstone's minimum remains one independent case per component. It does not erase the prerequisite lessons' own case-design tasks or add a new case bank. Explain why each chosen case distinguishes a meaningful policy/data-preservation boundary. Do not present a supplied example or an author-only counterexample as independently designed learner work. Record assistance/references under the actual assessment policy, without inventing a new academic-integrity rule.

Case-design changes belong in the appropriate companion test copy while preserving the original expectations. The repair itself belongs in the corresponding component copy. Confirm that the runner actually executes every added case. A written but undiscovered test is not a regression result. Do not weaken the observer or compare only a convenient substring to hide a failed invariant.

Record which tests were unchanged, which were added and what was actually executed. A green visible suite alone is not independent mastery or proof of complete application security. The reviewer may ask you to explain a permitted variation within the same scope; this does not introduce hidden learner surveillance, a new fixture, automatic credentials or permission for real-target testing.

If a repair or regression remains blocked, preserve that result. Do not rewrite earlier failures as successes, attribute a later implementation's result to the starter or add an unrelated operation to obtain better-looking evidence.

## Phase 4 — Report and handoff
Use the existing [student report template](WEB-PRACTICAL-REPORT-TEMPLATE.md). Include scope, environment, baseline, root causes, minimal diffs, regression results, independent cases and limitations. Keep evidence concise and distinguish authored expectations from your actual run. This is one capstone report, not three new reports or another required worksheet.

| Existing report area | What must remain traceable |
|---|---|
| Scope and minimal environment | Synthetic-only local actions, source/version references, ordinary guest context and relevant observed tool/runtime details; unknowns labelled |
| Predictions | What was expected before execution and why; reconstructed reasoning must not be disguised as a prior prediction |
| Evidence index | E labels, component and starter/repaired state, action actually run, genuine result and limitations |
| Repeated component analysis | Intended invariant, input/trust assumptions, actual baseline, root cause, minimal diff, preserved legitimate behaviour, unchanged-suite result, independent case and untested areas |
| Findings/impact boundaries | The justified local consequence and the conclusions the evidence cannot support |
| Final state and reflection | Identified working copies/evidence retained or removed, unresolved failures, permitted handoff and explanation of what changed after observation |
| Submission integrity | Assistance and illustrative material labelled under the actual assessment policy; no fabricated run or unstated originality claim |

Use the template's existing fields; the table explains them rather than creating a second submission. Real timestamps/timezones belong in evidence only when actually recorded and relevant. A copied command, an author's local check or a paper prediction is not the learner's transcript.

State that these are intentionally vulnerable local fixtures. Do not claim that an academy service, browser session or live database was compromised. Do not invent severity scores, exploit chains, timestamps or successful runs. The policy function returns a decision without accessing a real submission; SQLite is in memory; the HTML observer is not a browser.

If blocked, submit a blocker report identifying exactly what was and was not completed. A clear explanation can demonstrate useful diagnosis without establishing successful execution or a repaired boundary. Do not let a polished conclusion conceal missing baseline, rerun or independent-case observations.

Before cleanup, preserve only the evidence needed by the approved private assessment workflow. Remove only identified disposable exercise files when authorised; do not delete unrelated data or evidence required for review. No service needs to be left running. State the actual final condition rather than a cleanup plan as if it had happened.

## Assessment status — existing rubric, not a new threshold
Use the existing [draft transparent rubric](WEB-PRACTICAL-DRAFT-RUBRIC.md) as a proposed review aid only. It proposes five dimensions scored 0 through 3, for a possible 15 points: boundary/policy reasoning, baseline/reproducibility, repair quality, regression/independent testing, and reporting/responsible scope. No approved pass score is set. This clarification changes neither that rubric nor its descriptors.

A numerical total must not replace qualitative review of scope, privacy, incomplete execution or supported accessibility needs. Accommodations, resubmissions, appeals and incident contacts need actual approved policy before release. Suspected fabrication, an exposed secret or a scope breach requires the actual process, not an invented disciplinary rule or a quiet point deduction. Do not publish individual feedback or allegations in the repository.

Reviewer feedback should identify the particular missing observation, confused boundary or unsupported inference and request a bounded correction. It must not require an external request, active browser example, real account or altered expected value. Record interventions separately from independent performance. Completion never automatically grants enrolment, restricted-course access, progression, a grade or an award.

Use only the actual approved private submission route after its access, format, collection and retention rules exist. The repository, report template and Markdown brief do not implement private storage or a collection service.

## Validation limits and authoring boundary
The three starter/temporary-repair behaviours were checked individually in earlier authoring sessions as recorded in their validation files and the prerequisite lessons. Those observations remain component-level author evidence. They are not relabelled as a student completing this capstone, an ordinary-account supported-guest run or a new end-to-end assessment execution.

This complete capstone, new student cases, novice/editor/transfer workflow, private submission path and assessment calibration have not been executed. No new test run is claimed by this brief update. Repository CI, including successful jobs for preceding documentation changes, is not evidence of learner independence, guest/hardware compatibility or browser/application enforcement.

The following EH-WEB-07 filesystem-boundary practical has its own prerequisites, supplied files, test-owned workspace and limitations. This capstone adds no filesystem, path, symbolic-link, command-execution or real-file-access task, and its completion does not activate later lessons automatically.

This changes only the existing EH-WEB-PRACTICAL-CAPSTONE brief. It preserves the three separate fixtures, four phases, original visible expectations, at-least-one independent case per component, existing report template/rubric and prerequisites. No fixture, canonical lesson ID, prerequisite edge, external target, request allowance, reading-profile entry, runtime integration, publication flag, Discord handler, database service/migration, course activation or deployment is added. Hosting, production, Community Learning and existing release gates remain unchanged.
