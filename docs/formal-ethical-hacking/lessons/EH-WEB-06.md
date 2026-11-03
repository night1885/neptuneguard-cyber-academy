# EH-WEB-06 — Preserve text at an HTML output boundary

Draft offline practical, not published. Requires EH-WEB-05 and the Python reading bridge in EH-WEB-04. This is authoring material, not implemented runtime progression. Use your own clean student guest. Community Learning is unchanged.

## Outcomes
Trace a text value into a fixed HTML paragraph, reproduce unintended markup interpretation, apply context-appropriate encoding and state what the tests cannot prove.

## Task and finish line
Read the supplied renderer and test observer, predict the existing six tests, reproduce the relevant structure/text mismatches, make the narrow text-context repair and rerun the unchanged expectations. Add the same two existing independent-case categories. Finish with genuine results, a source-to-output explanation, minimal repair diff and explicit limits—not a claim that JavaScript executed or a browser session was compromised.

## Scope and setup
Only render_lab.py and test_render_lab.py in a fresh disposable directory are in scope. They create and parse strings in memory. No HTTP server, browser, network request, credential, real user data or script execution is involved. Keep the supplied markup harmless; do not add event handlers, script elements, external resources or active payloads. Do not import this deliberately unsafe starter into the academy application.

The reviewed repository source package is fixtures/html-text-encoding relative to the formal course directory. Obtain only the two named files through the approved offline material-transfer procedure, preserve their names and keep them together. This is not a request to launch a repository-wide installer, open generated content in a browser or add another rendering environment.

Use Python 3 with unittest and html.parser from the standard library. The repair uses the standard html module. No pip installation or privileged commands are needed. Tested platform-specific transfer/editor instructions remain release work. Confirm the ordinary learner-guest session, intended directory, source files and required interpreter before running. Stop if a required tool or approved setup route is unavailable rather than reconnecting an isolated guest ad hoc.

## Understand the output boundary
HTML distinguishes document structure from text. The starter constructs a paragraph by concatenating a fixed opening tag, a supplied value and a fixed closing tag. The intention is to show the entire value as text. Without encoding, angle-bracket markup can become structure instead. Entity-like sequences can also be interpreted rather than shown literally.

```text
Original Python text value
  -> render_note places it between fixed paragraph tags
     -> resulting HTML source string
        -> the supplied parser observes tags and decoded text
           -> tests compare those observations with the fixed contract
```

This is a model of the supplied local code, not a browser/network trace. Keep the original value, generated source string and parser's decoded text separate. Correct output encoding can change the generated source representation while preserving the original value after parsing. Identical raw source and identical decoded text are different requirements.

The fixture tests harmless examples. An unexpected em element is evidence of HTML structure injection in this model, not evidence that JavaScript executed or that a real browser session was compromised. XSS claims require the relevant execution context and evidence. Do not label this a demonstrated production exploit.

## Read the actual test observer
ObservedHTML subclasses Python's HTMLParser. It records start tags, end tags and text callbacks. Its constructor explicitly uses convert_charrefs=True. The test expects one fixed p element, its closing tag and the original input as decoded text. It does not implement a browser DOM, execute JavaScript, validate full HTML conformance or emulate every browser error-recovery rule.

| Existing observer/check | What it records or compares | Limit |
|---|---|---|
| handle_starttag | Start-tag names and attribute pairs in the observer's starts list | Not a browser DOM or proof of script execution |
| handle_endtag | End-tag names in the ends list | Not complete nesting/conformance validation |
| handle_data | Text chunks in the text list | A value may arrive through multiple callbacks; callback count is not the text-preservation contract |
| parsed.starts comparison | Exactly the fixed p start with no attributes | Passing it alone does not establish correct end tags or text |
| parsed.ends comparison | Exactly the intended p end | Passing it alone does not establish original text preservation |
| Joined parsed.text comparison | Original input equals the concatenated decoded text | Tested selected string values only, not every browser/context/input |

The helper check_text contains the assertions; its name does not make it another discovered test method. There are six supplied test methods, not eighteen independent tests because the helper contains three comparisons. When an assertion fails, a method can stop before later assertions, so do not claim every invariant was independently checked in that failed method.

