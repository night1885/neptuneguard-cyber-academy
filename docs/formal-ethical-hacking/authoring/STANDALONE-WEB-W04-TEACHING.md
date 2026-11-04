# W04 — build a causal source trace

Draft learner walkthrough. W04 is a planning label, not a registered lesson or activated gate. This is guided familiar-source practice, not proof of independent advanced-web competence. No other preparation-course enrollment is required; review W02/W03 and provide missing language/framework support within this course or assess equivalent skills.

## Source and execution boundary

Use the existing [application lab](../lessons/APPLICATION-OWNERSHIP-LAB.md), its [source](../fixtures/application-ownership/application_lab.py) and the [request-to-response pathway](code-review-pathway/01-REQUEST-TO-RESPONSE.md). This walkthrough was authored against commit fae501008bb2804041198942f0c2b0cfb0e59914, source blob 828353b64c1340b7311f301d25f7b1303ad86a83. Function names are navigation anchors, not immutable line numbers; confirm the version before reusing a trace.

The harness constructs a WSGI environment and calls the application in-process. It does not start a listener or prove an HTTP exchange over a network. ng.actor is an assumed trusted synthetic Actor. An Actor instance, frozen record or type annotation does not implement authentication. No real identity, browser, session or proxy trust is supplied.

## 1. Locate the entry and terminal effects

Begin at call_app, then DemoApplication.__call__, can_read and the nested respond function. Distinguish request-shaped inputs, assumed trusted context, selected resource fields, policy result and returned bytes. DemoApplication.__init__ creates synthetic in-memory SQLite rows; it is not a production data store.

Draw this flow: harness input → method/query/path gates → assumed actor → value-bound row lookup → policy → serialized response. Add early exits instead of drawing only the successful path. Unsupported methods, queries, malformed paths, missing actors, unavailable dependencies and absent rows do not all reach the same branch.

## 2. Trace a concrete hypothesis

Predict ALICE reading /notes/note-b before consulting the repaired source. The route selects a key; the parameterized SELECT returns one row whose owner differs from ALICE. Parameter binding keeps the key a value; it does not decide ownership.

In the starter can_read, course/state checks reject some cases and an instructor branch permits assigned-course reads. The remaining student-draft branch omits subject_id == owner. Follow how a True policy result permits note id/text into the response. State the cause as a missing subject/resource relationship, not an unrestricted SQL query or forged login.

Compare the visible repaired policy only after recording the hypothesis. A narrow repair must block the same-course nonowner while preserving legitimate owner and assigned-instructor behavior under this fixture's policy. Deny-all is not a correct repair.

## 3. Test competing explanations

Hypothesis A: query text is being reinterpreted as SQL structure. Hypothesis B: a selected row passes an incomplete authorization decision. Locate evidence for each: bound SELECT parameters, row identity, policy branch and returned fields. Reject or retain hypotheses using specific source facts rather than matching vulnerability keywords.

An existing row is necessary for this selected disclosure path. In note is None or not self.policy(...), short-circuiting skips the policy call for a missing row. An absent-record response is not evidence that a nonowner policy was exercised. Identical visible status/body for absent and denied records does not prove equal timing or complete non-enumeration.

## 4. Inspect response construction

respond serializes JSON and calculates encoded byte length before returning an empty body for HEAD. HEAD still traverses the policy path. Inspect permission, status, metadata and body separately; no body alone would hide an incorrect allow decision. A JSON/string observer is not a browser or transport capture.

## 5. Plan bounded debugging observations

Before any separately approved execution, propose observation points at the extracted key, loaded row, policy entry/result and response construction. State the smallest synthetic value needed at each. Do not dump process environments, credentials, real rows or full private requests. No debugger installation, attachment to a real process or breakpoint session is authorized here.

Complete the [trace worksheet](STANDALONE-WEB-W04-TRACE.md). Later dynamic confirmation requires the original lab's reviewed source/setup, prerequisites and permissions. Record actual results separately from predictions; use only named approved tests. This batch runs no source, debugger, suite or request. Supported setup, language/framework depth, unfamiliar investigations, independent assessment and release review remain open. No W04 completion or OSWE readiness is established.
