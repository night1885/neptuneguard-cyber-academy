# Read token claims without mistaking decoding for trust

## Goal and boundary

Inspect a fabricated signed token offline and distinguish decoding, integrity and claim validation. Do not paste a real bearer token into a public decoder, third-party website or AI prompt. A bearer token can convey account access even when its payload looks harmless.

A typical signed JWT has encoded header, payload and signature segments. Base64url is an encoding, not encryption. Real verification must constrain the expected algorithm/key and applicable issuer, audience, expiry and application context. A correct signature does not grant every action described by a client-controlled role field.

## Offline Python exercise

This synthetic HMAC example makes no requests and is not a production JWT implementation:

```bash
python3 - <<'PY'
import base64
import hashlib
import hmac
import json

def enc(value):
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode('ascii')
header = enc(b'{"alg":"HS256","typ":"JWT"}')
payload = enc(b'{"sub":"A","exp":100}')
changed = enc(b'{"sub":"B","exp":100}')
key = b'public-teaching-key-never-use-in-production'
original = (header + '.' + payload).encode('ascii')
signature = hmac.new(key, original, hashlib.sha256).digest()
modified = (header + '.' + changed).encode('ascii')
print('decoded changed claims:', json.loads(base64.urlsafe_b64decode(changed + '==')))
print('original matches:', hmac.compare_digest(signature, hmac.new(key, original, hashlib.sha256).digest()))
print('modified matches:', hmac.compare_digest(signature, hmac.new(key, modified, hashlib.sha256).digest()))
print('valid at expiry:', 100 < 100)
PY
```

Expected: readable changed claims; original True; modified False; exact-expiry False. No server received or accepted a modified token. The demonstration does not implement a full JWT verifier or key-management system.

## Apply to permitted research

Within an approved session, identify where a token is carried and whether it is actually used for authentication. Decode only in an approved private local tool. Record claim names and relevant synthetic relationships without exposing the token. Expiry in a decoded payload is an assertion until the server's applicable validation is established.

Any live tampering, alternate-token comparison or algorithm-related test requires an explicit bounded plan permitted by the program; it is not a required action here. Do not brute-force signing keys or substitute keys from unrelated systems.

## Exercise and explained answer

If editing sub changes a decoder's display, did you switch users? No. Only successful validation and server behavior under permitted testing could establish that. The local HMAC comparison rejects the changed signed bytes.

Does JWT mean confidential? No. The common signed representation is readable. Avoid secrets in logs regardless of whether a token is signed.

## Troubleshooting and cleanup

Padding/JSON errors are parsing failures, not vulnerabilities. Never turn off signature checks to fix a decoder. Keep any real tokens outside shared notes and revoke retained test sessions as appropriate.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

Only the synthetic cryptographic comparison is executable here; no live token-validation behavior is claimed.
