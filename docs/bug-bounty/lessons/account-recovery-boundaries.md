# Examine account recovery ownership and token lifecycle

## Goal and prerequisites

Explain which user, purpose and lifetime a recovery credential authorizes. Use only controlled accounts and a program that explicitly permits the planned recovery actions. Reset messages, email changes and session revocations affect accounts and may contact infrastructure; they are not read-only requests.

A token should be bound to the intended account and purpose, expire under a defined rule and be unusable after consumption. Validation and consumption may need atomicity. Length or a random-looking string alone does not prove these properties. Do not guess tokens, target strangers or repeat email delivery to test limits.

## Offline model

Run locally with Python 3; no email, file or network resource is accessed:

```bash
python3 - <<'PY'
tokens = {'synthetic': {'owner': 'A', 'purpose': 'reset', 'expires': 100, 'used': False}}
def consume(token, owner, purpose, now):
    row = tokens.get(token)
    if (row is None or row['owner'] != owner or row['purpose'] != purpose
            or row['used'] or now >= row['expires']):
        return False
    row['used'] = True
    return True
print('wrong owner:', consume('synthetic', 'B', 'reset', 50))
print('wrong purpose:', consume('synthetic', 'A', 'email-change', 50))
print('first use:', consume('synthetic', 'A', 'reset', 50))
print('replay:', consume('synthetic', 'A', 'reset', 50))
PY
```

Expected False, False, True, False. This single-threaded dictionary does not implement secure token generation, storage, delivery or concurrent atomic consumption.

## Conditional program workflow

1. Read recovery-specific restrictions and choose a controlled account you can restore. Do not use an account that owns important records.
2. Observe the normal approved recovery flow once. Record request order and which action actually changes credentials. Keep full reset URLs and tokens private.
3. Identify policy questions: account binding, purpose, expiry, successful-use invalidation and effects on existing sessions. Do not assume every question requires a live test.
4. If the program separately permits a particular replay/negative test, plan its minimal controlled evidence and rollback before execution. Never send tokens to a collector or a second organization.
5. Record actual observations separately from what a secure design would do. Stop if unexpected identity or lockout occurs.

## Exercise and explained answer

At now equal to expires, should this model accept? No: now >= expires denies equality. Actual application semantics require documented time precision and trusted clocks.

Does a reset email arriving at your address prove another person's account can be reset? No. Evidence must connect the controlled identity, intended recipient and actual credential/state change; do not use other people's accounts to fill the gap.

## Troubleshooting and cleanup

Expired tokens and already-consumed tokens are not interchangeable diagnoses. Do not trigger more emails automatically. Restore only your controlled account through the normal allowed route, revoke retained test sessions where appropriate and protect recovery codes. No production repair is supplied by this toy model.

## Reference and evidence limit

https://portswigger.net/web-security/authentication

No live reset, mailbox access or program recovery test was executed in preparing this lesson.
