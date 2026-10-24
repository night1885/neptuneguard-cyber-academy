# Output contexts — fictional paper case pack

Draft supporting material after [EH-WEB-06](EH-WEB-06.md). Six paper-only cases; no browser, server, script execution or live target is authorized or required. All strings and designs are fictional. Do not turn the examples into active payloads or change the existing local fixture's scope. This is supplementary content, not another canonical lesson or a calibrated assessment.

## Follow the value to its destination
For each case, identify the source value, intended meaning, exact destination and the parser or consumer that interprets it. A value moving from HTML text into an attribute, URL or script has crossed a different boundary even if its Python variable name stays the same.

Encoding represents data appropriately for a particular output context. Validation checks a defined input rule or business contract. HTML sanitization permits a reviewed subset of markup while removing or transforming disallowed content. Authentication and authorization decide identity and access. None is a universal substitute for the others.

Source basis: OWASP Cross Site Scripting Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html , and OWASP JavaScript and TypeScript Security Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/JavaScript_and_TypeScript_Security_Cheat_Sheet.html . These sources guide the conceptual distinctions; no specific implementation is endorsed by this pack.

## A — plain text inside a fixed paragraph
A fictional learner note contains the literal characters `Tea & notes <draft>`. A template intends to show that whole string inside one fixed paragraph, not interpret part of it as markup.

Identify why the HTML text boundary matters. Propose framework-supported text output or context-appropriate HTML text encoding. If code updates an ordinary HTML text element in the DOM, consider a text-oriented API rather than parsing a string as HTML. Do not apply that advice blindly to script/style elements or other execution contexts.

Questions: What original text should remain visible? Which document structure must remain fixed? Does a parser seeing an unexpected element prove script execution? Connect your reasoning to EH-WEB-06's intentionally limited observer.

## B — an ordinary quoted attribute
A fixed input element has a fixed ordinary value attribute. Its dynamic value contains both a quotation mark and an ampersand. The application intends those characters to remain part of the value.

Use the framework's supported attribute handling, keep attribute values quoted and names fixed, and protect the surrounding HTML syntax with handling appropriate to that attribute context. Merely adding quotes without encoding does not handle a quote contained in the data.

Questions: What could an HTML-text-only assumption miss? Why does an ordinary value attribute differ from an event-handler, style or URL attribute? Does the attribute encoder validate the meaning of every attribute? Do not build an event handler to answer this case.

## C — a link destination
A fictional application lets a user propose a link destination. The developer says the value was HTML-escaped, so the destination must be approved. The application also builds a separate search URL using a fixed trusted base and one untrusted query-parameter value.

Distinguish the two designs. A complete destination requires an explicit URL policy, including allowed schemes and any destination/origin restrictions. HTML attribute encoding alone does not approve a destination. A query-parameter value needs URL-component encoding during construction; the resulting URL still needs appropriate handling when inserted into a quoted HTML attribute. Encoding an entire URL indiscriminately is not the same operation.

Questions: Which value is a complete URL, and which is only a component? Which policy is still missing? Why does a quoted attribute not settle the URL's meaning? No URL needs to be visited for this discussion.

## D — data placed into JavaScript
An application takes a fictional display label containing punctuation and interpolates it into JavaScript source. A developer proposes reusing the paragraph encoder or hand-escaping a few quotes.

Prefer a design that separates data from executable source, with a reviewed serialization/delivery contract and consumers that use data-oriented APIs. Do not treat raw JSON serialization alone as a safe way to embed arbitrary data inside an HTML script element: the surrounding HTML context still matters. If source embedding cannot be avoided, use tooling explicitly designed for that exact surrounding context rather than guessing an escaping recipe.

Questions: Which parsers or layers surround the value? What would have to be established before choosing an encoder? Why is a JavaScript string not an HTML paragraph? This case provides no runnable script, event handler or evaluation exercise.

## E — intentionally permitted formatting
A product requirement says a note may preserve a small reviewed subset of formatting, such as emphasis. Rendering the whole note as plain text would not meet that requirement. A developer proposes allowing all input HTML or deleting a short list of suspicious strings.

Use a maintained HTML sanitizer with a reviewed allow-list and integration appropriate to the actual rendering path, or change the requirement to plain text. Do not write a tag-removal regular expression and call it a sanitizer. Keep sanitizer policy/dependencies maintained and avoid later transformations that invalidate the result. Sanitizing markup does not authorize a user or create a sandbox for arbitrary scripts.

Questions: How does this requirement differ from A? Who specifies allowed elements, attributes and URL rules? What evidence would an approved implementation review need beyond one harmless example? No sanitizer installation or execution is part of this pack.

## F — presentation choices instead of arbitrary CSS
A fictional settings form lets a user select one of three named appearance options. A developer wants to paste the submitted string into a style block.

Prefer a fixed allow-list of application-defined option names mapped by trusted code to approved classes or styles. Arbitrary CSS is not required by the stated feature. An HTML encoder or a raw CSS fragment is not a general solution for that redesign. If the requirement genuinely changes to dynamic CSS values, it needs a narrowly specified property/value contract and context-aware handling.

Questions: Which requirement can be satisfied without accepting code-like styling? What happens to an unknown option? Why does moving a string into CSS exceed the original HTML-text repair?

## Evidence and review
Complete the [blank worksheet](OUTPUT-CONTEXT-WORKSHEET.md). For each case distinguish a recommended design, a missing contract, a proposed test and an observation actually made. No browser or fixture tests were executed for this documentation batch. The cases establish no XSS execution, production vulnerability or security assurance.

An approved future implementation review should preserve legitimate text and test its exact output boundary, not just check that a selected string disappeared. Framework raw-HTML bypasses, downstream decoding and later unsafe sinks require review too. Content Security Policy can be an additional layer, not a replacement for correct context handling.

Use only fictional values. Real learner work requires an approved private workflow; do not commit personal answers, protected marking guidance or sensitive screenshots. No catalogue, prerequisite, fixture-code, progression, award, runtime or publication change follows from this supporting pack.
