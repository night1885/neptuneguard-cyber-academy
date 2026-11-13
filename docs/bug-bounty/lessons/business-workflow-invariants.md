# Turn business rules into testable invariants

## Outcome and prerequisites

Model which actors may move a resource between states and which numerical values are valid. Complete mapping and authorization lessons. Use ordinary approved synthetic workflows. Real payments, refunds, inventory reservations, discounts, messages and limited-stock actions need special care and are not generic live exercises.

A business-logic defect can accept syntactically valid input that violates the intended process. Validation must reflect domain meaning, not just type. A legitimate draft may be submitted once; a submitted record need not be editable; an approval can require a different actor. State and permission checks interact.

## Offline transition exercise

```bash
python3 - <<'PY'
def transition(role, state, action):
    rules = {
        ('student', 'draft', 'submit'): 'submitted',
        ('reviewer', 'submitted', 'approve'): 'approved',
    }
    return rules.get((role, state, action), 'DENIED')
for args in [
    ('student', 'draft', 'submit'),
    ('student', 'submitted', 'submit'),
    ('student', 'submitted', 'approve'),
    ('reviewer', 'submitted', 'approve'),
]:
    print(args, transition(*args))
for quantity in [-1, 0, 1, 11, True]:
    valid = type(quantity) is int and 1 <= quantity <= 10
    print('quantity:', repr(quantity), 'valid:', valid)
PY
```

Expected transitions submitted, DENIED, DENIED, approved. Only quantity 1 is valid among these cases. Explicit type checking excludes Python bool, a subclass of int. This illustrates language/domain precision, not a recommendation that every application use these exact quantities.

## Program-based procedure

1. Identify an allowed ordinary workflow and document the intended rule. Ask for clarification if the business expectation is unknown; surprising behavior alone is not a vulnerability.
2. Record actor, state before, action and state after from normal use. Browser Network/Burp can associate requests with transitions, but a hidden field is not automatically authoritative.
3. Draw allowed and disallowed edges. Identify consequences before choosing any test. Do not replay submissions, invitations or transactions simply because a UI button is disabled.
4. Where rules explicitly permit a reversible controlled comparison, plan one edge and a positive control with a permitted synthetic resource. Verify actual state, not just response status.
5. Stop after the minimum evidence. No repeated redemption, real balance changes or amplification is needed to explain a violated invariant.

## Exercise and explained answers

Why does a negative quantity matter even if it parses as an integer? Domain validity is narrower than grammatical validity. A valid type can encode an invalid business action.

Would rejecting all transitions fix the workflow? It prevents use, not a correct application repair. Preserve legitimate actor/state transitions and deny only disallowed relationships.

Does a documented admin action becoming available mean a low-privilege bypass? Only if the caller, expected policy and actual effect support that claim; a visible control is insufficient.

## Troubleshooting and cleanup

Eventually consistent displays and incomplete prerequisites can mislead comparisons. Do not repeatedly invoke state changes as a diagnostic shortcut. Restore only approved synthetic state through a permitted path; if irreversible, do not execute without explicit coordination.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

The model has no network activity, transaction or external side effect. No real business flow was tested in authoring this lesson.