### Predict the six existing cases
| Supplied method | Intended distinction |
|---|---|
| test_plain_text | Ordinary text, quotes and an apostrophe should survive without changing the container |
| test_empty_text | An empty value still has the fixed paragraph structure and empty joined text |
| test_entity_like_text | An entity-like input remains the original literal sequence, not a substituted character |
| test_markup_is_text | Harmless tag-looking input stays text, not an extra element |
| test_boundary_is_text | A paragraph-boundary-looking sequence cannot add or close application-owned structure |
| test_unicode_text | The supplied Unicode text is preserved |

Read the actual values and expected observations in test_render_lab.py. These are the existing cases, not an added payload set. Do not replace a supplied value with an active example or use other people's content. One Unicode example does not demonstrate all Unicode, encoding or normalization behaviour.

## Run and classify
From the fixture directory run the existing test invocation and preserve its status promptly:
```sh
python3 -m unittest -v test_render_lab
result=$?
printf 'test status=%s\n' "$result"
```

The runner's status must be saved before another command replaces $?. The final printf has its own status; it is not proof that the preceding suite passed. Do not insert a pipeline and attribute its final program's result to unittest.

Distinguish a failed assertion from an import problem, missing interpreter, syntax error or unexpected exception. A setup failure does not reproduce the intended boundary defect. For each observed assertion failure, identify the comparison actually reached: start tags, end tags or joined text. Trace the supplied value through the source before making a repair.

A parsed extra element and an entity-like sequence changing into another character are different observations. Do not describe every mismatch as an HTML parse error or as JavaScript execution. Record your actual diagnostic, method name, result and limitation, rather than replace them with an author's transcript.

## Repair at the correct context
Use Python's standard html.escape function on the supplied text when constructing the paragraph; keep the paragraph tags fixed. Do not escape the whole document or change expected test results. Rerun the same suite. The encoded source should parse back to the original text while retaining only the intended paragraph structure.

html.escape handles characters significant to this HTML representation, including ampersands and angle brackets; its default also handles quotes. That does not make it a universal encoder. In this exercise the selected variable belongs in paragraph text, and only that variable is encoded. The application-owned tags remain structure.

During the repair phase, edit only render_lab.py. Keep the original observer, its convert_charrefs setting and all six expectations unchanged. Do not weaken the comparisons, skip a failing method or redefine success as whatever the starter happens to return. The subsequent independent-case phase can extend the local test_render_lab.py copy without changing the original expectations. No additional learner fixture filename is introduced.

### Preserve both structure and original data
- Escaping the entire generated document would also turn the fixed paragraph tags into text, violating the container contract.
- Deleting angle brackets or blacklisting selected tags can alter legitimate input and does not express the required invariant.
- Decoding an already entity-like input before encoding can change the original value the exercise is meant to preserve. A text-preservation failure is not automatically evidence of script execution.
- Comparing only whether dangerous-looking text disappeared would miss that loss of legitimate data. Check the fixed structure and the original decoded text together.

Encoding displays markup-like input as text. Sanitization is a different operation: it permits a reviewed subset of markup while removing or transforming disallowed content. This exercise does not implement a sanitizer. No new decoding, stripping or counterexample implementation is required as a learner task.

## Context matters
HTML text encoding is not a universal encoder for JavaScript, CSS, URLs, arbitrary attribute names or unsafe attributes. A future change that moves a value into a script, style block or URL creates a different boundary requiring appropriate handling. Even quoted attribute values require consideration of the attribute's meaning. Never generalize this tiny fix into a claim that every use of a string is safe.

A parser's character-reference conversion and a function that deliberately decodes user input are not interchangeable workflow steps. For the tested paragraph-text context, retain the original string as data and reason about the output boundary. Do not add a decoding pass merely to make entity-like input look more familiar, or move the string into another context to demonstrate a new effect.

Framework auto-escaping can help, but unsafe raw-HTML APIs or explicitly trusted-markup wrappers can bypass it. This exercise has no such framework integration and does not establish that an application's other output paths are protected. Browser behaviour, sanitization, template integration and every other sink still require their own authorised design and evidence.

For optional paper practice, use the [output-context case pack](OUTPUT-CONTEXT-CASEPACK.md) and [blank worksheet](OUTPUT-CONTEXT-WORKSHEET.md). They compare paragraph text, ordinary quoted attributes, URLs, JavaScript, permitted formatting and presentation options. They do not expand this practical into browser execution, add a required deliverable or change its fixture, tests or prerequisites.

