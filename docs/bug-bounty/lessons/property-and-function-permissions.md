# Separate editable properties from privileged functions

## Outcome and prerequisites

Distinguish object access, editable fields and privileged operations. Complete controlled accounts, authorization and JSON lessons. Use only explicitly permitted synthetic records and roles. Do not try to grant a real account administrator privileges to complete this lesson.

An API may correctly check record ownership yet blindly apply fields the caller must not control, such as role, tenant or approval state. Returning sensitive fields and accepting unauthorized fields are related property-level policy problems. Function authorization separately controls an operation such as approve or export. Hiding its button is not enforcement.

## Offline update and action model

```bash
python3 - <<'PY'
original = {'display_name': 'A', 'role': 'student', 'tenant': 'T1'}
incoming = {'display_name': 'Synthetic name', 'role': 'admin', 'tenant': 'T2'}
unsafe = {**original, **incoming}
editable = {'display_name'}
rejected = sorted(set(incoming) - editable)
print('unsafe role:', unsafe['role'])
print('rejected fields:', rejected)
allowed_update = {'display_name': incoming['display_name']}
corrected = {**original, **allowed_update}
print('corrected:', corrected)
def can_approve(role, state):
    return role == 'reviewer' and state == 'submitted'
print('student approve:', can_approve('student', 'submitted'))
print('reviewer approve:', can_approve('reviewer', 'submitted'))
PY
```

Expected: the unsafe merge accepts admin; role and tenant are identified as unauthorized input fields; the corrected object preserves student/T1. Approval denies the student and allows the reviewer in submitted state. In a real API, decide whether to reject the whole invalid update or ignore forbidden fields consistently; the printout is not an endpoint implementation.

## Program-based procedure

Map one permitted normal update with Burp or browser Network. Determine its documented editable properties, object ownership and required role/state. Do not infer client-controlled authority merely because role appears in returned JSON. Check which properties actually persist or affect behavior using only authorized, harmless observations.

Any live negative-field or function comparison must be allowed by current rules and have a safe restore plan. Use a controlled nonprivileged test identity and minimum synthetic evidence; do not alter real tenant membership, approvals, payments or another account's permissions. If a safe comparison is unavailable, record the unanswered policy question rather than performing a dangerous action.

## Exercise and explained answers

An unknown JSON field returns 200 but does not persist. Is mass assignment proven? No. Acceptance of syntax does not establish application of a security-relevant property.

Would checking role only in the browser protect approve? No. The authoritative server operation must enforce the policy for every relevant entry point.

What must a repair preserve? Legitimate editable fields and authorized reviewer actions. Rejecting every update hides the symptom while breaking intended behavior.

## Troubleshooting and cleanup

Cached views, asynchronous processing and client transformations can obscure persistence. Do not keep retrying or change additional fields to force an outcome. Restore only permitted harmless fields and revoke test sessions as appropriate.

## Source and evidence limit

https://owasp.org/API-Security/editions/2023/en/0x11-t10/

The executable exercise modifies local dictionaries only. No real role, tenant or privileged function was changed.
