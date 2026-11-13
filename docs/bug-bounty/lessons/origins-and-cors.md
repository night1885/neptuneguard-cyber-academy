# Distinguish browser origins from CORS permission

## Outcome and prerequisites

Explain whether a browser sends a request, attaches credentials and exposes the response to a script. These are separate questions. Complete the browser-network and controlled-session lessons. Use only a program-permitted endpoint and controlled account; public CORS configuration is not itself a vulnerability.

An origin consists of scheme, hostname and effective port. Paths do not create new origins. Site and origin differ; do not equate a cross-origin subdomain with a cross-site destination. CORS is a browser response-sharing mechanism, not server-side authentication. curl and Repeater can inspect headers but do not enforce browser CORS rules.

## Offline origin exercise

```bash
python3 - <<'PY'
from urllib.parse import urlsplit
for value in [
    'https://portal.example.invalid/a',
    'https://portal.example.invalid:443/b',
    'https://portal.example.invalid:8443/a',
    'http://portal.example.invalid/a',
]:
    u = urlsplit(value)
    port = u.port if u.port is not None else (443 if u.scheme == 'https' else 80)
    print((u.scheme, u.hostname, port))
PY
```

Expected: the first two origin tuples match; the other two differ. This parser does not implement all browser origin serialization rules and makes no requests.

## Inspect the actual boundary

In Developer Tools Network, review a permitted normal cross-origin application request if one occurs. Identify the initiating origin, destination, credentials actually attached, any OPTIONS preflight and the actual response. Record Access-Control-Allow-Origin and Access-Control-Allow-Credentials where present, plus relevant browser errors. Do not assume a preflight is the only request or that every request needs one.

A wildcard origin does not permit scripts to read a credentialed response. An arbitrary reflected origin can be concerning, but a finding also needs evidence of inappropriate response exposure and relevant impact. Public unauthenticated data may be intentionally readable by any origin. Cookie SameSite and third-party-cookie policy can independently prevent credentials from being sent.

If the current program permits a controlled CORS comparison, use an approved test origin you control, your own test identity and a harmless response marker. Define the full request budget, including preflight, before execution. Do not collect real user data or send response contents to a third-party collector. If no suitable browser-based test is authorized, complete the reasoning exercise only.

## Exercise and explained answers

A tool shows Access-Control-Allow-Origin: * and Access-Control-Allow-Credentials: true. Is authenticated data theft proven? No. Browsers reject wildcard sharing for credentialed requests; verify actual behavior rather than inferring it from two strings.

A browser reports a CORS error. Did the server necessarily receive no request? No. Some requests can be sent while response access is blocked. CORS is not a substitute for CSRF protection.

## Troubleshooting and cleanup

Preflight caching, expired sessions, redirects and cookie policy can change observations. Do not disable browser security, add an untrusted extension or use a CORS-bypass proxy to obtain a preferred result. Stop on unexpected sensitive output. Close the dedicated browser and retain only permitted minimal evidence.

## Source and validation limit

https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

Only the offline origin parser is executed as a teaching example. A header inspection or parser result is not a completed browser exploit or live finding.
