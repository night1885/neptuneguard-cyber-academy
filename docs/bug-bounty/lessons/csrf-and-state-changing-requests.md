# Review CSRF at a state-changing boundary

## Outcome and prerequisites

Separate an unwanted authenticated action from unauthorized response reading. Complete the origin and session lessons. Practice uses only your own accounts and a reversible harmless action explicitly allowed by the program. Never use email changes, password changes, money movement or destructive operations as generic practice targets.

CSRF can arise when a browser supplies ambient authority, such as cookies, to a state-changing request whose source the application does not adequately validate. A token field's presence alone proves little: it must be validated appropriately and associated with the relevant context. SameSite, origin validation and framework token mechanisms have different assumptions. An authenticated endpoint still needs object/function authorization.

## Offline policy model

```bash
python3 - <<'PY'
import hmac
expected = 'synthetic-token-A'
def permit(origin, token):
    return (origin == 'https://portal.example.invalid'
            and isinstance(token, str)
            and hmac.compare_digest(expected, token))
for label, origin, token in [
    ('valid', 'https://portal.example.invalid', expected),
    ('missing token', 'https://portal.example.invalid', ''),
    ('wrong token', 'https://portal.example.invalid', 'wrong'),
    ('other origin', 'https://other.invalid', expected),
]:
    print(label, permit(origin, token))
PY
```

Expected: True, False, False, False. This intentionally strict Boolean model omits real browser cookie behavior, request methods and framework-specific token storage. It is not a universal server implementation.

## Conditional program workflow

1. Read relevant rules and choose a reversible synthetic preference, if permitted. Record its initial value and normal restore route.
2. Capture one normal allowed action with Developer Tools or Burp. Identify method, body format, session carrier, token location and origin context. A JSON content type may cause preflight in cross-origin browser use; do not ignore it.
3. Verify normal application success using the actual preference state, not just status or response length.
4. If applicable rules permit a missing/invalid-token comparison on your controlled account, plan that exact action, expected denial and restoration before sending. A custom-header or origin modification in Repeater does not prove another website can create an equivalent browser request.
5. Browser exploitability needs separately permitted evidence about dispatch, credentials and resulting state under actual browser constraints. Do not lure real users into a test or publish an actionable page for them.

## Exercise and explained answers

A response is blocked by CORS, but the synthetic preference changed. Does the CORS failure disprove CSRF? No. Response readability and action completion are distinct. Verify state under permitted conditions.

A token is absent but the action is rejected. Is a vulnerability demonstrated? No. Another applicable defense may enforce the intended boundary. Describe observations rather than demanding one particular implementation.

## Troubleshooting and cleanup

Expired sessions, stale anti-CSRF values and nonreversible state invalidate a comparison. Stop rather than repeating until a desired result occurs. Restore only the controlled preference through the allowed normal workflow. Keep credentials and tokens out of retained screenshots.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

The executable model makes no requests or state changes to an application. No live CSRF test or browser reproduction was performed in authoring this lesson.
