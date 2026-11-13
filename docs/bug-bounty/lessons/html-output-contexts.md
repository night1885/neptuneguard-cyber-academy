# Trace untrusted text into an HTML output context

## Goal and prerequisites

Distinguish literal text from markup and describe the exact output context. Use Python 3 locally. A harmless emphasis marker demonstrates structure without active script, network callbacks or other users. Do not place executable content into live shared records to complete this lesson.

HTML text, quoted attributes, JavaScript, CSS and URLs have different grammars. HTML escaping appropriate for element text does not automatically secure a script string or a URL destination. Reflected, stored and DOM-based issues describe different paths by which untrusted data reaches a browser interpretation boundary.

## Offline parser exercise

```bash
python3 - <<'PY'
from html import escape
from html.parser import HTMLParser

class Inspect(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.text = []
    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
    def handle_data(self, data):
        self.text.append(data)

value = '<em>draft</em> & notes'
for label, body in [('raw', value), ('encoded', escape(value))]:
    parsed = Inspect()
    parsed.feed('<p>' + body + '</p>')
    parsed.close()
    print(label, parsed.tags, ''.join(parsed.text))
assert parsed.tags == ['p'] and ''.join(parsed.text) == value
PY
```

Expected raw tags p/em and text draft & notes; encoded tags only p with the complete original string as text. This parser does not execute JavaScript or simulate every browser quirk. An added em element proves markup interpretation, not JavaScript execution or account takeover.

## Conditional program observation

1. Confirm that a chosen input and its display are permitted, private to your controlled account and safe to modify. Establish retention and cleanup before creating a stored marker.
2. Observe a normal non-sensitive text value through the allowed UI. In Developer Tools compare the response source, DOM and rendered view.
3. Determine where the data enters: server output, client template, textContent, innerHTML or another consumer. Do not infer the sink solely from a response substring.
4. Only if the program permits a harmless marker comparison, use the minimum controlled value and inspect its context. Do not target another user's browser, send a collector URL or assume an admin review queue is safe.
5. Record the exact evidence and its limit. Further exploitability testing needs separate permission and a bounded plan.

## Exercise and explained answer

Does seeing an emphasized word justify a JavaScript XSS claim? No. It demonstrates an HTML boundary. Describe only what was observed; execution and consequence require their own permitted evidence.

Does editing Elements demonstrate a server defect? No. It changes the local DOM, not the original delivery or another user's state.

What should a repair preserve? The user's intended text, not delete all punctuation. Use context-appropriate encoding/safe APIs and independent destination policies where needed.

## Troubleshooting and cleanup

If the marker is absent, inspect the intended field and client transformation before assuming filtering. Do not expand to shared or privileged views. Remove only your marker through the permitted normal UI and keep minimal redacted evidence.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

The executable example is an offline parser comparison. No browser execution or live application test is claimed.
