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

## Expanded teaching: encode once, at the boundary where text becomes HTML

This supplement stays inside the original disposable fixture. It adds no browser, server, network request, script execution or active payload. Predictions below come from reading the starter source and are not your execution results.

### Follow one value from source to parser

The starter function returns a fixed opening paragraph tag, then the supplied text, then a fixed closing tag. Draw three boxes: the original text, the assembled HTML source and the parser's observed events. The invariant is that the parser sees exactly one paragraph element and that the text it reports equals the original input.

The function has no step that distinguishes characters meant as text from characters HTML treats as syntax. Python's html.escape converts the ampersand, less-than and greater-than characters, and by default also the double and single quote characters, into character references. For element content the first three matter most; the quote conversion is harmless there and becomes relevant when a value sits in a quoted attribute.

### Why entity-like text is a separate boundary

An input that already looks like a character reference is still just text to the caller who supplied it. If it is passed through unchanged, an HTML parser may interpret it as a reference and report a different character than the original. The visible failure then changes the literal text rather than the element structure.

Encoding the ampersand first and then the rest produces source that parses back to the original sequence of characters. This is why decoding input before output can undo the boundary: the caller's text becomes parser input again. Apply encoding once, at the point of output, and not as a hidden transformation earlier in the data path. Encoding twice would display the reference text literally, which is a different defect: legitimate data is changed.

### Classify each failure by what it changed

For every failing test, ask two questions. Did the parsed structure change, for example an unexpected element appearing between the paragraph tags? Did the reported text differ from the input while the structure stayed the same? Record both answers separately. A structure change and a text change need different explanations even though one encoding step can repair both.

An import error, a missing interpreter or a syntax mistake in an edit means the intended decision was never evaluated. Do not describe such a result as reproduction of the defect. If an edit leaves the suite unexpectedly green, confirm that the named suite ran and that the expectations were not altered.

### Why a blacklist loses the invariant

Deleting angle brackets or removing selected tag names changes the data. A legitimate note that contains a comparison written with those characters would be silently altered, and the test that expects the original text would fail for a different reason. The repair must preserve the value, not guess which values are dangerous.

Encoding and sanitization answer different questions. Encoding displays any text exactly as text. Sanitization is for the case where users are allowed to author a reviewed subset of markup, and it requires a maintained sanitizer and ongoing patching. This fixture implements neither a sanitizer nor a rich-text feature. OWASP's guidance is to prefer text-only sinks and context-specific encoding, and to use sanitization only when authored HTML is genuinely required.

### What this tiny fix does not cover

The repair is correct for text placed between ordinary element tags. It does not make the same function safe for a JavaScript string, a style block, a URL or an attribute whose meaning is code. Each is a different parsing context, and OWASP describes separate handling for each. A value moved into one of those contexts creates a new boundary that needs its own review.

Framework auto-escaping reduces mistakes by encoding by default, but raw-HTML APIs and explicit trusted-markup wrappers can bypass it. The fixture has no framework, so its green result says nothing about an application's other output paths.

### Read the claim levels

The unexpected element in the starter is evidence that the model let text become structure. It is not evidence that script ran, that a session was exposed or that a production page was compromised. A cross-site scripting claim needs an execution context and observed behavior. Keep the report at the level the evidence supports.

The parser observer is a teaching device. It records start tags, end tags and text; it is not a browser document model and does not reproduce every error-recovery rule. A passing observer test supports the invariant for the tested inputs only.

### Independent cases, reasoned in advance

Before running your own added cases, write the expected parsed text. For an input containing both literal ampersands and angle brackets, the repaired output should report the same characters in the same order. For an input that is already entity-like text, the repaired output should report the reference characters literally, not the character they would denote. If your prediction and the result differ, explain which assumption was wrong rather than changing the expectation.

Keep every example inert and local. Do not add event handlers, script elements or external resources.

### Bounded human-led AI review

First write your own source-to-output diagram. If an approved assistant is available, provide only the tiny synthetic function and a description of the tests. Ask it to name which characters are structure, which are text and what the repair leaves unaddressed. Reject any answer that proposes active payloads, browser experiments or a blacklist. Manual review serves the same purpose. Do not supply real pages, logs or user content.

### Formative questions with explained answers

1. Does an unexpected paragraph-internal element prove script execution? No. It shows a structure change in the model.
2. Why not strip angle brackets? It destroys legitimate data and does not express the invariant.
3. Why can decoding before output reintroduce the problem? The decoded text becomes parser input again.
4. Is html.escape a universal encoder? No. It fits element text; other contexts need their own handling.
5. Does a green observer test prove the application is safe? No. It supports only the tested inputs at this boundary.

Technical basis: Python html documentation, https://docs.python.org/3/library/html.html , and the OWASP Cross Site Scripting Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html . No new test run, browser behavior or learner-platform reproduction is claimed.
