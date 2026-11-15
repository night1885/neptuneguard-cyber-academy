# Trace server-side requests without probing internal networks

## Outcome and prerequisites

Explain how an application-influenced destination can cross a server-side trust boundary. Complete URL inspection, mapping and evidence lessons. Use only an explicitly permitted feature and, if callbacks are allowed, an approved destination you control. The program's permission and confidentiality rules cover both ends and the method, not just the form where a URL is entered.

An application fetching a URL can have network access different from a user's browser. Destination controls must consider scheme, parsed authority, effective port, user information, DNS resolution, every redirect and network egress. A substring allowlist is not equivalent. This lesson contains no internal-network scan, metadata retrieval or file access.

## Offline destination inspection

```bash
python3 - <<'PY'
from urllib.parse import urlsplit
approved = ('https', 'images.example.invalid', 443)
for raw in [
    'https://images.example.invalid/image',
    'https://images.example.invalid.other.invalid/image',
    'https://images.example.invalid@other.invalid/image',
    'http://127.0.0.1/image',
]:
    u = urlsplit(raw)
    try:
        port = u.port if u.port is not None else (443 if u.scheme == 'https' else 80)
        match = ((u.scheme, u.hostname, port) == approved
                 and u.username is None and u.password is None)
    except ValueError:
        match = False
    print(raw, match)
PY
```

Expected True only for the first string. No string is resolved or fetched. This predicate does not enforce live DNS results, IP classification, redirect handling or egress, and is not a production SSRF defense.

## Conditional program workflow

Identify the normal permitted behavior of a URL-consuming feature: import, preview or webhook registration may have very different side effects. Record whether the browser or server initiates the observed connection. Do not assume a browser preview proves server-side fetching.

If explicitly allowed, plan a single harmless resource on an approved public destination you control, using a non-sensitive unique marker. Review the callback service's data handling before use; an external collector can receive confidential targets or tokens. Never put secrets in a callback URL. Do not create repeated webhook deliveries, redirect chains or background jobs as an incidental test.

Correlate timestamps, marker and protocol with the planned action. DNS-only evidence does not prove HTTP access; HTTP contact does not identify the exact component or demonstrate arbitrary response reading. Security scanners and preview services can also create callbacks. Stop at minimum supported evidence and avoid internal/private/link-local targets.

## Exercise and explained answers

Why check redirects separately? A permitted initial host can return a new destination outside the allowed boundary. Each new connection needs appropriate policy; disabling redirects may be suitable for some designs.

Does one callback prove remote code execution? No. It proves at most the observed interaction, subject to attribution. Do not claim internal compromise or exfiltration without separately authorized evidence.

## Troubleshooting and cleanup

Delayed or absent callbacks can be inconclusive. Do not repeatedly trigger jobs or expand destinations. Remove only your approved test resource/job through a normal permitted path, account for pending deliveries and retain minimal allowed logs.

## References and evidence limit

https://owasp.org/API-Security/editions/2023/en/0x11-t10/

https://portswigger.net/web-security/all-materials

No callback host, webhook, DNS lookup or network request was created in preparing this lesson.
