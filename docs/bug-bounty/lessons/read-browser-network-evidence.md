# Read browser network evidence without confusing the DOM

## Goal and context

Distinguish request bytes, response bytes, browser state and the live DOM. Use a dedicated browser profile and only a program-permitted page. Developer Tools can reveal confidential data; do not open personal email or unrelated accounts during capture.

The Network response is not necessarily the current document structure. Client JavaScript can alter the DOM after delivery. Conversely, changing a value in Elements edits your local view, not the server. Request initiators, caching and service workers can explain why the screen and a captured response differ.

## Tool workflow

1. Open Developer Tools before the allowed navigation. Select Network, clear old entries and identify any active filters. Do not disable caching, unregister service workers or replay requests without considering the changed activity.
2. Navigate once through the approved route. Select the document request and note final destination, method, status, initiator and redirect sequence. A redirect does not expand scope.
3. Inspect response headers and body privately. Identify Content-Type and whether the content is the intended page, an error, a login screen or a generic fallback.
4. Select one relevant fetch/XHR entry. Associate it with a normal UI action already allowed by the plan. Record the object and caller context without exposing credentials.
5. Compare Response with Elements for one harmless text value. Explain whether server rendering or client code accounts for the difference.
6. Inspect cookies/storage only for your controlled account. Cookie attributes constrain handling, but a storage value alone does not establish server trust or authorization.

## Encoding exercise

Use Python 3 locally; this does not contact a target:

```bash
python3 - <<'PY'
from urllib.parse import urlsplit, parse_qs, urlencode
u = urlsplit('https://portal.example.invalid/find?q=tea%20%26%20notes#preview')
print('path:', u.path)
print('query:', parse_qs(u.query))
print('fragment:', u.fragment)
print('encoded:', urlencode({'q': 'tea & notes'}))
PY
```

Expected path /find; one q value containing tea & notes; fragment preview; encoded query q=tea+%26+notes. A fragment is normally client-side and is not part of the HTTP request target. Encoding preserves data structure, not permission.

## Independent exercise and answer

Record three evidence types for the same permitted view: Network response, rendered text and DOM element. Identify which one supports each statement.

If Elements shows an administrator button after you edit HTML locally, did you gain a server privilege? No. Local presentation is not authority. A security claim needs permitted evidence about the actual protected action or information.

Does a favicon 404 establish a vulnerability? No. It is a missing resource observation without demonstrated security impact.

## Troubleshooting and cleanup

If no request appears, check capture timing, filters, cache and browser context before assuming no traffic occurred. Preserve only the minimum allowed evidence. HAR files and Copy as curl can include secrets in headers, bodies and URLs; never share them unreviewed. Clear capture and close the dedicated browser when finished.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

No browser-rendering workflow or live program request was executed in authoring this lesson.
