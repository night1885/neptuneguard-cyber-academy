# Review redirect destinations without involving real users

## Outcome and prerequisites

Separate URL parsing, application redirect decisions and security impact. Complete origins and OAuth lessons. Use only a program-permitted feature and your own session. Do not distribute test links, phish users or redirect authorization codes to a collector. Many programs exclude redirects without additional supported impact.

## Optional offline parsing exercise

```bash
python3 - <<'PY'
from urllib.parse import urlsplit
def candidate(value):
    u = urlsplit(value)
    if not u.scheme and not u.netloc:
        return value.startswith('/') and not value.startswith('//')
    return (u.scheme == 'https' and u.hostname == 'app.example.invalid'
            and u.port in (None, 443) and u.username is None
            and u.password is None)
for value in ['/account', '//other.invalid/x',
              'https://app.example.invalid/home',
              'https://app.example.invalid.other.invalid/']:
    print(value, candidate(value))
PY
```

Expected True, False, True, False. These four strings illustrate a distinction; this function is not a production redirect validator. It does not model browser/parser disagreements, encoding edge cases or every malformed URL. Prefer framework-supported validation and server-side destination identifiers where appropriate.

## Program-based procedure

1. Observe an allowed ordinary return navigation in browser Network or Burp history.
2. Identify whether a 3xx Location header, JavaScript or another mechanism causes navigation. Do not follow a new host automatically.
3. Check whether the brief allows redirect testing and whether the chosen flow involves secrets or account linking. Do not use such consequential flows as generic practice.
4. If expressly permitted, plan one harmless destination under your control, a controlled session and a request budget. Retain only the minimum redirect evidence.
5. Explain any demonstrated impact separately. Do not claim OAuth compromise, token leakage or account takeover from a bare redirect.

## Questions and answers

Why is a substring check insufficient? A different hostname can contain the trusted name. Userinfo, ports and normalization are additional considerations.

Does Location alone prove the browser navigated? No. Header observation and browser behavior are distinct evidence.

## Troubleshooting and cleanup

Expired return state and application normalization can explain rejection. Do not brute-force encodings or repeatedly replay login. Close the test session and remove any controlled test links.

## Reference and validation limit

https://portswigger.net/web-security/all-materials

Only the four-string parser exercise is executed. No live redirect or login flow was tested.
