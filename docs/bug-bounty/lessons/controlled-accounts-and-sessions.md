# Keep controlled accounts and sessions separate

## Outcome and prerequisites

Identify the actual caller before interpreting a response. Complete the brief and HTTP-tool lessons first. Use only accounts you own and are explicitly allowed to create/use under the selected program. If multiple accounts, proxying or account actions are prohibited, do not perform the live comparison; complete the offline exercise instead.

Authentication establishes identity. A session carries the server's recognition across requests. Authorization evaluates whether that caller may perform an action on an object. A valid session is not permission to access every record.

## Prepare tools and identities

Use a dedicated testing browser, not your personal account profile. In Burp Community, keep the listener loopback-only and use its configured browser. Do not install extensions, enable automatic session macros or add match-and-replace rules during this baseline. Those features can change requests or create extra traffic.

Create an identity ledger with aliases A/B, the allowed account roles, which synthetic records you created and how you confirmed the active identity. Store actual email addresses, passwords, tokens and recovery codes separately, never in a classroom submission. Account creation and email delivery are actions too; use only the program-approved route.

Do not assume two tabs are two sessions. Tabs often share a cookie store; local storage, service workers and single sign-on can also affect identity. A separate profile provides client-state separation, not network authorization. Alternatively, use one browser session at a time and record logout/login transitions carefully.

## Manual live workflow, only when permitted

1. Review the current program brief and your narrow plan, including the permitted account and read-only route. Browser navigation can trigger subrequests; allow for that rather than claiming a one-request budget.
2. Sign in as A through the approved application flow. Verify the displayed account and, if allowed, a documented identity response. Do not invent a /me endpoint or probe a guessed one.
3. Capture one normal permitted request in Burp HTTP history. Label a private Repeater tab A-baseline. Check every identity-bearing location: Cookie, Authorization and application-specific tokens. The active identity is not determined by a tab label.
4. If the plan permits a replay, verify its destination and send unchanged once. Record status and relevant synthetic response fields, not the token. A 200 alone does not establish the intended identity.
5. End A's browser session through the normal permitted logout flow. Switch to B through the approved route and verify B independently. Label B's captured baseline separately.
6. Before any later comparison, recheck which session is in the request. Do not mix A's Cookie with B's bearer token or rotate tokens by guessing values.

No real account credentials belong in shell history, a screenshot, a HAR shared with classmates or an external AI prompt. An exported Burp project can contain secrets even when a visible screenshot looks clean.

## Offline lifecycle exercise

This model opens no sockets and reads no credentials. Run with Python 3:

```bash
python3 - <<'PY'
store = {'before-login': None}
store.pop('before-login')
store['synthetic-A'] = {'user': 'A', 'expires': 100}
print('old session valid:', 'before-login' in store)
print('current caller:', store['synthetic-A']['user'])
print('valid at expiry:', 100 < store['synthetic-A']['expires'])
store.pop('synthetic-A')
print('valid after logout:', 'synthetic-A' in store)
PY
```

Expected: False, A, False, False. These identifiers are deliberately predictable teaching labels, not a token-generation example. The model demonstrates intended rotation, expiry and invalidation; it does not prove the real application implements them or model concurrent requests.

## Exercise and explained answer

Write a private four-column ledger: request alias, verified caller, synthetic object owner and observation. If you cannot verify the caller, mark the result inconclusive.

Question: A's old request still works after a UI logout. Is that automatically a valid vulnerability? Answer: investigate only within the allowed plan. Check which token actually authenticated it, whether logout was supposed to revoke that token, whether another session was used, caching and applicable policy. Do not claim account takeover from this observation alone.

Question: does clearing a cookie prove server-side revocation? Answer: no. It only removes the client's copy. Any separately permitted replay of your own token checks a different property; replay is additional activity requiring scope and budget review.

## Troubleshooting and cleanup

On 401, check session expiry and identity before changing resource identifiers. On unexpected account state, stop rather than collecting more data. Do not bypass MFA or anti-abuse controls to make a lesson work.

Log out controlled accounts where appropriate, close capture browsers, stop the proxy listener when finished, and protect or remove retained synthetic session material under your retention plan. Never delete another user's records or deactivate a real account as cleanup.

## Source and validation limit

https://portswigger.net/burp/documentation/desktop/testing-workflow/vulnerabilities/session-management

The offline lifecycle model is not evidence of a real application's session behavior. No live login, logout, replay or browser practical was executed in preparing this lesson.