## Existing independent work
Add a case containing both literal ampersands and angle brackets, and a case whose input is already entity-like text. Predict the parsed text and explain why decoding input before output can undo the intended boundary. Show that your repair preserves the original text rather than silently stripping it. Keep the examples inert and local.

Use your own invented values within those same two categories and preserve the original six tests. Explain the expected tag and text invariants before running. Confirm that the runner executes each addition, and report its actual method/subtest structure rather than equate written examples with discovered tests. Do not count a supplied case as a new independent addition.

Do not add event handlers, script elements, external resources, browser automation or network requests to strengthen the evidence. A case that violates the stated data-preservation contract is sufficient for this local task; it need not demonstrate XSS. Keep any guidance and revised reasoning distinguishable from an independent first attempt.

## Deliverables and review
Provide the existing scope statement, source-to-output diagram, genuine baseline and repaired test results, minimal diff, additional cases and limitations. A reviewer checks the context explanation and data preservation, not just a green test result.

The diagram should distinguish original input, generated source, observer callbacks and comparisons. For failed methods, state the actual observed invariant mismatch and the assertions not reached where relevant. Keep predictions, supplied expectations, actual output and conclusions separate. Do not infer a browser compromise, production finding or universal output-safety result.

Feedback should identify the specific context, structure/text confusion or missing observation and request a bounded correction. Do not ask a learner to open active content in a browser, change the observer or invent output to satisfy a reviewer. A partial/blocker result can be reviewed honestly but does not establish a completed repair.

Use only the actual approved private evidence route after access, format, collection and retention policies exist. Submit minimal redacted excerpts, not personal content or unrelated source files. This repository and Markdown lesson are not learner storage. Formal grading, supported-student-guest reproduction, accessibility review and assessor calibration remain pending. No automatic progression, permission, deployment or award follows from completion.

## Sources and selected author recheck
https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
https://docs.python.org/3/library/html.html
https://docs.python.org/3/library/html.parser.html

See OFFLINE-HTML-VALIDATION.md for the preserved historical local author-check record. The current documentation can describe features newer than the selected interpreter; it is not a supported Python/browser compatibility matrix. Only the reviewed fixture's APIs are used by this exercise.

For this expansion, the starter and visible tests were verified against Git blobs b1bfbd618d654b5296a6e307219ef818a80df0d0 and e2b520698c690cbb9c94f44b474a7add8d81e3d8 at source checkpoint 80de8bec26a6a2c09a43c0c8af2b291c2f03ee64. Five selected author-only runs used separate private temporary directories, Python 3.12.8 and disabled bytecode writing:
- Exact starter: exit 1 across six methods; test_boundary_is_text, test_entity_like_text and test_markup_is_text failed assertions; no test error was reported.
- Temporary text-context reference: the unchanged six-method suite exited 0. The reference implementation is not published in the learner starter or this lesson.
- Temporary reference plus two author methods covering the existing independent categories: exit 0 across eight methods. These are not a learner's independent cases or new required categories.
- Author-only whole-document-encoding counterexample: exit 1 with all six original methods failing the contract.
- Author-only decode-before-encoding counterexample: exit 1 across eight methods; the original entity-like method and the additional already-entity-like author method failed.

Original test expectations remained unchanged in all runs. The separate downloadable execution record contains selected command/result metadata, output and limits; it is not automatically a repository artifact or CI result. No reference repair, counterexample or author-edge module is installed into the learner fixture by this update.

The author sandbox ran with effective UID zero and was not the prescribed ordinary-account student guest. These runs did not validate the exact Bash status-capture sequence, transfer/editor workflow, student platform, browser DOM/error recovery, JavaScript execution, other output contexts, sanitization, framework integration, every Unicode/malformed-input case, actual learner performance or assessor calibration. No full repository suite or CI run was performed for this authoring expansion.

This changes only EH-WEB-06 teaching. The original fixture/tests, six expectations, two independent-case categories, prerequisites, optional support links, canonical catalogue, reading profiles, runtime integration and publication flags remain unchanged. No active payload, server, browser task, new permission, target, Discord handler, database change, course activation or deployment is introduced.
