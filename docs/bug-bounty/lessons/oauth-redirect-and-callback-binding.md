# Trace delegated login and bind its callback

## Outcome and prerequisites

Map a delegated login flow without confusing the client application, authorization server and resource server. Complete session, token and scope lessons. A program covering an application does not automatically authorize testing its external identity provider. Use only your own identities and explicitly permitted flows.

OAuth delegates authorization; OpenID Connect adds an identity layer. State correlates a response with a client transaction; registered redirect handling constrains delivery; PKCE binds code redemption to a verifier. These controls address different parts of the flow. OIDC nonce and issuer/audience validation introduce further requirements. The model below covers only selected callback checks, not a complete protocol.

## Offline callback exercise

```bash
python3 - <<'PY'
pending = {
    'state': 'synthetic-state',
    'redirect': 'https://client.example.invalid/callback',
    'used': False,
}
def accept(state, redirect):
    if (pending['used'] or state != pending['state']
            or redirect != pending['redirect']):
        return False
    pending['used'] = True
    return True
print('wrong state:', accept('wrong', pending['redirect']))
print('wrong redirect:', accept('synthetic-state', 'https://other.invalid/'))
print('matching callback:', accept('synthetic-state', pending['redirect']))
print('replay:', accept('synthetic-state', pending['redirect']))
PY
```

Expected False, False, True, False. The fixed strings are teaching data, not production random state. The single-process check does not model token exchange, concurrent consumption or cryptographic verification.

## Program-based observation

Using Developer Tools or Burp on an allowed normal login, privately identify the application redirect, authorization request, provider and return callback. Record parameter names and sequence without retaining authorization codes or bearer tokens in shared notes. Ordinary permitted use of a provider is not permission to attack it.

Check the actual boundary before any mutation. If the program permits validation of client-side callback handling, plan a minimal controlled test with an approved client/account, destination and restore route. Do not redirect codes to an external collector, link another person's account or use an account confusion demonstration involving a victim. Do not replay a real code merely because the offline model includes replay.

When describing PKCE, distinguish the code_challenge in authorization from the code_verifier in redemption; a base64url digest is not encryption. The presence of a challenge does not by itself prove server enforcement. Do not claim the model verifies PKCE or the whole OIDC protocol.

## Exercise and explained answers

Would rejecting wrong state prove the redirect policy is correct? No. They are separate checks; the example tests both independently.

If login succeeds after an external provider redirects normally, is the provider now in the bounty scope? No. Re-evaluate explicit asset and method coverage before testing it.

## Troubleshooting and cleanup

A used or expired code, wrong client, missing cookie or another browser profile can explain failure. Do not disable validation, swap real identities or broaden targets to force success. End controlled sessions and remove only permitted test account links through the normal application route when appropriate.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

No live identity-provider flow or token exchange was executed. The executable callback model is deliberately incomplete and offline.
