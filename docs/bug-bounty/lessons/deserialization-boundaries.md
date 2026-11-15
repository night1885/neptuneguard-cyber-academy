# Keep untrusted bytes away from object-restoring parsers

## Outcome and prerequisites

Explain serialization and deserialization and why restoring objects from untrusted bytes is risky. Complete json-and-evidence.md and property-and-function-permissions.md first. PortSwigger warns that dangerous behavior can occur during deserialization, making later checks too late. Prefer avoiding generic untrusted object deserialization. This is a reasoning lesson, not permission to send object payloads to a program.

## Offline integrity gate with a parser-call check

```bash
python3 - <<'PY'
import hashlib, hmac, json
key = b'synthetic-lab-key'
parser_calls = 0

def sign(body):
    return hmac.new(key, body, hashlib.sha256).hexdigest()

def parse_json(body):
    global parser_calls
    parser_calls += 1
    return json.loads(body)

def load_verified(body, tag):
    if not hmac.compare_digest(sign(body), tag):
        raise ValueError('integrity check failed')
    return parse_json(body)

body = json.dumps({'display': 'A'}, sort_keys=True).encode()
tag = sign(body)
value = load_verified(body, tag)
assert value == {'display': 'A'} and parser_calls == 1
print('valid data:', value)

for label, candidate_body, candidate_tag in [
    ('tampered body', body.replace(b'A', b'B'), tag),
    ('wrong tag', body, '0' * 64),
    ('unsigned malformed JSON', b'{', tag),
]:
    before = parser_calls
    try:
        load_verified(candidate_body, candidate_tag)
    except ValueError as error:
        assert str(error) == 'integrity check failed'
    else:
        raise AssertionError('invalid data accepted')
    assert parser_calls == before, 'parser ran before integrity rejection'
    print(label + ': rejected; parser calls added = 0')
print('total parser calls:', parser_calls)
PY
```

Expected: one valid object, three rejections each adding zero parser calls, then total parser calls of 1. The exception is the enforcement; printing False would not be. The malformed-JSON negative control is rejected before its contents reach the parser.

This is a deliberately small HMAC gate for plain JSON, not a safe generic object deserializer. The synthetic key must never be reused. Real designs also need appropriate key management, input limits, format/schema validation, application authorization and replay/context controls. Integrity does not provide confidentiality. A correctly authenticated object format can still be unsafe to deserialize.

## Program-based reasoning

Identify formats only from permitted normal observations and documentation. A base64-looking parameter is not proof of serialization or exploitation. Do not modify opaque sessions or send crafted objects to complete the lesson. If a hypothesis needs such a test, record it and use the program's coordination route rather than expanding testing authority.

## Exercise and answers

Why count parser calls? It demonstrates that all three failing integrity checks stop before parsing, rather than merely changing the displayed result.

Does a valid MAC grant permission to every action in the decoded data? No. Integrity, schema validation and application authorization are separate boundaries.

Does this demonstrate an insecure native object parser? No. It uses ordinary JSON without application-class restoration, and demonstrates only gate ordering.

## Troubleshooting and cleanup

A JSON parsing error after a valid integrity check is a separate format failure. Do not interpret it as bypass. Discard the synthetic key and sample output; keep real sessions and secrets out of notes.

## Source and validation limit

https://portswigger.net/web-security/deserialization

The local HMAC/JSON exercise and parser-call assertions are executed in authoring. No live application, native object deserializer or callback was tested.
