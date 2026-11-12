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

## Expanded teaching: run three repairs as one disciplined investigation

This supplement adds working method, not scope. The three fixtures remain separate local models, and the capstone still covers only the policy, query and HTML components. No new command, target, fixture change or combined application is introduced.

### Keep three investigations separate

Each component answers a different question. The policy function asks who may do what to which resource. The query function asks whether a value can change the structure of a database statement. The rendering function asks whether text can become document structure. A good report treats them as three parallel investigations that share a method, not as one story about a vulnerable application.

Use one folder per fixture and one evidence log per fixture. Before touching a component, copy the starter unchanged and note where it came from. Everything you later claim should be traceable to either that preserved baseline or to a run you actually performed.

### Use a prediction ledger

For each component, write a table with the test or case name, the policy rule or invariant it checks, your predicted result, the actual result and a short explanation of any mismatch. Fill the prediction column before running anything. A mismatch is useful evidence about your understanding; it is not a reason to edit the expected values.

Report counting units honestly. The authorization runner is one method with twelve subcases, the SQL suite has five methods and the rendering suite has six. Adding those into a single total hides differences in how failures are reported. State each unit next to its component.

### Distinguish failure types before diagnosing

An assertion failure means the code ran and disagreed with an expectation. An error means execution stopped for another reason, which can be the intended defect, as in the SQL syntax case, or a setup problem such as a missing module. A missing interpreter or failed import means the component was never evaluated. Label each result with its type, and resolve environment blockers before claiming that a defect was reproduced.

Capture the exit status promptly after each command and keep it separate from later commands, as the earlier shell lessons taught. A green result after an edit is meaningful only if the same named suite ran and the expectations were untouched.

### Write the root cause as a violated invariant

Phrase each root cause as a sentence of the form: the code allowed this input to cross this boundary without this check. For policy, the missing fact is the relationship between the subject and the resource. For SQL, the value was part of the statement text rather than supplied separately. For HTML, text was placed into markup without encoding for that context.

Then explain why the smallest principled repair addresses exactly that sentence. A repair that happens to turn tests green but cannot be explained in this form should be reconsidered. Avoid fixes that deny everything, suppress errors, strip legitimate data or hard-code the fixture's names.

### Preserve both sides of every boundary

For every repair, name one legitimate behavior that must still work and one prohibited behavior that must stay blocked. A policy repair must keep the owner and assigned-instructor cases working. A SQL repair must keep exact lookups, including punctuation that is part of a legitimate value. An HTML repair must keep the original text recoverable. Your added independent case for each component should probe one of these two sides with new synthetic values.

### Do not let one control stand in for another

The most common reporting mistake in this capstone is a sentence that quietly transfers assurance. A bound query parameter does not authorize the caller. A policy Boolean does not mean a server enforces it. HTML encoding does not sanitize authored markup, and it does not protect other output contexts. When you write limitations, say which neighboring control your result does not establish.

### Build the report from evidence levels

Separate what you read, what you predicted, what you ran and what you infer. The report template asks for scope, environment, baseline, root causes, diffs, regression results, independent cases and limitations. Keep each section to its evidence level. State plainly that these are intentionally vulnerable local models, and do not describe any academy service, browser session or live database as affected.

If you are blocked, a precise blocker report is a legitimate outcome. Say what was completed, what was not and why, and do not fill gaps with expected output.

### Cleanup and privacy

Preserve only the evidence the approved private workflow needs, and keep personal files, tokens and unrelated terminal history out of it. Remove only the disposable exercise files you can identify, and only when authorized. Nothing needs to be left running.

### Bounded human-led AI review

Write your own root-cause sentences first. If an approved assistant is available, provide only the tiny synthetic fixtures or short excerpts and ask it to find claims in your draft that go beyond your evidence. Reject suggestions to invent transcripts, severity scores or exploit chains, and do not provide real data. A manual self-review against the prediction ledger satisfies the same purpose.

### Formative questions with explained answers

1. Why record predictions before running? They separate understanding from observation and make mismatches informative.
2. Why not add the three test counts into one total? The counting units differ and a total hides that.
3. Is an import error a reproduced defect? No. The intended code path never ran.
4. Why name a legitimate behavior to preserve? A repair that blocks everything is not policy-compliant.
5. What does a green visible suite leave unproven? Untested inputs, enforcement in a real application and the other boundaries.

Technical basis: the OWASP and Python references already cited by the three component lessons. No new test run, student workflow or assessment calibration is claimed by this supplement.
