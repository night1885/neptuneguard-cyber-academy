# Output-context worksheet

Draft blank worksheet for the [fictional output-context cases](OUTPUT-CONTEXT-CASEPACK.md). Paper reasoning only, not a browser exercise, exploit transcript or implemented assessment.

| Case | Intended meaning | Exact output context / consumer | Suitable handling or safer redesign | Missing contract | Evidence limit |
|---|---|---|---|---|---|
| A — paragraph text | | | | | |
| B — quoted ordinary attribute | | | | | |
| C — link / URL component | | | | | |
| D — JavaScript source embedding | | | | | |
| E — permitted formatting | | | | | |
| F — presentation options / CSS | | | | | |

## Reasoning questions
1. Explain why encoding for one context does not approve every later use of the string.
2. Distinguish URL-policy validation, URL-component encoding and quoted HTML attribute handling.
3. Explain when plain-text rendering conflicts with a formatting requirement and why that changes the sanitizer question.
4. Name a case that can be redesigned to avoid placing untrusted values into executable source or arbitrary style content.
5. Explain why a parsed extra HTML element is not evidence of JavaScript execution.
6. State two limitations of these paper cases.

## Proposed review — not executed
Choose two cases and describe a legitimate data-preservation check and an output-boundary check for each. State what environment, policy and implementation details would be required before actual tests could be authorized. Keep the examples inert; provide no active scripts, event handlers, external resources or live targets.

No pass threshold or automatic completion decision is defined. Any real learner response belongs only in the approved private workflow, not this repository.
