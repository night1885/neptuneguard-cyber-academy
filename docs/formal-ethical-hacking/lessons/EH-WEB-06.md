# EH-WEB-06 — Preserve text at an HTML output boundary

Draft offline practical, not published. Requires EH-WEB-05 and the Python reading bridge in EH-WEB-04. Proposed lesson ID only; no implemented progression rule. Use your own clean student guest.

## Outcomes
Trace a text value into a fixed HTML paragraph, reproduce unintended markup interpretation, apply context-appropriate encoding and state what the tests cannot prove.

## Scope
Only render_lab.py and test_render_lab.py in a fresh disposable directory are in scope. They create and parse strings in memory. No HTTP server, browser, network request, credential, real user data or script execution is involved. Keep the supplied markup harmless; do not add event handlers, script elements, external resources or active payloads. Do not import this deliberately unsafe starter into the academy application.

Use Python 3 with unittest and html.parser from the standard library. No pip installation or privileged commands are needed. Obtain the reviewed fixture through the approved material-transfer procedure; tested platform-specific transfer instructions remain release work. Stop if required tools are unavailable rather than reconnecting an isolated guest ad hoc.

## Understand the output boundary
HTML distinguishes document structure from text. The starter constructs a paragraph by concatenating a fixed opening tag, a supplied value and a fixed closing tag. The intention is to show the entire value as text. Without encoding, angle-bracket markup can become structure instead. Entity-like sequences can also be interpreted rather than shown literally.

The fixture tests harmless examples. An unexpected em element is evidence of HTML structure injection in this model, not evidence that JavaScript executed or that a real browser session was compromised. XSS claims require the relevant execution context and evidence. Do not label this a demonstrated production exploit.

## Read the test observer
ObservedHTML subclasses Python's HTMLParser. It records start tags, end tags and text callbacks. The test expects one fixed p element, its closing tag and the original input as decoded text. It does not implement a browser DOM, execute JavaScript, validate full HTML conformance or emulate every browser error-recovery rule.

The six tests cover ordinary text, empty input, entity-like text, harmless embedded markup, a paragraph boundary sequence and Unicode. Read each input and predict which invariant it might violate.

## Run and classify
From the fixture directory run:
```sh
python3 -m unittest -v test_render_lab
```
Capture the actual exit status promptly as taught in EH-LINUX-03. Distinguish a failed assertion from an import problem. For each observed failure, state whether it changed parsed structure or altered the intended literal text. Do not replace your results with the author's transcript.

## Repair at the correct context
Use Python's standard html.escape function on the supplied text when constructing the paragraph; keep the paragraph tags fixed. Do not escape the whole document or change expected test results. Rerun the same suite. The encoded source should parse back to the original text while retaining only the intended paragraph structure.

Do not repair this with a blacklist of selected tags or by deleting angle brackets. Those approaches can lose legitimate data and do not express the required invariant. Encoding displays markup-like input as text. Sanitization is a different operation: it permits a reviewed subset of markup while removing or transforming disallowed content. This exercise does not implement a sanitizer.

## Context matters
HTML text encoding is not a universal encoder for JavaScript, CSS, URLs, arbitrary attribute names or unsafe attributes. A future change that moves a value into a script, style block or URL creates a different boundary requiring appropriate handling. Even quoted attribute values require consideration of the attribute's meaning. Never generalize this tiny fix into a claim that every use of a string is safe.

Framework auto-escaping can help, but unsafe raw-HTML APIs or explicitly trusted-markup wrappers can bypass it. This exercise has no such framework integration and does not establish that an application's other output paths are protected.

For optional paper practice, use the [output-context case pack](OUTPUT-CONTEXT-CASEPACK.md) and [blank worksheet](OUTPUT-CONTEXT-WORKSHEET.md). They compare paragraph text, ordinary quoted attributes, URLs, JavaScript, permitted formatting and presentation options. They do not expand this practical into browser execution, add a required deliverable or change its fixture, tests or prerequisites.

## Independent work
Add a case containing both literal ampersands and angle brackets, and a case whose input is already entity-like text. Predict the parsed text and explain why decoding input before output can undo the intended boundary. Show that your repair preserves the original text rather than silently stripping it. Keep the examples inert and local.

## Deliverables
Provide a scope statement, source-to-output diagram, genuine baseline and repaired test results, minimal diff, additional cases and limitations. A reviewer checks the context explanation and data preservation, not just a green test result. Formal grading, student-guest reproduction and accessibility review remain pending. No permission, deployment or award follows from completion.

Sources:
https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
https://docs.python.org/3/library/html.html
https://docs.python.org/3/library/html.parser.html

See OFFLINE-HTML-VALIDATION.md for the local author-check record.
