# Standalone web foundations — read a decision before testing it

Draft paper worksheet. Do not execute or integrate this example. It is a synthetic teaching function, not an authorization, enrollment or grading control.

## Read the function

```python
def needs_review(status, reviewed):
    return status != 0 or not reviewed
```

The parameters receive values supplied by a caller. The comparison asks whether status differs from zero; not reverses the Boolean reviewed value; or needs at least one true condition. Returning a Boolean does not print evidence or perform a system check. Use integer statuses and Boolean flags for these examples; no arbitrary-input validation is implemented.

Worked trace: with status 7 and reviewed True, status != 0 is True and not reviewed is False, so the result is True. A supplied status of 7 is fictional input, not evidence that a real command ran. A supplied reviewed flag does not authenticate a reviewer.

## Guided predictions

Before reading the instructor guide, predict results for (0, True), (0, False) and (7, False). Explain both subexpressions for each. Identify the difference between assignment and comparison, a function definition and a call, and returning a value versus recording an actual observation.

## Independent variant

On paper, replace or with and. Find two input pairs where the changed function disagrees with the original; explain the causal difference. Keep original and changed behavior distinct rather than changing expectations to hide the mutation. Propose an additional test input and explain what it would and would not establish. Do not claim tests were run.

## Next teaching and practical boundary

Use the existing [Python reading bridge](../lessons/PYTHON-READING-BRIDGE.md) for deeper function, record, tuple, branch and test reading. Its approved guest, Python availability, reviewed material transfer and named test instructions remain prerequisites to any later execution. Its teaching model stays outside runtime. If prerequisites are missing, continue paper tracing or request support; do not reconnect an isolated guest or install packages ad hoc.

The shared bridge's author results are not learner results. Capture actual counts/status only after an approved run. A green test suite supports the cases tested, not complete correctness, identity verification or trusted evidence.

This worksheet alone does not establish debugging, secure implementation, framework knowledge or independent programming competence. Further reviewed foundation teaching and independent work are needed before advanced source analysis. No pass threshold, permission, award or progression rule is implemented.
