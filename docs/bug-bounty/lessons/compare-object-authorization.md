# Compare ownership and authorization without enumeration

## Outcome and prerequisites

Test one explicit read-permission hypothesis using verified identities and synthetic records you own. Complete the account/session lesson first. The program must permit the chosen accounts, object creation, comparison and method. Permission to create two accounts does not by itself authorize cross-account testing. If the necessary action is unclear, ask the designated program contact or do not execute.

## Model the boundary

An identifier locates an object; it does not grant access. Object-level authorization asks whether a caller may act on this object. Function-level authorization governs an action such as approval. Property-level authorization restricts fields such as role or tenant. A successful read does not demonstrate writes, role escalation or access to every tenant.

Use a positive control: the owner must be able to retrieve the intended synthetic object. Use an independent permitted nonowner identity and, only if allowed, an anonymous control. A denied owner response makes the comparison unreliable. A different status or response length is not enough; inspect only the relevant synthetic fields and actual state.

## Offline policy comparison

The following makes no requests and opens no database. Predict each pair before running:

```bash
python3 - <<'PY'
def unsafe(caller, owner, tenant, object_tenant, state):
    return caller in {'A', 'B'}

def corrected(caller, owner, tenant, object_tenant, state):
    return (caller in {'A', 'B'} and caller == owner
            and tenant == object_tenant and state == 'draft')

cases = [
    ('owner', ('A', 'A', 'T1', 'T1', 'draft')),
    ('nonowner', ('B', 'A', 'T1', 'T1', 'draft')),
    ('wrong tenant', ('A', 'A', 'T2', 'T1', 'draft')),
    ('wrong state', ('A', 'A', 'T1', 'T1', 'submitted')),
    ('anonymous', (None, 'A', 'T1', 'T1', 'draft')),
]
for label, args in cases:
    print(label, unsafe(*args), corrected(*args))
PY
```

Expected unsafe/corrected results: owner True/True; nonowner True/False; wrong tenant True/False; wrong state True/False; anonymous False/False. The repaired predicate preserves a positive control. This Boolean model is not a production authorization framework; real applications need trusted identity, tenant and lifecycle inputs.

## Conditional program workflow with Burp

1. Recheck the brief and document the expected business rule. A publicly shared object can legitimately be accessible across accounts; establish the intended sharing state first.
2. If allowed, create one harmless private synthetic record as A through the normal UI. Use a short non-sensitive marker, not an executable payload or real personal data. Record its exact identifier without guessing others.
3. Verify A's identity and capture its ordinary read. Send unchanged once only if replay is permitted. Record the minimal fields proving the record is the expected synthetic one.
4. Verify B independently. Capture B's own normal request structure, then prepare a read comparison only if the plan explicitly permits access-control validation between your controlled accounts.
5. In Repeater, keep the destination, method and requested synthetic object constant; replace the complete coherent authentication context with B's permitted context. Review other identity/session bindings. Do not combine unrelated tokens or silently bypass a precondition.
6. Send once within the plan's budget. Compare the relevant synthetic data, not just status or length. If the server returns unrelated data, stop retrieval and use the secure reporting route.
7. If an anonymous comparison is allowed, remove the complete authentication context and send at most once under that separate planned control. Do not assume removing Cookie also removes bearer authentication.

Do not enumerate adjacent identifiers, increase page sizes, export lists or test delete/write operations to prove scale. A UUID is not a substitute for authorization, but neither is its presence evidence of a defect.

## Record and interpret

Use rows for owner, controlled nonowner and optional anonymous. Record caller verification, object ownership/sharing, method, relevant fields, status and uncertainty. If B sees A's synthetic private marker contrary to the applicable rule, that supports a narrow controlled cross-owner read finding. It does not establish anonymous access, all-user exposure, administrator access or modification.

## Exercise and explained answer

Question: the nonowner gets 403, while the owner also gets 403. Is authorization verified? Answer: no. The positive control failed; sessions, state, route or object assumptions may be wrong. Restore known context before drawing a conclusion.

Question: B gets 200 but the body is a login page. Is the object disclosed? Answer: not on that evidence. Identify the actual content and session; protocol success is not an authorization outcome.

Question: should a repair reject every caller? Answer: no. The owner's allowed use must remain functional. Retest the same bounded positive/negative controls only when authorized to retest.

## Troubleshooting and cleanup

Stale sessions, shared browser state, public-sharing settings and caches can invalidate comparisons. Stop on a lockout, rate limit, unexpected error or sensitive response rather than retrying until a desired result appears.

Remove only your harmless test record through the permitted normal workflow if appropriate. Keep redacted minimal evidence, revoke retained sessions where applicable, and state any final-state uncertainty. Do not turn cleanup into an unauthorized delete test.

## Source and validation limit

https://portswigger.net/burp/documentation/desktop/testing-workflow/vulnerabilities/access-controls

The offline model and proposed manual procedure are separate evidence classes. No real application authorization test or learner practical was executed in preparing this lesson.
