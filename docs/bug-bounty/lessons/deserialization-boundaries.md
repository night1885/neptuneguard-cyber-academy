# Keep untrusted bytes away from object-restoring parsers

## Outcome and prerequisites

Explain serialization and deserialization and why parsing untrusted objects is risky. Complete JSON and permission lessons. PortSwigger states that insecure deserialization means user-controllable data is deserialized, that checks after deserialization may be too late, and that integrity checks must happen before it begins. This is a reasoning lesson; do not send crafted serialized objects to a program.

## Offline contrast

```bash
python3 - <<'PY'
import hmac, hashlib, json
key = b'synthetic-lab-key'
def sign(body):
    return hmac.new(key, body, hashlib.sha256).hexdigest()
body = json.dumps({'display': 'A'}, sort_keys=True).encode()
tag = sign(body)
print('valid:', hmac.compare_digest(tag, sign(body)))
changed = body.replace(b'A', b'B')
print('changed accepted:', hmac.compare_digest(tag, sign(changed)))
data = json.loads(body)
print('plain data fields:', sorted(data))
PY
```

Expected: valid True, changed accepted False, fields ['display']. JSON creates plain data and does not instantiate application classes. The key is synthetic and must never be reused. This shows integrity-before-parse order, not a complete design.

## Program-based reasoning

Look for documented formats and visible cookies or parameters, but do not modify opaque values. Identify format only from normal observations and written documentation. A base64-looking string is not necessarily serialized code. If a technique would require an object payload, stop and record the hypothesis.

## Exercise and answer

Why is validating an object after deserialization insufficient? Dangerous behavior can occur during deserialization itself. Prefer avoiding untrusted object deserialization and verify integrity first when it is unavoidable.

## Troubleshooting and cleanup

Delete synthetic keys and sample outputs. Do not save real session values in notes.

## Source and validation limit

https://portswigger.net/web-security/deserialization

The HMAC and JSON example runs locally. No program or deserializer was tested.
